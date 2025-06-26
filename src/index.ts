import {
  MCPServer,
  MCPTool,
  MCPToolHandler,
  MCPToolRequest,
  MCPToolResponse,
} from "@mcp/server";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import WordPressClient from "./client/api.js";
import { WordPressAuthMethod, WordPressClientConfig } from "./types/client.js";
import * as Tools from "./tools/index.js";
import { getErrorMessage } from "./utils/error.js";

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.resolve(rootDir, ".env");
dotenv.config({ path: envPath });

const SERVER_VERSION = "1.1.0-multi-site"; // Updated version

// --- Main Server Class ---
class MCPWordPressServer {
  private server: MCPServer;
  // MODIFICATION: Manages multiple WordPress clients, keyed by site ID.
  private wordpressClients: Map<string, WordPressClient> = new Map();
  private tools: MCPTool[] = [];
  private handlers: { [key: string]: MCPToolHandler } = {};
  private initialized: boolean = false;
  // MODIFICATION: Stores the configurations for all loaded sites.
  private siteConfigs: any[] = [];

  constructor(mcpConfig?: any) {
    this.loadConfiguration(mcpConfig);

    if (this.wordpressClients.size === 0) {
      console.error(
        "No WordPress sites were configured. Please create mcp-wordpress.config.json or set environment variables.",
      );
      process.exit(1);
    }

    this.server = new MCPServer({
      name: "mcp-wordpress",
      version: SERVER_VERSION,
      description:
        "A server for managing WordPress sites using the Model Context Protocol.",
    });

    this.setupServer();
  }

  private loadConfiguration(mcpConfig?: any) {
    const configPath = path.resolve(rootDir, "mcp-wordpress.config.json");

    if (fs.existsSync(configPath)) {
      console.log(
        "INFO: Found mcp-wordpress.config.json, loading multi-site configuration.",
      );
      this.loadMultiSiteConfig(configPath);
    } else {
      console.log(
        "INFO: mcp-wordpress.config.json not found, falling back to environment variables for single-site mode.",
      );
      this.loadSingleSiteFromEnv(mcpConfig);
    }
  }

  private loadMultiSiteConfig(configPath: string) {
    try {
      const configFile = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(configFile);

      if (!config.sites || !Array.isArray(config.sites)) {
        throw new Error('Configuration file must have a "sites" array.');
      }

      this.siteConfigs = config.sites;
      for (const site of this.siteConfigs) {
        if (site.id && site.name && site.config) {
          const clientConfig: WordPressClientConfig = {
            siteUrl: site.config.WORDPRESS_SITE_URL,
            auth: {
              method:
                site.config.WORDPRESS_AUTH_METHOD ||
                WordPressAuthMethod.AppPassword,
              username: site.config.WORDPRESS_USERNAME,
              password: site.config.WORDPRESS_APP_PASSWORD,
            },
          };
          const client = new WordPressClient(clientConfig);
          this.wordpressClients.set(site.id, client);
          console.log(
            `INFO: Initialized client for site: ${site.name} (ID: ${site.id})`,
          );
        } else {
          console.warn(
            "WARN: Skipping invalid site entry in config. Must have id, name, and config.",
            site,
          );
        }
      }
    } catch (error) {
      console.error(
        `FATAL: Error reading or parsing mcp-wordpress.config.json: ${getErrorMessage(error)}`,
      );
      process.exit(1);
    }
  }

  private loadSingleSiteFromEnv(mcpConfig?: any) {
    const siteUrl =
      mcpConfig?.wordpressSiteUrl || process.env.WORDPRESS_SITE_URL;
    const username =
      mcpConfig?.wordpressUsername || process.env.WORDPRESS_USERNAME;
    const password =
      mcpConfig?.wordpressAppPassword || process.env.WORDPRESS_APP_PASSWORD;
    const authMethod = (mcpConfig?.wordpressAuthMethod ||
      process.env.WORDPRESS_AUTH_METHOD ||
      "app-password") as WordPressAuthMethod;

    if (!siteUrl || !username || !password) {
      console.error(
        "ERROR: Missing required credentials for single-site mode.",
      );
      console.error(
        "Please set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables.",
      );
      return;
    }

    const singleSiteConfig: WordPressClientConfig = {
      siteUrl,
      auth: { method: authMethod, username, password },
    };
    const client = new WordPressClient(singleSiteConfig);
    this.wordpressClients.set("default", client);
    this.siteConfigs.push({
      id: "default",
      name: "Default Site",
      config: singleSiteConfig,
    });
    console.log(
      "INFO: Initialized client for default site in single-site mode.",
    );
  }

