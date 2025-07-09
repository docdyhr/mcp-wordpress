console.error("DEBUG: MCP WordPress Server module loading started...");

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { WordPressClient } from "./client/api.js";
import {
  ServerConfiguration,
  SiteConfig,
} from "./config/ServerConfiguration.js";
import { ToolRegistry } from "./server/ToolRegistry.js";
import { ConnectionTester } from "./server/ConnectionTester.js";
import { getErrorMessage } from "./utils/error.js";

console.error("DEBUG: All imports completed successfully");

// --- Constants ---
const SERVER_VERSION = "1.1.8"; // Technical debt resolution and modular architecture

// --- Main Server Class ---
class MCPWordPressServer {
  private server: McpServer;
  private wordpressClients: Map<string, WordPressClient> = new Map();
  private initialized: boolean = false;
  private siteConfigs: SiteConfig[] = [];
  private toolRegistry: ToolRegistry;

  constructor(mcpConfig?: any) {
    // Add debugging output for DXT troubleshooting
    console.error("DEBUG: Starting MCP WordPress Server initialization...");
    console.error("DEBUG: Environment variables:");
    console.error(
      `  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? "SET" : "NOT SET"}`,
    );
    console.error(
      `  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? "SET" : "NOT SET"}`,
    );
    console.error(
      `  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? "SET" : "NOT SET"}`,
    );
    console.error(`  Working directory: ${process.cwd()}`);

    this.loadConfiguration(mcpConfig);

    if (this.wordpressClients.size === 0) {
      console.error(
        "ERROR: No WordPress sites were configured. Please check that environment variables are set correctly.",
      );
      console.error("Expected environment variables:");
      console.error("  - WORDPRESS_SITE_URL");
      console.error("  - WORDPRESS_USERNAME");
      console.error("  - WORDPRESS_APP_PASSWORD");
      process.exit(1);
    }

    this.server = new McpServer({
      name: "mcp-wordpress",
      version: SERVER_VERSION,
    });

    this.toolRegistry = new ToolRegistry(this.server, this.wordpressClients);
    this.setupTools();
  }

  private loadConfiguration(mcpConfig?: any) {
    const serverConfig = ServerConfiguration.getInstance();
    const { clients, configs } =
      serverConfig.loadClientConfigurations(mcpConfig);

    this.wordpressClients = clients;
    this.siteConfigs = configs;
  }

  private setupTools() {
    this.toolRegistry.registerAllTools();
  }

  private async testClientConnections(): Promise<void> {
    await ConnectionTester.testClientConnections(this.wordpressClients);
    this.initialized = true;
  }

  async run() {
    if (!this.initialized) {
      await this.testClientConnections();
    }
    console.error("INFO: Starting MCP WordPress Server...");

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(
      `INFO: Server started and connected. Tools available for ${this.wordpressClients.size} site(s).`,
    );

    // Keep the process alive
    process.stdin.resume();
  }

  async shutdown() {
    console.error("INFO: Shutting down MCP WordPress Server...");
    await this.server.close();
    console.error("INFO: Server stopped.");
  }
}

// --- Main Execution ---
async function main() {
  console.error("DEBUG: main() function started");
  console.error(`DEBUG: process.argv: ${JSON.stringify(process.argv)}`);
  console.error(
    `DEBUG: fileURLToPath(import.meta.url): ${fileURLToPath(import.meta.url)}`,
  );

  try {
    console.error("DEBUG: Creating MCPWordPressServer instance...");
    const mcpServer = new MCPWordPressServer();
    console.error("DEBUG: MCPWordPressServer created, calling run()...");
    await mcpServer.run();

    const shutdown = async () => {
      await mcpServer.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(`FATAL: Failed to start server: ${getErrorMessage(error)}`);
    console.error(`FATAL: Error stack: ${(error as Error).stack}`);
    process.exit(1);
  }
}

console.error(
  `DEBUG: Checking if should run main - process.argv[1]: ${process.argv[1]}`,
);
console.error(
  `DEBUG: fileURLToPath(import.meta.url): ${fileURLToPath(import.meta.url)}`,
);

// Check if running as main module - handle both direct execution and DXT entry point
const isMainModule =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith("/index.js") ||
  process.argv[1]?.endsWith("\\index.js") ||
  !process.argv[1]; // When run through DXT, process.argv[1] might be undefined

if (isMainModule) {
  console.error("DEBUG: Running main function...");
  main();
} else {
  console.error(
    "DEBUG: Not running main function - module imported, not executed directly",
  );
}

export default MCPWordPressServer;
export { MCPWordPressServer };
