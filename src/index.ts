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
import { getVersion, getDisplayVersion } from "./utils/version.js";

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
      version: getVersion(),
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
      const message = "No WordPress sites configured. Server cannot start.";
      this.logger.fatal(message, {
        expectedEnvVars: ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"],
      });
      throw new Error(message);
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
      version: getDisplayVersion(),
      sites: this.wordpressClients.size,
    });

    // Connect to stdio transport with timeout
    const transport = new StdioServerTransport();

    // Add timeout protection for server connection
    const connectionTimeout = setTimeout(() => {
      throw new Error("Server connection timed out after 30000ms");
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

// Check if running as main module - handle direct execution, DXT, and bin wrapper entry points
const currentFile = fileURLToPath(import.meta.url);
const callerFile = process.argv[1];

const isMainModule =
  callerFile === currentFile ||
  callerFile?.endsWith("/index.js") ||
  callerFile?.endsWith("\\index.js") ||
  callerFile?.endsWith("/mcp-wordpress.js") || // invoked via bin/mcp-wordpress.js wrapper
  callerFile?.endsWith("\\mcp-wordpress.js") ||
  !callerFile; // When run through DXT, process.argv[1] might be undefined

if (isMainModule) {
  main();
}

export default MCPWordPressServer;
export { MCPWordPressServer };
