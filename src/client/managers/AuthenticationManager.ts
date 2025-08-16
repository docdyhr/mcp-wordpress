/**
 * Authentication Manager
 * Handles all authentication methods and token management
 */

import type { AuthConfig, AuthMethod, WordPressClientConfig } from "../../types/client.js";
import { AuthenticationError } from "../../types/client.js";
import { config } from "../../config/Config.js";
import { BaseManager } from "./BaseManager.js";
import { debug } from "../../utils/debug.js";

interface AuthManagerConfig extends WordPressClientConfig {
  siteUrl?: string;
  authMethod?: string;
  username?: string;
  appPassword?: string;
  password?: string;
  apiKey?: string;
  jwtSecret?: string;
  jwtToken?: string;
  tokenExpiry?: number;
}

export class AuthenticationManager extends BaseManager {
  private jwtToken: string | null = null;
  private authenticated: boolean = false;
  public config: AuthManagerConfig; // Override the config type for test compatibility

  constructor(config: AuthManagerConfig) {
    // Validate required config fields
    if (!config.siteUrl || config.siteUrl.trim() === "") {
      throw new Error("Site URL is required");
    }

    // Validate site URL format
    try {
      new URL(config.siteUrl);
    } catch {
      throw new Error("Invalid site URL");
    }

    // Validate auth method
    const validMethods = ["app-password", "jwt", "basic", "api-key"];
    if (config.authMethod && !validMethods.includes(config.authMethod)) {
      throw new Error("Invalid authentication method");
    }

    // Transform config to match expected format
    const transformedConfig: WordPressClientConfig = {
      baseUrl: config.siteUrl,
      timeout: config.timeout || 30000,
      auth: {
        method: (config.authMethod || "app-password") as AuthMethod,
        ...(config.username && { username: config.username }),
        ...(config.appPassword && { appPassword: config.appPassword }),
        ...(config.password && { password: config.password }),
        ...(config.apiKey && { apiKey: config.apiKey }),
        ...(config.jwtSecret && { secret: config.jwtSecret }),
      },
    };

    super(transformedConfig);

    // Store original config for test compatibility
    this.config = { ...transformedConfig, ...config };
  }

