import dotenv from "dotenv";
import path from "path";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client.ts";

import { loadGlobalConfig } from "@heycode/shared";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
});

loadGlobalConfig();


const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });

export const db = new PrismaClient({ adapter });