  private setupServer() {
    Object.values(Tools).forEach((ToolClass) => {
      const toolInstance = new ToolClass();
      const tools = toolInstance.getTools();
      this.tools.push(...tools);
    });

    // MODIFICATION: Dynamically add a 'site' parameter to all tools.
    this.tools.forEach((tool) => {
      tool.parameters = tool.parameters || [];
      tool.parameters.push({
        name: "site",
        type: "string",
        description:
          "The ID of the WordPress site to target (from mcp-wordpress.config.json).",
        required: this.wordpressClients.size > 1,
      });
    });

    this.tools.forEach((tool) => {
      this.handlers[tool.name] = this.createToolHandler(tool);
    });

    this.server.registerTools(this.tools, this.handlers);
  }

  private createToolHandler(tool: MCPTool): MCPToolHandler {
    return async (request: MCPToolRequest): Promise<MCPToolResponse> => {
      const { params } = request;
      const siteId = (params.site as string) || "default";

      const client = this.wordpressClients.get(siteId);

      if (!client) {
        const availableSites = Array.from(this.wordpressClients.keys()).join(
          ", ",
        );
        return {
          error: {
            message: `Site with ID '${siteId}' not found. Available sites: ${availableSites}`,
            code: "SITE_NOT_FOUND",
          },
        };
      }

      try {
        if (typeof (tool as any).handler !== "function") {
          return {
            error: {
              message: `Tool '${tool.name}' is not implemented correctly.`,
            },
          };
        }
        // MODIFICATION: Pass the selected WordPress client to the tool's handler.
        return await (tool as any).handler(client, params);
      } catch (error) {
        if (this.isAuthenticationError(error)) {
          return {
            error: {
              message: `Authentication failed for site '${siteId}'. Please check your credentials.`,
              code: "AUTH_ERROR",
            },
          };
        }
        return { error: { message: getErrorMessage(error) } };
      }
    };
  }

  private async testClientConnections(): Promise<void> {
    console.log(
      "INFO: Testing connections to all configured WordPress sites...",
    );
    const connectionPromises = Array.from(this.wordpressClients.entries()).map(
      async ([siteId, client]) => {
        try {
          await client.testConnection();
          console.log(`SUCCESS: Connection to site '${siteId}' successful.`);
        } catch (error) {
          console.error(
            `ERROR: Failed to connect to site '${siteId}': ${getErrorMessage(error)}`,
          );
          if (this.isAuthenticationError(error)) {
            console.error(
              `Authentication may have failed for site '${siteId}'. Please check credentials.`,
            );
          }
        }
      },
    );
    await Promise.all(connectionPromises);
    this.initialized = true;
    console.log("INFO: Connection tests complete.");
  }

  private isAuthenticationError(error: any): boolean {
    if (error?.response?.status && [401, 403].includes(error.response.status)) {
      return true;
    }
    return error?.code === "WORDPRESS_AUTH_ERROR";
  }

  async run() {
    if (!this.initialized) {
      await this.testClientConnections();
    }
    console.log("INFO: Starting MCP WordPress Server...");
    await this.server.start();
    console.log(
      `INFO: Server started. ${this.tools.length} tools available for ${this.wordpressClients.size} site(s).`,
    );
  }

  async shutdown() {
    console.log("INFO: Shutting down MCP WordPress Server...");
    await this.server.stop();
    console.log("INFO: Server stopped.");
  }
}

// --- Main Execution ---
async function main() {
  try {
    const mcpServer = new MCPWordPressServer();
    await mcpServer.run();

    const shutdown = async () => {
      await mcpServer.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(`FATAL: Failed to start server: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default MCPWordPressServer;
