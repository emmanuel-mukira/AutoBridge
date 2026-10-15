import express from "express";
import cors from "cors";
import helmet from "helmet";
import { httpLogger } from "./lib/logger.js";
import cookieParser from "cookie-parser";
import { devAutheliaProxy } from "./middleware/devAutheliaProxy.js";
import authRouter from "./routes/auth.routes.js";
import usersAdminRouter from "./routes/users.admin.routes.js";
import userRouter from "./routes/user.routes.js";
import callPlannerRouter from "./routes/callPlanner.routes.js";
import customerRouter from "./routes/customer.routes.js";
import customerContactRouter from "./routes/customerContact.routes.js";
import leadRouter from "./routes/lead.routes.js";
import quotationRouter from "./routes/quotation.routes.js";
import interactionRouter from "./routes/interaction.routes.js";
import auditLogRouter from "./routes/auditLog.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

/**
 * Header spoof protection — strip Remote-* headers from any request that
 * didn't come from Traefik.
 *
 * How it works in production:
 *   - Traefik strips client-supplied Remote-* headers before forwarding to backends
 *   - Traefik re-injects them ONLY after Authelia validates the session
 *   - Backends are on internal Docker network and not directly reachable
 *
 * In dev (no Traefik): set TRUSTED_PROXY_SECRET in .env and pass it as the
 * X-Internal-Token header from your test client or curl to simulate Traefik.
 */
const TRUSTED_PROXY_SECRET = process.env.TRUSTED_PROXY_SECRET;

app.use((req, _res, next) => {
  const hasValidSecret =
    TRUSTED_PROXY_SECRET &&
    req.headers["x-internal-token"] === TRUSTED_PROXY_SECRET;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !hasValidSecret) {
    delete req.headers["remote-user"];
    delete req.headers["remote-groups"];
    delete req.headers["remote-email"];
    delete req.headers["remote-name"];
  }
  next();
});

// Security headers with HSTS and CSP
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    frameguard: { action: "deny" },
  }),
);
const configuredOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set<string>(configuredOrigins);
if (!isProduction) {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}
app.use(
  cors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin '${requestOrigin}'`));
    },
    credentials: true,
  }),
);
app.use(httpLogger);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// DEV: mimic Traefik ForwardAuth by calling Authelia /api/verify
if (process.env.NODE_ENV !== "production") {
  app.use(devAutheliaProxy());
}

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/call-plans", callPlannerRouter);
app.use("/api/customers", customerRouter);
app.use("/api/customer-contacts", customerContactRouter);
app.use("/api/leads", leadRouter);
app.use("/api/quotations", quotationRouter);
app.use("/api/interactions", interactionRouter);
app.use("/api/audit-logs", auditLogRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api", usersAdminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
