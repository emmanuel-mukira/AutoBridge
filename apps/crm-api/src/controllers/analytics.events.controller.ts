import { Request, Response } from "express";
import { analyticsQuery } from "../lib/analyticsDb.js";
import { prisma } from "../client.js";
import logger from "../lib/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventSeriesRow {
  bucket: string;
  event_name: string;
  event_count: string;
}

interface EventCountRow {
  event_name: string;
  event_count: string;
}

// ---------------------------------------------------------------------------
// GET /api/analytics/event-series
// Returns time-bucketed event counts grouped by event_name.
// Query params: startDate, endDate, unit (day|month), timezone
// Response: Record<string, { t: string; y: number }[]>
// ---------------------------------------------------------------------------

export async function getEventSeries(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const isAdmin = user.groups.includes("admin");
    const { startDate, endDate, unit, timezone } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }

    const bucketInterval = (unit as string) === "month" ? "1 month" : "1 day";
    const tz = (timezone as string) || "Africa/Nairobi";

    const result = await analyticsQuery<EventSeriesRow>(
      { tenantId: user.companyId, userId: user.id, isAdmin },
      `SELECT
         time_bucket($1::INTERVAL, time AT TIME ZONE $2) AS bucket,
         event_name,
         COUNT(*)::TEXT AS event_count
       FROM analytics_events
       WHERE company_id = $3
         AND time >= $4::TIMESTAMPTZ
         AND time <= $5::TIMESTAMPTZ
       GROUP BY bucket, event_name
       ORDER BY bucket ASC`,
      [
        bucketInterval,
        tz,
        user.companyId,
        startDate as string,
        endDate as string,
      ],
    );

    const grouped: Record<string, { t: string; y: number }[]> = {};
    for (const row of result.rows) {
      const name = row.event_name;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({
        t: new Date(row.bucket).toISOString(),
        y: Number(row.event_count),
      });
    }

    res.json(grouped);
  } catch (error) {
    logger.error({ err: error }, "event series query failed");
    res.status(500).json({ error: "Failed to fetch event series" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics/event-heatmap
// Returns daily event counts for a calendar month (for the activity heatmap).
// Query params: year, month (0-indexed)
// Response: number[][] (single row of day counts)
// ---------------------------------------------------------------------------

interface HeatmapRow {
  day: string;
  event_count: string;
}

export async function getEventHeatmap(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const isAdmin = user.groups.includes("admin");
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) ?? new Date().getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result = await analyticsQuery<HeatmapRow>(
      { tenantId: user.companyId, userId: user.id, isAdmin },
      `SELECT
         EXTRACT(DAY FROM time AT TIME ZONE 'Africa/Nairobi')::TEXT AS day,
         COUNT(*)::TEXT AS event_count
       FROM analytics_events
       WHERE company_id = $1
         AND time >= $2::TIMESTAMPTZ
         AND time <= $3::TIMESTAMPTZ
       GROUP BY day
       ORDER BY day ASC`,
      [user.companyId, monthStart.toISOString(), monthEnd.toISOString()],
    );

    const activitiesByDay = new Array(daysInMonth).fill(0);
    for (const row of result.rows) {
      const dayIndex = Number(row.day) - 1;
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        activitiesByDay[dayIndex] = Number(row.event_count);
      }
    }

    res.json([activitiesByDay]);
  } catch (error) {
    logger.error({ err: error }, "event heatmap query failed");
    res.status(500).json({ error: "Failed to fetch event heatmap" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics/event-counts
// Returns total event counts by name for a date range.
// Query params: startDate, endDate
// Response: { event: string; count: number }[]
// ---------------------------------------------------------------------------

export async function getEventCounts(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const isAdmin = user.groups.includes("admin");
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }

    const result = await analyticsQuery<EventCountRow>(
      { tenantId: user.companyId, userId: user.id, isAdmin },
      `SELECT
         event_name,
         COUNT(*)::TEXT AS event_count
       FROM analytics_events
       WHERE company_id = $1
         AND time >= $2::TIMESTAMPTZ
         AND time <= $3::TIMESTAMPTZ
       GROUP BY event_name
       ORDER BY event_count DESC`,
      [user.companyId, startDate as string, endDate as string],
    );

    res.json(
      result.rows.map((row) => ({
        event: row.event_name,
        count: Number(row.event_count),
      })),
    );
  } catch (error) {
    logger.error({ err: error }, "event counts query failed");
    res.status(500).json({ error: "Failed to fetch event counts" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics/sales-rep-performance
// Aggregates lead_created, lead_won, quotation_accepted events per user_id
// from TimescaleDB, then joins with CRM user names.
// Query params: startDate, endDate
// Response: { id, name, totalLeads, wonLeads, totalValue, conversionRate }[]
// ---------------------------------------------------------------------------

interface RepStatsRow {
  user_id: string;
  total_leads: string;
  won_leads: string;
  total_value: string;
}

export async function getSalesRepPerformance(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const isAdmin = user.groups.includes("admin");

    if (!isAdmin) {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }

    const result = await analyticsQuery<RepStatsRow>(
      { tenantId: user.companyId, userId: user.id, isAdmin },
      `SELECT
         user_id::TEXT,
         COUNT(*) FILTER (WHERE event_name = 'lead_created')::TEXT AS total_leads,
         COUNT(*) FILTER (WHERE event_name = 'lead_won')::TEXT AS won_leads,
         COALESCE(SUM(
           CASE WHEN event_name = 'quotation_accepted'
                THEN (event_data->>'value')::NUMERIC
                ELSE 0
           END
         ), 0)::TEXT AS total_value
       FROM analytics_events
       WHERE company_id = $1
         AND time >= $2::TIMESTAMPTZ
         AND time <= $3::TIMESTAMPTZ
         AND event_name IN ('lead_created', 'lead_won', 'quotation_accepted')
       GROUP BY user_id
       ORDER BY total_value DESC`,
      [user.companyId, startDate as string, endDate as string],
    );

    const userIds = result.rows.map((r) => Number(r.user_id));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const performance = result.rows.map((row) => {
      const uid = Number(row.user_id);
      const u = userMap.get(uid);
      const totalLeads = Number(row.total_leads);
      const wonLeads = Number(row.won_leads);
      return {
        id: uid,
        name: u ? `${u.firstName} ${u.lastName}` : `User ${uid}`,
        totalLeads,
        wonLeads,
        totalValue: Number(row.total_value),
        conversionRate:
          totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
      };
    });

    res.json(performance);
  } catch (error) {
    logger.error({ err: error }, "sales rep performance query failed");
    res.status(500).json({ error: "Failed to fetch sales rep performance" });
  }
}
