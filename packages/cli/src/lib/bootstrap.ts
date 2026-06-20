import { loadGlobalConfig } from "@heycode/shared";
import path from "path";

/**
 * Boots the CLI environment: loads configurations, runs Drizzle migrations,
 * and starts the local server.
 */
export async function bootstrap() {
  // 1. Load config and environment variables
  loadGlobalConfig();

  // 2. Dynamically import database client & run migrations
  try {
    const { db } = await import("@heycode/database/client");
    const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");

    // Search for drizzle folder relative to the running binary first, then fallback to workspace packages
    let migrationsFolder = path.join(import.meta.dirname, "drizzle");
    if (!require("fs").existsSync(migrationsFolder)) {
      try {
        const dbPackageFile = require.resolve("@heycode/database");
        migrationsFolder = path.join(path.dirname(dbPackageFile), "../drizzle"); // for development
      } catch (err) {
        // Fallback to default
      }
    }

    await migrate(db, { migrationsFolder });
  } catch (error) {
    console.error("Failed to initialize database or run migrations:", error);
    process.exit(1);
  }

  // 3. Dynamically import and start the Hono server in the background on a random free port
  try {
    const { default: serverApp } = await import("@heycode/server");
    const server = Bun.serve({
      ...serverApp,
      port: 0,
    });

    // Inject the actual assigned URL so that the api-client connects to the correct port
    process.env.API_BASE_URL = `http://localhost:${server.port}/`;
  } catch (error) {
    console.error("Failed to start Hono server:", error);
    process.exit(1);
  }
}
