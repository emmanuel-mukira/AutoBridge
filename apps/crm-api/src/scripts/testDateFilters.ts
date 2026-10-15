import { startOfMonth, startOfYear, startOfQuarter, subMonths } from "date-fns";

// Test date filter calculations
const now = new Date();
console.log("Current Date:", now.toISOString());
console.log("\n=== Date Filter Ranges ===\n");

const filters = {
  month: startOfMonth(now),
  quarter: startOfQuarter(now),
  "half-year": subMonths(now, 6),
  year: startOfYear(now),
  max: new Date(2020, 0, 1),
};

for (const [name, from] of Object.entries(filters)) {
  console.log(`${name.toUpperCase()}:`);
  console.log(`  From: ${from.toISOString()}`);
  console.log(`  To: ${now.toISOString()}`);
  console.log(
    `  Days: ${Math.ceil((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))}`,
  );
  console.log();
}
