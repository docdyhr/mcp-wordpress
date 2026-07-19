/**
 * HTTP-level caching wrapper with ETags and Cache-Control headers
 * Implements WordPress REST API caching best practices
 */

import { CacheManager, CachePresets } from "./CacheManager.js";
import * as crypto from "crypto";
import { LoggerFactory } from "@/utils/logger.js";

export interface HttpCacheOptions {
  ttl?: number;
  cacheControl?: string;
  varyHeaders?: string[];
  private?: boolean;
  revalidate?: boolean;
}

export interface CachedResponse {
  data: unknown;
  status: number;
  headers: Record<string, string>;
  etag?: string;
  lastModified?: string;
  cacheControl?: string;
}

export interface RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
}

/**
 * HTTP caching wrapper that adds intelligent caching to HTTP requests
 */
export class HttpCacheWrapper {
  private logger = LoggerFactory.cache();

  constructor(
    private cacheManager: CacheManager,
    private siteId: string,
  ) {}

  /**
   * Execute request with intelligent caching
   */
  async request<T = unknown>(
    requestFn: (extraHeaders?: Record<string, string>) => Promise<{
      data: T;
      status: number;
      headers: Record<string, string>;
    }>,
    options: RequestOptions,
    cacheOptions?: HttpCacheOptions,
  ): Promise<{
    data: T;
    status: number;
    headers: Record<string, string>;
    cached?: boolean;
  }> {
    // Only cache GET requests
    if (options.method.toUpperCase() !== "GET") {
      return await requestFn();
    }

    const cacheKey = this.generateCacheKey(options);

    // Non-destructive freshness check: get() would evict an expired entry
    // as a side effect, destroying the very ETag/Last-Modified this method
    // needs below to revalidate a stale value.
    const { entry, fresh } = this.cacheManager.peek(cacheKey);

    // Fresh, non-expired entry: return it directly. No network call at all —
    // this is the whole point of caching.
    if (fresh && entry) {
      const cachedValue = entry.value as CachedResponse;
      return {
        data: cachedValue.data as T,
        status: cachedValue.status,
        headers: cachedValue.headers,
        cached: true,
      };
    }

    // No fresh entry. If a stale entry exists with real validators from a
    // previous response, revalidate with a conditional request instead of
    // fetching the full body again.
    if (entry && (entry.etag || entry.lastModified)) {
      const conditionalHeaders: Record<string, string> = {};
      if (entry.etag) {
        conditionalHeaders["If-None-Match"] = entry.etag;
      }
      if (entry.lastModified) {
        conditionalHeaders["If-Modified-Since"] = entry.lastModified;
      }

      try {
        const response = await requestFn(conditionalHeaders);

        // 304 Not Modified — the stale value is still current. Refresh its
        // TTL and keep serving it without re-caching a new body.
        if (response.status === 304) {
          const cachedValue = entry.value as CachedResponse;
          const endpoint = this.extractEndpointFromKey(cacheKey);
          const ttl = cacheOptions?.ttl || this.getDefaultTTL(endpoint);
          this.cacheManager.set(cacheKey, cachedValue, ttl, entry.etag, entry.lastModified);

          return {
            data: cachedValue.data as T,
            status: 200,
            headers: cachedValue.headers,
            cached: true,
          };
        }

        // Content changed - update cache with the fresh response
        return await this.cacheAndReturn(
          response as { data: T; status: number; headers: Record<string, string> },
          cacheKey,
          cacheOptions,
        );
      } catch (_error) {
        // If conditional request fails, try without conditions
        this.logger.warn("Conditional request failed, falling back to regular request", {
          _error: _error instanceof Error ? _error.message : String(_error),
          siteId: this.siteId,
        });
      }
    }

    // No usable cache entry: execute a fresh request.
    const response = await requestFn();
    return await this.cacheAndReturn(response, cacheKey, cacheOptions);
  }

  /**
   * Invalidate cache for specific endpoint
   */
  invalidate(endpoint: string, params?: Record<string, unknown>): void {
    const cacheKey = this.cacheManager.generateKey(this.siteId, endpoint, params);
    this.cacheManager.delete(cacheKey);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(`${this.siteId}:${pattern}`);
    return this.cacheManager.clearPattern(regex);
  }

  /**
   * Invalidate all cache for this site
   */
  invalidateAll(): number {
    return this.cacheManager.clearSite(this.siteId);
  }

  /**
   * Pre-warm cache with data
   */
  warm<T>(endpoint: string, data: T, params?: Record<string, unknown>, cacheOptions?: HttpCacheOptions): void {
    const cacheKey = this.cacheManager.generateKey(this.siteId, endpoint, params);
    const ttl = cacheOptions?.ttl || this.getDefaultTTL(endpoint);

    const cachedResponse: CachedResponse = {
      data,
      status: 200,
      headers: this.generateCacheHeaders(cacheOptions, endpoint),
      etag: this.generateETag(data),
      lastModified: new Date().toUTCString(),
      cacheControl: cacheOptions?.cacheControl || this.getDefaultCacheControl(endpoint),
    };

    this.cacheManager.set(cacheKey, cachedResponse, ttl, cachedResponse.etag, cachedResponse.lastModified);
  }

