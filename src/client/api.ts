/**
 * WordPress API Client
 * Handles all REST API communication with WordPress
 *
 * This module has been refactored to use a modular architecture with
 * domain-specific operations extracted into separate modules under ./operations/
 */

// Use native fetch in Node.js 18+
import FormData from "form-data";
import { getUserAgent } from "@/utils/version.js";
import type {
  IWordPressClient,
  WordPressClientConfig,
  AuthConfig,
  AuthMethod,
  HTTPMethod,
  RequestOptions,
  ClientStats,
} from "@/types/client.js";
import { WordPressAPIError, AuthenticationError, RateLimitError } from "@/types/client.js";
import { config } from "@/config/Config.js";
import type {
  WordPressPost,
  WordPressPage,
  WordPressMedia,
  WordPressUser,
  WordPressComment,
  WordPressCategory,
  WordPressTag,
  WordPressSiteSettings,
  WordPressApplicationPassword,
  PostQueryParams,
  MediaQueryParams,
  UserQueryParams,
  CommentQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagRequest,
  UpdateTagRequest,
  UploadMediaRequest,
  UpdateMediaRequest,
  WordPressSiteInfo,
  WordPressSearchResult,
} from "@/types/wordpress.js";
import { debug, logError, startTimer } from "@/utils/debug.js";
import type { QueuedRequest } from "@/types/requests.js";

// Import domain-specific operations
import { PostsOperations } from "./operations/posts.js";
import { PagesOperations } from "./operations/pages.js";
import { MediaOperations } from "./operations/media.js";
import { UsersOperations } from "./operations/users.js";
import { CommentsOperations } from "./operations/comments.js";
import { TaxonomiesOperations } from "./operations/taxonomies.js";
import { SiteOperations } from "./operations/site.js";

/**
 * WordPress REST API Client
 *
 * A comprehensive client for interacting with the WordPress REST API v2.
 * Provides full CRUD operations for posts, pages, media, users, comments,
 * categories, tags, and site settings with robust error handling and performance optimization.
 *
 * Features:
 * - Multiple authentication methods (App Passwords, JWT, Basic Auth, API Key)
 * - Automatic retry logic with exponential backoff
 * - Request rate limiting and queue management
 * - Comprehensive error handling with detailed messages
 * - Performance monitoring and request statistics
 * - Caching support for improved performance
 * - Multi-site configuration support
 * - Modular architecture with domain-specific operations
 *
 * @example
 * ```typescript
 * // Initialize with app password authentication
 * const client = new WordPressClient({
 *   baseUrl: 'https://mysite.com',
 *   auth: {
 *     method: 'app-password',
 *     username: 'admin',
 *     password: 'xxxx xxxx xxxx xxxx xxxx xxxx'
 *   }
 * });
 *
 * // Create a new post
 * const post = await client.createPost({
 *   title: 'My New Post',
 *   content: '<p>This is the content</p>',
 *   status: 'publish'
 * });
 *
 * // List posts with filtering
 * const posts = await client.getPosts({
 *   search: 'WordPress',
 *   status: 'publish',
 *   per_page: 10
 * });
 * ```
 *
 * @since 1.0.0
 * @author MCP WordPress Team
 * @implements {IWordPressClient}
 */
export class WordPressClient implements IWordPressClient {
  private baseUrl: string;
  private apiUrl: string;
  private timeout: number;
  private maxRetries: number;
  private auth: AuthConfig;
  private requestQueue: QueuedRequest[] = [];
  private lastRequestTime: number = 0;
  private requestInterval: number;
  private authenticated: boolean = false;
  private jwtToken: string | null = null;
  private _stats: ClientStats;

  // Domain-specific operation handlers
  private readonly postsOps: PostsOperations;
  private readonly pagesOps: PagesOperations;
  private readonly mediaOps: MediaOperations;
  private readonly usersOps: UsersOperations;
  private readonly commentsOps: CommentsOperations;
  private readonly taxonomiesOps: TaxonomiesOperations;
  private readonly siteOps: SiteOperations;

