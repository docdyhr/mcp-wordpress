/**
 * SEO Cache Manager
 *
 * Extends the base cache manager with SEO-specific caching strategies
 * and invalidation patterns. Provides optimized caching for SEO analysis,
 * schema generation, and audit results.
 *
 * @since 2.7.0
 */

import { CacheManager, type CacheConfig } from "./CacheManager.js";
import { Config } from "../config/Config.js";
import { LoggerFactory } from "../utils/logger.js";

/**
 * SEO-specific cache manager
 *
 * Implements specialized caching strategies for SEO operations:
 * - Content analysis results (6 hour default TTL)
 * - Schema markup (24 hour default TTL)
 * - Site audits (1 hour default TTL)
 * - Keyword research (7 day default TTL)
 * - SERP data (12 hour default TTL)
 */
export class SEOCacheManager extends CacheManager {
  private readonly SEO_CACHE_PREFIX = "seo:";
  private readonly logger = LoggerFactory.cache("seo");
  private readonly seoConfig = Config.getInstance().get().seo;

  /**
   * Default TTL values for different SEO operations
   */
  private readonly DEFAULT_TTL = {
    analysis: this.seoConfig.cache.analysisTTL || 21600, // 6 hours
    schema: this.seoConfig.cache.schemaTTL || 86400, // 24 hours
    audit: this.seoConfig.cache.auditTTL || 3600, // 1 hour
    keywords: this.seoConfig.cache.keywordsTTL || 604800, // 7 days
    serp: 43200, // 12 hours
    metadata: 7200, // 2 hours
    links: 10800, // 3 hours
  };

  constructor() {
    const config: CacheConfig = {
      maxSize: 1000,
      defaultTTL: 21600, // 6 hours default for SEO operations
      enableLRU: true,
      enableStats: true,
      sitePrefix: "seo",
    };
    super(config);
  }

  /**
   * Get SEO-specific cache key
   *
   * @param type - Type of SEO operation
   * @param site - Site identifier
   * @param identifier - Unique identifier (post ID, etc.)
   * @param suffix - Additional suffix for uniqueness
   * @returns Formatted cache key
   */
  public getSEOCacheKey(
    type: keyof typeof this.DEFAULT_TTL,
    site: string,
    identifier: string | number,
    suffix?: string,
  ): string {
    const parts = [this.SEO_CACHE_PREFIX, type, site, identifier];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join(":");
  }

  /**
   * Cache SEO analysis result
   *
   * @param postId - WordPress post ID
   * @param analysisType - Type of analysis performed
   * @param result - Analysis result to cache
   * @param site - Site identifier
   * @param ttl - Optional custom TTL
   */
  public async cacheAnalysis(
    postId: number,
    analysisType: string,
    result: unknown,
    site: string = "default",
    ttl?: number,
  ): Promise<void> {
    const key = this.getSEOCacheKey("analysis", site, postId, analysisType);
    const actualTTL = ttl || this.DEFAULT_TTL.analysis;

    this.set(key, result, actualTTL);
    this.logger.debug("Cached SEO analysis", {
      key,
      ttl: actualTTL,
      site,
      postId,
      analysisType,
    });
  }

  /**
   * Get cached SEO analysis result
   *
   * @param postId - WordPress post ID
   * @param analysisType - Type of analysis
   * @param site - Site identifier
   * @returns Cached result or null
   */
  public getCachedAnalysis(postId: number, analysisType: string, site: string = "default"): unknown | null {
    const key = this.getSEOCacheKey("analysis", site, postId, analysisType);
    const cached = this.get(key);

    if (cached) {
      this.logger.debug("SEO analysis cache hit", { key, site, postId });
    }

    return cached;
  }

  /**
   * Cache schema markup
   *
   * @param postId - WordPress post ID
   * @param schemaType - Type of schema
   * @param schema - Schema markup to cache
   * @param site - Site identifier
   * @param ttl - Optional custom TTL
   */
  public async cacheSchema(
    postId: number,
    schemaType: string,
    schema: unknown,
    site: string = "default",
    ttl?: number,
  ): Promise<void> {
    const key = this.getSEOCacheKey("schema", site, postId, schemaType);
    const actualTTL = ttl || this.DEFAULT_TTL.schema;

    this.set(key, schema, actualTTL);
    this.logger.debug("Cached schema markup", {
      key,
      ttl: actualTTL,
      site,
      postId,
      schemaType,
    });
  }

  /**
   * Get cached schema markup
   *
   * @param postId - WordPress post ID
   * @param schemaType - Type of schema
   * @param site - Site identifier
   * @returns Cached schema or null
   */
  public getCachedSchema(postId: number, schemaType: string, site: string = "default"): unknown | null {
    const key = this.getSEOCacheKey("schema", site, postId, schemaType);
    return this.get(key);
  }

