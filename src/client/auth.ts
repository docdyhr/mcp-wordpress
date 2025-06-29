/**
 * WordPress Authentication Handler
 * Manages different authentication methods for WordPress REST API
 */

import { logger, debug } from "../utils/debug.js";
import * as http from "http";
import { URL } from "url";
import type {
  IAuthProvider,
  IWordPressClient,
  AuthMethod,
  AuthConfig,
  AuthenticationError,
} from "../types/client.js";
import type { WordPressUser } from "../types/wordpress.js";

export class WordPressAuth {
  private client: IWordPressClient;
  private authType: AuthMethod;

  constructor(client: IWordPressClient) {
    this.client = client;
    this.authType = client.config.auth.method;
  }

  /**
   * Handle authentication based on type
   */
  async authenticate(): Promise<boolean> {
    try {
      switch (this.authType) {
        case "app-password":
          return await this.handleAppPasswordAuth();
        case "jwt":
          return await this.handleJWTAuth();
        case "basic":
          return await this.handleBasicAuth();
        case "api-key":
          return await this.handleAPIKeyAuth();
        case "cookie":
          return await this.handleCookieAuth();
        default:
          throw new Error(`Unsupported authentication type: ${this.authType}`);
      }
    } catch (error) {
      logger.error("Authentication failed:", error);
      throw error;
    }
  }

  /**
   * Handle Application Password authentication
   */
  private async handleAppPasswordAuth(): Promise<boolean> {
    const { username, appPassword } = this.client.config.auth;

    if (!username || !appPassword) {
      throw new Error(
        "Application Password authentication requires WORDPRESS_USERNAME and WORDPRESS_APP_PASSWORD. " +
          "Visit your WordPress admin → Users → Profile → Application Passwords to create one.",
      );
    }

    // Test the credentials by attempting to get current user
    try {
      const user = await this.client.getCurrentUser();
      logger.log(
        `✅ Application Password authentication successful for user: ${user.name} (${user.username})`,
      );
      return true;
    } catch (error) {
      const message =
        "Application Password authentication failed. Please check your credentials and ensure the application password is valid.";
      logger.error(message, error);
      throw new Error(message);
    }
  }

  /**
   * Handle Basic authentication (username + password)
   */
  private async handleBasicAuth(): Promise<boolean> {
    const { username, password } = this.client.config.auth;

    if (!username || !password) {
      throw new Error(
        "Basic authentication requires WORDPRESS_USERNAME and WORDPRESS_PASSWORD",
      );
    }

    try {
      const user = await this.client.getCurrentUser();
      logger.log(
        `✅ Basic authentication successful for user: ${user.name} (${user.username})`,
      );
      return true;
    } catch (error) {
      const message =
        "Basic authentication failed. Please check your username and password.";
      logger.error(message, error);
      throw new Error(message);
    }
  }

  /**
   * Handle JWT authentication
   */
  private async handleJWTAuth(): Promise<boolean> {
    const { username, password, secret } = this.client.config.auth;

    if (!username || !password || !secret) {
      throw new Error(
        "JWT authentication requires WORDPRESS_USERNAME, WORDPRESS_PASSWORD, and WORDPRESS_JWT_SECRET. " +
          "Install and configure the JWT Authentication plugin first.",
      );
    }

    try {
      // The JWT token should be obtained during client authentication
      const user = await this.client.getCurrentUser();
      logger.log(
        `✅ JWT authentication successful for user: ${user.name} (${user.username})`,
      );
      return true;
    } catch (error) {
      const message =
        "JWT authentication failed. Please check your credentials and ensure the JWT plugin is installed and configured.";
      logger.error(message, error);
      throw new Error(message);
    }
  }

  /**
   * Handle API Key authentication
   */
  private async handleAPIKeyAuth(): Promise<boolean> {
    const { apiKey } = this.client.config.auth;

    if (!apiKey) {
      throw new Error("API Key authentication requires WORDPRESS_API_KEY");
    }

    try {
      // Test API key by making a simple request
      await this.client.getSiteInfo();
      logger.log("✅ API Key authentication successful");
      return true;
    } catch (error) {
      const message =
        "API Key authentication failed. Please check your API key.";
      logger.error(message, error);
      throw new Error(message);
    }
  }

