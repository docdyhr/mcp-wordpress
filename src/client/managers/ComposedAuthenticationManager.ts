/**
 * Composed Authentication Manager
 * Uses composition instead of inheritance for better flexibility and testability
 */

import type {
  WordPressClientConfig,
  AuthStatus,
  AppPasswordCredentials,
  JwtCredentials,
  BasicCredentials,
} from "@/types/client.js";
import { AuthenticationError } from "@/types/client.js";
import { AUTH_METHODS, type AuthMethod } from "@/types/wordpress.js";
import { debug } from "@/utils/debug.js";

import type {
  ConfigurationProvider,
  ErrorHandler,
  ParameterValidator,
  AuthenticationProvider,
} from "./interfaces/ManagerInterfaces.js";

import { ConfigurationProviderImpl } from "./implementations/ConfigurationProviderImpl.js";
import { ErrorHandlerImpl } from "./implementations/ErrorHandlerImpl.js";
import { ParameterValidatorImpl } from "./implementations/ParameterValidatorImpl.js";

interface AuthenticationDependencies {
  configProvider: ConfigurationProvider;
  errorHandler: ErrorHandler;
  validator: ParameterValidator;
}

export class ComposedAuthenticationManager implements AuthenticationProvider {
  private isAuth: boolean = false;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private lastAuthAttempt: Date | null = null;
  private authMethod: AuthMethod;

  constructor(private dependencies: AuthenticationDependencies) {
    this.authMethod = this.getAuthMethodFromConfig();
    this.validateAuthConfiguration();
  }

  /**
   * Factory method to create ComposedAuthenticationManager with default implementations
   */
  static create(clientConfig: WordPressClientConfig): ComposedAuthenticationManager {
    const configProvider = new ConfigurationProviderImpl(clientConfig);
    const errorHandler = new ErrorHandlerImpl(configProvider);
    const validator = new ParameterValidatorImpl();

    return new ComposedAuthenticationManager({
      configProvider,
      errorHandler,
      validator,
    });
  }

