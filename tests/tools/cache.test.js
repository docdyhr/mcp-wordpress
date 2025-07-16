import { jest } from "@jest/globals";
import { CacheTools } from "../../dist/tools/cache.js";

describe("CacheTools", () => {
  let cacheTools;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      cacheManager: {
        getStats: jest.fn(),
        clear: jest.fn(),
        resetStats: jest.fn(),
        getAllCachedKeys: jest.fn(),
        getCacheContent: jest.fn(),
      },
    };

    cacheTools = new CacheTools();
  });

  describe("getTools", () => {
    it("should return an array of cache tools", () => {
      const tools = cacheTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(4);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_cache_stats");
      expect(toolNames).toContain("wp_clear_cache");
      expect(toolNames).toContain("wp_cache_list");
      expect(toolNames).toContain("wp_cache_inspect");
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
    it("should return cache statistics", async () => {
      const mockStats = {
        hits: 150,
        misses: 50,
        sets: 200,
        deletes: 10,
        evictions: 5,
        hitRate: 0.75,
        totalRequests: 200,
        memoryUsage: 1048576, // 1MB
        size: 100,
        maxSize: 1000,
        sites: ["site1", "site2"],
      };

      mockClient.cacheManager.getStats.mockReturnValue(mockStats);

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({}, mockClient);

      expect(result).toMatchObject({
        content: [
          {
            type: "text",
            text: expect.stringContaining("Cache Statistics"),
          },
        ],
      });

      const text = result.content[0].text;
      expect(text).toContain("Hit Rate: 75.00%");
      expect(text).toContain("Total Requests: 200");
      expect(text).toContain("Hits: 150");
      expect(text).toContain("Misses: 50");
      expect(text).toContain("Memory Usage: 1.00 MB");
      expect(text).toContain("Cache Size: 100 / 1000 items");
      expect(text).toContain("Active Sites: 2");
    });

    it("should handle empty cache stats", async () => {
      const emptyStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        hitRate: 0,
        totalRequests: 0,
        memoryUsage: 0,
        size: 0,
        maxSize: 1000,
        sites: [],
      };

      mockClient.cacheManager.getStats.mockReturnValue(emptyStats);

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({}, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Hit Rate: 0.00%");
      expect(text).toContain("Memory Usage: 0.00 MB");
      expect(text).toContain("Cache is empty");
    });

    it("should show reset option if stats available", async () => {
      const mockStats = {
        hits: 10,
        misses: 5,
        totalRequests: 15,
        hitRate: 0.667,
        size: 5,
        maxSize: 100,
      };

      mockClient.cacheManager.getStats.mockReturnValue(mockStats);

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Use wp_clear_cache --reset-stats to reset statistics only");
    });

    it("should handle error when getting stats", async () => {
      mockClient.cacheManager.getStats.mockImplementation(() => {
        throw new Error("Failed to get stats");
      });

      const tools = cacheTools.getTools();
      const statsTool = tools.find((t) => t.name === "wp_cache_stats");
      const result = await statsTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to get cache statistics");
      expect(result.content[0].text).toContain("Failed to get stats");
    });
  });

  describe("wp_clear_cache", () => {
    it("should clear all cache entries", async () => {
      mockClient.cacheManager.clear.mockResolvedValue(undefined);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_clear_cache");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("✅ Cache cleared successfully");
      expect(mockClient.cacheManager.clear).toHaveBeenCalledWith();
      expect(mockClient.cacheManager.resetStats).not.toHaveBeenCalled();
    });

    it("should clear cache for specific site", async () => {
      mockClient.cacheManager.clear.mockResolvedValue(undefined);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_clear_cache");
      const result = await clearTool.handler({ site_id: "site1" }, mockClient);

      expect(result.content[0].text).toContain("✅ Cache cleared successfully for site: site1");
      expect(mockClient.cacheManager.clear).toHaveBeenCalledWith("site1");
    });

    it("should reset stats only when flag is set", async () => {
      mockClient.cacheManager.resetStats.mockResolvedValue(undefined);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_clear_cache");
      const result = await clearTool.handler({ reset_stats: true }, mockClient);

      expect(result.content[0].text).toContain("✅ Cache statistics reset successfully");
      expect(mockClient.cacheManager.resetStats).toHaveBeenCalled();
      expect(mockClient.cacheManager.clear).not.toHaveBeenCalled();
    });

    it("should handle clear cache errors", async () => {
      mockClient.cacheManager.clear.mockRejectedValue(new Error("Clear failed"));

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_clear_cache");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to clear cache");
      expect(result.content[0].text).toContain("Clear failed");
    });
  });

  describe("wp_cache_list", () => {
    it("should list all cached keys", async () => {
      const mockKeys = [
        { key: "posts:list:page1", size: 1024, ttl: 3600, created: Date.now() - 1000 },
        { key: "post:123", size: 512, ttl: 7200, created: Date.now() - 2000 },
        { key: "user:456", size: 256, ttl: 1800, created: Date.now() - 3000 },
      ];

      mockClient.cacheManager.getAllCachedKeys.mockReturnValue(mockKeys);

      const tools = cacheTools.getTools();
      const listTool = tools.find((t) => t.name === "wp_cache_list");
      const result = await listTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Cache Entries (3 total)");
      expect(result.content[0].text).toContain("posts:list:page1");
      expect(result.content[0].text).toContain("1.00 KB");
      expect(result.content[0].text).toContain("TTL: 1h");
    });

    it("should filter by pattern", async () => {
      const mockKeys = [
        { key: "posts:list:page1", size: 1024 },
        { key: "post:123", size: 512 },
        { key: "user:456", size: 256 },
      ];

      mockClient.cacheManager.getAllCachedKeys.mockReturnValue(mockKeys);

      const tools = cacheTools.getTools();
      const listTool = tools.find((t) => t.name === "wp_cache_list");
      const result = await listTool.handler({ pattern: "post" }, mockClient);

      expect(result.content[0].text).toContain("Cache Entries (2 total, filtered by: post)");
      expect(result.content[0].text).toContain("posts:list:page1");
      expect(result.content[0].text).toContain("post:123");
      expect(result.content[0].text).not.toContain("user:456");
    });

    it("should handle empty cache", async () => {
      mockClient.cacheManager.getAllCachedKeys.mockReturnValue([]);

      const tools = cacheTools.getTools();
      const listTool = tools.find((t) => t.name === "wp_cache_list");
      const result = await listTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("No cache entries found");
    });

    it("should show total size", async () => {
      const mockKeys = [
        { key: "key1", size: 1024 },
        { key: "key2", size: 2048 },
        { key: "key3", size: 512 },
      ];

      mockClient.cacheManager.getAllCachedKeys.mockReturnValue(mockKeys);

      const tools = cacheTools.getTools();
      const listTool = tools.find((t) => t.name === "wp_cache_list");
      const result = await listTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Total Size: 3.50 KB");
    });
  });

  describe("wp_cache_inspect", () => {
    it("should inspect a specific cache entry", async () => {
      const mockEntry = {
        key: "post:123",
        value: { id: 123, title: "Test Post", content: "Test content" },
        size: 512,
        ttl: 3600,
        created: Date.now() - 1000,
        accessed: Date.now() - 500,
        hits: 5,
      };

      mockClient.cacheManager.getCacheContent.mockReturnValue(mockEntry);

      const tools = cacheTools.getTools();
      const inspectTool = tools.find((t) => t.name === "wp_cache_inspect");
      const result = await inspectTool.handler({ key: "post:123" }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Cache Entry: post:123");
      expect(text).toContain("Size: 512 bytes");
      expect(text).toContain("TTL: 1h");
      expect(text).toContain("Hits: 5");
      expect(text).toContain("Value (JSON):");
      expect(text).toContain('"id": 123');
      expect(text).toContain('"title": "Test Post"');
    });

    it("should handle non-existent key", async () => {
      mockClient.cacheManager.getCacheContent.mockReturnValue(null);

      const tools = cacheTools.getTools();
      const inspectTool = tools.find((t) => t.name === "wp_cache_inspect");
      const result = await inspectTool.handler({ key: "non-existent" }, mockClient);

      expect(result.content[0].text).toContain("Cache entry not found: non-existent");
    });

    it("should handle large values", async () => {
      const largeValue = { data: "x".repeat(1000) };
      const mockEntry = {
        key: "large:entry",
        value: largeValue,
        size: 2048,
      };

      mockClient.cacheManager.getCacheContent.mockReturnValue(mockEntry);

      const tools = cacheTools.getTools();
      const inspectTool = tools.find((t) => t.name === "wp_cache_inspect");
      const result = await inspectTool.handler({ key: "large:entry" }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("[Value truncated - showing first 500 characters]");
    });

    it("should handle inspect errors", async () => {
      mockClient.cacheManager.getCacheContent.mockImplementation(() => {
        throw new Error("Inspect failed");
      });

      const tools = cacheTools.getTools();
      const inspectTool = tools.find((t) => t.name === "wp_cache_inspect");
      const result = await inspectTool.handler({ key: "test" }, mockClient);

      expect(result.content[0].text).toContain("Failed to inspect cache entry");
      expect(result.content[0].text).toContain("Inspect failed");
    });
  });

  describe("parameter validation", () => {
    it("should have proper parameter definitions", () => {
      const tools = cacheTools.getTools();

      const clearTool = tools.find((t) => t.name === "wp_clear_cache");
      expect(clearTool.parameters).toEqual([
        {
          name: "site_id",
          type: "string",
          description: "Clear cache for a specific site only",
          required: false,
        },
        {
          name: "reset_stats",
          type: "boolean",
          description: "Only reset statistics without clearing cache entries",
          required: false,
        },
      ]);

      const inspectTool = tools.find((t) => t.name === "wp_cache_inspect");
      expect(inspectTool.parameters).toEqual([
        {
          name: "key",
          type: "string",
          description: "The cache key to inspect",
          required: true,
        },
      ]);
    });
  });
});
