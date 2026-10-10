/**
 * Cache management tools for WordPress MCP Server
 * Provides cache inspection, clearing, and warming capabilities
 */

import type { WordPressClient } from "@/client/api.js";
import { CachedWordPressClient } from "@/client/CachedWordPressClient.js";
import { toolWrapper } from "@/utils/toolWrapper.js";
import { LoggerFactory } from "@/utils/logger.js";
import { SecurityConfig } from "@/security/SecurityConfig.js";

/**
 * Cache management tools class
 */
/** "14400000" -> "4 hours"; exact units only, otherwise raw milliseconds. */
function formatDuration(ms: number): string {
  const units: Array<[string, number]> = [
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ];
  for (const [name, size] of units) {
    if (ms >= size && ms % size === 0) {
      const count = ms / size;
      return `${count} ${name}${count === 1 ? "" : "s"}`;
    }
  }
  return `${ms} ms`;
}

// Each site has its own cache whose counters run from server start (clearing entries keeps them). The
// performance tools report every site's caches combined, so their hit rate can differ from this one.
const CACHE_SCOPE_THIS_SITE = "this site only, since the server started";

export class CacheTools {
  private readonly logger = LoggerFactory.tool("cache");

  constructor(private clients: Map<string, WordPressClient>) {}

  /**
   * Get cache management tools
   */
  getTools() {
    return [
      {
        name: "wp_cache_stats",
        description: "Get cache statistics for a WordPress site.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
        handler: this.handleGetCacheStats.bind(this),
      },
      {
        name: "wp_cache_clear",
        description: "Clear cache for a WordPress site.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pattern: {
              type: "string",
              description: 'Optional pattern to clear specific cache entries (e.g., "posts", "categories").',
            },
          },
        },
        handler: this.handleClearCache.bind(this),
      },
      {
        name: "wp_cache_warm",
        description: "Pre-warm cache with essential WordPress data.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
        handler: this.handleWarmCache.bind(this),
      },
      {
        name: "wp_cache_info",
        description: "Get detailed cache configuration and status information.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
        handler: this.handleGetCacheInfo.bind(this),
      },
    ];
  }

  /**
   * Get cache statistics
   */
  async handleGetCacheStats(client: WordPressClient, _params: Record<string, unknown>) {
    return toolWrapper(async () => {
      if (!(client instanceof CachedWordPressClient)) {
        return {
          caching_enabled: false,
          message: "Caching is disabled for this site. Set DISABLE_CACHE=false to enable caching.",
        };
      }

      const stats = client.getCacheStats();

      return {
        caching_enabled: true,
        cache_stats: {
          scope: CACHE_SCOPE_THIS_SITE,
          hits: stats.cache.hits,
          misses: stats.cache.misses,
          hit_rate: `${(stats.cache.hitRate * 100).toFixed(1)}%`,
          total_entries: stats.cache.totalSize,
          evictions: stats.cache.evictions,
          expirations: stats.cache.expirations,
        },
        invalidation_stats: {
          queue_size: stats.invalidation.queueSize,
          rules_count: stats.invalidation.rulesCount,
          processing: stats.invalidation.processing,
        },
      };
    });
  }

  /**
   * Clear cache
   */
  async handleClearCache(client: WordPressClient, params: Record<string, unknown>) {
    return toolWrapper(async () => {
      if (!(client instanceof CachedWordPressClient)) {
        return {
          success: false,
          message: "Caching is not enabled for this site.",
        };
      }

      let cleared: number;
      const pattern = params.pattern as string | undefined;

      if (pattern) {
        cleared = client.clearCachePattern(pattern);
        return {
          success: true,
          message: `Cleared ${cleared} cache entries matching pattern "${pattern}".`,
          cleared_entries: cleared,
          pattern,
        };
      } else {
        cleared = client.clearCache();
        return {
          success: true,
          message: `Cleared all cache entries (${cleared} total).`,
          cleared_entries: cleared,
        };
      }
    });
  }

  /**
   * Warm cache with essential data
   */
  async handleWarmCache(client: WordPressClient, _params: Record<string, unknown>) {
    this.logger.info("wp_cache_warm: tool call received");
    return toolWrapper(async () => {
      if (!(client instanceof CachedWordPressClient)) {
        return {
          success: false,
          message: "Caching is not enabled for this site.",
        };
      }

      await client.warmCache();

      const stats = client.getCacheStats();

      return {
        success: true,
        message: "Cache warmed with essential WordPress data.",
        cache_entries_after_warming: stats.cache.totalSize,
        warmed_data: ["Current user information", "Categories", "Tags", "Site settings"],
      };
    });
  }

  /**
   * Get detailed cache information
   */
  async handleGetCacheInfo(client: WordPressClient, _params: Record<string, unknown>) {
    const start = Date.now();
    this.logger.debug("cache info: enter", { tool: "wp_cache_info" });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("wp_cache_info timed out after 5000ms")), 5000);
    });

    try {
      const result = await Promise.race([
        toolWrapper(async () => {
          if (!(client instanceof CachedWordPressClient)) {
            return {
              caching_enabled: false,
              message: "Caching is disabled for this site.",
              how_to_enable: "Remove DISABLE_CACHE=true from environment variables or set it to false.",
            };
          }

          const stats = client.getCacheStats();

          return {
            caching_enabled: true,
            // The same SecurityConfig.cache values CachedWordPressClient builds its CacheManager from.
            cache_configuration: {
              max_size: SecurityConfig.cache.maxSize,
              default_ttl: formatDuration(SecurityConfig.cache.defaultTTL),
              default_ttl_ms: SecurityConfig.cache.defaultTTL,
              lru_enabled: SecurityConfig.cache.enableLRU,
              stats_enabled: SecurityConfig.cache.enableStats,
            },
            ttl_presets: {
              static_data: `${formatDuration(SecurityConfig.cache.ttlPresets.static)} (site settings, user roles)`,
              semi_static_data: `${formatDuration(SecurityConfig.cache.ttlPresets.semiStatic)} (categories, tags, user profiles)`,
              dynamic_data: `${formatDuration(SecurityConfig.cache.ttlPresets.dynamic)} (posts, pages, comments)`,
              session_data: `${formatDuration(SecurityConfig.cache.ttlPresets.session)} (authentication, current user)`,
              realtime_data: `${formatDuration(SecurityConfig.cache.ttlPresets.realtime)} (real-time data)`,
            },
            current_stats: {
              scope: CACHE_SCOPE_THIS_SITE,
              total_entries: stats.cache.totalSize,
              hit_rate: `${(stats.cache.hitRate * 100).toFixed(1)}%`,
              hits: stats.cache.hits,
              misses: stats.cache.misses,
              evictions: stats.cache.evictions,
              expirations: stats.cache.expirations,
            },
            invalidation_info: {
              queue_size: stats.invalidation.queueSize,
              rules_registered: stats.invalidation.rulesCount,
              currently_processing: stats.invalidation.processing,
            },
            performance_benefits: [
              "Reduced API calls to WordPress",
              "Faster response times for repeated requests",
              "Better rate limit utilization",
              "Improved user experience",
            ],
          };
        }),
        timeoutPromise,
      ]);

      this.logger.debug("cache info: exit", { tool: "wp_cache_info", durationMs: Date.now() - start });
      return result;
    } catch (err) {
      this.logger.error("cache info: failed", {
        tool: "wp_cache_info",
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        caching_enabled: false,
        status: "unavailable",
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

export default CacheTools;
