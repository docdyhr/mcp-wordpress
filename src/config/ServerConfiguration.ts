import dotenv from "dotenv";
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { WordPressClient } from "../client/api.js";
import { CachedWordPressClient } from "../client/CachedWordPressClient.js";
import { MockWordPressClient } from "../client/MockWordPressClient.js";
import { WordPressClientConfig } from "../types/client.js";
import { getErrorMessage } from "../utils/error.js";
import { LoggerFactory } from "../utils/logger.js";
import { ConfigHelpers } from "./Config.js";
import {
  ConfigurationValidator,
  type SiteType as SiteConfig,
  type MultiSiteConfigType as MultiSiteConfig,
  type McpConfigType,
} from "./ConfigurationSchema.js";

// Re-export types from schema for backward compatibility
export type { SiteConfig, MultiSiteConfig, McpConfigType };

/**
 * Configuration loader for MCP WordPress Server
 * Handles both single-site (environment variables) and multi-site (JSON config) modes
 */
export class ServerConfiguration {
  private static instance: ServerConfiguration;
  private readonly logger = LoggerFactory.server();
  private rootDir: string;
  private envPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.rootDir = path.resolve(__dirname, "../..");
    this.envPath = path.resolve(this.rootDir, ".env");

    // Load environment variables (completely silent for MCP compatibility)
    // Suppress dotenv output that could interfere with JSON-RPC communication
    // eslint-disable-next-line no-console
    const originalConsoleLog = console.log;
    // eslint-disable-next-line no-console
    const originalConsoleError = console.error;
    try {
      // eslint-disable-next-line no-console
      console.log = () => {};
      // eslint-disable-next-line no-console
      console.error = () => {};
      dotenv.config({
        path: this.envPath,
        debug: false,
        override: false,
      });
    } finally {
      // eslint-disable-next-line no-console
      console.log = originalConsoleLog;
      // eslint-disable-next-line no-console
      console.error = originalConsoleError;
    }

