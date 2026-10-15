import pino from "pino";
import { pinoHttp } from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import type { Request } from "express";

/**
 * Structured JSON logger for the CRM backend.
 * - Development: pino-pretty for readable terminal output
 * - Production: JSON to stdout → Docker captures → Vector collects → Loki stores
 */

interface TenantContext {
  companyId?: number;
  userId?: number;
  roleId?: number;
}

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "crm-backend",
    env: process.env.NODE_ENV || "development",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
    ],
    censor: "[REDACTED]",
  },
  ...(!isProduction
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname,service,env",
            singleLine: false,
          },
        },
      }
    : {}),
});

/**
 * Creates a child logger with tenant context extracted from the JWT.
 * Use this inside authenticated routes where req.user is available.
 */
export function createTenantLogger(context: TenantContext): pino.Logger {
  return logger.child({
    companyId: context.companyId,
    userId: context.userId,
    roleId: context.roleId,
  });
}

/**
 * Creates a child logger from an Express request.
 * Extracts tenant context from req.user if available.
 */
export function createRequestLogger(req: Request): pino.Logger {
  const user = (req as unknown as Record<string, unknown>).user as
    | TenantContext
    | undefined;
  return logger.child({
    companyId: user?.companyId,
    userId: user?.userId,
    roleId: user?.roleId,
    method: req.method,
    url: req.originalUrl,
    requestId: req.headers["x-request-id"] || undefined,
  });
}

/**
 * Pino-http middleware — replaces morgan("dev").
 * Automatically logs every HTTP request/response as structured JSON.
 *
 * Each log line includes: method, url, statusCode, responseTime, companyId, userId, roleId
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: IncomingMessage) => {
      const url = (req as unknown as Request).originalUrl || req.url || "";
      return url === "/health" || url === "/favicon.ico";
    },
  },
  customProps: (req: IncomingMessage) => {
    const user = (req as unknown as Record<string, unknown>).user as
      | TenantContext
      | undefined;
    return {
      companyId: user?.companyId,
      userId: user?.userId,
      roleId: user?.roleId,
    };
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req: IncomingMessage, res: ServerResponse) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  serializers: {
    req(req: IncomingMessage & { id?: number }) {
      return {
        method: req.method,
        url: req.url,
      };
    },
    res(res: ServerResponse) {
      return {
        statusCode: res.statusCode,
      };
    },
    err: pino.stdSerializers.err,
  },
});

export default logger;
