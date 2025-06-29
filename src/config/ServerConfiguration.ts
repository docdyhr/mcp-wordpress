import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WordPressClient } from '../client/api.js';
import { CachedWordPressClient } from '../client/CachedWordPressClient.js';
import { AuthMethod, WordPressClientConfig } from '../types/client.js';
import { getErrorMessage } from '../utils/error.js';

/**
 * Interface for site configuration
 */
export interface SiteConfig {
  id: string;
  name: string;
  config: {
    WORDPRESS_SITE_URL: string;
    WORDPRESS_USERNAME: string;
    WORDPRESS_APP_PASSWORD: string;
    WORDPRESS_AUTH_METHOD?: AuthMethod;
  };
}

/**
 * Interface for multi-site configuration file
 */
export interface MultiSiteConfig {
  sites: SiteConfig[];
}

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
    this.rootDir = path.resolve(__dirname, '../..');
    this.envPath = path.resolve(this.rootDir, '.env');
    
    // Load environment variables
    dotenv.config({ path: this.envPath });
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
  public loadClientConfigurations(mcpConfig?: any): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    const configPath = path.resolve(this.rootDir, 'mcp-wordpress.config.json');
    
    if (fs.existsSync(configPath)) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('INFO: Found mcp-wordpress.config.json, loading multi-site configuration.');
      }
      return this.loadMultiSiteConfig(configPath);
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.error('INFO: mcp-wordpress.config.json not found, falling back to environment variables for single-site mode.');
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
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const config: MultiSiteConfig = JSON.parse(configFile);

      if (!config.sites || !Array.isArray(config.sites)) {
        throw new Error('Configuration file must have a "sites" array.');
      }

      const clients = new Map<string, WordPressClient>();
      const validConfigs: SiteConfig[] = [];

      for (const site of config.sites) {
        if (this.isValidSiteConfig(site)) {
          const clientConfig: WordPressClientConfig = {
            baseUrl: site.config.WORDPRESS_SITE_URL,
            auth: {
              method: site.config.WORDPRESS_AUTH_METHOD || 'app-password',
              username: site.config.WORDPRESS_USERNAME,
              appPassword: site.config.WORDPRESS_APP_PASSWORD
            }
          };
          
          // Use cached client for better performance
          const client = process.env.DISABLE_CACHE === 'true' 
            ? new WordPressClient(clientConfig)
            : new CachedWordPressClient(clientConfig, site.id);
          clients.set(site.id, client);
          validConfigs.push(site);
          
          if (process.env.NODE_ENV !== 'test') {
            console.error(`INFO: Initialized client for site: ${site.name} (ID: ${site.id})`);
          }
        } else {
          console.warn('WARN: Skipping invalid site entry in config. Must have id, name, and config.', site);
        }
      }

      return { clients, configs: validConfigs };
    } catch (error) {
      console.error(`FATAL: Error reading or parsing mcp-wordpress.config.json: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  }

  /**
   * Load single-site configuration from environment variables
   */
  private loadSingleSiteFromEnv(mcpConfig?: any): {
    clients: Map<string, WordPressClient>;
    configs: SiteConfig[];
  } {
    const siteUrl = mcpConfig?.wordpressSiteUrl || process.env.WORDPRESS_SITE_URL;
    const username = mcpConfig?.wordpressUsername || process.env.WORDPRESS_USERNAME;
    const password = mcpConfig?.wordpressAppPassword || process.env.WORDPRESS_APP_PASSWORD;
    const authMethod = (mcpConfig?.wordpressAuthMethod || 
      process.env.WORDPRESS_AUTH_METHOD || 
      'app-password') as AuthMethod;

    if (!siteUrl || !username || !password) {
      console.error('ERROR: Missing required credentials for single-site mode.');
      console.error('Please set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables.');
      return { clients: new Map(), configs: [] };
    }

    const clientConfig: WordPressClientConfig = {
      baseUrl: siteUrl,
      auth: { method: authMethod, username, appPassword: password }
    };
    
    // Use cached client for better performance
    const client = process.env.DISABLE_CACHE === 'true'
      ? new WordPressClient(clientConfig)
      : new CachedWordPressClient(clientConfig, 'default');
    const clients = new Map<string, WordPressClient>();
    clients.set('default', client);

    const siteConfig: SiteConfig = {
      id: 'default',
      name: 'Default Site',
      config: {
        WORDPRESS_SITE_URL: siteUrl,
        WORDPRESS_USERNAME: username,
        WORDPRESS_APP_PASSWORD: password,
        WORDPRESS_AUTH_METHOD: authMethod
      }
    };

    console.error('INFO: Initialized client for default site in single-site mode.');
    
    return { clients, configs: [siteConfig] };
  }

  /**
   * Validate site configuration structure
   */
  private isValidSiteConfig(site: any): site is SiteConfig {
    return site && 
           typeof site.id === 'string' && 
           typeof site.name === 'string' && 
           site.config && 
           typeof site.config.WORDPRESS_SITE_URL === 'string' &&
           typeof site.config.WORDPRESS_USERNAME === 'string' &&
           typeof site.config.WORDPRESS_APP_PASSWORD === 'string';
  }

  /**
   * Get root directory path
   */
  public getRootDir(): string {
    return this.rootDir;
  }
}
