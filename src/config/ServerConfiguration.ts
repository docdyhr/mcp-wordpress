import dotenv from "dotenv";
import { promises as fsPromises } from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { WordPressClient } from "@/client/api.js";
import { CachedWordPressClient } from "@/client/CachedWordPressClient.js";
import { MockWordPressClient } from "@/client/MockWordPressClient.js";
import { WordPressClientConfig } from "@/types/client.js";
import { getErrorMessage } from "@/utils/error.js";
import { LoggerFactory } from "@/utils/logger.js";
import { ConfigHelpers } from "./Config.js";
import {
  ConfigurationValidator,
  buildAuthConfig,
  type SiteType as SiteConfig,
  type MultiSiteConfigType as MultiSiteConfig,
  type McpConfigType,
} from "./ConfigurationSchema.js";

// Re-export types from schema for backward compatibility
export type { SiteConfig, MultiSiteConfig, McpConfigType };

export type ConfigFileSource = "env" | "user-config-dir" | "home" | "install-dir";

/**
 * How the last call to loadClientConfigurations() configured the server. Exposed so a tool can report it:
 * the host does not capture an installed extension's stderr, so logging alone cannot tell a user which
 * config file is live.
 */
export interface ConfigLoadInfo {
  mode: "multi-site" | "single-site";
  /** The multi-site file that was loaded (multi-site only). */
  configPath?: string;
  source?: ConfigFileSource;
  siteIds: string[];
  /** Where a multi-site file was looked for and not found (single-site only). */
  searched?: string[];
}

interface ResolvedConfigFile {
  path: string;
  source: ConfigFileSource;
}

/**
 * Configuration loader for MCP WordPress Server
 * Handles both single-site (environment variables) and multi-site (JSON config) modes
 */
export class ServerConfiguration {
  private static instance: ServerConfiguration;
  private readonly logger = LoggerFactory.server();
  private rootDir: string;
  private envPath: string;
  private loadInfo: ConfigLoadInfo | undefined;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.rootDir = path.resolve(__dirname, "../..");
    this.envPath = path.resolve(this.rootDir, ".env");

    // Load environment variables silently. dotenv v17 logs an injection summary to
    // console.log unless quiet:true is set, which would corrupt MCP stdio JSON-RPC.
    const dotenvResult = dotenv.config({
      path: this.envPath,
      debug: false,
      quiet: true,
      override: false,
    });
    if (dotenvResult.error && ConfigHelpers.shouldDebug()) {
      this.logger.debug("dotenv: .env file not loaded", { reason: dotenvResult.error.message });
    }