  /**
   * Creates a new WordPress API client instance.
   *
   * Initializes the client with configuration options for connecting to a WordPress site.
   * Supports multiple authentication methods and automatic environment variable detection.
   *
   * @param {Partial<WordPressClientConfig>} [options={}] - Configuration options for the client
   * @param {string} [options.baseUrl] - WordPress site URL (falls back to WORDPRESS_SITE_URL env var)
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   * @param {number} [options.maxRetries=3] - Maximum number of retry attempts for failed requests
   * @param {AuthConfig} [options.auth] - Authentication configuration (auto-detected from env if not provided)
   * @param {boolean} [options.enableCache=true] - Whether to enable response caching
   * @param {number} [options.cacheMaxAge=300000] - Cache max age in milliseconds (5 minutes default)
   *
   * @throws {Error} When required configuration is missing or invalid
   *
   * @since 1.0.0
   */
  constructor(options: Partial<WordPressClientConfig> = {}) {
    const cfg = config();
    const baseUrl = options.baseUrl || cfg.wordpress.siteUrl || "";

    // Validate and sanitize base URL
    this.baseUrl = this.validateAndSanitizeUrl(baseUrl);
    this.apiUrl = "";
    this.timeout = options.timeout || cfg.wordpress.timeout;
    this.maxRetries = options.maxRetries || cfg.wordpress.maxRetries;

    // Authentication configuration
    if (options.auth) {
      // If auth is provided but without method, infer it
      if (!options.auth.method) {
        const auth = options.auth as AuthConfig & {
          username?: string;
          appPassword?: string;
          password?: string;
          secret?: string;
          apiKey?: string;
        };
        if (auth.username && auth.appPassword) {
          this.auth = { ...auth, method: "app-password" };
        } else if (auth.username && auth.password && auth.secret) {
          this.auth = { ...auth, method: "jwt" };
        } else if (auth.username && auth.password) {
          this.auth = { ...auth, method: "basic" };
        } else if (auth.apiKey) {
          this.auth = { ...auth, method: "api-key" };
        } else {
          this.auth = { ...auth, method: "app-password" }; // default
        }
      } else {
        this.auth = options.auth;
      }
    } else {
      this.auth = this.getAuthFromEnv();
    }

    // Rate limiting
    this.requestInterval = 60000 / cfg.security.rateLimit;

    // Initialize stats
    this._stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0,
      errors: 0,
    };

    // Validate configuration
    this.validateConfig();

