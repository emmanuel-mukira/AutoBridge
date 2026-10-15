import prismaClient from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { PrismaClient } = prismaClient;

// 1. Create the connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_ADMIN,
});

// 2. Setup the Prisma PostgreSQL adapter
//    Two @types/pg versions exist in node_modules (ours @8.20, adapter's @8.11).
//    They are structurally identical at runtime. The unknown cast breaks the
//    TypeScript structural incompatibility without using `any`.
const adapter = new PrismaPg(
  pool as unknown as ConstructorParameters<typeof PrismaPg>[0],
);

// 3. Initialize Prisma Client with the adapter
export const prisma = new PrismaClient({ adapter });
