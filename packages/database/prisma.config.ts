import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";
import path from "path";
import { loadGlobalConfig } from "../shared/src/config.ts";  // using @ causes issues 

dotenv.config({ path:path.resolve(import.meta.dirname,"../../.env") });

loadGlobalConfig();


export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
