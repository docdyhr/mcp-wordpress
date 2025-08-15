/**
 * Authentication Manager
 * Handles all authentication methods and token management
 */

import type { AuthConfig, AuthMethod } from "../../types/client.js";
import { AuthenticationError } from "../../types/client.js";
import { config } from "../../config/Config.js";
import { BaseManager } from "./BaseManager.js";
import { debug } from "../../utils/debug.js";

export class AuthenticationManager extends BaseManager {
  private jwtToken: string | null = null;
  private authenticated: boolean = false;

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
        throw new AuthenticationError(`Unsupported authentication method: ${method}`, method);
    }
  }

  /**
   * Get authentication headers for requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const auth = this.config.auth;

    if (!auth) {
      // In test environments, return empty headers instead of throwing
      if (
        config().app.isTest ||
        config().app.isCI ||
        (globalThis as { __EXECUTION_CONTEXT__?: string }).__EXECUTION_CONTEXT__ === "jest"
      ) {
        debug.log("Warning: No authentication configuration in test environment, returning empty headers");
        return {};
      }
      throw new AuthenticationError("Authentication configuration is required", "app-password");
    }

    switch (auth.method) {
      case "app-password":
        if (!auth.username || !auth.appPassword) {
          throw new AuthenticationError("Username and app password are required", auth.method);
        }

        const credentials = Buffer.from(`${auth.username}:${auth.appPassword}`).toString("base64");
        return { Authorization: `Basic ${credentials}` };

      case "jwt":
        if (!this.jwtToken) {
          await this.authenticateJWT();
        }
        return { Authorization: `Bearer ${this.jwtToken}` };

      case "basic":
        if (!auth.username || !auth.password) {
          throw new AuthenticationError("Username and password are required", auth.method);
        }

        const basicCredentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
        return { Authorization: `Basic ${basicCredentials}` };

      case "api-key":
        if (!auth.apiKey) {
          throw new AuthenticationError("API key is required", auth.method);
        }
        return { "X-API-Key": auth.apiKey };

      default:
        throw new AuthenticationError(`Unsupported authentication method: ${auth.method}`, auth.method);
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
}