    // Debug output for DXT troubleshooting (reduced in DXT mode)
    if (ConfigHelpers.shouldDebug()) {
      this.logger.debug("ServerConfiguration initialized", {
        rootDir: this.rootDir,
        envPath: this.envPath,
        // Note: envFileExists check moved to async initialization
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
    const { resolved, searched } = await this.resolveMultiSiteConfigFile();
    if (!resolved) {
      // Opting in to multi-site and then finding no file is almost certainly a misconfiguration (the original
      // symptom: an update wiped the file and the server quietly became single-site). Warn so it is visible
      // even where info-level logging is suppressed.
      if (process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE === "true") {
        this.logger.warn(
          "MCP_WORDPRESS_ALLOW_MULTI_SITE is true but no multi-site config file was found; " +
            "falling back to single-site mode",
          { searched },
        );
      }
      if (ConfigHelpers.shouldLogInfo()) {
        this.logger.info("Multi-site config not found, using environment variables for single-site mode", {
          searched,
        });
      }
      const singleSite = this.loadSingleSiteFromEnv(mcpConfig);
      this.loadInfo = { mode: "single-site", siteIds: singleSite.configs.map((site) => site.id), searched };
      return singleSite;
    }

    const { path: configPath, source } = resolved;
    if (ConfigHelpers.shouldLogInfo()) {
      this.logger.info("Found multi-site configuration file", { configPath, source });
    }

    // Fail closed against accidentally booting a multi-site config (real
    // production credentials for every listed site) just because the file
    // happens to be present — e.g. left over from another checkout, a stray
    // copy, or a misplaced dev config. Requires an explicit opt-in outside
    // CI/test, where the guard would only get in the way of existing suites.
    if (!ConfigHelpers.isCI() && !ConfigHelpers.isTest() && process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE !== "true") {
      const message =
        `Multi-site config file found at ${configPath} but MCP_WORDPRESS_ALLOW_MULTI_SITE is not set to true. ` +
        "Set it to load production sites, or remove/rename the config file to use single-site env config.";
      this.logger.fatal(message, { configPath });
      throw new Error(message);
    }

    // Any failure from here (JSON parse, schema validation, duplicate site
    // IDs, client construction) must stop startup rather than silently
    // falling back to single-site env config — loadMultiSiteConfig() already
    // logs a fatal diagnostic and rethrows.
    const multiSite = await this.loadMultiSiteConfig(configPath, source);
    this.loadInfo = { mode: "multi-site", configPath, source, siteIds: multiSite.configs.map((site) => site.id) };
    return multiSite;
  }

  /**
   * How the server was configured by the most recent load, or undefined before any load.
   */
  public getLoadInfo(): ConfigLoadInfo | undefined {
    return this.loadInfo;
  }

  /**
   * Explicit config path from MCP_WORDPRESS_CONFIG, or undefined when unset.
   *
   * An optional DXT `user_config` field left blank can reach the server as an
   * empty string or as the literal, unresolved `${user_config.config_path}`
   * placeholder — both mean "not set", not a path.
   */
  private readExplicitConfigPath(): string | undefined {
    const raw = process.env.MCP_WORDPRESS_CONFIG?.trim();
    if (!raw || /^\$\{.*\}$/.test(raw)) {
      return undefined;
    }
    if (raw.startsWith("~/") || raw.startsWith("~\\")) {
      return path.join(os.homedir(), raw.slice(2));
    }
    return path.resolve(raw);
  }

  /**
   * Find the multi-site config file. First existing candidate wins:
   *   1. MCP_WORDPRESS_CONFIG (explicit — a missing file is fatal, never a fallback)
   *   2. ~/.config/mcp-wordpress/config.json
   *   3. ~/mcp-wordpress.config.json
   *   4. <install dir>/mcp-wordpress.config.json (legacy)
   *
   * The install dir is replaced on every DXT update, so a config that only
   * lives there silently vanishes and the server degrades to single-site mode;
   * the user-level locations survive updates.
   */
  private async resolveMultiSiteConfigFile(): Promise<{ resolved?: ResolvedConfigFile; searched: string[] }> {
    const homeDir = os.homedir();
    const candidates: ResolvedConfigFile[] = [
      { path: path.join(homeDir, ".config", "mcp-wordpress", "config.json"), source: "user-config-dir" },
      { path: path.join(homeDir, "mcp-wordpress.config.json"), source: "home" },
      { path: path.resolve(this.rootDir, "mcp-wordpress.config.json"), source: "install-dir" },
    ];

    const explicitPath = this.readExplicitConfigPath();
    if (explicitPath) {
      if (!(await this.multiSiteConfigFileExists(explicitPath))) {
        const message =
          `MCP_WORDPRESS_CONFIG points to ${explicitPath}, but that file does not exist. ` +
          "Fix the path, or unset MCP_WORDPRESS_CONFIG to use the default config locations.";
        this.logger.fatal(message, { configPath: explicitPath });
        throw new Error(message);
      }
      await this.warnAboutShadowedConfigs(explicitPath, candidates);
      return { resolved: { path: explicitPath, source: "env" }, searched: [explicitPath] };
    }

    const searched: string[] = [];
    for (const [index, candidate] of candidates.entries()) {
      searched.push(candidate.path);
      if (!(await this.multiSiteConfigFileExists(candidate.path))) {
        continue;
      }

      await this.warnAboutShadowedConfigs(candidate.path, candidates.slice(index + 1));
      return { resolved: candidate, searched };
    }

    return { searched };
  }

  /**
   * Stale copies in several places are a real hazard (which one is live?), so
   * say which file won and which lower-priority ones were ignored. Probing
   * never throws: an unreadable shadowed copy must not break a good startup.
   */
  private async warnAboutShadowedConfigs(used: string, others: ResolvedConfigFile[]): Promise<void> {
    const ignored: string[] = [];
    for (const other of others) {
      if (other.path === used) continue;
      const exists = await fsPromises.access(other.path).then(
        () => true,
        () => false,
      );
      if (exists) ignored.push(other.path);
    }
    if (ignored.length > 0) {
      this.logger.warn("Multiple multi-site config files found; using the first and ignoring the rest", {
        configPath: used,
        ignored,
      });
    }
  }

  /**
   * Returns false only when the multi-site config file is absent (ENOENT).
   * Any other access error (permission denied, etc.) is fatal: it is logged
   * and rethrown so startup fails loudly instead of silently degrading to
   * single-site mode with the wrong site's credentials.
   */
  private async multiSiteConfigFileExists(configPath: string): Promise<boolean> {
    try {
      await fsPromises.access(configPath);
      return true;
    } catch (_error) {
      if ((_error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      const message = `Failed to access multi-site configuration file: ${getErrorMessage(_error)}`;
      this.logger.fatal(message, { configPath });
      throw new Error(message);
    }
  }

  /**
   * Load multi-site configuration from JSON file
   */
  private async loadMultiSiteConfig(
    configPath: string,
    source: ConfigFileSource,
  ): Promise<{
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
          auth: buildAuthConfig(site.config),
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
          });
        }
      }

      if (ConfigHelpers.shouldLogInfo()) {
        this.logger.info("Multi-site configuration loaded", {
          configPath,
          source,
          sitesConfigured: validConfigs.length,
          siteIds: validConfigs.map((site) => site.id),
        });
      }

      return { clients, configs: validConfigs };
    } catch (_error) {
      const message = `Failed to load multi-site configuration: ${getErrorMessage(_error)}`;
      this.logger.fatal(message, { configPath });
      throw new Error(message);
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
          configSource: mcpConfig ? "mcp" : "env",
          hasSiteUrl: Boolean(process.env.WORDPRESS_SITE_URL),
        });
      }

      // Check if we're in CI environment and credentials are missing
      if (this.isCIEnvironment() && !process.env.WORDPRESS_SITE_URL) {
        return this.createMockConfiguration();
      }

      // Validate MCP config if provided
      const validatedMcpConfig = mcpConfig ? ConfigurationValidator.validateMcpConfig(mcpConfig) : undefined;

      // Prepare environment configuration for validation. Every credential
      // field for every supported auth method is forwarded here (not just
      // app-password's) so basic/jwt/api-key configurations set via .env or
      // MCP config actually reach the schema and, from there, the client.
      const envConfig = {
        WORDPRESS_SITE_URL: validatedMcpConfig?.wordpressSiteUrl || process.env.WORDPRESS_SITE_URL,
        WORDPRESS_USERNAME: validatedMcpConfig?.wordpressUsername || process.env.WORDPRESS_USERNAME,
        WORDPRESS_APP_PASSWORD: validatedMcpConfig?.wordpressAppPassword || process.env.WORDPRESS_APP_PASSWORD,
        WORDPRESS_PASSWORD: validatedMcpConfig?.wordpressPassword || process.env.WORDPRESS_PASSWORD,
        WORDPRESS_JWT_SECRET: validatedMcpConfig?.wordpressJwtSecret || process.env.WORDPRESS_JWT_SECRET,
        WORDPRESS_API_KEY: validatedMcpConfig?.wordpressApiKey || process.env.WORDPRESS_API_KEY,
        WORDPRESS_AUTH_METHOD:
          validatedMcpConfig?.wordpressAuthMethod || process.env.WORDPRESS_AUTH_METHOD || "app-password",
        NODE_ENV: process.env.NODE_ENV,
        DEBUG: process.env.DEBUG,
        DISABLE_CACHE: process.env.DISABLE_CACHE,
        LOG_LEVEL: process.env.LOG_LEVEL,
      };

      if (!isDXTMode && ConfigHelpers.shouldDebug()) {
        this.logger.debug("Final environment configuration for validation", {
          configSource: mcpConfig ? "mcp" : "env",
          hasSiteUrl: Boolean(envConfig.WORDPRESS_SITE_URL),
        });
      }

      // Validate environment configuration using Zod schema
      const validatedConfig = ConfigurationValidator.validateEnvironmentConfig(envConfig);

      const clientConfig: WordPressClientConfig = {
        baseUrl: validatedConfig.WORDPRESS_SITE_URL,
        auth: buildAuthConfig(validatedConfig),
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
        config: validatedConfig,
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
