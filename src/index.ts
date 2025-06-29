import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WordPressClient } from './client/api.js';
import { AuthMethod, WordPressClientConfig } from './types/client.js';
import * as Tools from './tools/index.js';
import { getErrorMessage } from './utils/error.js';
import { z } from 'zod';

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, '.env');
dotenv.config({ path: envPath });

const SERVER_VERSION = '1.1.4'; // Updated version with CI/CD fixes and MCP test improvements

// --- Main Server Class ---
class MCPWordPressServer {
  private server: McpServer;
  // MODIFICATION: Manages multiple WordPress clients, keyed by site ID.
  private wordpressClients: Map<string, WordPressClient> = new Map();
  private initialized: boolean = false;
  // MODIFICATION: Stores the configurations for all loaded sites.
  private siteConfigs: any[] = [];

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

    this.setupTools();
  }

  private loadConfiguration(mcpConfig?: any) {
    const configPath = path.resolve(rootDir, 'mcp-wordpress.config.json');

    if (fs.existsSync(configPath)) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          'INFO: Found mcp-wordpress.config.json, loading multi-site configuration.'
        );
      }
      this.loadMultiSiteConfig(configPath);
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.error(
          'INFO: mcp-wordpress.config.json not found, falling back to environment variables for single-site mode.'
        );
      }
      this.loadSingleSiteFromEnv(mcpConfig);
    }
  }

  private loadMultiSiteConfig(configPath: string) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configFile);

      if (!config.sites || !Array.isArray(config.sites)) {
        throw new Error('Configuration file must have a "sites" array.');
      }

      this.siteConfigs = config.sites;
      for (const site of this.siteConfigs) {
        if (site.id && site.name && site.config) {
          const clientConfig: WordPressClientConfig = {
            baseUrl: site.config.WORDPRESS_SITE_URL,
            auth: {
              method:
                (site.config.WORDPRESS_AUTH_METHOD as AuthMethod) ||
                'app-password',
              username: site.config.WORDPRESS_USERNAME,
              appPassword: site.config.WORDPRESS_APP_PASSWORD
            }
          };
          const client = new WordPressClient(clientConfig);
          this.wordpressClients.set(site.id, client);
          if (process.env.NODE_ENV !== 'test') {
            console.error(
              `INFO: Initialized client for site: ${site.name} (ID: ${site.id})`
            );
          }
        } else {
          console.warn(
            'WARN: Skipping invalid site entry in config. Must have id, name, and config.',
            site
          );
        }
      }
    } catch (error) {
      console.error(
        `FATAL: Error reading or parsing mcp-wordpress.config.json: ${getErrorMessage(error)}`
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
      'app-password') as AuthMethod;

    if (!siteUrl || !username || !password) {
      console.error(
        'ERROR: Missing required credentials for single-site mode.'
      );
      console.error(
        'Please set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables.'
      );
      return;
    }

    const singleSiteConfig: WordPressClientConfig = {
      baseUrl: siteUrl,
      auth: { method: authMethod, username, appPassword: password }
    };
    const client = new WordPressClient(singleSiteConfig);
    this.wordpressClients.set('default', client);
    this.siteConfigs.push({
      id: 'default',
      name: 'Default Site',
      config: singleSiteConfig
    });
    console.error(
      'INFO: Initialized client for default site in single-site mode.'
    );
  }

  private setupTools() {
    // Register all tools from the tools directory
    Object.values(Tools).forEach((ToolClass) => {
      const toolInstance = new ToolClass();
      const tools = toolInstance.getTools();

      tools.forEach((tool) => {
        this.registerTool(tool);
      });
    });
  }

  private registerTool(tool: any) {
    // Create base parameter schema with site parameter
    const baseSchema = {
      site: z
        .string()
        .optional()
        .describe(
          'The ID of the WordPress site to target (from mcp-wordpress.config.json). Required if multiple sites are configured.'
        )
    };

    // Merge with tool-specific parameters
    const parameterSchema =
      tool.parameters?.reduce(
        (schema: any, param: any) => {
          let zodType;

          switch (param.type) {
          case 'string':
            zodType = z.string();
            break;
          case 'number':
            zodType = z.number();
            break;
          case 'boolean':
            zodType = z.boolean();
            break;
          case 'array':
            zodType = z.array(z.string());
            break;
          case 'object':
            zodType = z.record(z.any());
            break;
          default:
            zodType = z.string();
          }

          if (param.description) {
            zodType = zodType.describe(param.description);
          }

          if (!param.required) {
            zodType = zodType.optional();
          }

          schema[param.name] = zodType;
          return schema;
        },
        { ...baseSchema }
      ) || baseSchema;

    // Make site parameter required if multiple sites are configured
    if (this.wordpressClients.size > 1) {
      parameterSchema.site = parameterSchema.site.describe(
        'The ID of the WordPress site to target (from mcp-wordpress.config.json). Required when multiple sites are configured.'
      );
    }

    this.server.tool(
      tool.name,
      tool.description || `WordPress tool: ${tool.name}`,
      parameterSchema,
      async (args: any) => {
        try {
          const siteId = args.site || 'default';
          const client = this.wordpressClients.get(siteId);

          if (!client) {
            const availableSites = Array.from(
              this.wordpressClients.keys()
            ).join(', ');
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: Site with ID '${siteId}' not found. Available sites: ${availableSites}`
                }
              ],
              isError: true
            };
          }

          // Call the tool handler with the client and parameters
          const result = await tool.handler(client, args);

          return {
            content: [
              {
                type: 'text' as const,
                text:
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          if (this.isAuthenticationError(error)) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Authentication failed for site '${args.site || 'default'}'. Please check your credentials.`
                }
              ],
              isError: true
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${getErrorMessage(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  private async testClientConnections(): Promise<void> {
    console.error(
      'INFO: Testing connections to all configured WordPress sites...'
    );
    const connectionPromises = Array.from(this.wordpressClients.entries()).map(
      async ([siteId, client]) => {
        try {
          await client.ping();
          console.error(`SUCCESS: Connection to site '${siteId}' successful.`);
        } catch (error) {
          console.error(
            `ERROR: Failed to connect to site '${siteId}': ${getErrorMessage(error)}`
          );
          if (this.isAuthenticationError(error)) {
            console.error(
              `Authentication may have failed for site '${siteId}'. Please check credentials.`
            );
          }
        }
      }
    );
    await Promise.all(connectionPromises);
    this.initialized = true;
    console.error('INFO: Connection tests complete.');
  }

  private isAuthenticationError(error: any): boolean {
    if (error?.response?.status && [401, 403].includes(error.response.status)) {
      return true;
    }
    return error?.code === 'WORDPRESS_AUTH_ERROR';
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
