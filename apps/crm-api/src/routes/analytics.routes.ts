import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getEventSeries,
  getEventCounts,
  getEventHeatmap,
  getSalesRepPerformance,
} from "../controllers/analytics.events.controller.js";
import {
  getLeadsSummary,
  getCustomersSummary,
  getSalesRepSummary,
  getActivityHeatmap,
} from "../controllers/analytics.summary.controller.js";

const router = Router();

// TimescaleDB event analytics — time-series aggregations
router.get("/event-series", requireAuth(), getEventSeries);
router.get("/event-counts", requireAuth(), getEventCounts);
router.get("/event-heatmap", requireAuth(), getEventHeatmap);
router.get("/sales-rep-performance", requireAuth(), getSalesRepPerformance);

// Current-state summaries — simple Prisma counts (no aggregation)
router.get("/leads-summary", requireAuth(), getLeadsSummary);
router.get("/customers-summary", requireAuth(), getCustomersSummary);
router.get("/sales-rep-summary", requireAuth(), getSalesRepSummary);
router.get("/heatmap", requireAuth(), getActivityHeatmap);

export default router;