  /**
   * Get cache statistics for this site
   */
  getStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(options: RequestOptions): string {
    const endpoint = this.extractEndpoint(options.url);
    return this.cacheManager.generateKey(this.siteId, endpoint, {
      ...options.params,
      // Include relevant headers that affect response
      ...this.extractCacheableHeaders(options.headers),
    });
  }

  /**
   * Extract endpoint from full URL
   */
  private extractEndpoint(url: string): string {
    // Extract the path after /wp-json/wp/v2/
    const match = url.match(/\/wp-json\/wp\/v2\/(.+?)(?:\?|$)/);
    return match ? match[1] : url;
  }

  /**
   * Extract headers that affect caching
   */
  private extractCacheableHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};

    const cacheableHeaders: Record<string, string> = {};
    const relevantHeaders = ["accept", "accept-language", "authorization"];

    for (const header of relevantHeaders) {
      if (headers[header]) {
        cacheableHeaders[header] = headers[header];
      }
    }

    return cacheableHeaders;
  }

  /**
   * Execute request with modified headers
   */
  /**
   * Cache response and return with cache metadata
   */
  private async cacheAndReturn<T>(
    response: { data: T; status: number; headers: Record<string, string> },
    cacheKey: string,
    cacheOptions?: HttpCacheOptions,
  ): Promise<{
    data: T;
    status: number;
    headers: Record<string, string>;
    cached?: boolean;
  }> {
    // Don't cache error responses (unless specifically configured)
    if (response.status >= 400) {
      return response;
    }

    const endpoint = this.extractEndpointFromKey(cacheKey);
    const ttl = cacheOptions?.ttl || this.getDefaultTTL(endpoint);

    // Prefer the real validators the origin server sent back; only
    // synthesize our own when WordPress didn't provide any. A synthesized
    // value must never be presented as if it came from the origin server.
    const etag = response.headers?.["etag"] || this.generateETag(response.data);
    const lastModified = response.headers?.["last-modified"] || new Date().toUTCString();
    const cacheControl =
      response.headers?.["cache-control"] || cacheOptions?.cacheControl || this.getDefaultCacheControl(endpoint);

    const cachedResponse: CachedResponse = {
      data: response.data,
      status: response.status,
      headers: {
        ...response.headers,
        etag: etag,
        "last-modified": lastModified,
        "cache-control": cacheControl,
      },
      etag,
      lastModified,
      cacheControl,
    };

    // Store in cache
    this.cacheManager.set(cacheKey, cachedResponse, ttl, etag, lastModified);

    return {
      data: response.data,
      status: response.status,
      headers: cachedResponse.headers,
      cached: false,
    };
  }

  /**
   * Generate ETag for response data
   */
  private generateETag(data: unknown): string {
    const hash = crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
    return `"${hash}"`;
  }

  /**
   * Get default TTL based on endpoint type
   */
  private getDefaultTTL(endpoint: string): number {
    // Static data endpoints
    if (this.isStaticEndpoint(endpoint)) {
      return CachePresets.STATIC.ttl;
    }

    // Semi-static data endpoints
    if (this.isSemiStaticEndpoint(endpoint)) {
      return CachePresets.SEMI_STATIC.ttl;
    }

    // Session/auth endpoints
    if (this.isSessionEndpoint(endpoint)) {
      return CachePresets.SESSION.ttl;
    }

    // Default to dynamic for posts, comments, etc.
    return CachePresets.DYNAMIC.ttl;
  }

  /**
   * Get default Cache-Control header based on endpoint
   */
  private getDefaultCacheControl(endpoint: string): string {
    if (this.isStaticEndpoint(endpoint)) {
      return CachePresets.STATIC.cacheControl;
    }

    if (this.isSemiStaticEndpoint(endpoint)) {
      return CachePresets.SEMI_STATIC.cacheControl;
    }

    if (this.isSessionEndpoint(endpoint)) {
      return CachePresets.SESSION.cacheControl;
    }

    return CachePresets.DYNAMIC.cacheControl;
  }

  /**
   * Generate cache headers
   */
  private generateCacheHeaders(options?: HttpCacheOptions, endpoint?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (options?.cacheControl) {
      headers["cache-control"] = options.cacheControl;
    } else if (endpoint) {
      headers["cache-control"] = this.getDefaultCacheControl(endpoint);
    }

    if (options?.varyHeaders?.length) {
      headers["vary"] = options.varyHeaders.join(", ");
    }

    return headers;
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
   * Extract endpoint from cache key
   */
  private extractEndpointFromKey(cacheKey: string): string {
    const parts = cacheKey.split(":");
    return parts[1] || "";
  }
}
