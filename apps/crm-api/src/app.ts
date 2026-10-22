import express from "express";
import cors from "cors";
import helmet from "helmet";
import { httpLogger } from "./lib/logger.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import clientRouter from "./routes/client.routes.js";
import contactRouter from "./routes/contact.routes.js";
import opportunityRouter from "./routes/opportunity.routes.js";
import interactionRouter from "./routes/interaction.routes.js";
import followUpRouter from "./routes/followUp.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

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

app.use("/api/auth", authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/opportunities", opportunityRouter);
app.use("/api/interactions", interactionRouter);
app.use("/api/follow-ups", followUpRouter);
app.use("/api/analytics", analyticsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
