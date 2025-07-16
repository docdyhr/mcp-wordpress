import { jest } from "@jest/globals";
import { MetricsCollector } from "../../dist/performance/MetricsCollector.js";

describe("MetricsCollector", () => {
  let collector;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      collectInterval: 1000,
      enableRealTimeCollection: true,
      maxMetricsHistory: 1000,
      aggregationWindow: 60000,
    };

    collector = new MetricsCollector(mockConfig);
  });

  afterEach(() => {
    if (collector) {
      collector.stop();
    }
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultCollector = new MetricsCollector();
      expect(defaultCollector).toBeDefined();
      expect(defaultCollector.getConfig()).toBeDefined();
    });

    it("should initialize with custom config", () => {
      expect(collector.getConfig()).toEqual(mockConfig);
    });

    it("should initialize empty metrics", () => {
      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("metric collection", () => {
    it("should collect HTTP request metrics", () => {
      const requestMetric = {
        type: "http_request",
        timestamp: Date.now(),
        method: "GET",
        url: "/wp/v2/posts",
        statusCode: 200,
        responseTime: 150,
        contentLength: 1024,
      };

      collector.collect(requestMetric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(requestMetric);
    });

    it("should collect cache metrics", () => {
      const cacheMetric = {
        type: "cache_operation",
        timestamp: Date.now(),
        operation: "get",
        key: "posts:page:1",
        hit: true,
        responseTime: 5,
      };

      collector.collect(cacheMetric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(cacheMetric);
    });

    it("should collect system metrics", () => {
      const systemMetric = {
        type: "system",
        timestamp: Date.now(),
        cpuUsage: 45.2,
        memoryUsage: 512000000,
        freeMemory: 2048000000,
        uptime: 3600,
      };

      collector.collect(systemMetric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(systemMetric);
    });

    it("should collect database metrics", () => {
      const dbMetric = {
        type: "database",
        timestamp: Date.now(),
        query: "SELECT * FROM wp_posts",
        executionTime: 25,
        rowsAffected: 10,
      };

      collector.collect(dbMetric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(dbMetric);
    });

    it("should collect tool usage metrics", () => {
      const toolMetric = {
        type: "tool_usage",
        timestamp: Date.now(),
        toolName: "wp_get_posts",
        executionTime: 200,
        success: true,
        parameters: { per_page: 10 },
      };

      collector.collect(toolMetric);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(toolMetric);
    });
  });

  describe("metric aggregation", () => {
    it("should aggregate HTTP request metrics", () => {
      const requests = [
        { type: "http_request", timestamp: Date.now(), method: "GET", statusCode: 200, responseTime: 100 },
        { type: "http_request", timestamp: Date.now(), method: "GET", statusCode: 200, responseTime: 150 },
        { type: "http_request", timestamp: Date.now(), method: "POST", statusCode: 201, responseTime: 200 },
        { type: "http_request", timestamp: Date.now(), method: "GET", statusCode: 404, responseTime: 50 },
      ];

      requests.forEach((req) => collector.collect(req));

      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated.http).toBeDefined();
      expect(aggregated.http.totalRequests).toBe(4);
      expect(aggregated.http.successfulRequests).toBe(3);
      expect(aggregated.http.failedRequests).toBe(1);
      expect(aggregated.http.averageResponseTime).toBe(125);
    });

    it("should aggregate cache metrics", () => {
      const cacheOps = [
        { type: "cache_operation", timestamp: Date.now(), operation: "get", hit: true, responseTime: 5 },
        { type: "cache_operation", timestamp: Date.now(), operation: "get", hit: true, responseTime: 3 },
        { type: "cache_operation", timestamp: Date.now(), operation: "get", hit: false, responseTime: 50 },
        { type: "cache_operation", timestamp: Date.now(), operation: "set", hit: null, responseTime: 8 },
      ];

      cacheOps.forEach((op) => collector.collect(op));

      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated.cache).toBeDefined();
      expect(aggregated.cache.totalOperations).toBe(4);
      expect(aggregated.cache.hits).toBe(2);
      expect(aggregated.cache.misses).toBe(1);
      expect(aggregated.cache.hitRate).toBe(2 / 3);
    });

    it("should aggregate tool usage metrics", () => {
      const toolUsage = [
        { type: "tool_usage", timestamp: Date.now(), toolName: "wp_get_posts", executionTime: 100, success: true },
        { type: "tool_usage", timestamp: Date.now(), toolName: "wp_get_posts", executionTime: 150, success: true },
        { type: "tool_usage", timestamp: Date.now(), toolName: "wp_get_posts", executionTime: 200, success: false },
        { type: "tool_usage", timestamp: Date.now(), toolName: "wp_get_users", executionTime: 80, success: true },
      ];

      toolUsage.forEach((usage) => collector.collect(usage));

      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated.tools).toBeDefined();
      expect(aggregated.tools.totalCalls).toBe(4);
      expect(aggregated.tools.byTool["wp_get_posts"].callCount).toBe(3);
      expect(aggregated.tools.byTool["wp_get_posts"].successRate).toBe(2 / 3);
      expect(aggregated.tools.byTool["wp_get_posts"].averageTime).toBe(150);
    });

    it("should handle empty metrics gracefully", () => {
      const aggregated = collector.getAggregatedMetrics();
      expect(aggregated.http.totalRequests).toBe(0);
      expect(aggregated.cache.totalOperations).toBe(0);
      expect(aggregated.tools.totalCalls).toBe(0);
    });
  });

  describe("time-based filtering", () => {
    it("should filter metrics by time range", () => {
      const now = Date.now();
      const metrics = [
        { type: "http_request", timestamp: now - 120000, responseTime: 100 }, // 2 minutes ago
        { type: "http_request", timestamp: now - 60000, responseTime: 150 }, // 1 minute ago
        { type: "http_request", timestamp: now - 30000, responseTime: 200 }, // 30 seconds ago
        { type: "http_request", timestamp: now, responseTime: 250 }, // now
      ];

      metrics.forEach((metric) => collector.collect(metric));

      const recent = collector.getMetrics(90000); // Last 1.5 minutes
      expect(recent).toHaveLength(3);
    });

    it("should aggregate metrics within time window", () => {
      const now = Date.now();
      const metrics = [
        { type: "http_request", timestamp: now - 120000, statusCode: 200, responseTime: 100 },
        { type: "http_request", timestamp: now - 60000, statusCode: 200, responseTime: 150 },
        { type: "http_request", timestamp: now - 30000, statusCode: 500, responseTime: 200 },
      ];

      metrics.forEach((metric) => collector.collect(metric));

      const aggregated = collector.getAggregatedMetrics(90000); // Last 1.5 minutes
      expect(aggregated.http.totalRequests).toBe(2); // Only recent 2 requests
      expect(aggregated.http.successfulRequests).toBe(1);
      expect(aggregated.http.failedRequests).toBe(1);
    });
  });

  describe("real-time collection", () => {
    it("should start and stop collection", () => {
      expect(collector.isRunning()).toBe(false);

      collector.start();
      expect(collector.isRunning()).toBe(true);

      collector.stop();
      expect(collector.isRunning()).toBe(false);
    });

    it("should collect system metrics automatically", async () => {
      const originalCollectSystem = collector.collectSystemMetrics;
      let collectCount = 0;

      collector.collectSystemMetrics = () => {
        collectCount++;
        return originalCollectSystem.call(collector);
      };

      collector.start();

      await new Promise((resolve) => {
        setTimeout(() => {
          collector.stop();
          expect(collectCount).toBeGreaterThan(0);
          resolve();
        }, 1200);
      });
    });

    it("should respect collection interval", async () => {
      const fastConfig = {
        ...mockConfig,
        collectInterval: 100,
      };

      const fastCollector = new MetricsCollector(fastConfig);
      let collectCount = 0;

      fastCollector.collectSystemMetrics = () => {
        collectCount++;
        return { type: "system", timestamp: Date.now(), cpuUsage: 50 };
      };

      fastCollector.start();

      await new Promise((resolve) => {
        setTimeout(() => {
          fastCollector.stop();
          expect(collectCount).toBeGreaterThan(2);
          resolve();
        }, 350);
      });
    });
  });

  describe("metric history management", () => {
    it("should limit history size", () => {
      const limitedConfig = {
        ...mockConfig,
        maxMetricsHistory: 5,
      };

      const limitedCollector = new MetricsCollector(limitedConfig);

      // Add more metrics than the limit
      for (let i = 0; i < 10; i++) {
        limitedCollector.collect({
          type: "http_request",
          timestamp: Date.now(),
          responseTime: 100 + i,
        });
      }

      const metrics = limitedCollector.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(5);
    });

    it("should remove old metrics", () => {
      const now = Date.now();
      const metrics = [
        { type: "http_request", timestamp: now - 300000, responseTime: 100 }, // 5 minutes ago
        { type: "http_request", timestamp: now - 60000, responseTime: 150 }, // 1 minute ago
        { type: "http_request", timestamp: now, responseTime: 200 }, // now
      ];

      metrics.forEach((metric) => collector.collect(metric));

      collector.cleanupOldMetrics(120000); // Keep last 2 minutes

      const remaining = collector.getMetrics();
      expect(remaining).toHaveLength(2);
    });
  });

  describe("performance metrics", () => {
    it("should calculate percentiles", () => {
      const responseTimes = [];
      for (let i = 0; i < 100; i++) {
        responseTimes.push(i * 10); // 0, 10, 20, ..., 990
        collector.collect({
          type: "http_request",
          timestamp: Date.now(),
          responseTime: i * 10,
        });
      }

      const percentiles = collector.getPercentiles();
      expect(percentiles.p50).toBe(490);
      expect(percentiles.p95).toBe(940);
      expect(percentiles.p99).toBe(980);
    });

    it("should calculate throughput", () => {
      const start = Date.now();

      for (let i = 0; i < 50; i++) {
        collector.collect({
          type: "http_request",
          timestamp: start + i * 100, // Spread over 5 seconds
          responseTime: 100,
        });
      }

      const throughput = collector.getThroughput(5000);
      expect(throughput).toBeCloseTo(10, 1); // 50 requests in 5 seconds = 10 RPS
    });

    it("should identify performance trends", () => {
      const baseTime = Date.now();

      // Add requests with increasing response times (degrading performance)
      for (let i = 0; i < 10; i++) {
        collector.collect({
          type: "http_request",
          timestamp: baseTime + i * 10000, // 10 second intervals
          responseTime: 100 + i * 20, // Increasing response times
        });
      }

      const trends = collector.getPerformanceTrends();
      expect(trends.responseTime.trend).toBe("degrading");
      expect(trends.responseTime.slope).toBeGreaterThan(0);
    });
  });

  describe("metric validation", () => {
    it("should validate metric structure", () => {
      const validMetric = {
        type: "http_request",
        timestamp: Date.now(),
        responseTime: 100,
      };

      expect(() => collector.collect(validMetric)).not.toThrow();
    });

    it("should reject invalid metrics", () => {
      const invalidMetrics = [
        null,
        undefined,
        {},
        { type: "unknown_type" },
        { timestamp: Date.now() },
        { type: "http_request", timestamp: "invalid" },
      ];

      invalidMetrics.forEach((metric) => {
        expect(() => collector.collect(metric)).toThrow();
      });
    });

    it("should sanitize metric values", () => {
      const unsafeMetric = {
        type: "http_request",
        timestamp: Date.now(),
        responseTime: -50, // Negative response time
        url: "https://example.com/<script>alert('xss')</script>",
      };

      collector.collect(unsafeMetric);

      const metrics = collector.getMetrics();
      expect(metrics[0].responseTime).toBe(0); // Sanitized to 0
      expect(metrics[0].url).not.toContain("<script>"); // XSS removed
    });
  });

  describe("event handling", () => {
    it("should emit events on metric collection", () => {
      const eventHandler = jest.fn();
      collector.on("metric_collected", eventHandler);

      const metric = {
        type: "http_request",
        timestamp: Date.now(),
        responseTime: 100,
      };

      collector.collect(metric);

      expect(eventHandler).toHaveBeenCalledWith(metric);
    });

    it("should emit events on aggregation", () => {
      const eventHandler = jest.fn();
      collector.on("metrics_aggregated", eventHandler);

      collector.collect({
        type: "http_request",
        timestamp: Date.now(),
        responseTime: 100,
      });

      const aggregated = collector.getAggregatedMetrics();

      expect(eventHandler).toHaveBeenCalledWith(aggregated);
    });
  });

  describe("error handling", () => {
    it("should handle collection errors gracefully", () => {
      const originalCollect = collector.collect;
      collector.collect = jest.fn().mockImplementation(() => {
        throw new Error("Collection error");
      });

      expect(() => {
        collector.collect({ type: "http_request", timestamp: Date.now() });
      }).not.toThrow();

      // Restore original method
      collector.collect = originalCollect;
    });

    it("should handle aggregation errors gracefully", () => {
      collector.collect({
        type: "http_request",
        timestamp: Date.now(),
        responseTime: 100,
      });

      // Mock aggregation to throw error
      const originalAggregate = collector.getAggregatedMetrics;
      collector.getAggregatedMetrics = jest.fn().mockImplementation(() => {
        throw new Error("Aggregation error");
      });

      expect(() => collector.getAggregatedMetrics()).not.toThrow();

      // Restore original method
      collector.getAggregatedMetrics = originalAggregate;
    });
  });

  describe("concurrent access", () => {
    it("should handle concurrent metric collection", async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            collector.collect({
              type: "http_request",
              timestamp: Date.now(),
              responseTime: 100 + i,
            });
          }),
        );
      }

      await Promise.all(promises);

      const metrics = collector.getMetrics();
      expect(metrics).toHaveLength(100);
    });

    it("should handle concurrent aggregation requests", async () => {
      // Add some metrics
      for (let i = 0; i < 10; i++) {
        collector.collect({
          type: "http_request",
          timestamp: Date.now(),
          responseTime: 100 + i,
        });
      }

      // Request aggregation concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => collector.getAggregatedMetrics()));
      }

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach((result) => {
        expect(result.http.totalRequests).toBe(10);
      });
    });
  });
});
