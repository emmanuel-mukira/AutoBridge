import { Request } from "express";
import { insertAnalyticsEvent } from "../lib/analyticsDb.js";
import logger from "../lib/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventData = Record<string, string | number | boolean>;

// ---------------------------------------------------------------------------
// Core sender — fire-and-forget, never blocks the caller
// ---------------------------------------------------------------------------

async function trackEvent(
  req: Request,
  eventName: string,
  data?: EventData,
): Promise<void> {
  const user = req.user;
  if (!user?.companyId) {
    logger.warn("analytics event skipped: no companyId on request");
    return;
  }

  const isAdmin = user.groups.includes("admin");

  try {
    await insertAnalyticsEvent(
      { tenantId: user.companyId, userId: user.id, isAdmin },
      eventName,
      { ...data, companyId: user.companyId },
    );
    logger.debug({ eventName, ...data }, "analytics event tracked");
  } catch (error) {
    logger.warn({ err: error, eventName }, "analytics event failed");
  }
}

// ---------------------------------------------------------------------------
// Pre-built event helpers — every event carries companyId automatically
// ---------------------------------------------------------------------------

export const AnalyticsEvents = {
  /** Lead created — tracks new lead pipeline entries */
  leadCreated: (req: Request, salesRepId: number) =>
    trackEvent(req, "lead_created", { salesRepId }),

  /** Lead won — tracks successful conversions */
  leadWon: (req: Request, leadId: number) =>
    trackEvent(req, "lead_won", { leadId }),

  /** Lead lost — tracks failed conversions */
  leadLost: (req: Request, leadId: number) =>
    trackEvent(req, "lead_lost", { leadId }),

  /** Customer created — tracks new customers with regional data */
  customerCreated: (req: Request, county: string) =>
    trackEvent(req, "customer_created", { county }),

  /** Call plan completed — tracks visit activity */
  callPlanCompleted: (req: Request, salesRepId: number, plannedDate: string) =>
    trackEvent(req, "call_plan_completed", { salesRepId, plannedDate }),

  /** Quotation accepted — tracks accepted quotation value */
  quotationAccepted: (req: Request, quotationId: number, value: number) =>
    trackEvent(req, "quotation_accepted", { quotationId, value }),
};
