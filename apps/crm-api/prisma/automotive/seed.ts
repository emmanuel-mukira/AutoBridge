import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/client.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const firstName = process.env.ADMIN_FIRST_NAME?.trim();
const lastName = process.env.ADMIN_LAST_NAME?.trim();
const databaseUrl = process.env.DATABASE_URL_ADMIN;

if (process.env.NODE_ENV !== "development") throw new Error("Development seed requires NODE_ENV=development");
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Development seed requires a local PostgreSQL connection");
}
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8 || !firstName || !lastName) {
  throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD (8+ characters), ADMIN_FIRST_NAME and ADMIN_LAST_NAME in the API .env");
}

const accounts = [
  { businessName: "Metro Auto Parts", countyName: "Nairobi", locationAddress: "Industrial Area", shortHistory: "Supplies parts to local garages." },
  { businessName: "Coast Fleet Services", countyName: "Mombasa", locationAddress: "Changamwe", shortHistory: "Maintains commercial vehicles." },
  { businessName: "Rift Valley Garage", countyName: "Nakuru", locationAddress: "Nakuru town", shortHistory: "Repairs passenger and fleet vehicles." },
];

const productGroups: Record<string, string[]> = {
  "Car Accessories": ["Batteries & Accessories", "Exterior Accessories", "Garage & Car Care", "Interior Accessories", "Replacement Parts", "Towing & Hitches"],
  "Car Electronics": ["Car Electronics"],
  "Performance & Non-auto": ["Motorcycle Parts", "Shelters & RV"],
  "Tires & Wheels": ["Tires & Wheels"],
};

try {
  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, take: 2 });
    if (admins.length > 1 || (admins.length === 0 && await prisma.user.count() > 0)) {
      throw new Error("Cannot identify a unique development administrator; seed stopped without changing users");
    }
    admin = admins[0] ?? await prisma.user.create({ data: {
      email, firstName, lastName, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN",
    } });
  }
  if (admin.role !== "ADMIN") throw new Error("ADMIN_EMAIL belongs to a non-admin user");
  const passwordChanged = !(await bcrypt.compare(password, admin.passwordHash));
  if (admin.email !== email || admin.firstName !== firstName || admin.lastName !== lastName || passwordChanged || !admin.active) {
    admin = await prisma.user.update({ where: { id: admin.id }, data: {
      email, firstName, lastName, active: true,
      ...(passwordChanged ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      ...(passwordChanged ? { sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } } } : {}),
    } });
  }

  for (const account of accounts) {
    const exists = await prisma.account.findFirst({ where: { businessName: account.businessName } });
    if (!exists) await prisma.account.create({ data: { ...account, ownerId: admin.id } });
  }
  for (const [name, subgroups] of Object.entries(productGroups)) {
    const group = await prisma.productGroup.upsert({ where: { name }, update: {}, create: { name } });
    for (const subgroupName of subgroups) {
      await prisma.productSubgroup.upsert({
        where: { productGroupId_name: { productGroupId: group.id, name: subgroupName } },
        update: {},
        create: { productGroupId: group.id, name: subgroupName },
      });
    }
  }
  console.log("Development administrator, sample accounts, and automotive product groups ready");
} finally {
  await prisma.$disconnect();
}
