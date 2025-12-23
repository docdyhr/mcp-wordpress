/**
 * HTTP Request Manager
 * Handles all HTTP operations, rate limiting, and retries
 */

// Use native fetch in Node.js 18+
import type { HTTPMethod, RequestOptions, ClientStats, WordPressClientConfig } from "@/types/client.js";
import { WordPressAPIError, RateLimitError } from "@/types/client.js";
import { config } from "@/config/Config.js";
import { BaseManager } from "./BaseManager.js";
import { AuthenticationManager } from "./AuthenticationManager.js";
import { debug, startTimer } from "@/utils/debug.js";
import { getUserAgent } from "@/utils/version.js";

export class RequestManager extends BaseManager {
  private stats: ClientStats;
  private lastRequestTime: number = 0;
  private requestInterval: number;
  private authManager: AuthenticationManager;

  constructor(clientConfig: WordPressClientConfig, authManager: AuthenticationManager) {
    super(clientConfig);

    this.authManager = authManager;
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
   * Make HTTP request with retry logic and rate limiting
   */
  async request<T>(method: HTTPMethod, endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const timer = startTimer();

    try {
      await this.enforceRateLimit();

      const response = await this.makeRequestWithRetry(method, endpoint, data, options);

      this.stats.successfulRequests++;
      this.updateAverageResponseTime(timer.end());

      return response as T;
    } catch (_error) {
      this.stats.failedRequests++;
      this.handleError(_error, `${method} ${endpoint}`);
    } finally {
      this.stats.totalRequests++;
    }
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    method: HTTPMethod,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    let lastError: unknown;
    const maxRetries = options.retries ?? this.config.maxRetries ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest<T>(method, endpoint, data, options);
      } catch (error: unknown) {
        lastError = error;

        // Type guard for error-like objects
        const isErrorLike = (err: unknown): err is { statusCode?: number; message?: string } => {
          return typeof err === "object" && err !== null;
        };

        // Don't retry on authentication errors or client errors
        if ((isErrorLike(error) && error.statusCode && error.statusCode < 500) || attempt === maxRetries) {
          throw error;
        }

        const errorMessage = isErrorLike(error) && error.message ? error.message : String(error);
        debug.log(`Request failed (attempt ${attempt}/${maxRetries}):`, errorMessage);

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Make single HTTP request
   */
  private async makeRequest<T>(
    method: HTTPMethod,
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const timeout = options.timeout ?? this.config.timeout ?? 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Get authentication headers
      const authHeaders = await this.authManager.getAuthHeaders();

      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": getUserAgent(),
          ...authHeaders, // Add auth headers before custom headers
          ...options.headers,
        },
        signal: controller.signal,
      };

      if (data && method !== "GET") {
        if (
          data instanceof FormData ||
          (typeof data === "object" &&
            "append" in data &&
            typeof (data as Record<string, unknown>).append === "function")
        ) {
          // For FormData, don't set Content-Type (let fetch set it with boundary)
          const headers = fetchOptions.headers as Record<string, string>;
          if ("Content-Type" in headers) {
            delete headers["Content-Type"];
          }
          fetchOptions.body = data as FormData;
        } else if (Buffer.isBuffer(data)) {
          // For Buffer data, keep Content-Type from headers
          fetchOptions.body = data;
        } else if (typeof data === "string") {
          fetchOptions.body = data;
        } else {
          fetchOptions.body = JSON.stringify(data);
        }
      }

      debug.log(`API Request: ${method} ${url}`);

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const responseData = await response.json();
      return responseData as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: Record<string, unknown> = {};

    try {
      const jsonData = await response.json();
      if (typeof jsonData === "object" && jsonData !== null) {
        errorData = jsonData as Record<string, unknown>;
      }
    } catch {
      // Ignore JSON parsing errors
    }

    const message =
      (typeof errorData.message === "string" ? errorData.message : undefined) ||
      `HTTP ${response.status}: ${response.statusText}`;
    const code = (typeof errorData.code === "string" ? errorData.code : undefined) || "http_error";

    if (response.status === 429) {
      this.stats.rateLimitHits++;
      throw new RateLimitError(message, Date.now() + 60000); // Retry after 1 minute
    }

    if (response.status === 401 || response.status === 403) {
      this.stats.authFailures++;
    }

    throw new WordPressAPIError(message, response.status, code, errorData);
  }

  /**
   * Build full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const apiBase = "/wp-json/wp/v2";
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    return `${baseUrl}${apiBase}${cleanEndpoint}`;
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.stats.successfulRequests;
    const currentAverage = this.stats.averageResponseTime;

    this.stats.averageResponseTime = (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Get request statistics
   */
  getStats(): ClientStats {
    return { ...this.stats };
  }
}
