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
      },
    };

    const mockClients = new Map();
    mockClients.set("default", mockClient);
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

      expect(result.content[0].text).toContain("Use wp_cache_clear --reset-stats to reset statistics only");
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

  describe("wp_cache_clear", () => {
    it("should clear all cache entries", async () => {
      mockClient.cacheManager.clear.mockResolvedValue(true);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("✅ Cache cleared successfully");
      expect(mockClient.cacheManager.clear).toHaveBeenCalledWith();
    });

    it("should clear cache for specific site", async () => {
      mockClient.cacheManager.clear.mockResolvedValue(true);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({ site: "site1" }, mockClient);

      expect(result.content[0].text).toContain("✅ Cache cleared successfully for site: site1");
      expect(mockClient.cacheManager.clear).toHaveBeenCalledWith("site1");
    });

    it("should reset stats only when flag is set", async () => {
      mockClient.cacheManager.resetStats.mockResolvedValue(true);

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({ reset_stats: true }, mockClient);

      expect(result.content[0].text).toContain("✅ Cache statistics reset successfully");
      expect(mockClient.cacheManager.resetStats).toHaveBeenCalledWith();
    });

    it("should handle clear cache errors", async () => {
      mockClient.cacheManager.clear.mockRejectedValue(new Error("Clear failed"));

      const tools = cacheTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_cache_clear");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to clear cache");
      expect(result.content[0].text).toContain("Clear failed");
    });
  });

  describe("wp_cache_warm", () => {
    it("should warm cache with essential data", async () => {
      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");
      const result = await warmTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("🔥 Cache Warming");
      expect(result.content[0].text).toContain("Cache warming initiated");
    });

    it("should handle warm cache for specific site", async () => {
      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");
      const result = await warmTool.handler({ site: "site1" }, mockClient);

      expect(result.content[0].text).toContain("🔥 Cache Warming");
      expect(result.content[0].text).toContain("Cache warming for site: site1");
    });

    it("should handle warm cache errors", async () => {
      const tools = cacheTools.getTools();
      const warmTool = tools.find((t) => t.name === "wp_cache_warm");

      // Mock console.error for any errors during cache warming
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await warmTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("🔥 Cache Warming");

      consoleSpy.mockRestore();
    });
  });

  describe("wp_cache_info", () => {
    it("should return cache configuration info", async () => {
      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");
      const result = await infoTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("ℹ️ Cache Information");
      expect(result.content[0].text).toContain("Cache status: Active");
    });

    it("should handle cache info for specific site", async () => {
      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");
      const result = await infoTool.handler({ site: "site1" }, mockClient);

      expect(result.content[0].text).toContain("ℹ️ Cache Information");
      expect(result.content[0].text).toContain("Site: site1");
    });

    it("should handle cache info errors", async () => {
      const tools = cacheTools.getTools();
      const infoTool = tools.find((t) => t.name === "wp_cache_info");

      // Mock console.error for any errors during info gathering
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await infoTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("ℹ️ Cache Information");

      consoleSpy.mockRestore();
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
});
