import { jest } from "@jest/globals";
import { MetricsCollector } from "../../dist/performance/MetricsCollector.js";

describe("MetricsCollector", () => {
  let collector;
  let mockMonitor;

  beforeEach(() => {
    // Create a mock PerformanceMonitor
    mockMonitor = {
      recordRequest: jest.fn(),
      updateCacheMetrics: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        requests: {
          total: 100,
          failed: 5,
          averageResponseTime: 250,
        },
        cache: {
          hitRate: 0.85,
          totalSize: 1000,
        },
        system: {
          memoryUsage: 75,
          cpuUsage: 30,
        },
        tools: {
          toolUsageCount: {},
          toolResponseTimes: {},
        },
      }),
      getAlerts: jest.fn().mockReturnValue([]),
      stop: jest.fn(),
    };

    collector = new MetricsCollector(mockMonitor);
  });

  afterEach(() => {
    if (collector) {
      collector.stop();
    }
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create collector with default configuration", () => {
      expect(collector).toBeDefined();
      expect(collector.constructor.name).toBe("MetricsCollector");
    });

    it("should accept custom configuration", () => {
      const customCollector = new MetricsCollector(mockMonitor, {
        enableRealTime: false,
        collectInterval: 60000,
      });

      expect(customCollector).toBeDefined();
    });
  });

  describe("metrics collection", () => {
    it("should collect current metrics from monitor", () => {
      const metrics = collector.collectCurrentMetrics();
      expect(mockMonitor.getMetrics).toHaveBeenCalled();
      expect(metrics).toEqual({
        requests: {
          total: 100,
          failed: 5,
          averageResponseTime: 250,
        },
        cache: {
          hitRate: 0.85,
          totalSize: 1000,
        },
        system: {
          memoryUsage: 75,
          cpuUsage: 30,
        },
        tools: {
          toolUsageCount: {},
          toolResponseTimes: {},
        },
      });
    });

    it("should get aggregated cache stats", () => {
      const stats = collector.getAggregatedCacheStats();
      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("evictions");
      expect(stats).toHaveProperty("totalSize");
      expect(stats).toHaveProperty("hitRate");
    });

    it("should get aggregated client stats", () => {
      const stats = collector.getAggregatedClientStats();
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("successfulRequests");
      expect(stats).toHaveProperty("failedRequests");
      expect(stats).toHaveProperty("averageResponseTime");
      expect(stats).toHaveProperty("rateLimitHits");
      expect(stats).toHaveProperty("authFailures");
    });
  });

  describe("client registration", () => {
    it("should register clients", () => {
      const mockClient = { request: jest.fn() };
      collector.registerClient("site1", mockClient);

      // Just verify no errors - internal state is private
      expect(() => collector.registerClient("site2", mockClient)).not.toThrow();
    });

    it("should handle client without request method", () => {
      const mockClient = {}; // No request method

      // Should not throw
      expect(() => collector.registerClient("site1", mockClient)).not.toThrow();
    });
  });

  describe("cache manager registration", () => {
    it("should register cache managers", () => {
      const mockCacheManager = {
        getStats: jest.fn().mockReturnValue({
          hits: 10,
          misses: 2,
          evictions: 1,
          totalSize: 100,
          hitRate: 0.83,
        }),
      };

      collector.registerCacheManager("site1", mockCacheManager);

      // Verify by checking aggregated stats includes this cache
      const stats = collector.getAggregatedCacheStats();
      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(2);
    });
  });

  describe("tool tracking", () => {
    it("should track tool execution", async () => {
      const executionId = collector.startToolExecution("wp_list_posts", { per_page: 10 }, "site1");
      expect(executionId).toBeTruthy();
      expect(typeof executionId).toBe("string");

      // Wait a bit to ensure some response time
      await new Promise((resolve) => setTimeout(resolve, 10));

      collector.endToolExecution(executionId, true);
      expect(mockMonitor.recordRequest).toHaveBeenCalledWith(expect.any(Number), true, "wp_list_posts");
    });

    it("should handle tool execution errors", () => {
      const executionId = collector.startToolExecution("wp_list_posts", {}, "site1");
      const error = new Error("Test error");

      collector.endToolExecution(executionId, false, error);
      expect(mockMonitor.recordRequest).toHaveBeenCalledWith(expect.any(Number), false, "wp_list_posts");
    });

    it("should handle invalid execution IDs gracefully", () => {
      // Should not throw
      expect(() => collector.endToolExecution("invalid-id", true)).not.toThrow();
      expect(mockMonitor.recordRequest).not.toHaveBeenCalled();
    });
  });

  describe("request tracking", () => {
    it("should record raw requests", () => {
      collector.recordRawRequest(150, true, "/wp/v2/posts", false);
      expect(mockMonitor.recordRequest).toHaveBeenCalledWith(150, true);
    });

    it("should record cached requests", () => {
      collector.recordRawRequest(5, true, "/wp/v2/posts", true);
      expect(mockMonitor.recordRequest).toHaveBeenCalledWith(5, true);
    });
  });

  describe("site metrics", () => {
    it("should get metrics for specific site", () => {
      const mockClient = {
        getStats: jest.fn().mockReturnValue({
          totalRequests: 50,
          successfulRequests: 45,
          failedRequests: 5,
          averageResponseTime: 200,
          rateLimitHits: 0,
          authFailures: 0,
        }),
      };

      const mockCache = {
        getStats: jest.fn().mockReturnValue({
          hits: 100,
          misses: 20,
          evictions: 5,
          totalSize: 500,
          hitRate: 0.83,
        }),
      };

      collector.registerClient("site1", mockClient);
      collector.registerCacheManager("site1", mockCache);

      const siteMetrics = collector.getSiteMetrics("site1");
      expect(siteMetrics).toHaveProperty("client");
      expect(siteMetrics).toHaveProperty("cache");
      expect(siteMetrics.isActive).toBe(true);
      expect(mockClient.getStats).toHaveBeenCalled();
      expect(mockCache.getStats).toHaveBeenCalled();
    });

    it("should handle missing site", () => {
      const siteMetrics = collector.getSiteMetrics("non-existent");
      expect(siteMetrics.isActive).toBe(false);
      expect(siteMetrics.client).toBeUndefined();
      expect(siteMetrics.cache).toBeUndefined();
    });
  });

  describe("performance comparison", () => {
    it("should compare site performance", () => {
      // Register multiple sites with different performance characteristics
      const sites = ["site1", "site2", "site3"];
      sites.forEach((site, index) => {
        collector.registerClient(site, {
          getStats: jest.fn().mockReturnValue({
            totalRequests: 100 * (index + 1),
            successfulRequests: 100 * (index + 1) - 5 * (index + 1),
            failedRequests: 5 * (index + 1),
            averageResponseTime: 100 * (index + 1),
            rateLimitHits: 0,
            authFailures: 0,
          }),
        });

        collector.registerCacheManager(site, {
          getStats: jest.fn().mockReturnValue({
            hits: 80 - index * 10,
            misses: 20 + index * 10,
            evictions: 0,
            totalSize: 1000,
            hitRate: (80 - index * 10) / 100,
          }),
        });
      });

      const comparison = collector.compareSitePerformance();
      expect(comparison.sites).toHaveLength(3);
      expect(comparison.bestPerforming).toBeTruthy();
      expect(comparison.worstPerforming).toBeTruthy();
      expect(comparison.comparison).toBeDefined();

      // Verify each site has comparison data
      sites.forEach((site) => {
        expect(comparison.comparison[site]).toHaveProperty("responseTime");
        expect(comparison.comparison[site]).toHaveProperty("cacheHitRate");
        expect(comparison.comparison[site]).toHaveProperty("errorRate");
        expect(comparison.comparison[site]).toHaveProperty("requestCount");
        expect(comparison.comparison[site]).toHaveProperty("ranking");
      });
    });
  });

  describe("optimization suggestions", () => {
    it("should generate optimization suggestions", () => {
      const suggestions = collector.generateOptimizationSuggestions();
      expect(suggestions).toHaveProperty("critical");
      expect(suggestions).toHaveProperty("recommended");
      expect(suggestions).toHaveProperty("optional");
      expect(Array.isArray(suggestions.critical)).toBe(true);
      expect(Array.isArray(suggestions.recommended)).toBe(true);
      expect(Array.isArray(suggestions.optional)).toBe(true);
    });

    it("should identify critical issues with poor performance", () => {
      // Mock poor performance metrics
      mockMonitor.getMetrics.mockReturnValue({
        requests: {
          total: 100,
          failed: 20,
          averageResponseTime: 6000, // > 5000ms
        },
        cache: {
          hitRate: 0.5,
          totalSize: 1000,
        },
        system: {
          memoryUsage: 90,
          cpuUsage: 80,
        },
        tools: {
          toolUsageCount: {},
          toolResponseTimes: {},
        },
      });

      const suggestions = collector.generateOptimizationSuggestions();
      expect(suggestions.critical.length).toBeGreaterThan(0);
      expect(suggestions.critical.some((s) => s.includes("Response times are critically high"))).toBe(true);
      expect(suggestions.critical.some((s) => s.includes("Error rate is critically high"))).toBe(true);
    });

    it("should provide recommendations for suboptimal performance", () => {
      // Mock suboptimal but not critical performance
      mockMonitor.getMetrics.mockReturnValue({
        requests: {
          total: 100,
          failed: 5,
          averageResponseTime: 2500, // Between 2000-5000ms
        },
        cache: {
          hitRate: 0.7, // Below 0.8
          totalSize: 1000,
        },
        system: {
          memoryUsage: 85, // Above 80%
          cpuUsage: 50,
        },
        tools: {
          toolUsageCount: {},
          toolResponseTimes: {},
        },
      });

      const suggestions = collector.generateOptimizationSuggestions();
      expect(suggestions.recommended.length).toBeGreaterThan(0);
      expect(suggestions.recommended.some((s) => s.includes("Cache hit rate is below 80%"))).toBe(true);
      expect(suggestions.recommended.some((s) => s.includes("Response times could be improved"))).toBe(true);
      expect(suggestions.recommended.some((s) => s.includes("Memory usage is high"))).toBe(true);
    });
  });

  describe("detailed report", () => {
    it("should export detailed performance report", () => {
      // Register a site to make the report more complete
      collector.registerClient("site1", {
        getStats: jest.fn().mockReturnValue({
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 200,
          rateLimitHits: 0,
          authFailures: 0,
        }),
      });

      const report = collector.exportDetailedReport();
      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("overview");
      expect(report).toHaveProperty("siteComparison");
      expect(report).toHaveProperty("aggregatedStats");
      expect(report.aggregatedStats).toHaveProperty("cache");
      expect(report.aggregatedStats).toHaveProperty("client");
      expect(report).toHaveProperty("optimizations");
      expect(report).toHaveProperty("alerts");

      // Verify timestamp is ISO format
      expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    });
  });

  describe("cleanup", () => {
    it("should stop monitoring and cleanup resources", () => {
      // Start some tool executions to verify they get cleaned up
      const executionId = collector.startToolExecution("test_tool", {}, "site1");

      collector.stop();
      expect(mockMonitor.stop).toHaveBeenCalled();

      // Verify tool execution is cleaned up (should not throw or record)
      collector.endToolExecution(executionId, true);
      expect(mockMonitor.recordRequest).not.toHaveBeenCalled();
    });
  });
});
