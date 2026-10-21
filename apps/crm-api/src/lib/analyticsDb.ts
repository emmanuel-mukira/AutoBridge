import pg from "pg";
import logger from "./logger.js";

const { Pool } = pg;

/**
 * Dedicated connection pool for the TimescaleDB analytics database.
 * Separate from the main CRM Prisma client — lightweight, raw SQL only.
 */
const analyticsPool = new Pool({
  connectionString: process.env.ANALYTICS_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

analyticsPool.on("error", (err) => {
  logger.error({ err }, "analytics DB pool error");
});

interface RlsContext {
  tenantId: number;
  userId: number;
  isAdmin: boolean;
}

/**
 * Execute a query with RLS session variables set on the same connection.
 * Wraps the query in a transaction so session vars are scoped correctly.
 */
export async function analyticsQuery<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(
  ctx: RlsContext,
  text: string,
  params?: (string | number | boolean | null | Date)[],
): Promise<pg.QueryResult<T>> {
  const client = await analyticsPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true), set_config('app.is_admin', $3, true)",
      [
        ctx.tenantId.toString(),
        ctx.userId.toString(),
        ctx.isAdmin ? "true" : "false",
      ],
    );
    const result = await client.query<T>(text, params);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Insert an analytics event (fire-and-forget safe).
 * RLS WITH CHECK ensures company_id matches the session tenant.
 */
export async function insertAnalyticsEvent(
  ctx: RlsContext,
  eventName: string,
  eventData: Record<string, string | number | boolean>,
): Promise<void> {
  await analyticsQuery(
    ctx,
    `INSERT INTO analytics_events (event_name, company_id, user_id, event_data)
     VALUES ($1, $2, $3, $4)`,
    [eventName, ctx.tenantId, ctx.userId, JSON.stringify(eventData)],
  );
}

/**
 * Graceful shutdown — drain the pool.
 */
export async function closeAnalyticsPool(): Promise<void> {
  await analyticsPool.end();
}

export { analyticsPool };
