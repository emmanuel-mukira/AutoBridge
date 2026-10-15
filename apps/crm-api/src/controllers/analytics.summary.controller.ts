import { Request, Response } from "express";
import { prisma } from "../client.js";
import logger from "../lib/logger.js";

interface DateRange {
  gte?: Date;
  lte?: Date;
}

function parseDateRange(req: Request): DateRange | undefined {
  const { startDate, endDate } = req.query;
  if (!startDate && !endDate) return undefined;
  const range: DateRange = {};
  if (startDate) range.gte = new Date(startDate as string);
  if (endDate) range.lte = new Date(endDate as string);
  return range;
}

/**
 * Lead summary — counts by status, filtered by date range.
 */
export async function getLeadsSummary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const isAdmin = user.groups.includes("admin");
    const dateRange = parseDateRange(req);

    const where = {
      companyId: user.companyId,
      ...(isAdmin ? {} : { salesRepId: user.id }),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const quotationWhere = {
      companyId: user.companyId,
      status: "ACCEPTED" as const,
      ...(isAdmin ? {} : { salesRepId: user.id }),
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const [total, won, lost, open, draft, acceptedValue] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, status: "WON" } }),
      prisma.lead.count({ where: { ...where, status: "LOST" } }),
      prisma.lead.count({ where: { ...where, status: "OPEN" } }),
      prisma.lead.count({ where: { ...where, status: "DRAFT" } }),
      prisma.quotation.aggregate({
        where: quotationWhere,
        _sum: { totalPrice: true },
      }),
    ]);

    const conversionRate =
      won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    res.json({
      totalLeads: total,
      wonLeads: won,
      lostLeads: lost,
      openLeads: open,
      draftLeads: draft,
      conversionRate,
      acceptedValue: Number(acceptedValue._sum?.totalPrice ?? 0),
      isAdmin,
    });
  } catch (error) {
    logger.error({ err: error }, "leads summary query failed");
    res.status(500).json({ error: "Failed to fetch leads summary" });
  }
}

/**
 * Customer summary — count by county/region, filtered by date range.
 */
export async function getCustomersSummary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const dateRange = parseDateRange(req);

    const where = {
      companyId: user.companyId,
      ...(dateRange ? { createdAt: dateRange } : {}),
    };

    const [total, byCounty] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.groupBy({
        by: ["countyName"],
        where,
        _count: { id: true },
      }),
    ]);

    res.json({
      totalCustomers: total,
      regionalDistribution: byCounty.map((d) => ({
        region: d.countyName,
        count: d._count.id,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "customers summary query failed");
    res.status(500).json({ error: "Failed to fetch customers summary" });
  }
}

/**
 * Sales rep performance — leads + won + revenue per rep, filtered by date range (admin only).
 */
export async function getSalesRepSummary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;

    if (!user.groups.includes("admin")) {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const dateRange = parseDateRange(req);

    const salesReps = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true, username: true },
    });

    const performance = await Promise.all(
      salesReps.map(async (rep) => {
        const repWhere = {
          companyId: user.companyId,
          salesRepId: rep.id,
          ...(dateRange ? { createdAt: dateRange } : {}),
        };
        const [leads, won, revenue] = await Promise.all([
          prisma.lead.count({ where: repWhere }),
          prisma.lead.count({ where: { ...repWhere, status: "WON" } }),
          prisma.quotation.aggregate({
            where: {
              salesRepId: rep.id,
              status: "ACCEPTED",
              ...(dateRange ? { createdAt: dateRange } : {}),
            },
            _sum: { totalPrice: true },
          }),
        ]);

        return {
          id: rep.id,
          name: `${rep.firstName} ${rep.lastName}`,
          totalLeads: leads,
          wonLeads: won,
          totalValue: Number(revenue._sum?.totalPrice ?? 0),
          conversionRate: leads > 0 ? Math.round((won / leads) * 100) : 0,
        };
      }),
    );

    res.json(performance.sort((a, b) => b.totalValue - a.totalValue));
  } catch (error) {
    logger.error({ err: error }, "sales rep summary query failed");
    res.status(500).json({ error: "Failed to fetch sales rep summary" });
  }
}

/**
 * Activity heatmap — call plans + interactions per day for a calendar month.
 */
export async function getActivityHeatmap(
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

    const userFilter = isAdmin ? {} : { salesRepId: user.id };

    const [callPlans, interactions] = await Promise.all([
      prisma.callPlan.findMany({
        where: {
          companyId: user.companyId,
          ...userFilter,
          plannedDate: { gte: monthStart, lte: monthEnd },
        },
        select: { plannedDate: true },
      }),
      prisma.interaction.findMany({
        where: {
          companyId: user.companyId,
          ...userFilter,
          interactionDate: { gte: monthStart, lte: monthEnd },
        },
        select: { interactionDate: true },
      }),
    ]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activitiesByDay = new Array(daysInMonth).fill(0);

    for (const plan of callPlans) {
      const day = new Date(plan.plannedDate).getDate() - 1;
      if (day >= 0 && day < daysInMonth) activitiesByDay[day]++;
    }
    for (const interaction of interactions) {
      const day = new Date(interaction.interactionDate).getDate() - 1;
      if (day >= 0 && day < daysInMonth) activitiesByDay[day]++;
    }

    res.json([activitiesByDay]);
  } catch (error) {
    logger.error({ err: error }, "heatmap query failed");
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
}