    // Debug output for DXT troubleshooting (reduced in DXT mode)
    if (ConfigHelpers.shouldDebug()) {
      this.logger.debug("ServerConfiguration initialized", {
        rootDir: this.rootDir,
        envPath: this.envPath,
        envFileExists: fs.existsSync(this.envPath),
      });
    }
  }

  /**
   * Get singleton instance of ServerConfiguration
   */
  public static getInstance(): ServerConfiguration {
    if (!ServerConfiguration.instance) {
      ServerConfiguration.instance = new ServerConfiguration();
    }
    return ServerConfiguration.instance;
  }

  /**
   * Load WordPress client configurations
   * Returns a Map of site ID to WordPressClient instances
   */
  public async loadClientConfigurations(mcpConfig?: McpConfigType): Promise<{
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  }> {
    const configPath = path.resolve(this.rootDir, "mcp-wordpress.config.json");

    if (fs.existsSync(configPath)) {
      if (ConfigHelpers.shouldLogInfo()) {
        this.logger.info("Found multi-site configuration file", { configPath });
      }
      return await this.loadMultiSiteConfig(configPath);
    } else {
      if (ConfigHelpers.shouldLogInfo()) {
        this.logger.info("Multi-site config not found, using environment variables for single-site mode", {
          configPath,
        });
      }
      return this.loadSingleSiteFromEnv(mcpConfig);
    }
  }

  /**
   * Load multi-site configuration from JSON file
   */
  private async loadMultiSiteConfig(configPath: string): Promise<{
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  }> {
    try {
      const configFile = await fsPromises.readFile(configPath, "utf-8");
      const rawConfig = JSON.parse(configFile);

      // Validate configuration using Zod schema
      const config = ConfigurationValidator.validateMultiSiteConfig(rawConfig);

      const clients = new Map<string, WordPressClient>();
      const validConfigs: SiteConfig[] = [];

      for (const site of config.sites) {
        const clientConfig: WordPressClientConfig = {
          baseUrl: site.config.WORDPRESS_SITE_URL,
          auth: {
            method: site.config.WORDPRESS_AUTH_METHOD || "app-password",
            username: site.config.WORDPRESS_USERNAME,
            appPassword: site.config.WORDPRESS_APP_PASSWORD,
          },
        };

        // Use cached client for better performance
        const client = ConfigHelpers.shouldUseCache()
          ? new CachedWordPressClient(clientConfig, site.id)
          : new WordPressClient(clientConfig);
        clients.set(site.id, client);
        validConfigs.push(site);

        if (ConfigHelpers.shouldLogInfo()) {
          this.logger.info("Initialized site client", {
            siteName: site.name,
            siteId: site.id,
            authMethod: site.config.WORDPRESS_AUTH_METHOD,
          });
        }
      }

      return { clients, configs: validConfigs };
    } catch (_error) {
      this.logger.fatal("Failed to load multi-site configuration", {
        configPath,
        _error: getErrorMessage(_error),
      });
      process.exit(1);
    }
  }

  /**
   * Check if we're in CI environment
   */
  private isCIEnvironment(): boolean {
    return ConfigHelpers.isCI();
  }

  /**
   * Create mock configuration for CI environments
   */
  private createMockConfiguration(): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    const mockConfig = {
      WORDPRESS_SITE_URL: "https://demo.wordpress.com",
      WORDPRESS_USERNAME: "ci-user",
      WORDPRESS_APP_PASSWORD: "ci-mock-password",
      WORDPRESS_AUTH_METHOD: "app-password" as const,
    };

    const clientConfig: WordPressClientConfig = {
      baseUrl: mockConfig.WORDPRESS_SITE_URL,
      auth: {
        method: mockConfig.WORDPRESS_AUTH_METHOD,
        username: mockConfig.WORDPRESS_USERNAME,
        appPassword: mockConfig.WORDPRESS_APP_PASSWORD,
      },
    };

    // Create mock client that won't actually connect to WordPress
    const client = new MockWordPressClient(clientConfig);
    const clients = new Map<string, WordPressClient>();
    clients.set("default", client);

    const siteConfig: SiteConfig = {
      id: "default",
      name: "Demo Site (CI Mode)",
      config: mockConfig,
    };

    this.logger.info("Using mock configuration for CI environment");
    return { clients, configs: [siteConfig] };
  }

  /**
   * Load single-site configuration from environment variables
   */
  private loadSingleSiteFromEnv(mcpConfig?: McpConfigType): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    try {
      // Debug output for DXT troubleshooting (reduced in DXT mode)
      const isDXTMode = process.env.NODE_ENV === "dxt";
      if (!isDXTMode && ConfigHelpers.shouldDebug()) {
        this.logger.debug("Loading single-site configuration from environment", {
          mcpConfigProvided: Boolean(mcpConfig),
          siteUrl: process.env.WORDPRESS_SITE_URL || "NOT SET",
          username: process.env.WORDPRESS_USERNAME || "NOT SET",
          appPasswordSet: Boolean(process.env.WORDPRESS_APP_PASSWORD),
          authMethod: process.env.WORDPRESS_AUTH_METHOD || "NOT SET",
        });
      }

      // Check if we're in CI environment and credentials are missing
      if (this.isCIEnvironment() && !process.env.WORDPRESS_SITE_URL) {
        return this.createMockConfiguration();
      }

      // Validate MCP config if provided
      const validatedMcpConfig = mcpConfig ? ConfigurationValidator.validateMcpConfig(mcpConfig) : undefined;

      // Prepare environment configuration for validation
      const envConfig = {
        WORDPRESS_SITE_URL: validatedMcpConfig?.wordpressSiteUrl || process.env.WORDPRESS_SITE_URL,
        WORDPRESS_USERNAME: validatedMcpConfig?.wordpressUsername || process.env.WORDPRESS_USERNAME,
        WORDPRESS_APP_PASSWORD: validatedMcpConfig?.wordpressAppPassword || process.env.WORDPRESS_APP_PASSWORD,
        WORDPRESS_AUTH_METHOD:
          validatedMcpConfig?.wordpressAuthMethod || process.env.WORDPRESS_AUTH_METHOD || "app-password",
        NODE_ENV: process.env.NODE_ENV,
        DEBUG: process.env.DEBUG,
        DISABLE_CACHE: process.env.DISABLE_CACHE,
        LOG_LEVEL: process.env.LOG_LEVEL,
      };

      if (!isDXTMode && ConfigHelpers.shouldDebug()) {
        this.logger.debug("Final environment configuration for validation", {
          siteUrl: envConfig.WORDPRESS_SITE_URL || "NOT SET",
          username: envConfig.WORDPRESS_USERNAME || "NOT SET",
          appPasswordSet: Boolean(envConfig.WORDPRESS_APP_PASSWORD),
          authMethod: envConfig.WORDPRESS_AUTH_METHOD || "NOT SET",
        });
      }

      // Validate environment configuration using Zod schema
      const validatedConfig = ConfigurationValidator.validateEnvironmentConfig(envConfig);

      const clientConfig: WordPressClientConfig = {
        baseUrl: validatedConfig.WORDPRESS_SITE_URL,
        auth: {
          method: validatedConfig.WORDPRESS_AUTH_METHOD,
          username: validatedConfig.WORDPRESS_USERNAME,
          appPassword: validatedConfig.WORDPRESS_APP_PASSWORD,
        },
      };

      // Use cached client for better performance
      const client =
        process.env.DISABLE_CACHE === "true"
          ? new WordPressClient(clientConfig)
          : new CachedWordPressClient(clientConfig, "default");
      const clients = new Map<string, WordPressClient>();
      clients.set("default", client);

      const siteConfig: SiteConfig = {
        id: "default",
        name: "Default Site",
        config: {
          WORDPRESS_SITE_URL: validatedConfig.WORDPRESS_SITE_URL,
          WORDPRESS_USERNAME: validatedConfig.WORDPRESS_USERNAME,
          WORDPRESS_APP_PASSWORD: validatedConfig.WORDPRESS_APP_PASSWORD,
          WORDPRESS_AUTH_METHOD: validatedConfig.WORDPRESS_AUTH_METHOD,
        },
      };

      if (!isDXTMode) {
        this.logger.info("Initialized default site client in single-site mode");
      }

      return { clients, configs: [siteConfig] };
    } catch (_error) {
      this.logger.error("Configuration validation failed for single-site mode", {
        _error: getErrorMessage(_error),
        suggestion: "Please check your environment variables or MCP configuration",
      });
      return { clients: new Map(), configs: [] };
    }
  }

  /**
   * Get root directory path
   */
  public getRootDir(): string {
    return this.rootDir;
  }
}
