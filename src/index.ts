import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { WordPressClient } from "./client/api.js";
import { ServerConfiguration, SiteConfig } from "./config/ServerConfiguration.js";
import { ToolRegistry } from "./server/ToolRegistry.js";
import { ConnectionTester } from "./server/ConnectionTester.js";
import { getErrorMessage } from "./utils/error.js";
import { LoggerFactory } from "./utils/logger.js";
import { ConfigHelpers } from "./config/Config.js";
import { McpConfigType } from "./config/ServerConfiguration.js";

// --- Constants ---
const SERVER_VERSION = "1.1.8"; // Technical debt resolution and modular architecture

// --- Main Server Class ---
class MCPWordPressServer {
  private server: McpServer;
  private wordpressClients: Map<string, WordPressClient> = new Map();
  private initialized: boolean = false;
  private siteConfigs: SiteConfig[] = [];
  private toolRegistry!: ToolRegistry;
  private logger = LoggerFactory.server();

  constructor(private mcpConfig?: McpConfigType) {
    // Server initialization will happen in run() method
    this.server = new McpServer({
      name: "mcp-wordpress",
      version: SERVER_VERSION,
    });
  }

  private async loadConfiguration(mcpConfig?: McpConfigType) {
    const serverConfig = ServerConfiguration.getInstance();
    const { clients, configs } = await serverConfig.loadClientConfigurations(mcpConfig);

    this.wordpressClients = clients;
    this.siteConfigs = configs;
  }

  private setupTools() {
    this.toolRegistry.registerAllTools();
  }

  private async testClientConnections(): Promise<void> {
    // Use optimized connection testing with timeouts and concurrency control
    await ConnectionTester.testClientConnections(this.wordpressClients, {
      timeout: ConfigHelpers.getTimeout("test"),
      maxConcurrent: ConfigHelpers.isCI() ? 2 : 3, // Reduce concurrency in CI
    });
    this.initialized = true;
  }

  async run() {
    // Load configuration asynchronously
    await this.loadConfiguration(this.mcpConfig);

    if (this.wordpressClients.size === 0) {
      // In test environments, don't exit the process
      if (
        ConfigHelpers.isCI() ||
        ConfigHelpers.isTest() ||
        (globalThis as Record<string, unknown>).__EXECUTION_CONTEXT__ === "jest"
      ) {
        this.logger.warn("No WordPress sites configured in test environment");
        // Create a dummy client for testing
        this.wordpressClients.set("test", {} as WordPressClient);
      } else {
        this.logger.fatal("No WordPress sites configured. Server cannot start.", {
          expectedEnvVars: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"],
        });
        process.exit(1);
      }
    }

    this.toolRegistry = new ToolRegistry(this.server, this.wordpressClients);
    this.setupTools();

    // Skip connection testing in DXT environment to prevent timeouts
    const isDXTMode = ConfigHelpers.isDXT() || process.argv[0]?.includes("dxt-entry");

    if (!this.initialized && !isDXTMode) {
      this.logger.info("Testing connections to configured WordPress sites...", {
        siteCount: this.wordpressClients.size,
      });
      try {
        await this.testClientConnections();
      } catch (_error) {
        this.logger.warn("Connection test failed - continuing with server startup", {
          _error: getErrorMessage(_error),
        });
      }
    } else if (isDXTMode) {
      this.logger.info("DXT mode detected - skipping connection tests for faster startup");
      this.initialized = true;
    }

    this.logger.info("Starting MCP WordPress Server...", {
      version: SERVER_VERSION,
      sites: this.wordpressClients.size,
    });

    // Connect to stdio transport with timeout
    const transport = new StdioServerTransport();

    // Add timeout protection for server connection
    const connectionTimeout = setTimeout(() => {
      this.logger.fatal("Server connection timed out", { timeoutMs: 30000 });
      process.exit(1);
    }, 30000);

    try {
      await this.server.connect(transport);
      clearTimeout(connectionTimeout);

      this.logger.info("Server started and connected successfully", {
        sites: this.wordpressClients.size,
      });

      // Keep the process alive
      process.stdin.resume();
    } catch (_error) {
      clearTimeout(connectionTimeout);
      throw _error;
    }
  }

  async shutdown() {
    this.logger.info("Shutting down MCP WordPress Server...");
    await this.server.close();
    this.logger.info("Server stopped");
  }
}

// --- Main Execution ---
async function main() {
  const mainLogger = LoggerFactory.server();

  try {
    const mcpServer = new MCPWordPressServer();
    await mcpServer.run();

    const shutdown = async () => {
      await mcpServer.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (_error) {
    mainLogger.fatal("Failed to start server", { _error: getErrorMessage(_error) });
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
