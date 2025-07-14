import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { WordPressClient } from "./client/api.js";
import { ServerConfiguration, SiteConfig } from "./config/ServerConfiguration.js";
import { ToolRegistry } from "./server/ToolRegistry.js";
import { ConnectionTester } from "./server/ConnectionTester.js";
import { getErrorMessage } from "./utils/error.js";

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
    const { clients, configs } = serverConfig.loadClientConfigurations(mcpConfig);

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
    // Skip connection testing in DXT environment to prevent timeouts
    const isDXTMode = process.env.NODE_ENV === "dxt" || process.argv[0]?.includes("dxt-entry");

    if (!this.initialized && !isDXTMode) {
      console.error("INFO: Testing connections to configured WordPress sites...");
      try {
        await this.testClientConnections();
      } catch (error) {
        console.error(`WARNING: Connection test failed: ${getErrorMessage(error)}`);
        console.error("INFO: Continuing with server startup. Tools will be available but connections may fail.");
      }
    } else if (isDXTMode) {
      console.error("INFO: DXT mode detected - skipping connection tests for faster startup");
      this.initialized = true;
    }

    console.error("INFO: Starting MCP WordPress Server...");

    // Connect to stdio transport with timeout
    const transport = new StdioServerTransport();

    // Add timeout protection for server connection
    const connectionTimeout = setTimeout(() => {
      console.error("ERROR: Server connection timed out after 30 seconds");
      process.exit(1);
    }, 30000);

    try {
      await this.server.connect(transport);
      clearTimeout(connectionTimeout);

      console.error(`INFO: Server started and connected. Tools available for ${this.wordpressClients.size} site(s).`);

      // Keep the process alive
      process.stdin.resume();
    } catch (error) {
      clearTimeout(connectionTimeout);
      throw error;
    }
  }

  async shutdown() {
    console.error("INFO: Shutting down MCP WordPress Server...");
    await this.server.close();
    console.error("INFO: Server stopped.");
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

// Check if running as main module - handle both direct execution and DXT entry point
const isMainModule =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith("/index.js") ||
  process.argv[1]?.endsWith("\\index.js") ||
  !process.argv[1]; // When run through DXT, process.argv[1] might be undefined

if (isMainModule) {
  main();
}

export default MCPWordPressServer;
export { MCPWordPressServer };