    // Initialize domain-specific operations with this client as the base
    this.postsOps = new PostsOperations(this);
    this.pagesOps = new PagesOperations(this);
    this.mediaOps = new MediaOperations(this);
    this.usersOps = new UsersOperations(this);
    this.commentsOps = new CommentsOperations(this);
    this.taxonomiesOps = new TaxonomiesOperations(this);
    this.siteOps = new SiteOperations(this);
  }

  get config(): WordPressClientConfig {
    return {
      baseUrl: this.baseUrl,
      auth: this.auth,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    };
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  get stats(): ClientStats {
    return { ...this._stats };
  }

  getSiteUrl(): string {
    return this.baseUrl;
  }

  /**
   * Validate and sanitize URL for security
   */
  private validateAndSanitizeUrl(url: string): string {
    if (!url) {
      throw new Error("WordPress site URL is required");
    }

    try {
      const parsed = new URL(url);

      // Only allow HTTP/HTTPS protocols
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP and HTTPS protocols are allowed");
      }

      // Prevent localhost/private IP access in production
      if (config().app.isProduction) {
        const hostname = parsed.hostname.toLowerCase();
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1" ||
          hostname.match(/^10\./) ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) ||
          hostname.match(/^192\.168\./)
        ) {
          throw new Error("Private/localhost URLs not allowed in production");
        }
      }

      // Return clean URL without query parameters or fragments
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
    } catch (_error) {
      if (_error instanceof TypeError) {
        throw new Error("Invalid WordPress site URL format");
      }
      throw _error;
    }
  }

  private getAuthFromEnv(): AuthConfig {
    const cfg = config();
    const wp = cfg.wordpress;
    const authMethod = wp.authMethod as AuthMethod;

    // Use explicit auth method if set
    if (authMethod === "app-password" && wp.username && wp.appPassword) {
      return {
        method: "app-password",
        username: wp.username,
        appPassword: wp.appPassword,
      };
    }

    // Try Application Password first (fallback)
    if (wp.username && wp.appPassword) {
      return {
        method: "app-password",
        username: wp.username,
        appPassword: wp.appPassword,
      };
    }

    // Try JWT
    if (wp.jwtSecret && wp.username && wp.password) {
      return {
        method: "jwt",
        secret: wp.jwtSecret,
        username: wp.username,
        password: wp.password,
      };
    }

    // Try API Key
    if (wp.apiKey) {
      return {
        method: "api-key",
        apiKey: wp.apiKey,
      };
    }

    // Try Cookie
    if (wp.cookieNonce) {
      return {
        method: "cookie",
        nonce: wp.cookieNonce,
      };
    }

    // Default to basic authentication
    return {
      method: "basic",
      username: wp.username || "",
      password: wp.password || wp.appPassword || "",
    };
  }

  private validateConfig(): void {
    if (!this.baseUrl) {
      throw new Error("WordPress configuration is incomplete: baseUrl is required");
    }

    // Ensure URL doesn't end with slash and add API path
    this.baseUrl = this.baseUrl.replace(/\/$/, "");
    this.apiUrl = `${this.baseUrl}/wp-json/wp/v2`;

    debug.log(`WordPress API Client initialized for: ${this.apiUrl}`);
  }

  async initialize(): Promise<void> {
    await this.authenticate();
  }

  async disconnect(): Promise<void> {
    this.authenticated = false;
    this.jwtToken = null;
    debug.log("WordPress client disconnected");
  }

  /**
   * Add authentication headers to request
   */
  private addAuthHeaders(headers: Record<string, string>): void {
    const method = this.auth.method?.toLowerCase() as AuthMethod;

    switch (method) {
      case "app-password":
        if (this.auth.username && this.auth.appPassword) {
          const credentials = Buffer.from(`${this.auth.username}:${this.auth.appPassword}`).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;
      case "basic":
        if (this.auth.username && this.auth.password) {
          const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
        break;

      case "jwt":
        if (this.jwtToken) {
          headers["Authorization"] = `Bearer ${this.jwtToken}`;
        }
        break;

      case "api-key":
        if (this.auth.apiKey) {
          headers["X-API-Key"] = this.auth.apiKey;
        }
        break;

      case "cookie":
        if (this.auth.nonce) {
          headers["X-WP-Nonce"] = this.auth.nonce;
        }
        break;
    }
  }

  /**
   * Rate limiting implementation
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await this.delay(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async authenticate(): Promise<boolean> {
    const method = this.auth.method?.toLowerCase() as AuthMethod;

    try {
      switch (method) {
        case "app-password":
        case "basic":
          return await this.authenticateWithBasic();
        case "jwt":
          return await this.authenticateWithJWT();
        case "cookie":
          return await this.authenticateWithCookie();
        case "api-key":
          // API key auth doesn't require separate authentication step
          this.authenticated = true;
          return true;
        default:
          throw new Error(`Unsupported authentication method: ${method}`);
      }
    } catch (_error) {
      this._stats.authFailures++;
      logError(_error as Error, { method });
      throw _error;
    }
  }

  /**
   * Authenticate using Basic/Application Password
   */
  private async authenticateWithBasic(): Promise<boolean> {
    const hasCredentials =
      this.auth.username && (this.auth.method === "app-password" ? this.auth.appPassword : this.auth.password);

    if (!hasCredentials) {
      const methodName = this.auth.method === "app-password" ? "Application Password" : "Basic";
      const passwordField = this.auth.method === "app-password" ? "app password" : "password";
      throw new AuthenticationError(
        `Username and ${passwordField} are required for ${methodName} authentication`,
        this.auth.method,
      );
    }

    try {
      // Test authentication by getting current user
      await this.request<WordPressUser>("GET", "users/me");
      this.authenticated = true;
      debug.log("Basic/Application Password authentication successful");
      return true;
    } catch (_error) {
      throw new AuthenticationError(`Basic authentication failed: ${(_error as Error).message}`, this.auth.method);
    }
  }

  /**
   * Authenticate using JWT
   */
  private async authenticateWithJWT(): Promise<boolean> {
    if (!this.auth.secret || !this.auth.username || !this.auth.password) {
      throw new AuthenticationError(
        "JWT secret, username, and password are required for JWT authentication",
        this.auth.method,
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/wp-json/jwt-auth/v1/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: this.auth.username,
          password: this.auth.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { token: string };
      this.jwtToken = data.token;
      this.authenticated = true;
      debug.log("JWT authentication successful");
      return true;
    } catch (_error) {
      throw new AuthenticationError(`JWT authentication failed: ${(_error as Error).message}`, this.auth.method);
    }
  }

  /**
   * Authenticate using Cookie
   */
  private async authenticateWithCookie(): Promise<boolean> {
    if (!this.auth.nonce) {
      throw new AuthenticationError("Nonce is required for cookie authentication", this.auth.method);
    }
    this.authenticated = true;
    debug.log("Cookie authentication configured");
    return true;
  }

  /**
   * Make authenticated request to WordPress REST API
   */
  async request<T = unknown>(
    method: HTTPMethod,
    endpoint: string,
    data: unknown = null,
    options: RequestOptions = {},
  ): Promise<T> {
    const timer = startTimer();
    this._stats.totalRequests++;

    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    const url = endpoint.startsWith("http") ? endpoint : `${this.apiUrl}/${cleanEndpoint}`;

    const { headers: _ignoredHeaders, retries: retryOverride, params: _ignoredParams, ...restOptions } = options;
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
      ...(_ignoredHeaders || {}),
    };

    this.addAuthHeaders(baseHeaders);

    const requestTimeout = options.timeout || this.timeout;
    const configuredRetries =
      typeof retryOverride === "number" && retryOverride > 0 ? retryOverride : this.maxRetries || 1;
    const canRetryBody = this.isRetryableBody(data);
    const maxAttempts = canRetryBody ? configuredRetries : 1;

    let lastError: Error = new Error("Unknown error");

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.rateLimit();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      const headers = { ...baseHeaders };
      const fetchOptions: RequestInit & { headers: Record<string, string> } = {
        ...restOptions,
        method,
        headers,
        signal: controller.signal,
      };

      if (data && ["POST", "PUT", "PATCH"].includes(method)) {
        this.attachRequestBody(fetchOptions, headers, data);
      }

      try {
        debug.log(`API Request: ${method} ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ""}`);

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const fallbackResult = await this.handleErrorResponseWithFallback<T>(
            response,
            url,
            endpoint,
            requestTimeout,
            fetchOptions,
            timer,
          );
          if (fallbackResult !== undefined) {
            clearTimeout(timeoutId);
            return fallbackResult;
          }
          continue;
        }

        const result = await this.parseResponse<T>(response, endpoint, timer);
        clearTimeout(timeoutId);
        return result;
      } catch (_error) {
        clearTimeout(timeoutId);
        if (_error instanceof RateLimitError) {
          lastError = _error;
          break;
        }
        lastError = this.normalizeRequestError(_error, requestTimeout);
        debug.log(`Request failed (attempt ${attempt + 1}): ${lastError.message}`);

        const shouldRetry = this.shouldRetryError(lastError) && attempt < maxAttempts - 1;
        if (!shouldRetry) {
          break;
        }

        await this.delay(1000 * (attempt + 1));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    this._stats.failedRequests++;
    timer.end();
    throw new WordPressAPIError(
      `Request failed after ${maxAttempts} attempt${maxAttempts === 1 ? "" : "s"}: ${lastError.message}`,
    );
  }

  private attachRequestBody(
    fetchOptions: RequestInit & { headers: Record<string, string> },
    headers: Record<string, string>,
    data: unknown,
  ): void {
    if (
      data instanceof FormData ||
      (typeof data === "object" && data && "append" in data && typeof (data as FormData).append === "function")
    ) {
      if (typeof (data as { getHeaders?: () => Record<string, string> }).getHeaders === "function") {
        const formHeaders = (data as unknown as { getHeaders(): Record<string, string> }).getHeaders();
        Object.assign(headers, formHeaders);
      } else {
        delete headers["Content-Type"];
      }
      fetchOptions.body = data as FormData;
      return;
    }

    if (Buffer.isBuffer(data)) {
      fetchOptions.body = data;
      return;
    }

    if (typeof data === "string") {
      fetchOptions.body = data;
      return;
    }

    fetchOptions.body = JSON.stringify(data);
  }

  private normalizeRequestError(error: unknown, timeout: number): Error {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new Error(`Request timeout after ${timeout}ms`);
      }
      if (error.message.includes("socket hang up") || error.message.includes("ECONNRESET")) {
        return new Error(`Network connection lost during request: ${error.message}`);
      }
      return error;
    }
    return new Error(typeof error === "string" ? error : "Unknown error");
  }

  private shouldRetryError(error: Error): boolean {
    const message = error.message.toLowerCase();
    if (message.includes("401") || message.includes("403")) {
      return false;
    }
    if (message.includes("timeout")) {
      return false;
    }
    if (message.includes("network connection lost")) {
      return false;
    }
    return true;
  }

  private isRetryableBody(data: unknown): boolean {
    if (!data) {
      return true;
    }

    if (typeof data === "string" || Buffer.isBuffer(data)) {
      return true;
    }

    if (data instanceof FormData) {
      return false;
    }

    if (typeof data === "object" && data && "pipe" in (data as Record<string, unknown>)) {
      const potentialStream = (data as Record<string, unknown>).pipe;
      if (typeof potentialStream === "function") {
        return false;
      }
    }

    return true;
  }

  private async handleErrorResponseWithFallback<T>(
    response: Response,
    url: string,
    originalEndpoint: string,
    requestTimeout: number,
    fetchOptions: RequestInit & { headers: Record<string, string> },
    timer: ReturnType<typeof startTimer>,
  ): Promise<T | undefined> {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
    } catch {
      errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
    }

    if (response.status === 429) {
      this._stats.rateLimitHits++;
      throw new RateLimitError(errorMessage, Date.now() + 60000);
    }

    if (response.status === 403 && originalEndpoint.includes("media") && fetchOptions.method === "POST") {
      throw new AuthenticationError(
        "Media upload blocked: WordPress REST API media uploads appear to be disabled or restricted by a plugin/security policy. " +
          `Error: ${errorMessage}. ` +
          "Common causes: W3 Total Cache, security plugins, or custom REST API restrictions. " +
          "Please check WordPress admin settings or contact your system administrator.",
        this.auth.method,
      );
    }

    if (errorMessage.includes("Beiträge zu erstellen") && originalEndpoint.includes("media")) {
      throw new AuthenticationError(
        `WordPress REST API media upload restriction detected: ${errorMessage}. ` +
          "This typically indicates that media uploads via REST API are disabled by WordPress configuration, " +
          "a security plugin (like W3 Total Cache, Borlabs Cookie), or server policy. " +
          "User has sufficient permissions but WordPress/plugins are blocking the upload.",
        this.auth.method,
      );
    }

    if (response.status === 404 && url.includes("/wp-json/wp/v2")) {
      const fallbackResult = await this.tryIndexPhpFallback<T>(url, requestTimeout, fetchOptions, timer);
      if (fallbackResult !== undefined) {
        return fallbackResult;
      }
    }

    throw new WordPressAPIError(errorMessage, response.status);
  }

  private async tryIndexPhpFallback<T>(
    url: string,
    requestTimeout: number,
    fetchOptions: RequestInit & { headers: Record<string, string> },
    timer: ReturnType<typeof startTimer>,
  ): Promise<T | undefined> {
    debug.log(`404 on pretty permalinks, trying index.php approach`);

    try {
      const urlObj = new URL(url);
      const endpointPath = urlObj.pathname.replace("/wp-json/wp/v2", "");
      const queryParams = urlObj.searchParams.toString();

      let fallbackUrl = `${urlObj.origin}/index.php?rest_route=/wp/v2${endpointPath}`;
      if (queryParams) {
        fallbackUrl += `&${queryParams}`;
      }

      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => {
        fallbackController.abort();
      }, requestTimeout);

      const fallbackOptions = {
        ...fetchOptions,
        signal: fallbackController.signal,
      };
      const fallbackResponse = await fetch(fallbackUrl, fallbackOptions);
      clearTimeout(fallbackTimeoutId);

      if (!fallbackResponse.ok) {
        debug.log(`Fallback also failed with status ${fallbackResponse.status}`);
        return undefined;
      }

      const responseText = await fallbackResponse.text();
      if (!responseText) {
        this._stats.successfulRequests++;
        const duration = timer.end();
        this.updateAverageResponseTime(duration);
        return null as T;
      }

      const result = JSON.parse(responseText);
      this._stats.successfulRequests++;
      const duration = timer.end();
      this.updateAverageResponseTime(duration);
      return result as T;
    } catch (fallbackError) {
      debug.log(`Fallback request failed: ${(fallbackError as Error).message}`);
      return undefined;
    }
  }

  private async parseResponse<T>(
    response: Response,
    endpoint: string,
    timer: ReturnType<typeof startTimer>,
  ): Promise<T> {
    const responseText = await response.text();
    if (!responseText) {
      this._stats.successfulRequests++;
      const duration = timer.end();
      this.updateAverageResponseTime(duration);
      return null as T;
    }

    try {
      const result = JSON.parse(responseText);
      this._stats.successfulRequests++;
      const duration = timer.end();
      this.updateAverageResponseTime(duration);
      return result as T;
    } catch (parseError) {
      if (endpoint.includes("users/me") || endpoint.includes("jwt-auth")) {
        throw new WordPressAPIError(`Invalid JSON response: ${(parseError as Error).message}`);
      }
      this._stats.successfulRequests++;
      const duration = timer.end();
      this.updateAverageResponseTime(duration);
      return responseText as T;
    }
  }

  private updateAverageResponseTime(duration: number): void {
    const totalSuccessful = this._stats.successfulRequests;
    this._stats.averageResponseTime =
      (this._stats.averageResponseTime * (totalSuccessful - 1) + duration) / totalSuccessful;
    this._stats.lastRequestTime = Date.now();
  }

  // ============================================================================
  // HTTP Method Helpers
  // ============================================================================

  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, null, options);
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", endpoint, data, options);
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, data, options);
  }

  async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, null, options);
  }

  // ============================================================================
  // Posts Operations (delegated to PostsOperations)
  // ============================================================================

  async getPosts(params?: PostQueryParams): Promise<WordPressPost[]> {
    return this.postsOps.getPosts(params);
  }

  async getPost(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPost> {
    return this.postsOps.getPost(id, context);
  }

  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    return this.postsOps.createPost(data);
  }

  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    return this.postsOps.updatePost(data);
  }

  async deletePost(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    return this.postsOps.deletePost(id, force);
  }

  async getPostRevisions(id: number): Promise<WordPressPost[]> {
    return this.postsOps.getPostRevisions(id);
  }

  // ============================================================================
  // Pages Operations (delegated to PagesOperations)
  // ============================================================================

  async getPages(params?: PostQueryParams): Promise<WordPressPage[]> {
    return this.pagesOps.getPages(params);
  }

  async getPage(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPage> {
    return this.pagesOps.getPage(id, context);
  }

  async createPage(data: CreatePageRequest): Promise<WordPressPage> {
    return this.pagesOps.createPage(data);
  }

  async updatePage(data: UpdatePageRequest): Promise<WordPressPage> {
    return this.pagesOps.updatePage(data);
  }

  async deletePage(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPage }> {
    return this.pagesOps.deletePage(id, force);
  }

  async getPageRevisions(id: number): Promise<WordPressPage[]> {
    return this.pagesOps.getPageRevisions(id);
  }

  // ============================================================================
  // Media Operations (delegated to MediaOperations)
  // ============================================================================

  async getMedia(params?: MediaQueryParams): Promise<WordPressMedia[]> {
    return this.mediaOps.getMedia(params);
  }

  async getMediaItem(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressMedia> {
    return this.mediaOps.getMediaItem(id, context);
  }

  async uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia> {
    return this.mediaOps.uploadMedia(data);
  }

  async uploadFile(
    fileData: Buffer,
    filename: string,
    mimeType: string,
    meta: Partial<UploadMediaRequest> = {},
    options?: RequestOptions,
  ): Promise<WordPressMedia> {
    return this.mediaOps.uploadFile(fileData, filename, mimeType, meta, options);
  }

  async updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia> {
    return this.mediaOps.updateMedia(data);
  }

  async deleteMedia(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressMedia }> {
    return this.mediaOps.deleteMedia(id, force);
  }

  // ============================================================================
  // Users Operations (delegated to UsersOperations)
  // ============================================================================

  async getUsers(params?: UserQueryParams): Promise<WordPressUser[]> {
    return this.usersOps.getUsers(params);
  }

  async getUser(id: number | "me", context: "view" | "embed" | "edit" = "view"): Promise<WordPressUser> {
    return this.usersOps.getUser(id, context);
  }

  async createUser(data: CreateUserRequest): Promise<WordPressUser> {
    return this.usersOps.createUser(data);
  }

  async updateUser(data: UpdateUserRequest): Promise<WordPressUser> {
    return this.usersOps.updateUser(data);
  }

  async deleteUser(id: number, reassign?: number): Promise<{ deleted: boolean; previous?: WordPressUser }> {
    return this.usersOps.deleteUser(id, reassign);
  }

  async getCurrentUser(): Promise<WordPressUser> {
    return this.usersOps.getCurrentUser();
  }

  // ============================================================================
  // Comments Operations (delegated to CommentsOperations)
  // ============================================================================

  async getComments(params?: CommentQueryParams): Promise<WordPressComment[]> {
    return this.commentsOps.getComments(params);
  }

  async getComment(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressComment> {
    return this.commentsOps.getComment(id, context);
  }

  async createComment(data: CreateCommentRequest): Promise<WordPressComment> {
    return this.commentsOps.createComment(data);
  }

  async updateComment(data: UpdateCommentRequest): Promise<WordPressComment> {
    return this.commentsOps.updateComment(data);
  }

  async deleteComment(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressComment }> {
    return this.commentsOps.deleteComment(id, force);
  }

  async approveComment(id: number): Promise<WordPressComment> {
    return this.commentsOps.approveComment(id);
  }

  async rejectComment(id: number): Promise<WordPressComment> {
    return this.commentsOps.rejectComment(id);
  }

  async spamComment(id: number): Promise<WordPressComment> {
    return this.commentsOps.spamComment(id);
  }

  // ============================================================================
  // Taxonomies Operations (delegated to TaxonomiesOperations)
  // ============================================================================

  async getCategories(params?: Record<string, string | number | boolean>): Promise<WordPressCategory[]> {
    return this.taxonomiesOps.getCategories(params);
  }

  async getCategory(id: number): Promise<WordPressCategory> {
    return this.taxonomiesOps.getCategory(id);
  }

  async createCategory(data: CreateCategoryRequest): Promise<WordPressCategory> {
    return this.taxonomiesOps.createCategory(data);
  }

  async updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory> {
    return this.taxonomiesOps.updateCategory(data);
  }

  async deleteCategory(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressCategory }> {
    return this.taxonomiesOps.deleteCategory(id, force);
  }

  async getTags(params?: Record<string, string | number | boolean>): Promise<WordPressTag[]> {
    return this.taxonomiesOps.getTags(params);
  }

  async getTag(id: number): Promise<WordPressTag> {
    return this.taxonomiesOps.getTag(id);
  }

  async createTag(data: CreateTagRequest): Promise<WordPressTag> {
    return this.taxonomiesOps.createTag(data);
  }

  async updateTag(data: UpdateTagRequest): Promise<WordPressTag> {
    return this.taxonomiesOps.updateTag(data);
  }

  async deleteTag(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressTag }> {
    return this.taxonomiesOps.deleteTag(id, force);
  }

  // ============================================================================
  // Site Operations (delegated to SiteOperations)
  // ============================================================================

  async getSiteSettings(): Promise<WordPressSiteSettings> {
    return this.siteOps.getSiteSettings();
  }

  async updateSiteSettings(settings: Partial<WordPressSiteSettings>): Promise<WordPressSiteSettings> {
    return this.siteOps.updateSiteSettings(settings);
  }

  async getSiteInfo(): Promise<WordPressSiteInfo> {
    return this.siteOps.getSiteInfo();
  }

  async getApplicationPasswords(userId: number | "me" = "me"): Promise<WordPressApplicationPassword[]> {
    return this.siteOps.getApplicationPasswords(userId);
  }

  async createApplicationPassword(
    userId: number | "me",
    name: string,
    appId?: string,
  ): Promise<WordPressApplicationPassword> {
    return this.siteOps.createApplicationPassword(userId, name, appId);
  }

  async deleteApplicationPassword(userId: number | "me", uuid: string): Promise<{ deleted: boolean }> {
    return this.siteOps.deleteApplicationPassword(userId, uuid);
  }

  async search(query: string, types?: string[], subtype?: string): Promise<WordPressSearchResult[]> {
    return this.siteOps.search(query, types, subtype);
  }

  async ping(): Promise<boolean> {
    return this.siteOps.ping();
  }

  async getServerInfo(): Promise<Record<string, unknown>> {
    return this.siteOps.getServerInfo();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  validateEndpoint(endpoint: string): boolean {
    return /^[a-zA-Z0-9\/\-_]+$/.test(endpoint);
  }

  buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = `${this.apiUrl}/${endpoint.replace(/^\/+/, "")}`;
    if (params) {
      const normalizedParams = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
      const searchParams = new URLSearchParams(normalizedParams);
      return `${url}?${searchParams.toString()}`;
    }
    return url;
  }
}
