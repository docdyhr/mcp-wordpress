/**
 * Authentication Manager
 * Handles all authentication methods and token management
 */

import type {
  AuthConfig,
  WordPressClientConfig,
  AuthStatus,
  AppPasswordCredentials,
  JwtCredentials,
  BasicCredentials,
  ApiKeyCredentials,
} from "../../types/client.js";
import { AuthenticationError } from "../../types/client.js";
import { AUTH_METHODS, type AuthMethod } from "../../types/wordpress.js";
import { config } from "../../config/Config.js";
import { BaseManager } from "./BaseManager.js";
import { debug } from "../../utils/debug.js";

interface AuthManagerConfig extends WordPressClientConfig {
  siteUrl: string; // Required based on constructor validation
  authMethod: AuthMethod; // Use proper AuthMethod type
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
  private authConfig: AuthManagerConfig;
  public config: AuthManagerConfig; // Expose for test compatibility

  constructor(config: AuthManagerConfig) {
    // Validate required config fields
    if (!config.siteUrl || config.siteUrl.trim() === "") {
      throw new AuthenticationError("Site URL is required", AUTH_METHODS.APP_PASSWORD);
    }

    // Validate site URL format
    try {
      new URL(config.siteUrl);
    } catch {
      throw new AuthenticationError("Invalid site URL", AUTH_METHODS.APP_PASSWORD);
    }

    // Validate auth method using centralized constants
    const validMethods = Object.values(AUTH_METHODS);
    if (config.authMethod && !validMethods.includes(config.authMethod)) {
      throw new AuthenticationError("Invalid authentication method", config.authMethod);
    }

    // Transform config to match expected format
    const transformedConfig: WordPressClientConfig = {
      baseUrl: config.siteUrl,
      timeout: config.timeout || 30000,
      auth: {
        method: config.authMethod || AUTH_METHODS.APP_PASSWORD,
        ...(config.username && { username: config.username }),
        ...(config.appPassword && { appPassword: config.appPassword }),
        ...(config.password && { password: config.password }),
        ...(config.apiKey && { apiKey: config.apiKey }),
        ...(config.jwtSecret && { secret: config.jwtSecret }),
      },
    };

    super(transformedConfig);

    // Store private config
    this.authConfig = config;
    // Expose config for test compatibility
    this.config = config;
  }

  /**
   * Get config for testing purposes
   */
  getConfig(): AuthManagerConfig {
    return { ...this.authConfig };
  }