  /**
   * Handle Cookie authentication
   */
  private async handleCookieAuth(): Promise<boolean> {
    const { nonce } = this.client.config.auth;

    if (!nonce) {
      logger.warn(
        "Cookie authentication: No nonce provided, authentication may fail for write operations",
      );
    }

    try {
      // Test with a simple read operation
      await this.client.getSiteInfo();
      logger.log(
        "✅ Cookie authentication configured (note: write operations may require valid nonce)",
      );
      return true;
    } catch (error) {
      const message =
        "Cookie authentication failed. Please ensure you are properly logged into WordPress.";
      logger.error(message, error);
      throw new Error(message);
    }
  }

  /**
   * Refresh authentication (for JWT and OAuth)
   */
  async refreshAuth(): Promise<boolean> {
    switch (this.authType) {
      case "jwt":
        return await this.refreshJWTToken();
      default:
        logger.log(`Authentication refresh not supported for ${this.authType}`);
        return true;
    }
  }

  /**
   * Refresh JWT token
   */
  private async refreshJWTToken(): Promise<boolean> {
    try {
      // Re-authenticate to get a new token
      return await this.handleJWTAuth();
    } catch (error) {
      logger.error("Failed to refresh JWT token:", error);
      return false;
    }
  }

  /**
   * Validate current authentication
   */
  async validateAuth(): Promise<boolean> {
    try {
      await this.client.getCurrentUser();
      return true;
    } catch (error) {
      logger.error("Authentication validation failed:", error);
      return false;
    }
  }

  /**
   * Get authentication status information
   */
  async getAuthStatus(): Promise<{
    authenticated: boolean;
    method: AuthMethod;
    user?: WordPressUser;
    error?: string;
  }> {
    try {
      const user = await this.client.getCurrentUser();
      return {
        authenticated: true,
        method: this.authType,
        user,
      };
    } catch (error) {
      return {
        authenticated: false,
        method: this.authType,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Switch authentication method
   */
  async switchAuthMethod(newConfig: AuthConfig): Promise<boolean> {
    // Update client configuration
    (this.client.config as any).auth = newConfig;
    this.authType = newConfig.method;

    // Re-authenticate with new method
    return await this.authenticate();
  }

  /**
   * Start OAuth 2.0 flow (for future implementation)
   */
  async startOAuthFlow(): Promise<{ authUrl: string; state: string }> {
    const { clientId } = this.client.config.auth;

    if (!clientId) {
      throw new Error("OAuth requires client ID");
    }

    const state = this.generateRandomState();
    const redirectUri = "http://localhost:8080/oauth/callback";

    const authUrl = new URL("/oauth/authorize", this.client.config.baseUrl);
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "read write");

    return {
      authUrl: authUrl.toString(),
      state,
    };
  }

  /**
   * Complete OAuth 2.0 flow (for future implementation)
   */
  async completeOAuthFlow(code: string, state: string): Promise<boolean> {
    // This would implement the OAuth token exchange
    // For now, this is a placeholder
    throw new Error("OAuth flow not yet implemented");
  }

  /**
   * Generate random state for OAuth
   */
  private generateRandomState(length = 32): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get authentication headers for the current method
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const auth = this.client.config.auth;

    switch (this.authType) {
      case "app-password":
        if (auth.username && auth.appPassword) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.appPassword}`,
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "basic":
        if (auth.username && auth.password) {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`,
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;

      case "jwt":
        if (auth.token) {
          headers["Authorization"] = `Bearer ${auth.token}`;
        }
        break;

      case "api-key":
        if (auth.apiKey) {
          headers["X-API-Key"] = auth.apiKey;
        }
        break;

      case "cookie":
        if (auth.nonce) {
          headers["X-WP-Nonce"] = auth.nonce;
        }
        break;
    }

    return headers;
  }

  /**
   * Check if authentication method requires additional setup
   */
  requiresSetup(): boolean {
    switch (this.authType) {
      case "jwt":
        return !this.client.config.auth.secret;
      case "api-key":
        return !this.client.config.auth.apiKey;
      case "app-password":
        return (
          !this.client.config.auth.username ||
          !this.client.config.auth.appPassword
        );
      case "basic":
        return (
          !this.client.config.auth.username || !this.client.config.auth.password
        );
      case "cookie":
        return false; // Cookie auth can work without additional setup
      default:
        return true;
    }
  }

