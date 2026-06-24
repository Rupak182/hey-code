import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import os from "os";
import { z } from "zod";

// Zod Schema definitions for configuration validation
export const mcpServerConfigSchema = z.object({
  type: z.enum(["stdio", "sse"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
  enabled: z.boolean().optional().default(true),
}).refine((data) => {
  if (data.type === "stdio" && !data.command) return false;
  if (data.type === "sse" && !data.url) return false;
  return true;
}, {
  message: "command is required for 'stdio' transport; url is required for 'sse' transport"
});

export const heycodeConfigSchema = z.object({
  mcp: z.record(z.string(), mcpServerConfigSchema).optional(),
});

export type MCPServerConfig = z.infer<typeof mcpServerConfigSchema> & { name: string };

interface ActiveConnection {
  client: Awaited<ReturnType<typeof createMCPClient>> | null;
  config: MCPServerConfig;
  status: "connected" | "connecting" | "error";
  tools: Record<string, any>;
}

const activeConnections = new Map<string, ActiveConnection>();

export async function loadMcpConfigurations(): Promise<MCPServerConfig[]> {
  const configMap = new Map<string, MCPServerConfig>();
  const cwd = process.env.HEYCODE_CWD || process.cwd();

  const configPaths = [
    join(cwd, "heycode.json"),
    join(os.homedir(), ".heycode", "mcp.json"),
  ];

  for (const filePath of configPaths) {
    if (!existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf-8"));
      const parsed = heycodeConfigSchema.parse(raw);
      if (parsed.mcp) {
        for (const [name, server] of Object.entries(parsed.mcp)) {
          if (!configMap.has(name)) {
            configMap.set(name, { name, ...server });
          }
        }
      }
    } catch (error) {
      console.error(`Invalid MCP configuration at ${filePath}:`, error);
    }
  }

  return Array.from(configMap.values());
}

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function initializeMcpServers(): Promise<void> {
  const configs = await loadMcpConfigurations();

  await Promise.all(
    configs.map(async (cfg) => {
      if (!cfg.enabled) return;

      const conn: ActiveConnection = {
        client: null,
        config: cfg,
        status: "connecting",
        tools: {},
      };
      activeConnections.set(cfg.name, conn);

      try {
        const transport = cfg.type === "stdio"
          ? new Experimental_StdioMCPTransport({
              command: cfg.command!,
              args: cfg.args || [],
              env: cfg.env,
            })
          : { type: "sse" as const, url: cfg.url! };

        const client = await withTimeout(
          createMCPClient({ transport }),
          10000,
          `Connection timed out after 10s`
        );

        if (!activeConnections.has(cfg.name)) {
          await client.close();
          return;
        }

        conn.client = client;

        const tools = await withTimeout(
          conn.client.tools(),
          5000,
          `Fetching tools timed out after 5s`
        );

        if (!activeConnections.has(cfg.name)) {
          await client.close();
          return;
        }

        conn.tools = tools;
        conn.status = "connected";
      } catch (e) {
        if (conn.client) try { await conn.client.close(); } catch (_) {}
        conn.client = null;
        conn.status = "error";
        console.error(`Failed to initialize MCP Server ${cfg.name}:`, e);
      }
    })
  );
}

export function getActiveMcpConnections(): ActiveConnection[] {
  return Array.from(activeConnections.values());
}

export function getMcpToolSchemas() {
  const schemas: Array<{ name: string; description?: string; inputSchema?: any }> = [];
  for (const [serverName, conn] of activeConnections.entries()) {
    if (conn.status !== "connected") continue;
    for (const [toolName, tool] of Object.entries(conn.tools)) {
      const inputSchema = tool.parameters && typeof tool.parameters === "object" && "jsonSchema" in tool.parameters
        ? tool.parameters.jsonSchema
        : tool.parameters;

      schemas.push({
        name: `${serverName}__${toolName}`,
        description: tool.description,
        inputSchema,
      });
    }
  }
  return schemas;
}

export async function executeMcpTool(fullName: string, args: any) {
  const parts = fullName.split("__");
  const serverName = parts[0];
  const toolName = parts.slice(1).join("__");

  const conn = activeConnections.get(serverName!);
  if (!conn || conn.status !== "connected") {
    throw new Error(`MCP Server ${serverName} is not connected.`);
  }

  const tool = conn.tools[toolName!];
  if (!tool) throw new Error(`Tool ${toolName} not found on MCP server ${serverName}`);

  return await tool.execute(args);
}

export async function shutdownMcpServers(): Promise<void> {
  const connections = Array.from(activeConnections.values());
  activeConnections.clear();

  const closures = connections.map(async (conn) => {
    try {
      if (conn.client) await conn.client.close();
    } catch (_) {}
  });
  await Promise.all(closures);
}

// Global Process Event Listeners to prevent zombie processes
let shuttingDown = false;
const cleanUp = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await shutdownMcpServers();
  process.exit(0);
};

process.on("SIGINT", cleanUp);
process.on("SIGTERM", cleanUp);
process.on("exit", () => {
  for (const conn of activeConnections.values()) {
    try {
      if (conn.client) conn.client.close();
    } catch (_) {}
  }
});