  /**
   * Get authentication from environment variables
   */
  static getAuthFromEnv(): AuthConfig {
    const cfg = config();
    const wp = cfg.wordpress;
    const method: AuthMethod = (wp.authMethod as AuthMethod) || "app-password";

    switch (method) {
      case "app-password":
        return {
          method: "app-password",
          username: wp.username || "",
          appPassword: wp.appPassword || "",
        };

      case "jwt":
        return {
          method: "jwt",
          username: wp.username || "",
          password: wp.jwtPassword || wp.password || "",
          secret: wp.jwtSecret || "",
        };

      case "basic":
        return {
          method: "basic",
          username: wp.username || "",
          password: wp.password || "",
        };

      case "api-key":
        return {
          method: "api-key",
          apiKey: wp.apiKey || "",
        };

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method as AuthMethod);
    }
  }

  /**
   * Get authentication headers for requests
   */
  getAuthHeaders(): Record<string, string> {
    const method = this.config.authMethod || "app-password";

    switch (method) {
      case "app-password":
        if (!this.config.username || !this.config.appPassword) {
          throw new AuthenticationError("Username and app password are required", method);
        }

        const credentials = Buffer.from(`${this.config.username}:${this.config.appPassword}`).toString("base64");
        return { Authorization: `Basic ${credentials}` };

      case "jwt":
        if (!this.config.jwtToken) {
          throw new AuthenticationError("JWT token is required", method);
        }
        return { Authorization: `Bearer ${this.config.jwtToken}` };

      case "basic":
        if (!this.config.username || !this.config.password) {
          throw new AuthenticationError("Username and password are required", method);
        }

        const basicCredentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
        return { Authorization: `Basic ${basicCredentials}` };

      case "api-key":
        if (!this.config.apiKey) {
          throw new AuthenticationError("API key is required", method);
        }
        return { "X-API-Key": this.config.apiKey };

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method as AuthMethod);
    }
  }

  /**
   * Authenticate using JWT
   */
  private async authenticateJWT(): Promise<void> {
    const auth = this.config.auth;

    if (auth.method !== "jwt" || !auth.username || !auth.password) {
      throw new AuthenticationError("JWT authentication requires username and password", "jwt");
    }

    try {
      // This would need the RequestManager instance to make the request
      // For now, we'll throw an error indicating this needs to be implemented
      throw new AuthenticationError("JWT authentication requires RequestManager integration", "jwt");
    } catch (error) {
      this.handleError(error, "JWT authentication");
    }
  }

  /**
   * Test authentication
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const _headers = await this.getAuthHeaders();
      debug.log("Authentication headers prepared", {
        method: this.config.auth.method,
      });

      // This would need the RequestManager to actually test the connection
      // For now, we'll return true if headers can be generated
      this.authenticated = true;
      return true;
    } catch (error) {
      this.authenticated = false;
      debug.log("Authentication test failed", error);
      return false;
    }
  }

  /**
   * Get authentication status
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Clear authentication state
   */
  clearAuthentication(): void {
    this.jwtToken = null;
    this.authenticated = false;
  }

  /**
   * Validate authentication configuration
   */
  validateAuthConfig(): void {
    const auth = this.config.auth;

    if (!auth.method) {
      throw new AuthenticationError("Authentication method is required", "app-password");
    }

    switch (auth.method) {
      case "app-password":
        if (!auth.username || !auth.appPassword) {
          throw new AuthenticationError(
            "App password authentication requires username and appPassword",
            "app-password",
          );
        }
        break;

      case "jwt":
        if (!auth.username || !auth.password || !auth.secret) {
          throw new AuthenticationError("JWT authentication requires username, password, and secret", "jwt");
        }
        break;

      case "basic":
        if (!auth.username || !auth.password) {
          throw new AuthenticationError("Basic authentication requires username and password", "basic");
        }
        break;

      case "api-key":
        if (!auth.apiKey) {
          throw new AuthenticationError("API key authentication requires apiKey", "api-key");
        }
        break;

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${auth.method}`, auth.method);
    }
  }

  /**
   * Validate credentials for current auth method
   */
  validateCredentials(): void {
    const method = this.config.authMethod || "app-password";

    switch (method) {
      case "app-password":
        if (!this.config.username) {
          throw new Error("Username is required");
        }
        if (!this.config.appPassword) {
          throw new Error("App password is required");
        }
        break;

      case "jwt":
        if (!this.config.jwtToken) {
          throw new Error("JWT token is required");
        }
        break;

      case "basic":
        if (!this.config.username) {
          throw new Error("Username is required");
        }
        if (!this.config.password) {
          throw new Error("Password is required");
        }
        break;

      case "api-key":
        if (!this.config.apiKey) {
          throw new Error("API key is required");
        }
        break;

      default:
        throw new Error(`Invalid authentication method: ${method}`);
    }
  }

  /**
   * Update authentication method and credentials
   */
  updateAuthMethod(method: string, credentials: Record<string, unknown>): void {
    const validMethods = ["app-password", "jwt", "basic", "api-key"];
    if (!validMethods.includes(method)) {
      throw new Error("Invalid authentication method");
    }

    this.config.authMethod = method;

    switch (method) {
      case "app-password":
        if (credentials.username) this.config.username = credentials.username as string;
        if (credentials.appPassword) this.config.appPassword = credentials.appPassword as string;
        break;

      case "jwt":
        if (!credentials.jwtToken) {
          throw new Error("JWT token is required");
        }
        this.config.jwtToken = credentials.jwtToken as string;
        if (credentials.username) this.config.username = credentials.username as string;
        break;

      case "basic":
        if (credentials.username) this.config.username = credentials.username as string;
        if (credentials.password) this.config.password = credentials.password as string;
        break;

      case "api-key":
        if (!credentials.apiKey) {
          throw new Error("API key is required");
        }
        this.config.apiKey = credentials.apiKey as string;
        break;
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(): Promise<void> {
    if (this.config.authMethod !== "jwt") {
      throw new Error("Token refresh not supported for non-JWT authentication methods");
    }

    if (this.refreshJwtToken) {
      const result = await this.refreshJwtToken();
      this.config.jwtToken = result.token;
      if (result.expires_in) {
        this.config.tokenExpiry = Date.now() + result.expires_in * 1000;
      }
    } else {
      throw new Error("JWT refresh functionality not implemented");
    }
  }

  /**
   * Check if JWT token is expired
   */
  isTokenExpired(): boolean {
    if (this.config.authMethod !== "jwt") {
      return false;
    }

    if (!this.config.tokenExpiry) {
      return true;
    }

    return Date.now() >= this.config.tokenExpiry;
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): Record<string, unknown> {
    const method = this.config.authMethod || "app-password";
    const isExpired = this.isTokenExpired();

    const status: Record<string, unknown> = {
      method,
      username: this.config.username,
      isAuthenticated: method === "jwt" ? !isExpired : true,
      tokenExpired: isExpired,
    };

    if (method === "jwt" && this.config.tokenExpiry) {
      status.tokenExpiry = this.config.tokenExpiry;
    }

    return status;
  }

  // Property for JWT refresh function (set by tests)
  refreshJwtToken?: () => Promise<{ token: string; expires_in?: number }>;
}
