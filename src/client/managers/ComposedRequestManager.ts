/**
 * Composed Request Manager
 * Uses composition instead of inheritance for better testability and flexibility
 */

import type { HTTPMethod, RequestOptions, ClientStats, WordPressClientConfig } from "@/types/client.js";
import { WordPressAPIError, RateLimitError } from "@/types/client.js";
import { config } from "@/config/Config.js";
import { debug, startTimer } from "@/utils/debug.js";

import type { 
  ComposedManager, 
  ConfigurationProvider, 
  ErrorHandler, 
  ParameterValidator,
  AuthenticationProvider,
  RequestHandler
} from "./interfaces/ManagerInterfaces.js";

import { ConfigurationProviderImpl } from "./implementations/ConfigurationProviderImpl.js";
import { ErrorHandlerImpl } from "./implementations/ErrorHandlerImpl.js";
import { ParameterValidatorImpl } from "./implementations/ParameterValidatorImpl.js";

interface ComposedRequestManagerDependencies {
  configProvider: ConfigurationProvider;
  errorHandler: ErrorHandler;
  validator: ParameterValidator;
  authProvider: AuthenticationProvider;
}

export class ComposedRequestManager implements RequestHandler {
  private stats: ClientStats;
  private lastRequestTime: number = 0;
  private requestInterval: number;
  private initialized: boolean = false;

  constructor(private dependencies: ComposedRequestManagerDependencies) {
    this.requestInterval = 60000 / config().security.rateLimit;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0,
      errors: 0,
    };
  }

  /**
   * Factory method to create ComposedRequestManager with default implementations
   */
  static create(clientConfig: WordPressClientConfig, authProvider: AuthenticationProvider): ComposedRequestManager {
    const configProvider = new ConfigurationProviderImpl(clientConfig);
    const errorHandler = new ErrorHandlerImpl(configProvider);
    const validator = new ParameterValidatorImpl();

    return new ComposedRequestManager({
      configProvider,
      errorHandler,
      validator,
      authProvider,
    });
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Validate configuration
      if (!this.dependencies.configProvider.config.baseUrl) {
        throw new Error("Base URL is required");
      }
      
      // Ensure authentication is ready
      await this.dependencies.authProvider.authenticate();
      
      this.initialized = true;
    } catch (error) {
      this.dependencies.errorHandler.handleError(error, "initialize request manager");
    }
  }

  /**
   * Make HTTP request with retry logic and rate limiting
   */
  async request<T>(method: HTTPMethod, endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    this.ensureInitialized();
    
    const timer = startTimer();
    this.stats.totalRequests++;

    try {
      // Validate inputs
      this.dependencies.validator.validateString(method, "method", { required: true });
      this.dependencies.validator.validateString(endpoint, "endpoint", { required: true });

      await this.enforceRateLimit();

      const response = await this.makeRequestWithRetry(method, endpoint, data, options);

      this.stats.successfulRequests++;
      this.updateAverageResponseTime(timer.end());

      this.dependencies.errorHandler.logSuccess(`${method} ${endpoint}`, { responseTime: timer.end() });

      return response as T;
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.errors++;
      
      if (error instanceof RateLimitError) {
        this.stats.rateLimitHits++;
      }

      this.dependencies.errorHandler.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Get request statistics
   */
  getStats(): ClientStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0,
      errors: 0,
    };
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    method: HTTPMethod, 
    endpoint: string, 
    data?: unknown, 
    options: RequestOptions = {},
    attempt: number = 1
  ): Promise<T> {
    const maxRetries = 3; // Use default retries for composed manager
    
    try {
      return await this.makeRequest<T>(method, endpoint, data, options);
    } catch (error) {
      if (attempt <= maxRetries && this.shouldRetry(error)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry<T>(method, endpoint, data, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Make actual HTTP request
   */
  private async makeRequest<T>(method: HTTPMethod, endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = await this.buildRequestOptions(method, data, options);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      return await response.json() as T;
    }

    return (await response.text()) as unknown as T;
  }

  /**
   * Build full URL for request
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.dependencies.configProvider.config.baseUrl;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${cleanBase}/wp-json${cleanEndpoint}`;
  }

  /**
   * Build request options with authentication
   */
  private async buildRequestOptions(method: HTTPMethod, data?: unknown, options: RequestOptions = {}): Promise<RequestInit> {
    const authHeaders = this.dependencies.authProvider.getAuthHeaders();
    const timeout = this.dependencies.configProvider.config.timeout || 30000;

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "MCP-WordPress/2.0",
      ...authHeaders,
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout 
        ? AbortSignal.timeout(timeout) 
        : null,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      requestOptions.body = JSON.stringify(data);
    }

    return requestOptions;
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(response: Response): Promise<never> {
    const statusCode = response.status;
    
    if (statusCode === 401) {
      this.stats.authFailures++;
      
      // Try to refresh authentication
      try {
        await this.dependencies.authProvider.handleAuthFailure(new Error(`HTTP ${statusCode}`));
        // If refresh succeeds, the caller should retry
        throw new WordPressAPIError("Authentication refreshed, retry needed", 401, "auth_refreshed");
      } catch (authError) {
        throw new WordPressAPIError("Authentication failed", 401, "auth_failed");
      }
    }

    if (statusCode === 429) {
      const retryAfter = response.headers.get("retry-after");
      const delay = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new RateLimitError("Rate limit exceeded", delay);
    }

    let errorMessage = `HTTP ${statusCode}: ${response.statusText}`;
    
    try {
      const errorBody = await response.json() as { message?: string };
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore JSON parsing errors for non-JSON error responses
    }

    throw new WordPressAPIError(errorMessage, statusCode, "http_error");
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof WordPressAPIError) {
      const nonRetryableCodes = [400, 401, 403, 404];
      return !nonRetryableCodes.includes(error.statusCode || 500);
    }

    if (error instanceof Error) {
      const retryableErrors = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"];
      return retryableErrors.some(code => error.message.includes(code));
    }

    return false;
  }

  /**
   * Update average response time with new measurement
   */
  private updateAverageResponseTime(newTime: number): void {
    const total = this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + newTime;
    this.stats.averageResponseTime = Math.round(total / this.stats.successfulRequests);
  }

  /**
   * Ensure manager is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("ComposedRequestManager not initialized. Call initialize() first.");
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Cleanup any resources, timers, etc.
    this.initialized = false;
  }
}