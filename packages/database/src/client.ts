import dotenv from "dotenv";
import path from "path";
import os from "os";
import fs from "fs";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

import { loadGlobalConfig } from "@heycode/shared";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
});

loadGlobalConfig();

const heycodeDir = path.join(os.homedir(), ".heycode");
if (!fs.existsSync(heycodeDir)) {
  fs.mkdirSync(heycodeDir, { recursive: true });
}
const defaultDbPath = `file:${path.join(heycodeDir, "heycode.db")}`;

const rawDatabaseUrl = process.env.DATABASE_URL?.startsWith("file:")
  ? process.env.DATABASE_URL
  : defaultDbPath;
const dbPath = rawDatabaseUrl.replace(/^file:/, "");

const sqlite = new Database(dbPath);
sqlite.run("PRAGMA journal_mode = WAL;");
export const db = drizzle(sqlite, { schema });