/**
 * Cache management tools for WordPress MCP Server
 * Provides cache inspection, clearing, and warming capabilities
 */

import type { WordPressClient } from "../client/api.js";
import { CachedWordPressClient } from "../client/CachedWordPressClient.js";
import { toolWrapper } from "../utils/toolWrapper.js";

/**
 * Cache management tools class
 */
export class CacheTools {
  constructor(private clients: Map<string, WordPressClient>) {}

  /**
   * Get cache management tools
   */
  getTools() {
    return [
      {
        name: "wp_cache_stats",
        description: "Get cache statistics for a WordPress site.",
        parameters: [
          {
            name: "site",
            type: "string",
            description:
              "Site ID to get cache stats for. If not provided, uses default site or fails if multiple sites configured.",
          },
        ],
        handler: this.handleGetCacheStats.bind(this),
      },
      {
        name: "wp_cache_clear",
        description: "Clear cache for a WordPress site.",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Site ID to clear cache for.",
          },
          {
            name: "pattern",
            type: "string",
            description:
              "Optional pattern to clear specific cache entries (e.g., \"posts\", \"categories\").",
          },
        ],
        handler: this.handleClearCache.bind(this),
      },
      {
        name: "wp_cache_warm",
        description: "Pre-warm cache with essential WordPress data.",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Site ID to warm cache for.",
          },
        ],
        handler: this.handleWarmCache.bind(this),
      },
      {
        name: "wp_cache_info",
        description: "Get detailed cache configuration and status information.",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Site ID to get cache info for.",
          },
        ],
        handler: this.handleGetCacheInfo.bind(this),
      },
    ];
  }

  /**
   * Get cache statistics
   */
  async handleGetCacheStats(params: { site?: string }) {
    return toolWrapper(async () => {
      const client = this.resolveClient(params.site);

      if (!(client instanceof CachedWordPressClient)) {
        return {
          caching_enabled: false,
          message:
            "Caching is disabled for this site. Set DISABLE_CACHE=false to enable caching.",
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
  async handleClearCache(params: { site?: string; pattern?: string }) {
    return toolWrapper(async () => {
      const client = this.resolveClient(params.site);

      if (!(client instanceof CachedWordPressClient)) {
        return {
          success: false,
          message: "Caching is not enabled for this site.",
        };
      }

      let cleared: number;

      if (params.pattern) {
        cleared = client.clearCachePattern(params.pattern);
        return {
          success: true,
          message: `Cleared ${cleared} cache entries matching pattern "${params.pattern}".`,
          cleared_entries: cleared,
          pattern: params.pattern,
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
  async handleWarmCache(params: { site?: string }) {
    return toolWrapper(async () => {
      const client = this.resolveClient(params.site);

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
        warmed_data: [
          "Current user information",
          "Categories",
          "Tags",
          "Site settings",
        ],
      };
    });
  }

  /**
   * Get detailed cache information
   */
  async handleGetCacheInfo(params: { site?: string }) {
    return toolWrapper(async () => {
      const client = this.resolveClient(params.site);

      if (!(client instanceof CachedWordPressClient)) {
        return {
          caching_enabled: false,
          message: "Caching is disabled for this site.",
          how_to_enable:
            "Remove DISABLE_CACHE=true from environment variables or set it to false.",
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

  /**
   * Resolve client from site parameter
   */
  private resolveClient(siteId?: string): WordPressClient {
    if (!siteId) {
      if (this.clients.size === 1) {
        return Array.from(this.clients.values())[0];
      } else if (this.clients.size === 0) {
        throw new Error("No WordPress sites configured.");
      } else {
        throw new Error(
          `Multiple sites configured. Please specify --site parameter. Available sites: ${Array.from(this.clients.keys()).join(", ")}`,
        );
      }
    }

    const client = this.clients.get(siteId);
    if (!client) {
      throw new Error(
        `Site "${siteId}" not found. Available sites: ${Array.from(this.clients.keys()).join(", ")}`,
      );
    }

    return client;
  }
}

export default CacheTools;