  /**
   * Get setup instructions for the current authentication method
   */
  getSetupInstructions(): string {
    switch (this.authType) {
      case "app-password":
        return `
To set up Application Password authentication:
1. Log into your WordPress admin dashboard
2. Go to Users → Profile (or Users → All Users → Edit your user)
3. Scroll down to "Application Passwords" section
4. Enter a name for this application (e.g., "MCP WordPress Server")
5. Click "Add New Application Password"
6. Copy the generated password and set it as WORDPRESS_APP_PASSWORD
7. Set WORDPRESS_USERNAME to your WordPress username
`;

      case "jwt":
        return `
To set up JWT authentication:
1. Install the "JWT Authentication for WP REST API" plugin
2. Add JWT_AUTH_SECRET_KEY to your wp-config.php file
3. Configure the plugin settings
4. Set WORDPRESS_JWT_SECRET environment variable
5. Set WORDPRESS_USERNAME and WORDPRESS_PASSWORD
`;

      case "api-key":
        return `
To set up API Key authentication:
1. Install an API Key plugin (varies by plugin)
2. Generate an API key in the plugin settings
3. Set WORDPRESS_API_KEY environment variable
`;

      case "basic":
        return `
To set up Basic authentication:
1. Set WORDPRESS_USERNAME to your WordPress username
2. Set WORDPRESS_PASSWORD to your WordPress password
Note: This method is less secure than Application Passwords
`;

      case "cookie":
        return `
Cookie authentication is automatically configured when you're logged into WordPress.
For write operations, you may need to set WORDPRESS_COOKIE_NONCE.
`;

      default:
        return "No setup instructions available for this authentication method.";
    }
  }
}

/**
 * Authentication Provider implementations
 */

export class AppPasswordAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = "app-password";

  async authenticate(client: IWordPressClient): Promise<boolean> {
    const auth = new WordPressAuth(client);
    return auth.authenticate();
  }

  addAuthHeaders(headers: Record<string, string>): void {
    // Implementation handled by WordPressAuth
  }
}

export class JWTAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = "jwt";

  async authenticate(client: IWordPressClient): Promise<boolean> {
    const auth = new WordPressAuth(client);
    return auth.authenticate();
  }

  addAuthHeaders(headers: Record<string, string>): void {
    // Implementation handled by WordPressAuth
  }

  async refreshAuth(): Promise<boolean> {
    // JWT token refresh logic
    return true;
  }
}

export class BasicAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = "basic";

  async authenticate(client: IWordPressClient): Promise<boolean> {
    const auth = new WordPressAuth(client);
    return auth.authenticate();
  }

  addAuthHeaders(headers: Record<string, string>): void {
    // Implementation handled by WordPressAuth
  }
}

export class APIKeyAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = "api-key";

  async authenticate(client: IWordPressClient): Promise<boolean> {
    const auth = new WordPressAuth(client);
    return auth.authenticate();
  }

  addAuthHeaders(headers: Record<string, string>): void {
    // Implementation handled by WordPressAuth
  }
}

export class CookieAuthProvider implements IAuthProvider {
  readonly method: AuthMethod = "cookie";

  async authenticate(client: IWordPressClient): Promise<boolean> {
    const auth = new WordPressAuth(client);
    return auth.authenticate();
  }

  addAuthHeaders(headers: Record<string, string>): void {
    // Implementation handled by WordPressAuth
  }
}

/**
 * Factory function to create appropriate auth provider
 */
export function createAuthProvider(method: AuthMethod): IAuthProvider {
  switch (method) {
    case "app-password":
      return new AppPasswordAuthProvider();
    case "jwt":
      return new JWTAuthProvider();
    case "basic":
      return new BasicAuthProvider();
    case "api-key":
      return new APIKeyAuthProvider();
    case "cookie":
      return new CookieAuthProvider();
    default:
      throw new Error(`Unsupported authentication method: ${method}`);
  }
}
