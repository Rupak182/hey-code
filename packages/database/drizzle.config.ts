import { defineConfig } from "drizzle-kit";
import path from "path";
import os from "os";

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.startsWith("file:")) {
  databaseUrl = `file:${path.join(os.homedir(), ".heycode", "heycode.db")}`;
} else {
  databaseUrl = databaseUrl
    .replace("$HOME", os.homedir())
    .replace("~", os.homedir());
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
});
