import { vi } from "vitest";
import { CacheTools } from "../../dist/tools/cache.js";
import { CachedWordPressClient } from "../../dist/client/CachedWordPressClient.js";

describe("CacheTools", () => {
  let cacheTools;
  let mockClient;
  let mockCachedClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock regular client
    mockClient = {
      cacheManager: {
        getStats: vi.fn(),
        clear: vi.fn(),
        resetStats: vi.fn(),
      },
    };

    // Mock cached client with cache functionality
    mockCachedClient = {
      getCacheStats: vi.fn(),
      clearCache: vi.fn(),
      clearCachePattern: vi.fn(),
      warmCache: vi.fn(),
    };

    // Make the cached client appear as instance of CachedWordPressClient
    Object.setPrototypeOf(mockCachedClient, CachedWordPressClient.prototype);

    const mockClients = new Map();
    mockClients.set("default", mockClient);
    mockClients.set("cached", mockCachedClient);

    cacheTools = new CacheTools(mockClients);
  });

  describe("getTools", () => {
    it("should return an array of cache tools", () => {
      const tools = cacheTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(4);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_cache_stats");
      expect(toolNames).toContain("wp_cache_clear");
      expect(toolNames).toContain("wp_cache_warm");
      expect(toolNames).toContain("wp_cache_info");
    });

    it("should have proper tool definitions", () => {
      const tools = cacheTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });
  });

  describe("wp_cache_stats", () => {
    it("should return cache statistics when caching is enabled", async () => {
      const mockStats = {
        cache: {
          hits: 150,
          misses: 50,
          hitRate: 0.75,
          totalSize: 100,
          evictions: 5,
        },
        invalidation: {
          queueSize: 10,
          rulesCount: 25,
          processing: false,
        },
      };

      mockCachedClient.getCacheStats.mockReturnValue(mockStats);

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({ site: "cached" });

      expect(result.caching_enabled).toBe(true);
      expect(result.cache_stats).toEqual({
        hits: 150,
        misses: 50,
        hit_rate: "75%",
        total_entries: 100,
        evictions: 5,
      });
      expect(result.invalidation_stats).toEqual({
        queue_size: 10,
        rules_count: 25,
        processing: false,
      });
    });

    it("should return disabled message when caching is disabled", async () => {
      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({ site: "default" });

      expect(result.caching_enabled).toBe(false);
      expect(result.message).toContain("Caching is disabled for this site");
    });

    it("should handle cache stats errors", async () => {
      mockCachedClient.getCacheStats.mockImplementation(() => {
        throw new Error("Failed to get stats");
      });

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");

      await expect(statsTool.handler({ site: "cached" })).rejects.toThrow("Failed to get stats");
    });
  });

  describe("wp_cache_clear", () => {
    it("should clear all cache entries when caching is enabled", async () => {
      mockCachedClient.clearCache.mockReturnValue(75);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({ site: "cached" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Cleared all cache entries (75 total)");
      expect(result.cleared_entries).toBe(75);
      expect(mockCachedClient.clearCache).toHaveBeenCalledWith();
    });

    it("should clear cache entries by pattern when pattern is provided", async () => {
      mockCachedClient.clearCachePattern.mockReturnValue(25);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({ site: "cached", pattern: "posts" });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cleared 25 cache entries matching pattern "posts"');
      expect(result.cleared_entries).toBe(25);
      expect(result.pattern).toBe("posts");
      expect(mockCachedClient.clearCachePattern).toHaveBeenCalledWith("posts");
    });

    it("should return disabled message when caching is disabled", async () => {
      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({ site: "default" });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Caching is not enabled for this site");
    });

    it("should handle clear cache errors", async () => {
      mockCachedClient.clearCache.mockImplementation(() => {
        throw new Error("Clear failed");
      });

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");

      await expect(clearTool.handler({ site: "cached" })).rejects.toThrow("Clear failed");
    });
  });

  describe("wp_cache_warm", () => {
    it("should warm cache with essential data when caching is enabled", async () => {
      const mockStats = {
        cache: {
          totalSize: 50,
        },
      };

      mockCachedClient.warmCache.mockResolvedValue(undefined);
      mockCachedClient.getCacheStats.mockReturnValue(mockStats);

      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");
      const result = await warmTool.handler({ site: "cached" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Cache warmed with essential WordPress data");
      expect(result.cache_entries_after_warming).toBe(50);
      expect(result.warmed_data).toEqual(["Current user information", "Categories", "Tags", "Site settings"]);
      expect(mockCachedClient.warmCache).toHaveBeenCalledWith();
    });

    it("should return disabled message when caching is disabled", async () => {
      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");
      const result = await warmTool.handler({ site: "default" });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Caching is not enabled for this site");
    });

    it("should handle warm cache errors", async () => {
      mockCachedClient.warmCache.mockRejectedValue(new Error("Warm failed"));

      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");

      await expect(warmTool.handler({ site: "cached" })).rejects.toThrow("Warm failed");
    });
  });

  describe("wp_cache_info", () => {
    it("should return cache configuration info when caching is enabled", async () => {
      const mockStats = {
        cache: {
          totalSize: 100,
          hitRate: 0.85,
          hits: 170,
          misses: 30,
          evictions: 5,
        },
        invalidation: {
          queueSize: 5,
          rulesCount: 15,
          processing: true,
        },
      };

      mockCachedClient.getCacheStats.mockReturnValue(mockStats);

      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");
      const result = await infoTool.handler({ site: "cached" });

      expect(result.caching_enabled).toBe(true);
      expect(result.cache_configuration).toBeDefined();
      expect(result.ttl_presets).toBeDefined();
      expect(result.current_stats).toEqual({
        total_entries: 100,
        hit_rate: "85%",
        hits: 170,
        misses: 30,
        evictions: 5,
      });
      expect(result.invalidation_info).toEqual({
        queue_size: 5,
        rules_registered: 15,
        currently_processing: true,
      });
      expect(result.performance_benefits).toBeDefined();
    });

    it("should return disabled message when caching is disabled", async () => {
      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");
      const result = await infoTool.handler({ site: "default" });

      expect(result.caching_enabled).toBe(false);
      expect(result.message).toContain("Caching is disabled for this site");
      expect(result.how_to_enable).toBeDefined();
    });

    it("should handle cache info errors", async () => {
      mockCachedClient.getCacheStats.mockImplementation(() => {
        throw new Error("Info failed");
      });

      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");

      await expect(infoTool.handler({ site: "cached" })).rejects.toThrow("Info failed");
    });
  });

  describe("parameter validation", () => {
    it("should have proper parameter definitions", () => {
      const tools = cacheTools.getTools();

      tools.forEach((tool) => {
        expect(tool.parameters).toBeDefined();
        expect(Array.isArray(tool.parameters)).toBe(true);

        tool.parameters.forEach((param) => {
          expect(param).toHaveProperty("name");
          expect(param).toHaveProperty("type");
          expect(param).toHaveProperty("description");
          expect(typeof param.name).toBe("string");
          expect(typeof param.type).toBe("string");
          expect(typeof param.description).toBe("string");
        });
      });
    });
  });

  describe("site resolution", () => {
    it("should handle invalid site gracefully", async () => {
      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");

      await expect(statsTool.handler({ site: "nonexistent" })).rejects.toThrow('Site "nonexistent" not found');
    });

    it("should handle multiple sites configuration", async () => {
      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");

      // Should fail when no site is specified with multiple sites
      await expect(statsTool.handler({})).rejects.toThrow("Multiple sites configured. Please specify --site parameter");
    });
  });
});
