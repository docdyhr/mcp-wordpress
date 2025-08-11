/**
 * WordPress API Client
 * Handles all REST API communication with WordPress
 */

// Use native fetch in Node.js 18+
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";
import type {
  IWordPressClient,
  WordPressClientConfig,
  AuthConfig,
  AuthMethod,
  HTTPMethod,
  RequestOptions,
  ClientStats,
} from "../types/client.js";
import { WordPressAPIError, AuthenticationError, RateLimitError } from "../types/client.js";
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
} from "../types/wordpress.js";
import { debug, logError, startTimer } from "../utils/debug.js";
import type { QueuedRequest } from '../types/requests.js';

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
   * @example
   * ```typescript
   * // Basic configuration with app password
   * const client = new WordPressClient({
   *   baseUrl: 'https://mysite.com',
   *   auth: {
   *     method: 'app-password',
   *     username: 'admin',
   *     password: 'xxxx xxxx xxxx xxxx xxxx xxxx'
   *   }
   * });
   *
   * // Configuration with environment variables
   * // Set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD
   * const client = new WordPressClient(); // Auto-detects from env
   *
   * // Custom timeout and retry settings
   * const client = new WordPressClient({
   *   baseUrl: 'https://mysite.com',
   *   timeout: 60000,      // 60 seconds
   *   maxRetries: 5,       // 5 retry attempts
   *   auth: { method: 'app-password', username: 'user', password: 'pass' }
   * });
   * ```
   *
   * @throws {Error} When required configuration is missing or invalid
   *
   * @since 1.0.0
   */
  constructor(options: Partial<WordPressClientConfig> = {}) {
    const baseUrl = options.baseUrl || process.env.WORDPRESS_SITE_URL || "";

    // Validate and sanitize base URL
    this.baseUrl = this.validateAndSanitizeUrl(baseUrl);
    this.apiUrl = "";
    this.timeout = options.timeout || parseInt(process.env.WORDPRESS_TIMEOUT || "30000");
    this.maxRetries = options.maxRetries || parseInt(process.env.WORDPRESS_MAX_RETRIES || "3");

    // Authentication configuration
    this.auth = options.auth || this.getAuthFromEnv();

    // Rate limiting
    this.requestInterval = 60000 / parseInt(process.env.RATE_LIMIT || "60");

    // Initialize stats
    this._stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0,
    };

    // Validate configuration
    this.validateConfig();
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
      if (process.env.NODE_ENV === "production") {
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
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Invalid WordPress site URL format");
      }
      throw error;
    }
  }

  private getAuthFromEnv(): AuthConfig {
    const authMethod = process.env.WORDPRESS_AUTH_METHOD as AuthMethod;

    // Use explicit auth method if set
    if (authMethod === "app-password" && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
      return {
        method: "app-password",
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
      };
    }

    // Try Application Password first (fallback)
    if (process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
      return {
        method: "app-password",
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
      };
    }

    // Try JWT
    if (process.env.WORDPRESS_JWT_SECRET && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_PASSWORD) {
      return {
        method: "jwt",
        secret: process.env.WORDPRESS_JWT_SECRET,
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_PASSWORD,
      };
    }

    // Try API Key
    if (process.env.WORDPRESS_API_KEY) {
      return {
        method: "api-key",
        apiKey: process.env.WORDPRESS_API_KEY,
      };
    }

    // Try Cookie
    if (process.env.WORDPRESS_COOKIE_NONCE) {
      return {
        method: "cookie",
        nonce: process.env.WORDPRESS_COOKIE_NONCE,
      };
    }

    // Default to basic authentication
    return {
      method: "basic",
      username: process.env.WORDPRESS_USERNAME || "",
      password: process.env.WORDPRESS_PASSWORD || process.env.WORDPRESS_APP_PASSWORD || "",
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
    } catch (error) {
      this._stats.authFailures++;
      logError(error as Error, { method });
      throw error;
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
    } catch (error) {
      throw new AuthenticationError(`Basic authentication failed: ${(error as Error).message}`, this.auth.method);
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
    } catch (error) {
      throw new AuthenticationError(`JWT authentication failed: ${(error as Error).message}`, this.auth.method);
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

    // Handle endpoint properly - remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    const url = endpoint.startsWith("http") ? endpoint : `${this.apiUrl}/${cleanEndpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "MCP-WordPress/1.0.0",
      ...options.headers,
    };

    // Add authentication headers
    this.addAuthHeaders(headers);

    // Set up timeout using AbortController - use options timeout if provided
    const controller = new AbortController();
    const requestTimeout = options.timeout || this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    const fetchOptions: RequestInit & { headers: Record<string, string> } = {
      ...options, // Spread options first
      method,
      headers, // Headers come after to ensure auth headers aren't overridden
      signal: controller.signal,
    };

    // Add body for POST/PUT/PATCH requests
    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      if (
        data instanceof FormData ||
        (typeof data === "object" && data && "append" in data && typeof data.append === "function")
      ) {
        // For FormData, check if it has getHeaders method (form-data package)
        if (typeof (data as { getHeaders?: () => Record<string, string> }).getHeaders === "function") {
          // Use headers from form-data package
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formHeaders = (data as any).getHeaders();
          Object.assign(headers, formHeaders);
        } else {
          // For native FormData, don't set Content-Type (let fetch set it with boundary)
          delete headers["Content-Type"];
        }
        fetchOptions.body = data as FormData;
      } else if (Buffer.isBuffer(data)) {
        // For Buffer data (manual multipart), keep Content-Type from headers
        fetchOptions.body = data;
      } else if (typeof data === "string") {
        fetchOptions.body = data;
      } else {
        fetchOptions.body = JSON.stringify(data);
      }
    }

    // Rate limiting
    await this.rateLimit();

    let lastError: Error = new Error("Unknown error");
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        debug.log(`API Request: ${method} ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ""}`);

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Handle different response types
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
          } catch {
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }

          // Handle rate limiting
          if (response.status === 429) {
            this._stats.rateLimitHits++;
            throw new RateLimitError(errorMessage, Date.now() + 60000);
          }

          // Handle permission errors specifically for uploads
          if (response.status === 403 && endpoint.includes("media") && method === "POST") {
            throw new AuthenticationError(
              "Media upload blocked: WordPress REST API media uploads appear to be disabled or restricted by a plugin/security policy. " +
                `Error: ${errorMessage}. ` +
                "Common causes: W3 Total Cache, security plugins, or custom REST API restrictions. " +
                "Please check WordPress admin settings or contact your system administrator.",
              this.auth.method,
            );
          }

          // Handle general upload permission errors
          if (errorMessage.includes("Beiträge zu erstellen") && endpoint.includes("media")) {
            throw new AuthenticationError(
              `WordPress REST API media upload restriction detected: ${errorMessage}. ` +
                "This typically indicates that media uploads via REST API are disabled by WordPress configuration, " +
                "a security plugin (like W3 Total Cache, Borlabs Cookie), or server policy. " +
                "User has sufficient permissions but WordPress/plugins are blocking the upload.",
              this.auth.method,
            );
          }

          // Fallback for 404 errors - try index.php approach for REST API
          if (response.status === 404 && attempt === 0 && url.includes("/wp-json/wp/v2")) {
            debug.log(`404 on pretty permalinks, trying index.php approach`);

            // Parse the URL to handle query parameters correctly
            const urlObj = new URL(url);
            const endpoint = urlObj.pathname.replace("/wp-json/wp/v2", "");
            const queryParams = urlObj.searchParams.toString();

            let fallbackUrl = `${urlObj.origin}/index.php?rest_route=/wp/v2${endpoint}`;
            if (queryParams) {
              fallbackUrl += `&${queryParams}`;
            }

            try {
              // Create a new timeout for the fallback request
              const fallbackController = new AbortController();
              const fallbackTimeoutId = setTimeout(() => {
                fallbackController.abort();
              }, requestTimeout);

              const fallbackOptions = { ...fetchOptions, signal: fallbackController.signal };
              const fallbackResponse = await fetch(fallbackUrl, fallbackOptions);
              clearTimeout(fallbackTimeoutId);

              if (fallbackResponse.ok) {
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
                return result;
              } else {
                // If fallback also fails, continue with original error
                debug.log(`Fallback also failed with status ${fallbackResponse.status}`);
              }
            } catch (fallbackError) {
              debug.log(`Fallback request failed: ${(fallbackError as Error).message}`);
            }
          }

          throw new WordPressAPIError(errorMessage, response.status);
        }

        // Parse response
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
          // For authentication requests, malformed JSON should be an error
          if (endpoint.includes("users/me") || endpoint.includes("jwt-auth")) {
            throw new WordPressAPIError(`Invalid JSON response: ${(parseError as Error).message}`);
          }
          this._stats.successfulRequests++;
          const duration = timer.end();
          this.updateAverageResponseTime(duration);
          return responseText as T;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // Handle timeout errors
        if ((error as Error & { name?: string }).name === "AbortError") {
          lastError = new Error(`Request timeout after ${requestTimeout}ms`);
        }

        // Handle network errors
        if (lastError.message.includes("socket hang up") || lastError.message.includes("ECONNRESET")) {
          lastError = new Error(`Network connection lost during upload: ${lastError.message}`);
        }

        debug.log(`Request failed (attempt ${attempt + 1}): ${lastError.message}`);

        // Don't retry on authentication errors, timeouts, or critical network errors
        if (
          lastError.message.includes("401") ||
          lastError.message.includes("403") ||
          lastError.message.includes("timeout") ||
          lastError.message.includes("Network connection lost")
        ) {
          break;
        }

        if (attempt < this.maxRetries - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    this._stats.failedRequests++;
    timer.end();
    throw new WordPressAPIError(`Request failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  private updateAverageResponseTime(duration: number): void {
    const totalSuccessful = this._stats.successfulRequests;
    this._stats.averageResponseTime =
      (this._stats.averageResponseTime * (totalSuccessful - 1) + duration) / totalSuccessful;
    this._stats.lastRequestTime = Date.now();
  }

  // HTTP method helpers
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

  // WordPress API Methods

  // Posts
  async getPosts(params?: PostQueryParams): Promise<WordPressPost[]> {
    const queryString = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return this.get<WordPressPost[]>(`posts${queryString}`);
  }

  async getPost(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPost> {
    return this.get<WordPressPost>(`posts/${id}?context=${context}`);
  }

  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    return this.post<WordPressPost>("posts", data);
  }

  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    const { id, ...updateData } = data;
    return this.put<WordPressPost>(`posts/${id}`, updateData);
  }

  async deletePost(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    return this.delete(`posts/${id}?force=${force}`);
  }

  async getPostRevisions(id: number): Promise<WordPressPost[]> {
    return this.get<WordPressPost[]>(`posts/${id}/revisions`);
  }

  // Pages
  async getPages(params?: PostQueryParams): Promise<WordPressPage[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.get<WordPressPage[]>(`pages${queryString}`);
  }

  async getPage(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPage> {
    return this.get<WordPressPage>(`pages/${id}?context=${context}`);
  }

  async createPage(data: CreatePageRequest): Promise<WordPressPage> {
    return this.post<WordPressPage>("pages", data);
  }

  async updatePage(data: UpdatePageRequest): Promise<WordPressPage> {
    const { id, ...updateData } = data;
    return this.put<WordPressPage>(`pages/${id}`, updateData);
  }

  async deletePage(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPage }> {
    return this.delete(`pages/${id}?force=${force}`);
  }

  async getPageRevisions(id: number): Promise<WordPressPage[]> {
    return this.get<WordPressPage[]>(`pages/${id}/revisions`);
  }

  // Media
  async getMedia(params?: MediaQueryParams): Promise<WordPressMedia[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.get<WordPressMedia[]>(`media${queryString}`);
  }

  async getMediaItem(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressMedia> {
    return this.get<WordPressMedia>(`media/${id}?context=${context}`);
  }

  async uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia> {
    if (!fs.existsSync(data.file_path)) {
      throw new Error(`File not found: ${data.file_path}`);
    }

    const stats = fs.statSync(data.file_path);
    const filename = data.title || path.basename(data.file_path);
    const fileBuffer = fs.readFileSync(data.file_path);

    // Check if file is too large (WordPress default is 2MB for most installs)
    const maxSize = 10 * 1024 * 1024; // 10MB reasonable limit
    if (stats.size > maxSize) {
      throw new Error(
        `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${maxSize / 1024 / 1024}MB`,
      );
    }

    debug.log(`Uploading file: ${filename} (${(stats.size / 1024).toFixed(2)}KB)`);

    return this.uploadFile(fileBuffer, filename, this.getMimeType(data.file_path), data);
  }

  async uploadFile(
    fileData: Buffer,
    filename: string,
    mimeType: string,
    meta: Partial<UploadMediaRequest> = {},
    options?: RequestOptions,
  ): Promise<WordPressMedia> {
    debug.log(`Uploading file: ${filename} (${fileData.length} bytes)`);

    // Use FormData but with correct configuration for node-fetch
    const formData = new FormData();
    formData.setMaxListeners(20);

    // Add file with correct options
    formData.append("file", fileData, {
      filename,
      contentType: mimeType,
    });

    // Add metadata
    if (meta.title) formData.append("title", meta.title);
    if (meta.alt_text) formData.append("alt_text", meta.alt_text);
    if (meta.caption) formData.append("caption", meta.caption);
    if (meta.description) formData.append("description", meta.description);
    if (meta.post) formData.append("post", meta.post.toString());

    // Use longer timeout for file uploads
    const uploadTimeout = options?.timeout !== undefined ? options.timeout : 600000; // 10 minutes default
    const uploadOptions: RequestOptions = {
      ...options,
      timeout: uploadTimeout,
    };

    debug.log(`Upload prepared with FormData, timeout: ${uploadTimeout}ms`);

    // Use the regular post method which handles FormData correctly
    return this.post<WordPressMedia>("media", formData, uploadOptions);
  }

  async updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia> {
    const { id, ...updateData } = data;
    return this.put<WordPressMedia>(`media/${id}`, updateData);
  }

  async deleteMedia(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressMedia }> {
    return this.delete(`media/${id}?force=${force}`);
  }

  // Users
  async getUsers(params?: UserQueryParams): Promise<WordPressUser[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.get<WordPressUser[]>(`users${queryString}`);
  }

  async getUser(id: number | "me", context: "view" | "embed" | "edit" = "view"): Promise<WordPressUser> {
    return this.get<WordPressUser>(`users/${id}?context=${context}`);
  }

  async createUser(data: CreateUserRequest): Promise<WordPressUser> {
    return this.post<WordPressUser>("users", data);
  }

  async updateUser(data: UpdateUserRequest): Promise<WordPressUser> {
    const { id, ...updateData } = data;
    return this.put<WordPressUser>(`users/${id}`, updateData);
  }

  async deleteUser(id: number, reassign?: number): Promise<{ deleted: boolean; previous?: WordPressUser }> {
    const params = reassign ? `?reassign=${reassign}&force=true` : "?force=true";
    return this.delete(`users/${id}${params}`);
  }

  async getCurrentUser(): Promise<WordPressUser> {
    return this.getUser("me");
  }

  // Comments
  async getComments(params?: CommentQueryParams): Promise<WordPressComment[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.get<WordPressComment[]>(`comments${queryString}`);
  }

  async getComment(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressComment> {
    return this.get<WordPressComment>(`comments/${id}?context=${context}`);
  }

  async createComment(data: CreateCommentRequest): Promise<WordPressComment> {
    return this.post<WordPressComment>("comments", data);
  }

  async updateComment(data: UpdateCommentRequest): Promise<WordPressComment> {
    const { id, ...updateData } = data;
    return this.put<WordPressComment>(`comments/${id}`, updateData);
  }

  async deleteComment(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressComment }> {
    return this.delete(`comments/${id}?force=${force}`);
  }

  async approveComment(id: number): Promise<WordPressComment> {
    return this.put<WordPressComment>(`comments/${id}`, { status: "approved" });
  }

  async rejectComment(id: number): Promise<WordPressComment> {
    return this.put<WordPressComment>(`comments/${id}`, {
      status: "unapproved",
    });
  }

  async spamComment(id: number): Promise<WordPressComment> {
    return this.put<WordPressComment>(`comments/${id}`, { status: "spam" });
  }

  // Taxonomies
  async getCategories(params?: Record<string, string | number | boolean>): Promise<WordPressCategory[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.get<WordPressCategory[]>(`categories${queryString}`);
  }

  async getCategory(id: number): Promise<WordPressCategory> {
    return this.get<WordPressCategory>(`categories/${id}`);
  }

  async createCategory(data: CreateCategoryRequest): Promise<WordPressCategory> {
    return this.post<WordPressCategory>("categories", data);
  }

  async updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory> {
    const { id, ...updateData } = data;
    return this.put<WordPressCategory>(`categories/${id}`, updateData);
  }

  async deleteCategory(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressCategory }> {
    return this.delete(`categories/${id}?force=${force}`);
  }

  async getTags(params?: Record<string, string | number | boolean>): Promise<WordPressTag[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.get<WordPressTag[]>(`tags${queryString}`);
  }

  async getTag(id: number): Promise<WordPressTag> {
    return this.get<WordPressTag>(`tags/${id}`);
  }

  async createTag(data: CreateTagRequest): Promise<WordPressTag> {
    return this.post<WordPressTag>("tags", data);
  }

  async updateTag(data: UpdateTagRequest): Promise<WordPressTag> {
    const { id, ...updateData } = data;
    return this.put<WordPressTag>(`tags/${id}`, updateData);
  }

  async deleteTag(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressTag }> {
    return this.delete(`tags/${id}?force=${force}`);
  }

  // Site Management
  async getSiteSettings(): Promise<WordPressSiteSettings> {
    return this.get<WordPressSiteSettings>("settings");
  }

  async updateSiteSettings(settings: Partial<WordPressSiteSettings>): Promise<WordPressSiteSettings> {
    return this.post<WordPressSiteSettings>("settings", settings);
  }

  async getSiteInfo(): Promise<any> {
    return this.get("");
  }

  // Application Passwords
  async getApplicationPasswords(userId: number | "me" = "me"): Promise<WordPressApplicationPassword[]> {
    return this.get<WordPressApplicationPassword[]>(`users/${userId}/application-passwords`);
  }

  async createApplicationPassword(
    userId: number | "me",
    name: string,
    appId?: string,
  ): Promise<WordPressApplicationPassword> {
    const data: Record<string, unknown> = { name };
    if (appId) data.app_id = appId;
    return this.post<WordPressApplicationPassword>(`users/${userId}/application-passwords`, data);
  }

  async deleteApplicationPassword(userId: number | "me", uuid: string): Promise<{ deleted: boolean }> {
    return this.delete(`users/${userId}/application-passwords/${uuid}`);
  }

  // Search
  async search(query: string, types?: string[], subtype?: string): Promise<any[]> {
    const params = new URLSearchParams({ search: query });
    if (types) params.append("type", types.join(","));
    if (subtype) params.append("subtype", subtype);

    return this.get<any[]>(`search?${params.toString()}`);
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    try {
      await this.get("");
      return true;
    } catch {
      return false;
    }
  }

  async getServerInfo(): Promise<Record<string, any>> {
    return this.get("");
  }

  validateEndpoint(endpoint: string): boolean {
    return /^[a-zA-Z0-9\/\-_]+$/.test(endpoint);
  }

  buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = `${this.apiUrl}/${endpoint.replace(/^\/+/, "")}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      return `${url}?${searchParams.toString()}`;
    }
    return url;
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}
