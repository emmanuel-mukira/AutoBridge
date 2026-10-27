import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/automotive",
  migrations: {
    path: "prisma/automotive/migrations",
    seed: "tsx prisma/automotive/seed.ts",
  },
});