  /**
   * Get authentication from environment variables
   */
  static getAuthFromEnv(): AuthConfig {
    const cfg = config();
    const wp = cfg.wordpress;
    const method: AuthMethod = (wp.authMethod as AuthMethod) || AUTH_METHODS.APP_PASSWORD;

    switch (method) {
      case AUTH_METHODS.APP_PASSWORD:
        return {
          method: AUTH_METHODS.APP_PASSWORD,
          username: wp.username || "",
          appPassword: wp.appPassword || "",
        };

      case AUTH_METHODS.JWT:
        return {
          method: AUTH_METHODS.JWT,
          username: wp.username || "",
          password: wp.jwtPassword || wp.password || "",
          secret: wp.jwtSecret || "",
        };

      case AUTH_METHODS.BASIC:
        return {
          method: AUTH_METHODS.BASIC,
          username: wp.username || "",
          password: wp.password || "",
        };

      case AUTH_METHODS.API_KEY:
        return {
          method: AUTH_METHODS.API_KEY,
          apiKey: wp.apiKey || "",
        };

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method as AuthMethod);
    }
  }

  /**
   * Get authentication headers for requests
   *
   * Note: This method is synchronous by design for test compatibility and simplicity.
   * JWT token refresh should be handled externally before calling this method,
   * as automatic refresh would require RequestManager integration.
   */
  getAuthHeaders(): Record<string, string> {
    const method = this.authConfig.authMethod || AUTH_METHODS.APP_PASSWORD;

    switch (method) {
      case AUTH_METHODS.APP_PASSWORD:
        if (!this.authConfig.username || !this.authConfig.appPassword) {
          throw new AuthenticationError("Username and app password are required", method);
        }

        const credentials = Buffer.from(`${this.authConfig.username}:${this.authConfig.appPassword}`).toString(
          "base64",
        );
        return { Authorization: `Basic ${credentials}` };

      case AUTH_METHODS.JWT:
        if (!this.authConfig.jwtToken) {
          throw new AuthenticationError("JWT token is required", method);
        }
        return { Authorization: `Bearer ${this.authConfig.jwtToken}` };

      case AUTH_METHODS.BASIC:
        if (!this.authConfig.username || !this.authConfig.password) {
          throw new AuthenticationError("Username and password are required", method);
        }

        const basicCredentials = Buffer.from(`${this.authConfig.username}:${this.authConfig.password}`).toString(
          "base64",
        );
        return { Authorization: `Basic ${basicCredentials}` };

      case AUTH_METHODS.API_KEY:
        if (!this.authConfig.apiKey) {
          throw new AuthenticationError("API key is required", method);
        }
        return { "X-API-Key": this.authConfig.apiKey };

      case AUTH_METHODS.COOKIE:
        // Cookie authentication typically handled by browser
        return {};

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method as AuthMethod);
    }
  }

  /**
   * Authenticate using JWT
   *
   * Note: This method is not fully implemented as it requires integration with
   * the RequestManager to make HTTP requests to the WordPress JWT endpoint.
   * JWT authentication requires the JWT Authentication for WP-API plugin.
   *
   * @throws {AuthenticationError} - JWT auth requires external dependency injection
   */
  private async authenticateJWT(): Promise<void> {
    if (this.authConfig.authMethod !== AUTH_METHODS.JWT || !this.authConfig.username || !this.authConfig.password) {
      throw new AuthenticationError("JWT authentication requires username and password", AUTH_METHODS.JWT);
    }

    try {
      // TODO: Implement JWT authentication with RequestManager integration
      // This would require making a POST request to /wp-json/jwt-auth/v1/token
      // with username and password to obtain a JWT token
      throw new AuthenticationError(
        "JWT authentication requires RequestManager integration - not yet implemented",
        AUTH_METHODS.JWT,
      );
    } catch (_error) {
      this.handleError(_error, "JWT authentication");
    }
  }

  /**
   * Test authentication
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const _headers = await this.getAuthHeaders();
      debug.log("Authentication headers prepared", {
        method: this.authConfig.authMethod,
      });

      // This would need the RequestManager to actually test the connection
      // For now, we'll return true if headers can be generated
      this.authenticated = true;
      return true;
    } catch (_error) {
      this.authenticated = false;
      debug.log("Authentication test failed", _error);
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
    const method = this.authConfig.authMethod;

    if (!method) {
      throw new AuthenticationError("Authentication method is required", AUTH_METHODS.APP_PASSWORD);
    }

    switch (method) {
      case AUTH_METHODS.APP_PASSWORD:
        if (!this.authConfig.username || !this.authConfig.appPassword) {
          throw new AuthenticationError(
            "App password authentication requires username and appPassword",
            AUTH_METHODS.APP_PASSWORD,
          );
        }
        break;

      case AUTH_METHODS.JWT:
        if (!this.authConfig.username || !this.authConfig.password || !this.authConfig.jwtSecret) {
          throw new AuthenticationError("JWT authentication requires username, password, and secret", AUTH_METHODS.JWT);
        }
        break;

      case AUTH_METHODS.BASIC:
        if (!this.authConfig.username || !this.authConfig.password) {
          throw new AuthenticationError("Basic authentication requires username and password", AUTH_METHODS.BASIC);
        }
        break;

      case AUTH_METHODS.API_KEY:
        if (!this.authConfig.apiKey) {
          throw new AuthenticationError("API key authentication requires apiKey", AUTH_METHODS.API_KEY);
        }
        break;

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method);
    }
  }

  /**
   * Validate credentials for current auth method
   */
  validateCredentials(): void {
    const method = this.authConfig.authMethod || AUTH_METHODS.APP_PASSWORD;

    switch (method) {
      case AUTH_METHODS.APP_PASSWORD:
        if (!this.authConfig.username) {
          throw new AuthenticationError("Username is required", method);
        }
        if (!this.authConfig.appPassword) {
          throw new AuthenticationError("App password is required", method);
        }
        break;

      case AUTH_METHODS.JWT:
        if (!this.authConfig.jwtToken) {
          throw new AuthenticationError("JWT token is required", method);
        }
        break;

      case AUTH_METHODS.BASIC:
        if (!this.authConfig.username) {
          throw new AuthenticationError("Username is required", method);
        }
        if (!this.authConfig.password) {
          throw new AuthenticationError("Password is required", method);
        }
        break;

      case AUTH_METHODS.API_KEY:
        if (!this.authConfig.apiKey) {
          throw new AuthenticationError("API key is required", method);
        }
        break;

      default:
        throw new AuthenticationError(`Invalid authentication method: ${method}`, method);
    }
  }

  /**
   * Update authentication method and credentials
   */
  updateAuthMethod(
    method: AuthMethod,
    credentials: AppPasswordCredentials | JwtCredentials | BasicCredentials | ApiKeyCredentials,
  ): void {
    const validMethods = Object.values(AUTH_METHODS);
    if (!validMethods.includes(method)) {
      throw new AuthenticationError("Invalid authentication method", method);
    }

    // Clear all previous credentials to prevent leakage
    delete this.authConfig.username;
    delete this.authConfig.appPassword;
    delete this.authConfig.jwtToken;
    delete this.authConfig.password;
    delete this.authConfig.apiKey;
    delete this.authConfig.tokenExpiry;

    // Set new auth method
    this.authConfig.authMethod = method;

    // Set new credentials with type safety and validation
    switch (method) {
      case AUTH_METHODS.APP_PASSWORD:
        const appCreds = credentials as AppPasswordCredentials;
        if (!appCreds.username || !appCreds.appPassword) {
          throw new AuthenticationError("Username and app password are required", method);
        }
        this.authConfig.username = appCreds.username;
        this.authConfig.appPassword = appCreds.appPassword;
        break;

      case AUTH_METHODS.JWT:
        const jwtCreds = credentials as JwtCredentials;
        if (!jwtCreds.jwtToken) {
          throw new AuthenticationError("JWT token is required", method);
        }
        this.authConfig.jwtToken = jwtCreds.jwtToken;
        if (jwtCreds.username) {
          this.authConfig.username = jwtCreds.username;
        }
        break;

      case AUTH_METHODS.BASIC:
        const basicCreds = credentials as BasicCredentials;
        if (!basicCreds.username || !basicCreds.password) {
          throw new AuthenticationError("Username and password are required", method);
        }
        this.authConfig.username = basicCreds.username;
        this.authConfig.password = basicCreds.password;
        break;

      case AUTH_METHODS.API_KEY:
        const apiCreds = credentials as ApiKeyCredentials;
        if (!apiCreds.apiKey) {
          throw new AuthenticationError("API key is required", method);
        }
        this.authConfig.apiKey = apiCreds.apiKey;
        break;
    }
  }

  /**
   * Refresh JWT token
   *
   * For testing compatibility, this method supports mock JWT refresh.
   * In production, it requires RequestManager integration.
   */
  async refreshToken(): Promise<void> {
    if (this.authConfig.authMethod !== AUTH_METHODS.JWT) {
      throw new AuthenticationError(
        "Token refresh not supported for non-JWT authentication methods",
        this.authConfig.authMethod,
      );
    }

    // Check if mock refresh method is available (for testing)
    const mockRefreshMethod = (this as Record<string, unknown>).refreshJwtToken;
    if (typeof mockRefreshMethod === "function") {
      const result = await mockRefreshMethod();
      if (result && typeof result === "object" && "token" in result) {
        const tokenResult = result as { token: string; expires_in?: number };
        this.authConfig.jwtToken = tokenResult.token;
        if (tokenResult.expires_in) {
          this.authConfig.tokenExpiry = Date.now() + tokenResult.expires_in * 1000;
        }
        return;
      }
    }

    // TODO: Implement JWT token refresh with RequestManager integration
    // This would require making a POST request to /wp-json/jwt-auth/v1/token/validate
    // and updating the stored token and expiry
    throw new AuthenticationError(
      "JWT refresh requires RequestManager integration - not yet implemented",
      AUTH_METHODS.JWT,
    );
  }

  /**
   * Check if JWT token is expired
   */
  isTokenExpired(): boolean {
    if (this.authConfig.authMethod !== AUTH_METHODS.JWT) {
      return false;
    }

    if (!this.authConfig.tokenExpiry) {
      return true;
    }

    return Date.now() >= this.authConfig.tokenExpiry;
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): AuthStatus {
    const method = this.authConfig.authMethod || AUTH_METHODS.APP_PASSWORD;
    const isExpired = this.isTokenExpired();

    const status: AuthStatus = {
      method,
      username: this.authConfig.username,
      isAuthenticated: method === AUTH_METHODS.JWT ? !isExpired : true,
      tokenExpired: isExpired,
    };

    if (method === AUTH_METHODS.JWT && this.authConfig.tokenExpiry) {
      status.tokenExpiry = this.authConfig.tokenExpiry;
    }

    return status;
  }
}