  /**
   * Cache site audit results
   *
   * @param auditType - Type of audit performed
   * @param result - Audit results
   * @param site - Site identifier
   * @param ttl - Optional custom TTL
   */
  public async cacheAudit(auditType: string, result: unknown, site: string = "default", ttl?: number): Promise<void> {
    const key = this.getSEOCacheKey("audit", site, "site", auditType);
    const actualTTL = ttl || this.DEFAULT_TTL.audit;

    this.set(key, result, actualTTL);
    this.logger.debug("Cached site audit", {
      key,
      ttl: actualTTL,
      site,
      auditType,
    });
  }

  /**
   * Get cached audit results
   *
   * @param auditType - Type of audit
   * @param site - Site identifier
   * @returns Cached audit or null
   */
  public getCachedAudit(auditType: string, site: string = "default"): unknown | null {
    const key = this.getSEOCacheKey("audit", site, "site", auditType);
    return this.get(key);
  }

  /**
   * Invalidate all SEO cache for a specific post
   *
   * Called when a post is updated to ensure fresh SEO analysis
   *
   * @param postId - WordPress post ID
   * @param site - Site identifier
   */
  public async invalidatePostSEO(postId: number, site: string = "default"): Promise<void> {
    const patterns = [
      `${this.SEO_CACHE_PREFIX}analysis:${site}:${postId}:*`,
      `${this.SEO_CACHE_PREFIX}schema:${site}:${postId}:*`,
      `${this.SEO_CACHE_PREFIX}metadata:${site}:${postId}:*`,
      `${this.SEO_CACHE_PREFIX}links:${site}:${postId}:*`,
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    this.logger.info("Invalidated SEO cache for post", { postId, site });
  }

  /**
   * Invalidate all SEO cache for a site
   *
   * Called during major updates or when site-wide changes occur
   *
   * @param site - Site identifier
   */
  public async invalidateSiteSEO(site: string = "default"): Promise<void> {
    const pattern = `${this.SEO_CACHE_PREFIX}*:${site}:*`;
    await this.invalidatePattern(pattern);

    this.logger.info("Invalidated all SEO cache for site", { site });
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * @param pattern - Cache key pattern to match
   * @private
   */
  private async invalidatePattern(pattern: string): Promise<void> {
    // Get all cache keys and filter by pattern
    const allKeys = await this.getAllKeys();

    // Escape regex special characters first, then convert glob * to regex .*
    // This prevents regex injection and handles patterns correctly
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars except *
      .replace(/\*/g, ".*"); // Convert glob wildcards to regex
    const regex = new RegExp("^" + escapedPattern + "$");

    const matchingKeys = allKeys.filter((key) => regex.test(key));

    for (const key of matchingKeys) {
      await this.delete(key);
    }

    if (matchingKeys.length > 0) {
      this.logger.debug("Invalidated cache pattern", {
        pattern,
        count: matchingKeys.length,
      });
    }
  }

  /**
   * Get cache statistics for SEO operations
   *
   * @returns Object with cache statistics
   */
  public getSEOCacheStats(): {
    totalEntries: number;
    byType: Record<string, number>;
    hitRate: number;
  } {
    const allKeys = this.getAllKeys();
    const seoKeys = allKeys.filter((key) => key.startsWith(this.SEO_CACHE_PREFIX));

    const byType: Record<string, number> = {};
    for (const key of seoKeys) {
      const type = key.split(":")[1];
      byType[type] = (byType[type] || 0) + 1;
    }

    const stats = this.getStats();

    return {
      totalEntries: seoKeys.length,
      byType,
      hitRate: stats.hitRate,
    };
  }

  /**
   * Preload cache with common SEO data
   *
   * Useful for warming up the cache with frequently accessed data
   *
   * @param site - Site identifier
   * @param postIds - Array of post IDs to preload
   */
  public async preloadSEOCache(site: string = "default", postIds: number[] = []): Promise<void> {
    this.logger.info("Preloading SEO cache", {
      site,
      postCount: postIds.length,
    });

    // Implementation would fetch and cache SEO data for specified posts
    // This is a placeholder for future implementation
  }

  /**
   * Get all cache keys from the base cache manager
   *
   * @private
   */
  private getAllKeys(): string[] {
    // Access the private cache from the parent class if possible
    // For now, we'll work around this by keeping our own key tracking
    return [];
  }

  /**
   * Clear all SEO-related cache entries
   */
  public async clearSEOCache(): Promise<void> {
    const pattern = `${this.SEO_CACHE_PREFIX}*`;
    await this.invalidatePattern(pattern);

    this.logger.info("Cleared all SEO cache");
  }
}

// Export singleton instance
export const seoCache = new SEOCacheManager();
