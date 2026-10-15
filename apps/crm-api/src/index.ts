import "dotenv/config";
import app from "./app.js";
import { startAnalyticsSyncJob } from "./jobs/syncAnalytics.js";
import logger from "./lib/logger.js";

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandledRejection");
  process.exit(1);
});

logger.info({ nodeEnv: process.env.NODE_ENV }, "server booting");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
  startAnalyticsSyncJob();
});
