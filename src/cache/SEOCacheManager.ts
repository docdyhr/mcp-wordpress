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
import { Config } from "@/config/Config.js";
import { LoggerFactory } from "@/utils/logger.js";

/**
 * Cache key for an SEO result: `seo:<kind>:<site>:<postId or ->:<post version or ->:<parameters>`. The site and post
 * are their own segments, so `invalidatePostSEO()`/`invalidateSiteSEO()` and the stats can find them. Every parameter
 * of the call goes in (sorted, without `force`), so no parameter that changes the result can be left out, and a
 * post-based result carries the post's last modification, so it never outlives an edit.
 */
export function seoResultKey(
  kind: string,
  params: object,
  post?: { modified_gmt?: string | undefined; modified?: string | undefined },
): string {
  const { site, postId } = params as { site?: unknown; postId?: unknown };
  const entries = Object.entries(params)
    .filter(([name, value]) => name !== "force" && value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const version = post ? post.modified_gmt || post.modified || "unknown" : "-";
  return [
    "seo",
    kind,
    typeof site === "string" && site ? site : "default",
    postId === undefined ? "-" : String(postId),
    version,
    JSON.stringify(Object.fromEntries(entries)),
  ].join(":");
}

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
      defaultTTL: 21600 * 1000, // 6 hours default for SEO operations (the base cache counts milliseconds)
      enableLRU: true,
      enableStats: true,
      sitePrefix: "seo",
    };
    super(config);
  }

  /** The configured TTL for an SEO result type, in seconds (SEO_CACHE_*_TTL where one exists). */
  public ttlFor(type: keyof typeof this.DEFAULT_TTL): number {
    return this.DEFAULT_TTL[type];
  }

  /**
   * Store an SEO result. SEO TTLs are seconds — the SEO_CACHE_*_TTL settings, DEFAULT_TTL and every SEO caller — while
   * the base cache counts milliseconds, so the conversion happens here, once.
   */
  override set<T>(key: string, value: T, ttlSeconds?: number, etag?: string, lastModified?: string): void {
    super.set(key, value, ttlSeconds === undefined ? undefined : ttlSeconds * 1000, etag, lastModified);
  }

  /**
   * Get SEO-specific cache key
   *
   * @param type - Type of SEO operation
   * @param site - Site identifier
   * @param identifier - Unique identifier (post ID, etc.)
   * @param suffix - Additional suffix for uniqueness
   * @returns Formatted cache key, `seo:<type>:<site>:<identifier>[:<suffix>]` (the same segments as `seoResultKey()`)
   */
  public getSEOCacheKey(
    type: keyof typeof this.DEFAULT_TTL,
    site: string,
    identifier: string | number,
    suffix?: string,
  ): string {
    // "seo", not SEO_CACHE_PREFIX: joining the prefix's own colon gave "seo::type", which nothing matched.
    const parts = ["seo", type, site, identifier];
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
    // Every SEO key is `seo:<kind>:<site>:<postId>:...` (seoResultKey(), getSEOCacheKey()).
    const count = await this.invalidateWhere((parts) => parts[2] === site && parts[3] === String(postId));

    this.logger.info("Invalidated SEO cache for post", { postId, site, count });
  }

  /**
   * Invalidate all SEO cache for a site
   *
   * Called during major updates or when site-wide changes occur
   *
   * @param site - Site identifier
   */
  public async invalidateSiteSEO(site: string = "default"): Promise<void> {
    const count = await this.invalidateWhere((parts) => parts[2] === site);

    this.logger.info("Invalidated all SEO cache for site", { site, count });
  }

  /**
   * Delete the SEO entries whose key segments (`seo:<kind>:<site>:<postId>:...`) match. Comparing segments, not a glob,
   * keeps site "s1" from matching "s10" and a post ID from matching inside the parameters.
   */
  private async invalidateWhere(matches: (parts: string[]) => boolean): Promise<number> {
    const keys = (await this.getAllKeys()).filter((key) => {
      const parts = key.split(":");
      return parts[0] === "seo" && matches(parts);
    });
    for (const key of keys) {
      await this.delete(key);
    }
    return keys.length;
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
    // This returned [] (a placeholder), so the invalidate/clear/stats methods never found an entry.
    return this.keys();
  }

  /**
   * Clear all SEO-related cache entries
   */
  public async clearSEOCache(): Promise<void> {
    await this.invalidateWhere(() => true);

    this.logger.info("Cleared all SEO cache");
  }
}

// Export singleton instance
export const seoCache = new SEOCacheManager();
