import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { WordPressClient } from "../client/api.js";
import { CachedWordPressClient } from "../client/CachedWordPressClient.js";
import { MockWordPressClient } from "../client/MockWordPressClient.js";
import { WordPressClientConfig } from "../types/client.js";
import { getErrorMessage } from "../utils/error.js";
import {
  ConfigurationValidator,
  type SiteType as SiteConfig,
  type MultiSiteConfigType as MultiSiteConfig,
  type McpConfigType,
} from "./ConfigurationSchema.js";

// Re-export types from schema for backward compatibility
export type { SiteConfig, MultiSiteConfig };

/**
 * Configuration loader for MCP WordPress Server
 * Handles both single-site (environment variables) and multi-site (JSON config) modes
 */
export class ServerConfiguration {
  private static instance: ServerConfiguration;
  private rootDir: string;
  private envPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.rootDir = path.resolve(__dirname, "../..");
    this.envPath = path.resolve(this.rootDir, ".env");

    // Load environment variables
    dotenv.config({ path: this.envPath });

    // Debug output for DXT troubleshooting (reduced in DXT mode)
    const isDXTMode = process.env.NODE_ENV === "dxt";
    if (!isDXTMode && process.env.DEBUG === "true") {
      console.error("DEBUG: ServerConfiguration initialized");
      console.error(`DEBUG: Root directory: ${this.rootDir}`);
      console.error(`DEBUG: Environment file path: ${this.envPath}`);
      console.error(`DEBUG: Environment file exists: ${fs.existsSync(this.envPath)}`);
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
  public loadClientConfigurations(mcpConfig?: McpConfigType): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    const configPath = path.resolve(this.rootDir, "mcp-wordpress.config.json");

    if (fs.existsSync(configPath)) {
      if (process.env.NODE_ENV !== "test") {
        console.error("INFO: Found mcp-wordpress.config.json, loading multi-site configuration.");
      }
      return this.loadMultiSiteConfig(configPath);
    } else {
      if (process.env.NODE_ENV !== "test") {
        console.error(
          "INFO: mcp-wordpress.config.json not found, falling back to environment variables for single-site mode.",
        );
      }
      return this.loadSingleSiteFromEnv(mcpConfig);
    }
  }

  /**
   * Load multi-site configuration from JSON file
   */
  private loadMultiSiteConfig(configPath: string): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    try {
      const configFile = fs.readFileSync(configPath, "utf-8");
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
        const client =
          process.env.DISABLE_CACHE === "true"
            ? new WordPressClient(clientConfig)
            : new CachedWordPressClient(clientConfig, site.id);
        clients.set(site.id, client);
        validConfigs.push(site);

        if (process.env.NODE_ENV !== "test") {
          console.error(`INFO: Initialized client for site: ${site.name} (ID: ${site.id})`);
        }
      }

      return { clients, configs: validConfigs };
    } catch (error) {
      console.error(`FATAL: Error reading or parsing mcp-wordpress.config.json: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  }

  /**
   * Check if we're in CI environment
   */
  private isCIEnvironment(): boolean {
    return (
      process.env.CI === "true" ||
      process.env.NODE_ENV === "ci" ||
      process.env.NODE_ENV === "test" ||
      process.env.GITHUB_ACTIONS === "true" ||
      process.env.TRAVIS === "true" ||
      process.env.CIRCLECI === "true"
    );
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

    console.error("INFO: Using mock configuration for CI environment.");
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
      if (!isDXTMode) {
        console.error("DEBUG: loadSingleSiteFromEnv called");
        console.error(`DEBUG: mcpConfig provided: ${mcpConfig ? "YES" : "NO"}`);
        console.error("DEBUG: Current environment variables:");
        console.error(`  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL || "NOT SET"}`);
        console.error(`  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME || "NOT SET"}`);
        console.error(`  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? "SET" : "NOT SET"}`);
        console.error(`  WORDPRESS_AUTH_METHOD: ${process.env.WORDPRESS_AUTH_METHOD || "NOT SET"}`);
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

      if (!isDXTMode) {
        console.error("DEBUG: Final envConfig for validation:");
        console.error(`  WORDPRESS_SITE_URL: ${envConfig.WORDPRESS_SITE_URL || "NOT SET"}`);
        console.error(`  WORDPRESS_USERNAME: ${envConfig.WORDPRESS_USERNAME || "NOT SET"}`);
        console.error(`  WORDPRESS_APP_PASSWORD: ${envConfig.WORDPRESS_APP_PASSWORD ? "SET" : "NOT SET"}`);
        console.error(`  WORDPRESS_AUTH_METHOD: ${envConfig.WORDPRESS_AUTH_METHOD || "NOT SET"}`);
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
        console.error("INFO: Initialized client for default site in single-site mode.");
      }

      return { clients, configs: [siteConfig] };
    } catch (error) {
      console.error("ERROR: Configuration validation failed for single-site mode.");
      console.error(`Details: ${getErrorMessage(error)}`);
      console.error("Please check your environment variables or MCP configuration.");
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
