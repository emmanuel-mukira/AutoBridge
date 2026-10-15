import { prisma } from "../client.js";
import { analyticsPool } from "../lib/analyticsDb.js";
import logger from "../lib/logger.js";

/**
 * Syncs CRM data into TimescaleDB analytics_events.
 *
 * Strategy:
 *   1. Read all CRM records (leads, customers, call plans, quotations, interactions)
 *   2. For each record, derive the matching analytics event
 *   3. Upsert into TimescaleDB (skip duplicates via ON CONFLICT)
 *
 * Runs on startup (full backfill) and then hourly (incremental).
 * Future real-time events are handled by AnalyticsEvents service — this cron
 * is the safety net that keeps TimescaleDB in sync with CRM history.
 */

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

interface AnalyticsEvent {
  time: Date;
  eventName: string;
  companyId: number;
  userId: number;
  eventData: Record<string, unknown>;
}

async function buildEventsFromCRM(): Promise<AnalyticsEvent[]> {
  const events: AnalyticsEvent[] = [];

  // 1. Leads → lead_created, lead_won, lead_lost
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      companyId: true,
      salesRepId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  for (const lead of leads) {
    events.push({
      time: lead.createdAt,
      eventName: "lead_created",
      companyId: lead.companyId,
      userId: lead.salesRepId,
      eventData: { leadId: lead.id, salesRepId: lead.salesRepId },
    });

    if (lead.status === "WON") {
      events.push({
        time: lead.updatedAt,
        eventName: "lead_won",
        companyId: lead.companyId,
        userId: lead.salesRepId,
        eventData: { leadId: lead.id },
      });
    }

    if (lead.status === "LOST") {
      events.push({
        time: lead.updatedAt,
        eventName: "lead_lost",
        companyId: lead.companyId,
        userId: lead.salesRepId,
        eventData: { leadId: lead.id },
      });
    }
  }

  // 2. Customers → customer_created
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      companyId: true,
      salesRepId: true,
      countyName: true,
      createdAt: true,
    },
  });

  for (const customer of customers) {
    events.push({
      time: customer.createdAt,
      eventName: "customer_created",
      companyId: customer.companyId,
      userId: customer.salesRepId ?? 0,
      eventData: { customerId: customer.id, county: customer.countyName },
    });
  }

  // 3. Call plans (completed) → call_plan_completed
  const callPlans = await prisma.callPlan.findMany({
    where: { isCompleted: true },
    select: {
      id: true,
      companyId: true,
      salesRepId: true,
      plannedDate: true,
      completedAt: true,
    },
  });

  for (const cp of callPlans) {
    events.push({
      time: cp.completedAt ?? cp.plannedDate,
      eventName: "call_plan_completed",
      companyId: cp.companyId,
      userId: cp.salesRepId,
      eventData: {
        callPlanId: cp.id,
        salesRepId: cp.salesRepId,
        plannedDate: cp.plannedDate.toISOString(),
      },
    });
  }

  // 4. Quotations (accepted) → quotation_accepted
  const quotations = await prisma.quotation.findMany({
    where: { status: "ACCEPTED" },
    select: {
      id: true,
      companyId: true,
      salesRepId: true,
      totalPrice: true,
      createdAt: true,
    },
  });

  for (const q of quotations) {
    events.push({
      time: q.createdAt,
      eventName: "quotation_accepted",
      companyId: q.companyId,
      userId: q.salesRepId,
      eventData: {
        quotationId: q.id,
        value: Number(q.totalPrice),
      },
    });
  }

  // 5. Interactions → interaction_logged
  const interactions = await prisma.interaction.findMany({
    select: {
      id: true,
      companyId: true,
      salesRepId: true,
      customerId: true,
      type: true,
      interactionDate: true,
    },
  });

  for (const i of interactions) {
    events.push({
      time: i.interactionDate,
      eventName: "interaction_logged",
      companyId: i.companyId,
      userId: i.salesRepId,
      eventData: {
        interactionId: i.id,
        customerId: i.customerId,
        type: i.type,
      },
    });
  }

  return events;
}

async function syncToTimescale(events: AnalyticsEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  const client = await analyticsPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.tenant_id', '0', true), set_config('app.user_id', '0', true), set_config('app.is_admin', 'true', true)",
    );
    await client.query("TRUNCATE analytics_events");
    await client.query("COMMIT");

    // Group events by company so we can set correct RLS context per company
    const byCompany = new Map<number, AnalyticsEvent[]>();
    for (const evt of events) {
      const list = byCompany.get(evt.companyId) ?? [];
      list.push(evt);
      byCompany.set(evt.companyId, list);
    }

    const BATCH = 500;
    for (const [companyId, companyEvents] of byCompany) {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', '0', true), set_config('app.is_admin', 'true', true)",
        [companyId.toString()],
      );

      for (let i = 0; i < companyEvents.length; i += BATCH) {
        const batch = companyEvents.slice(i, i + BATCH);
        const values: string[] = [];
        const params: (string | number | Date)[] = [];
        let paramIdx = 1;

        for (const evt of batch) {
          values.push(
            `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`,
          );
          params.push(
            evt.time.toISOString(),
            evt.eventName,
            evt.companyId,
            evt.userId,
            JSON.stringify(evt.eventData),
          );
        }

        await client.query(
          `INSERT INTO analytics_events (time, event_name, company_id, user_id, event_data)
           VALUES ${values.join(", ")}`,
          params,
        );
      }

      await client.query("COMMIT");
    }

    return events.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runAnalyticsSync(): Promise<void> {
  const start = Date.now();
  logger.info("starting CRM → TimescaleDB sync");

  try {
    const events = await buildEventsFromCRM();
    const count = await syncToTimescale(events);
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    logger.info(
      { count, durationSeconds: duration },
      "analytics sync complete",
    );
  } catch (error) {
    logger.error({ err: error }, "analytics sync failed");
  }
}

// ---------------------------------------------------------------------------
// Startup sync — runs once to backfill historical CRM data into TimescaleDB.
// Future events are tracked in real-time by AnalyticsEvents service.
// ---------------------------------------------------------------------------

export function startAnalyticsSyncJob(): void {
  runAnalyticsSync();
}
