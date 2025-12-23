/**
 * Authentication Manager
 * Handles all authentication methods for WordPress REST API
 */

import type { WordPressClient } from "@/client/api.js";
import type { AuthConfig, AuthMethod } from "@/types/client.js";
import { AuthenticationError } from "@/types/client.js";
import { LoggerFactory } from "@/utils/logger.js";

export interface JWTToken {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
  expiresAt: number;
}

export class AuthManager {
  private logger = LoggerFactory.api();
  private jwtToken?: JWTToken;

  constructor(
    private client: WordPressClient,
    private authConfig: AuthConfig,
  ) {}

  /**
   * Authenticate using the configured method
   */
  async authenticate(): Promise<boolean> {
    this.logger.info("Authenticating with method", { method: this.authConfig.method });

    try {
      switch (this.authConfig.method) {
        case "app-password":
          return this.authenticateWithAppPassword();
        case "jwt":
          return this.authenticateWithJWT();
        case "basic":
          return this.authenticateWithBasic();
        case "cookie":
          return this.authenticateWithCookie();
        case "api-key":
          return this.authenticateWithAPIKey();
        default:
          throw new AuthenticationError(
            `Unsupported authentication method: ${this.authConfig.method}`,
            this.authConfig.method,
          );
      }
    } catch (error) {
      this.logger.error("Authentication failed", {
        method: this.authConfig.method,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current authentication headers
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.authConfig.method) {
      case "app-password":
      case "basic":
        if (this.authConfig.username && this.authConfig.appPassword) {
          const credentials = Buffer.from(`${this.authConfig.username}:${this.authConfig.appPassword}`).toString(
            "base64",
          );
          headers.Authorization = `Basic ${credentials}`;
        }
        break;

      case "jwt":
        if (this.jwtToken && !this.isTokenExpired()) {
          headers.Authorization = `Bearer ${this.jwtToken.token}`;
        }
        break;

      case "api-key":
        if (this.authConfig.apiKey) {
          headers["X-API-Key"] = this.authConfig.apiKey;
        }
        break;

      case "cookie":
        // Cookie authentication is handled by the browser/client
        // Headers are set automatically after successful login
        break;
    }

    return headers;
  }

  /**
   * JWT authentication
   */
  private async authenticateWithJWT(): Promise<boolean> {
    if (!this.authConfig.username || !this.authConfig.password) {
      throw new AuthenticationError(
        "Username and password are required for JWT authentication",
        this.authConfig.method,
      );
    }

    try {
      const response = await this.client.post<{
        token: string;
        user_email: string;
        user_nicename: string;
        user_display_name: string;
      }>("jwt-auth/v1/token", {
        username: this.authConfig.username,
        password: this.authConfig.password,
      });

      if (!response.token) {
        throw new AuthenticationError("JWT token not received", this.authConfig.method);
      }

      // Calculate expiration time (typically 24 hours for JWT)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      this.jwtToken = {
        token: response.token,
        user_email: response.user_email,
        user_nicename: response.user_nicename,
        user_display_name: response.user_display_name,
        expiresAt,
      };

      this.logger.info("JWT authentication successful", {
        user: response.user_nicename,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new AuthenticationError(`JWT authentication failed: ${error.message}`, this.authConfig.method);
      }
      throw new AuthenticationError("JWT authentication failed", this.authConfig.method);
    }
  }

  private authenticateWithAppPassword(): boolean {
    if (!this.authConfig.username || !this.authConfig.appPassword) {
      throw new AuthenticationError("Username and app password are required", this.authConfig.method);
    }
    return true;
  }

  private authenticateWithBasic(): boolean {
    if (!this.authConfig.username || !this.authConfig.password) {
      throw new AuthenticationError("Username and password are required", this.authConfig.method);
    }
    return true;
  }

  private async authenticateWithCookie(): Promise<boolean> {
    throw new AuthenticationError("Cookie authentication not implemented", this.authConfig.method);
  }

  private authenticateWithAPIKey(): boolean {
    if (!this.authConfig.apiKey) {
      throw new AuthenticationError("API key is required", this.authConfig.method);
    }
    return true;
  }

  private isTokenExpired(): boolean {
    if (!this.jwtToken) return true;
    return Date.now() > this.jwtToken.expiresAt;
  }

  getAuthMethod(): AuthMethod {
    return this.authConfig.method;
  }
}