  /**
   * Authenticate with the configured method
   */
  async authenticate(): Promise<boolean> {
    try {
      this.lastAuthAttempt = new Date();

      switch (this.authMethod) {
        case "app-password":
          return await this.authenticateAppPassword();
        case "jwt":
          return await this.authenticateJWT();
        case "basic":
          return await this.authenticateBasic();
        case "api-key":
          return await this.authenticateApiKey();
        default:
          throw new AuthenticationError(`Unsupported authentication method: ${this.authMethod}`, this.authMethod);
      }
    } catch (error) {
      this.isAuth = false;
      this.authToken = null;
      this.dependencies.errorHandler.handleError(error, "authentication");
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    if (!this.isAuth) {
      return false;
    }

    // Check token expiry for JWT
    if (this.authMethod === "jwt" && this.tokenExpiry) {
      if (new Date() > this.tokenExpiry) {
        this.isAuth = false;
        this.authToken = null;
        return false;
      }
    }

    return true;
  }

  /**
   * Get authentication headers for requests
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (this.authMethod) {
      case "app-password":
      case "basic":
        headers.Authorization = this.getBasicAuthHeader();
        break;
      case "jwt":
        if (this.authToken) {
          headers.Authorization = `Bearer ${this.authToken}`;
        }
        break;
      case "api-key":
        const apiKey = this.getApiKeyFromConfig();
        if (apiKey) {
          headers["X-API-Key"] = apiKey;
        }
        break;
    }

    return headers;
  }

  /**
   * Handle authentication failure
   */
  async handleAuthFailure(error: unknown): Promise<boolean> {
    debug.log("Handling authentication failure", { error: String(error), method: this.authMethod });

    this.isAuth = false;
    this.authToken = null;

    // For JWT, try to refresh token
    if (this.authMethod === "jwt") {
      try {
        return await this.refreshJWTToken();
      } catch (_refreshError) {
        // If refresh fails, try full re-authentication
        return await this.authenticate();
      }
    }

    // For other methods, try full re-authentication
    return await this.authenticate();
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): AuthStatus {
    return {
      isAuthenticated: this.isAuthenticated(),
      method: this.authMethod,
      lastAuthAttempt: this.lastAuthAttempt,
      tokenExpiry: this.tokenExpiry,
    };
  }

  /**
   * App Password authentication
   */
  private async authenticateAppPassword(): Promise<boolean> {
    const credentials = this.getAppPasswordCredentials();

    // App passwords are stateless - just validate credentials format
    this.dependencies.validator.validateString(credentials.username, "username", { required: true });
    this.dependencies.validator.validateString(credentials.appPassword, "appPassword", { required: true });

    this.isAuth = true;
    debug.log("App password authentication configured");
    return true;
  }

  /**
   * JWT authentication
   */
  private async authenticateJWT(): Promise<boolean> {
    const credentials = this.getJWTCredentials();
    const tokenEndpoint = "/jwt-auth/v1/token";

    try {
      const response = await fetch(`${this.dependencies.configProvider.config.baseUrl}/wp-json${tokenEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new AuthenticationError(`JWT authentication failed: ${response.statusText}`, "jwt");
      }

      const data = (await response.json()) as { token?: string; expires_in?: number };

      if (!data.token) {
        throw new AuthenticationError("No token received from JWT authentication", "jwt");
      }

      this.authToken = data.token;
      this.isAuth = true;

      // Set token expiry (default to 24 hours if not provided)
      const expiresIn = data.expires_in || 86400; // 24 hours in seconds
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      debug.log("JWT authentication successful", {
        expiresIn,
        expiry: this.tokenExpiry.toISOString(),
      });

      return true;
    } catch (error) {
      throw new AuthenticationError(`JWT authentication failed: ${String(error)}`, "jwt");
    }
  }

  /**
   * Basic authentication
   */
  private async authenticateBasic(): Promise<boolean> {
    const credentials = this.getBasicCredentials();

    this.dependencies.validator.validateString(credentials.username, "username", { required: true });
    this.dependencies.validator.validateString(credentials.password, "password", { required: true });

    this.isAuth = true;
    debug.log("Basic authentication configured");
    return true;
  }

  /**
   * API Key authentication
   */
  private async authenticateApiKey(): Promise<boolean> {
    const apiKey = this.getApiKeyFromConfig();

    this.dependencies.validator.validateString(apiKey, "apiKey", { required: true });

    this.isAuth = true;
    debug.log("API key authentication configured");
    return true;
  }

  /**
   * Refresh JWT token
   */
  private async refreshJWTToken(): Promise<boolean> {
    if (!this.authToken) {
      throw new AuthenticationError("No token to refresh", "jwt");
    }

    const refreshEndpoint = "/jwt-auth/v1/token/validate";

    try {
      const response = await fetch(`${this.dependencies.configProvider.config.baseUrl}/wp-json${refreshEndpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Token is still valid
        debug.log("JWT token validated successfully");
        return true;
      }

      // Token invalid, need to re-authenticate
      this.authToken = null;
      return await this.authenticateJWT();
    } catch (error) {
      throw new AuthenticationError(`JWT token refresh failed: ${String(error)}`, "jwt");
    }
  }

  /**
   * Get Basic auth header
   */
  private getBasicAuthHeader(): string {
    let credentials: { username: string; password?: string; appPassword?: string };

    if (this.authMethod === "app-password") {
      credentials = this.getAppPasswordCredentials();
      const auth = `${credentials.username}:${credentials.appPassword}`;
      return `Basic ${Buffer.from(auth).toString("base64")}`;
    } else {
      credentials = this.getBasicCredentials();
      const auth = `${credentials.username}:${credentials.password}`;
      return `Basic ${Buffer.from(auth).toString("base64")}`;
    }
  }

  /**
   * Extract auth method from configuration
   */
  private getAuthMethodFromConfig(): AuthMethod {
    const authConfig = this.dependencies.configProvider.config.auth;

    if (authConfig.method && Object.values(AUTH_METHODS).includes(authConfig.method as AuthMethod)) {
      return authConfig.method as AuthMethod;
    }

    // Auto-detect based on available credentials
    if (authConfig.appPassword) return "app-password";
    if (authConfig.secret || authConfig.password) return "jwt";
    if (authConfig.apiKey) return "api-key";

    return "basic"; // fallback
  }

  /**
   * Validate authentication configuration
   */
  private validateAuthConfiguration(): void {
    const authConfig = this.dependencies.configProvider.config.auth;

    if (!authConfig) {
      throw new AuthenticationError("No authentication configuration provided", this.authMethod);
    }

    switch (this.authMethod) {
      case "app-password":
        if (!authConfig.username || !authConfig.appPassword) {
          throw new AuthenticationError(
            "App password authentication requires username and appPassword",
            this.authMethod,
          );
        }
        break;
      case "jwt":
        if (!authConfig.username || !authConfig.password) {
          throw new AuthenticationError("JWT authentication requires username and password", this.authMethod);
        }
        break;
      case "basic":
        if (!authConfig.username || !authConfig.password) {
          throw new AuthenticationError("Basic authentication requires username and password", this.authMethod);
        }
        break;
      case "api-key":
        if (!authConfig.apiKey) {
          throw new AuthenticationError("API key authentication requires apiKey", this.authMethod);
        }
        break;
    }
  }

  /**
   * Get app password credentials from config
   */
  private getAppPasswordCredentials(): AppPasswordCredentials {
    const authConfig = this.dependencies.configProvider.config.auth;
    return {
      username: authConfig.username!,
      appPassword: authConfig.appPassword!,
    };
  }

  /**
   * Get JWT credentials from config
   */
  private getJWTCredentials(): JwtCredentials {
    const authConfig = this.dependencies.configProvider.config.auth;
    const credentials: JwtCredentials = {
      username: authConfig.username!,
      password: authConfig.password!,
    };

    if (authConfig.secret) {
      credentials.jwtSecret = authConfig.secret;
    }

    return credentials;
  }

  /**
   * Get basic credentials from config
   */
  private getBasicCredentials(): BasicCredentials {
    const authConfig = this.dependencies.configProvider.config.auth;
    return {
      username: authConfig.username!,
      password: authConfig.password!,
    };
  }

  /**
   * Get API key from config
   */
  private getApiKeyFromConfig(): string {
    const authConfig = this.dependencies.configProvider.config.auth;
    return authConfig.apiKey || "";
  }
}
