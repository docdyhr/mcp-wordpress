/**
 * Cached WordPress API Client
 * Extends the base WordPress client with intelligent caching capabilities and performance monitoring
 */

import { WordPressClient } from "./api.js";
import { CacheManager, type CacheStats } from "../cache/CacheManager.js";
import { HttpCacheWrapper } from "../cache/HttpCacheWrapper.js";
import { CacheInvalidation } from "../cache/CacheInvalidation.js";
import { SecurityConfig } from "../security/SecurityConfig.js";
import type { WordPressClientConfig, HTTPMethod, RequestOptions } from "../types/client.js";
import type {
  WordPressPost,
  WordPressUser,
  WordPressCategory,
  WordPressTag,
  WordPressSiteSettings,
  PostQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
} from "../types/wordpress.js";

/**
 * WordPress client with intelligent caching
 */
export class CachedWordPressClient extends WordPressClient {
  private cacheManager: CacheManager;
  private httpCache: HttpCacheWrapper;
  private cacheInvalidation: CacheInvalidation;
  private siteId: string;

  constructor(config: WordPressClientConfig, siteId: string = "default") {
    super(config);
    this.siteId = siteId;

    // Initialize caching system
    this.cacheManager = new CacheManager({
      maxSize: SecurityConfig.cache.maxSize,
      defaultTTL: SecurityConfig.cache.defaultTTL,
      enableLRU: SecurityConfig.cache.enableLRU,
      enableStats: SecurityConfig.cache.enableStats,
      sitePrefix: siteId,
    });

    this.httpCache = new HttpCacheWrapper(this.cacheManager, siteId);
    this.cacheInvalidation = new CacheInvalidation(this.httpCache);
  }

  /**
   * Override request method to add caching
   */
  async request<T = unknown>(
    method: HTTPMethod,
    endpoint: string,
    data: unknown = null,
    options: RequestOptions = {},
  ): Promise<T> {
    const upperMethod = method.toUpperCase();

    // Only cache GET requests
    if (upperMethod !== "GET" || !SecurityConfig.cache.enabled) {
      const response = await super.request<T>(method, endpoint, data, options);

      // Trigger cache invalidation for write operations
      if (["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod)) {
        await this.handleCacheInvalidation(method, endpoint, data);
      }

      return response;
    }

    // Normalize endpoint/query params so both the HTTP request and cache key stay in sync
    const { normalizedEndpoint, normalizedParams } = this.normalizeEndpoint(endpoint, options.params);

    // Ensure we don't leak params to the super call (the parent client expects query strings)
    const baseOptions: RequestOptions = { ...options };
    delete baseOptions.params;

    const cacheRequestOptions = {
      method,
      url: this.buildRequestUrl(normalizedEndpoint),
      headers: { ...(baseOptions.headers || {}) },
      params: normalizedParams,
      data,
    };

    const cacheOptions = this.getCacheOptions(normalizedEndpoint);

    const response = await this.httpCache.request(
      async (extraHeaders) => {
        const mergedOptions: RequestOptions = {
          ...baseOptions,
          headers: {
            ...(baseOptions.headers || {}),
            ...(extraHeaders || {}),
          },
        };
        const result = await super.request<T>(method, normalizedEndpoint, data, mergedOptions);
        return {
          data: result,
          status: 200,
          headers: mergedOptions.headers || {},
        };
      },
      cacheRequestOptions,
      cacheOptions,
    );

    return response.data;
  }

  /**
   * Enhanced methods with caching optimization
   */

  /**
   * Get posts with intelligent caching
   */
  async getPosts(params: PostQueryParams = {}): Promise<WordPressPost[]> {
    return await this.request<WordPressPost[]>("GET", "posts", null, {
      params,
    });
  }

  /**
   * Get single post with caching
   */
  async getPost(id: number): Promise<WordPressPost> {
    return await this.request<WordPressPost>("GET", `posts/${id}`);
  }

  /**
   * Create post with cache invalidation
   */
  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    const post = await super.createPost(data);

    // Invalidate related caches
    await this.cacheInvalidation.invalidateResource("posts", post.id, "create");

    return post;
  }

  /**
   * Update post with cache invalidation
   */
  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    const post = await super.updatePost(data);

    // Invalidate related caches
    await this.cacheInvalidation.invalidateResource("posts", post.id, "update");

