import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'url';
import { WordPressClient } from './client/api.js';
import { ServerConfiguration, SiteConfig } from './config/ServerConfiguration.js';
import { ToolRegistry } from './server/ToolRegistry.js';
import { ConnectionTester } from './server/ConnectionTester.js';
import { getErrorMessage } from './utils/error.js';

// --- Constants ---
const SERVER_VERSION = '1.1.8'; // Technical debt resolution and modular architecture

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
        'No WordPress sites were configured. Please create mcp-wordpress.config.json or set environment variables.'
      );
      process.exit(1);
    }

    this.server = new McpServer({
      name: 'mcp-wordpress',
      version: SERVER_VERSION
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
    if (!this.initialized) {
      await this.testClientConnections();
    }
    console.error('INFO: Starting MCP WordPress Server...');

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error(
      `INFO: Server started and connected. Tools available for ${this.wordpressClients.size} site(s).`
    );
  }

  async shutdown() {
    console.error('INFO: Shutting down MCP WordPress Server...');
    await this.server.close();
    console.error('INFO: Server stopped.');
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

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error(`FATAL: Failed to start server: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default MCPWordPressServer;
export { MCPWordPressServer };
