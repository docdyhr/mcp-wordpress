/**
 * JWT Authentication Implementation
 * Complete JWT authentication with token refresh and RequestManager integration
 */

import type { AuthConfig, RequestOptions } from "@/types/client.js";
import { AuthenticationError } from "@/types/client.js";
import { AUTH_METHODS } from "@/types/wordpress.js";
import { LoggerFactory } from "@/utils/logger.js";
import type { RequestManager } from "./RequestManager.js";

export interface JWTTokenResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
  expires_in?: number;
}

export interface JWTValidateResponse {
  code: string;
  data: {
    status: number;
  };
}

export interface JWTRefreshResponse {
  token: string;
  expires_in?: number;
}

export class JWTAuthImplementation {
  private logger = LoggerFactory.api();
  private jwtToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshTokenValue: string | null = null;
  
  constructor(
    private requestManager: RequestManager,
    private authConfig: AuthConfig
  ) {}

  /**
   * Complete JWT authentication implementation
   */
  async authenticateJWT(): Promise<void> {
    if (!this.authConfig.username || !this.authConfig.password) {
      throw new AuthenticationError("JWT authentication requires username and password", AUTH_METHODS.JWT);
    }

    try {
      this.logger.info("Starting JWT authentication", { 
        username: this.authConfig.username,
        endpoint: "jwt-auth/v1/token"
      });

      const response = await this.requestManager.request<JWTTokenResponse>(
        "POST",
        "jwt-auth/v1/token",
        {
          username: this.authConfig.username,
          password: this.authConfig.password,
        },
        {
          skipAuth: true, // Don't use auth headers for the auth request itself
          timeout: 10000,
        } as RequestOptions & { skipAuth: boolean }
      );

      if (!response.token) {
        throw new AuthenticationError("JWT token not received in response", AUTH_METHODS.JWT);
      }

      // Store the JWT token
      this.jwtToken = response.token;
      
      // Calculate token expiry (default to 24 hours if not provided)
      const expiresInSeconds = response.expires_in || (24 * 60 * 60);
      this.tokenExpiry = Date.now() + (expiresInSeconds * 1000);

      this.logger.info("JWT authentication successful", {
        user: response.user_nicename,
        expiresAt: new Date(this.tokenExpiry).toISOString(),
      });

      // Test the token by validating it
      await this.validateToken();

    } catch (error) {
      this.jwtToken = null;
      this.tokenExpiry = null;
      this.logger.error("JWT authentication failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      if (error instanceof Error) {
        throw new AuthenticationError(`JWT authentication failed: ${error.message}`, AUTH_METHODS.JWT);
      }
      throw new AuthenticationError("JWT authentication failed", AUTH_METHODS.JWT);
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(): Promise<boolean> {
    if (!this.jwtToken) {
      return false;
    }

    try {
      const response = await this.requestManager.request<JWTValidateResponse>(
        "POST",
        "jwt-auth/v1/token/validate",
        {},
        {
          headers: {
            Authorization: `Bearer ${this.jwtToken}`,
          },
          timeout: 5000,
        }
      );

      const isValid = response.data.status === 200;
      
      if (!isValid) {
        this.logger.warn("JWT token validation failed", { response });
        this.jwtToken = null;
        this.tokenExpiry = null;
      }

      return isValid;

    } catch (error) {
      this.logger.warn("JWT token validation error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(): Promise<void> {
    if (!this.jwtToken) {
      throw new AuthenticationError("No JWT token to refresh", AUTH_METHODS.JWT);
    }

    try {
      this.logger.debug("Refreshing JWT token");

      // Some JWT implementations support refresh endpoints
      // First try the refresh endpoint if available
      try {
        const refreshResponse = await this.requestManager.request<JWTRefreshResponse>(
          "POST",
          "jwt-auth/v1/token/refresh",
          {},
          {
            headers: {
              Authorization: `Bearer ${this.jwtToken}`,
            },
            timeout: 5000,
          }
        );

        if (refreshResponse.token) {
          this.jwtToken = refreshResponse.token;
          const expiresInSeconds = refreshResponse.expires_in || (24 * 60 * 60);
          this.tokenExpiry = Date.now() + (expiresInSeconds * 1000);
          
          this.logger.info("JWT token refreshed successfully", {
            expiresAt: new Date(this.tokenExpiry).toISOString(),
          });
          return;
        }
      } catch (_refreshError) {
        this.logger.debug("JWT refresh endpoint not available, falling back to re-authentication");
      }

      // Fallback: Re-authenticate with original credentials
      if (!this.authConfig.username || !this.authConfig.password) {
        throw new AuthenticationError("Cannot refresh JWT token: original credentials not available", AUTH_METHODS.JWT);
      }

      this.logger.debug("Re-authenticating to refresh JWT token");
      await this.authenticateJWT();

    } catch (error) {
      this.jwtToken = null;
      this.tokenExpiry = null;
      this.logger.error("JWT token refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new AuthenticationError(
        `JWT token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AUTH_METHODS.JWT
      );
    }
  }

  /**
   * Check if JWT token is expired
   */
  isTokenExpired(): boolean {
    if (!this.tokenExpiry) {
      return true;
    }
    
    // Consider token expired if it expires within 5 minutes (300000ms)
    const buffer = 5 * 60 * 1000;
    return Date.now() >= (this.tokenExpiry - buffer);
  }

  /**
   * Get current JWT token
   */
  getToken(): string | null {
    return this.jwtToken;
  }

  /**
   * Get token expiry timestamp
   */
  getTokenExpiry(): number | null {
    return this.tokenExpiry;
  }

  /**
   * Clear JWT token and expiry
   */
  clearToken(): void {
    this.jwtToken = null;
    this.tokenExpiry = null;
    this.refreshTokenValue = null;
    this.logger.debug("JWT token cleared");
  }

  /**
   * Get JWT auth headers
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.jwtToken) {
      return {};
    }
    
    return {
      Authorization: `Bearer ${this.jwtToken}`,
    };
  }

  /**
   * Check if we have a valid JWT token
   */
  hasValidToken(): boolean {
    return this.jwtToken !== null && !this.isTokenExpired();
  }

  /**
   * Automatic token refresh if needed
   */
  async ensureValidToken(): Promise<void> {
    if (!this.jwtToken) {
      // No token, need to authenticate
      await this.authenticateJWT();
      return;
    }

    if (this.isTokenExpired()) {
      // Token expired, need to refresh
      await this.refreshToken();
      return;
    }

    // Token is still valid
  }

  /**
   * Logout and invalidate token
   */
  async logout(): Promise<void> {
    if (!this.jwtToken) {
      return;
    }

    try {
      // Try to invalidate the token on the server
      await this.requestManager.request(
        "POST",
        "jwt-auth/v1/token/invalidate",
        {},
        {
          headers: this.getAuthHeaders(),
          timeout: 5000,
        }
      );
      
      this.logger.info("JWT token invalidated on server");
    } catch (error) {
      this.logger.warn("Failed to invalidate JWT token on server", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.clearToken();
  }

  /**
   * Get token information
   */
  getTokenInfo(): {
    hasToken: boolean;
    isExpired: boolean;
    expiresAt: string | null;
    expiresIn: number | null;
  } {
    return {
      hasToken: this.jwtToken !== null,
      isExpired: this.isTokenExpired(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      expiresIn: this.tokenExpiry ? Math.max(0, this.tokenExpiry - Date.now()) : null,
    };
  }
}