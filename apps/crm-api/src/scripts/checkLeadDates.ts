import { prisma } from "../client.js";

async function checkLeadDates() {
  console.log("=== Checking Lead Data Dates ===\n");

  const firstLeads = await prisma.lead.findMany({
    where: { companyId: 1 },
    select: { id: true, createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  console.log("First 5 leads:");
  firstLeads.forEach((l) => {
    console.log(`  ID ${l.id}: ${l.createdAt.toISOString()} - ${l.status}`);
  });

  const lastLeads = await prisma.lead.findMany({
    where: { companyId: 1 },
    select: { id: true, createdAt: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\nLast 5 leads:");
  lastLeads.forEach((l) => {
    console.log(`  ID ${l.id}: ${l.createdAt.toISOString()} - ${l.status}`);
  });

  const stats = await prisma.lead.groupBy({
    by: ["status"],
    where: { companyId: 1 },
    _count: { id: true },
  });

  console.log("\nLead Status Distribution:");
  stats.forEach((s) => {
    console.log(`  ${s.status}: ${s._count.id}`);
  });

  const dateRange = await prisma.lead.aggregate({
    where: { companyId: 1 },
    _min: { createdAt: true },
    _max: { createdAt: true },
    _count: { id: true },
  });

  console.log("\nOverall Lead Stats:");
  console.log(`  Total Leads: ${dateRange._count.id}`);
  console.log(`  Earliest: ${dateRange._min.createdAt?.toISOString()}`);
  console.log(`  Latest: ${dateRange._max.createdAt?.toISOString()}`);

  await prisma.$disconnect();
}

checkLeadDates().catch(console.error);
