import "dotenv/config";
import app from "./app.js";
import { prisma } from "./client.js";
import logger from "./lib/logger.js";
import { validateAuthConfig } from "./middleware/auth.js";

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandledRejection");
  process.exit(1);
});

logger.info({ nodeEnv: process.env.NODE_ENV }, "server booting");
validateAuthConfig();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "server listening");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(async (error) => {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        logger.error({ err: disconnectError }, "database disconnect failed");
        process.exitCode = 1;
      }
      if (error) {
        logger.error({ err: error }, "HTTP shutdown failed");
        process.exitCode = 1;
      }
    });
  });
}
