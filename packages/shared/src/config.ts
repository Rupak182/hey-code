import os from "os";
import path from "path";
import fs from "fs";

/**
 * Loads the global configuration from ~/.heycode/config.json
 * and populates process.env.
 */
export function loadGlobalConfig() {
  const configPath = path.join(os.homedir(), ".heycode", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const rawData = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(rawData);
      for (const [key, value] of Object.entries(config)) {
        if (value !== null && value !== undefined && process.env[key] === undefined) {
          process.env[key] = String(value);
        }
      }
    } catch (error) {
      console.error("Error loading config from ~/.heycode/config.json:", error);
    }
  }
}