    return post;
  }

  /**
   * Delete post with cache invalidation
   */
  async deletePost(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    const result = await super.deletePost(id, force);

    // Invalidate related caches
    await this.cacheInvalidation.invalidateResource("posts", id, "delete");

    return result;
  }

  /**
   * Get current user with session caching
   * Uses context=edit to ensure roles and capabilities are included
   */
  async getCurrentUser(): Promise<WordPressUser> {
    return await this.request<WordPressUser>("GET", "users/me?context=edit");
  }

  /**
   * Get categories with semi-static caching
   */
  async getCategories(params: Record<string, unknown> = {}): Promise<WordPressCategory[]> {
    return await this.request<WordPressCategory[]>("GET", "categories", null, {
      params,
    });
  }

  /**
   * Get tags with semi-static caching
   */
  async getTags(params: Record<string, unknown> = {}): Promise<WordPressTag[]> {
    return await this.request<WordPressTag[]>("GET", "tags", null, { params });
  }

  /**
   * Get site settings with static caching
   */
  async getSiteSettings(): Promise<WordPressSiteSettings> {
    return await this.request<WordPressSiteSettings>("GET", "settings");
  }

  /**
   * Cache management methods
   */

  /**
   * Private helper methods
   */

  private extractEndpoint(url: string): string {
    // Simple approach - use the endpoint part
    return url.replace(/^.*\/wp-json\/wp\/v2\//, "").split("?")[0];
  }

  /**
   * Get cache options based on endpoint
   */
  private getCacheOptions(endpoint: string) {
    // Determine cache type based on endpoint
    if (this.isStaticEndpoint(endpoint)) {
      return {
        ttl: SecurityConfig.cache.ttlPresets.static,
        cacheControl: SecurityConfig.cache.cacheHeaders.static,
      };
    }

    if (this.isSemiStaticEndpoint(endpoint)) {
      return {
        ttl: SecurityConfig.cache.ttlPresets.semiStatic,
        cacheControl: SecurityConfig.cache.cacheHeaders.semiStatic,
      };
    }

    if (this.isSessionEndpoint(endpoint)) {
      return {
        ttl: SecurityConfig.cache.ttlPresets.session,
        cacheControl: SecurityConfig.cache.cacheHeaders.session,
        private: true,
      };
    }

    // Default to dynamic caching
    return {
      ttl: SecurityConfig.cache.ttlPresets.dynamic,
      cacheControl: SecurityConfig.cache.cacheHeaders.dynamic,
    };
  }

  private normalizeEndpoint(
    endpoint: string,
    params: Record<string, unknown> | undefined,
  ): { normalizedEndpoint: string; normalizedParams: Record<string, unknown> } {
    const [pathPart, queryPart] = endpoint.split("?");
    const collectedParams: Record<string, string[]> = {};

    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [key, value] of searchParams.entries()) {
        if (!collectedParams[key]) {
          collectedParams[key] = [];
        }
        collectedParams[key].push(value);
      }
    }

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        const values = Array.isArray(value) ? value : [value];
        collectedParams[key] = values.map((item) => String(item));
      }
    }

    const searchParams = new URLSearchParams();
    Object.keys(collectedParams)
      .sort()
      .forEach((key) => {
        collectedParams[key].forEach((value) => searchParams.append(key, value));
      });

    const normalizedParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(collectedParams)) {
      normalizedParams[key] = value.length === 1 ? value[0] : [...value];
    }

    const normalizedEndpoint = searchParams.toString() ? `${pathPart}?${searchParams.toString()}` : pathPart;

    return { normalizedEndpoint, normalizedParams };
  }

  private buildRequestUrl(endpoint: string): string {
    if (endpoint.startsWith("http")) {
      return endpoint;
    }

    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    const siteUrl = this.getSiteUrl().replace(/\/$/, "");

    if (cleanEndpoint.startsWith("wp-json/")) {
      return `${siteUrl}/${cleanEndpoint}`;
    }

    return `${siteUrl}/wp-json/wp/v2/${cleanEndpoint}`;
  }

  /**
   * Handle cache invalidation for write operations
   */
  private async handleCacheInvalidation(method: string, endpoint: string, data: unknown): Promise<void> {
    const resource = this.extractResourceFromEndpoint(endpoint);
    const id = this.extractIdFromEndpoint(endpoint);

    let operationType: "create" | "update" | "delete";

    switch (method.toUpperCase()) {
      case "POST":
        operationType = "create";
        break;
      case "PUT":
      case "PATCH":
        operationType = "update";
        break;
      case "DELETE":
        operationType = "delete";
        break;
      default:
        return;
    }

    await this.cacheInvalidation.invalidateResource(resource, id, operationType);
  }

  /**
   * Extract resource type from endpoint
   */
  private extractResourceFromEndpoint(endpoint: string): string {
    const parts = endpoint.split("/");
    return parts[0] || "unknown";
  }

  /**
   * Extract ID from endpoint
   */
  private extractIdFromEndpoint(endpoint: string): number | undefined {
    const match = endpoint.match(/\/(\d+)(?:\/|$)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Check if endpoint contains static data
   */
  private isStaticEndpoint(endpoint: string): boolean {
    const staticEndpoints = ["settings", "types", "statuses"];
    return staticEndpoints.some((pattern) => endpoint.includes(pattern));
  }

  /**
   * Check if endpoint contains semi-static data
   */
  private isSemiStaticEndpoint(endpoint: string): boolean {
    const semiStaticEndpoints = ["categories", "tags", "users", "taxonomies"];
    return semiStaticEndpoints.some((pattern) => endpoint.includes(pattern));
  }

  /**
   * Check if endpoint is session-related
   */
  private isSessionEndpoint(endpoint: string): boolean {
    const sessionEndpoints = ["users/me", "application-passwords"];
    return sessionEndpoints.some((pattern) => endpoint.includes(pattern));
  }

  /**
   * Performance monitoring and cache management methods
   */

  /**
   * Get cache statistics for performance monitoring
   */
  getCacheStats(): {
    cache: CacheStats;
    invalidation: {
      queueSize: number;
      rulesCount: number;
      processing: boolean;
    };
  } {
    return {
      cache: this.cacheManager.getStats(),
      invalidation: this.cacheInvalidation.getStats(),
    };
  }

  /**
   * Get cache manager instance (for performance monitoring integration)
   */
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Clear cache entries (for cache management tools)
   */
  clearCache(): number {
    const stats = this.cacheManager.getStats();
    this.cacheManager.clear();
    return stats.totalSize;
  }

  /**
   * Clear cache entries matching pattern
   */
  clearCachePattern(pattern: string): number {
    const regex = new RegExp(pattern, "i");
    return this.cacheManager.clearPattern(regex);
  }

  /**
   * Warm cache with essential data
   */
  async warmCache(): Promise<void> {
    try {
      // Pre-load frequently accessed data
      const warmupOperations = [
        () => this.getCurrentUser().catch(() => null),
        () => this.getCategories().catch(() => null),
        () => this.getTags().catch(() => null),
        () => this.getSiteSettings().catch(() => null),
      ];

      // Execute warmup operations in parallel
      await Promise.allSettled(warmupOperations.map((op) => op()));
    } catch (_error) {
      // Ignore warmup errors - they shouldn't fail the cache warming
    }
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency(): {
    hitRate: number;
    missRate: number;
    efficiency: string;
    memoryUsage: number;
    totalEntries: number;
  } {
    const stats = this.cacheManager.getStats();
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? stats.hits / total : 0;
    const missRate = 1 - hitRate;

    let efficiency = "Poor";
    if (hitRate >= 0.9) efficiency = "Excellent";
    else if (hitRate >= 0.8) efficiency = "Good";
    else if (hitRate >= 0.6) efficiency = "Fair";

    return {
      hitRate,
      missRate,
      efficiency,
      memoryUsage: this.estimateMemoryUsage(),
      totalEntries: stats.totalSize,
    };
  }

  /**
   * Get cache configuration info
   */
  getCacheInfo(): {
    enabled: boolean;
    siteId: string;
    maxSize: number;
    defaultTTL: number;
    currentSize: number;
    ttlPresets: Record<string, unknown>;
  } {
    const stats = this.cacheManager.getStats();

    return {
      enabled: SecurityConfig.cache.enabled,
      siteId: this.siteId,
      maxSize: SecurityConfig.cache.maxSize,
      defaultTTL: SecurityConfig.cache.defaultTTL,
      currentSize: stats.totalSize,
      ttlPresets: SecurityConfig.cache.ttlPresets,
    };
  }

  /**
   * Estimate memory usage of cache (in MB)
   */
  private estimateMemoryUsage(): number {
    const stats = this.cacheManager.getStats();
    // Rough estimate: ~1KB per cache entry
    return (stats.totalSize * 1024) / (1024 * 1024);
  }

  /**
   * Get detailed cache performance metrics
   */
  getDetailedCacheMetrics(): {
    statistics: {
      cache: CacheStats;
      invalidation: {
        queueSize: number;
        rulesCount: number;
        processing: boolean;
      };
    };
    efficiency: Record<string, unknown>;
    configuration: Record<string, unknown>;
    siteInfo: {
      siteId: string;
      baseUrl: string;
    };
  } {
    return {
      statistics: this.getCacheStats(),
      efficiency: this.getCacheEfficiency(),
      configuration: this.getCacheInfo(),
      siteInfo: {
        siteId: this.siteId,
        baseUrl: this.config.baseUrl,
      },
    };
  }
}
