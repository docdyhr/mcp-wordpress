/**
 * Cache management tools for WordPress MCP Server
 * Provides cache inspection, clearing, and warming capabilities
 */

import type { WordPressClient } from "@/client/api.js";
import { CachedWordPressClient } from "@/client/CachedWordPressClient.js";
import { toolWrapper } from "@/utils/toolWrapper.js";
import { LoggerFactory } from "@/utils/logger.js";

/**
 * Cache management tools class
 */
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
          hits: stats.cache.hits,
          misses: stats.cache.misses,
          hit_rate: Math.round(stats.cache.hitRate * 100) + "%",
          total_entries: stats.cache.totalSize,
          evictions: stats.cache.evictions,
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
    this.logger.info("wp_cache_info: tool call received");
    return toolWrapper(async () => {
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
        cache_configuration: {
          max_size: "Configured in SecurityConfig.cache.maxSize",
          default_ttl: "Configured in SecurityConfig.cache.defaultTTL",
          lru_enabled: "Configured in SecurityConfig.cache.enableLRU",
          stats_enabled: "Configured in SecurityConfig.cache.enableStats",
        },
        ttl_presets: {
          static_data: "4 hours (site settings, user roles)",
          semi_static_data: "2 hours (categories, tags, user profiles)",
          dynamic_data: "15 minutes (posts, pages, comments)",
          session_data: "30 minutes (authentication, current user)",
          realtime_data: "1 minute (real-time data)",
        },
        current_stats: {
          total_entries: stats.cache.totalSize,
          hit_rate: Math.round(stats.cache.hitRate * 100) + "%",
          hits: stats.cache.hits,
          misses: stats.cache.misses,
          evictions: stats.cache.evictions,
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
    });
  }
}

export default CacheTools;
