import { jest } from "@jest/globals";
import { PerformanceMonitor } from "../../dist/performance/PerformanceMonitor.js";

describe("PerformanceMonitor", () => {
  let monitor;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      collectInterval: 1000,
      retentionPeriod: 60000,
      alertThresholds: {
        responseTime: 500,
        errorRate: 0.05,
        cacheHitRate: 0.7,
        memoryUsage: 0.8,
        cpuUsage: 0.8,
      },
      enableRealTimeMonitoring: true,
      enableHistoricalData: true,
      enableAlerts: true,
    };

    monitor = new PerformanceMonitor(mockConfig);
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
      expect(defaultMonitor.getConfig()).toBeDefined();
    });

    it("should initialize with custom config", () => {
      expect(monitor.getConfig()).toEqual(mockConfig);
    });

    it("should initialize metrics to zero", () => {
      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.cache.hits).toBe(0);
      expect(metrics.system.uptime).toBeGreaterThan(0);
    });
  });

  describe("metric collection", () => {
    it("should record request metrics", () => {
      monitor.recordRequest(200, 150);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(1);
      expect(metrics.requests.failed).toBe(0);
      expect(metrics.requests.averageResponseTime).toBe(150);
    });

    it("should record failed requests", () => {
      monitor.recordRequest(500, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(0);
      expect(metrics.requests.failed).toBe(1);
    });

    it("should calculate response time percentiles", () => {
      // Record multiple requests to test percentiles
      for (let i = 0; i < 100; i++) {
        monitor.recordRequest(200, i * 10); // 0, 10, 20, ..., 990ms
      }

      const metrics = monitor.getMetrics();
      expect(metrics.requests.p50ResponseTime).toBe(490);
      expect(metrics.requests.p95ResponseTime).toBe(940);
      expect(metrics.requests.p99ResponseTime).toBe(980);
    });

    it("should record cache hits", () => {
      monitor.recordCacheHit("posts", 150);

      const metrics = monitor.getMetrics();
      expect(metrics.cache.hits).toBe(1);
      expect(metrics.cache.misses).toBe(0);
      expect(metrics.cache.hitRate).toBe(1);
    });

    it("should record cache misses", () => {
      monitor.recordCacheMiss("posts", 50);

      const metrics = monitor.getMetrics();
      expect(metrics.cache.hits).toBe(0);
      expect(metrics.cache.misses).toBe(1);
      expect(metrics.cache.hitRate).toBe(0);
    });

    it("should calculate cache hit rate", () => {
      monitor.recordCacheHit("posts", 100);
      monitor.recordCacheHit("users", 120);
      monitor.recordCacheMiss("comments", 80);

      const metrics = monitor.getMetrics();
      expect(metrics.cache.hits).toBe(2);
      expect(metrics.cache.misses).toBe(1);
      expect(metrics.cache.hitRate).toBeCloseTo(0.667, 2);
    });

    it("should record tool usage", () => {
      monitor.recordToolUsage("wp_get_posts", 200, true);
      monitor.recordToolUsage("wp_get_posts", 180, true);
      monitor.recordToolUsage("wp_get_posts", 220, false);

      const metrics = monitor.getMetrics();
      expect(metrics.tools.toolUsageCount["wp_get_posts"]).toBe(3);
      expect(metrics.tools.toolPerformance["wp_get_posts"].callCount).toBe(3);
      expect(metrics.tools.toolPerformance["wp_get_posts"].averageTime).toBe(200);
      expect(metrics.tools.toolPerformance["wp_get_posts"].successRate).toBeCloseTo(0.667, 2);
    });

    it("should track most used tool", () => {
      monitor.recordToolUsage("wp_get_posts", 200, true);
      monitor.recordToolUsage("wp_get_posts", 180, true);
      monitor.recordToolUsage("wp_get_users", 150, true);

      const metrics = monitor.getMetrics();
      expect(metrics.tools.mostUsedTool).toBe("wp_get_posts");
    });
  });

  describe("system monitoring", () => {
    it("should collect system metrics", () => {
      monitor.collectSystemMetrics();

      const metrics = monitor.getMetrics();
      expect(metrics.system.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.system.uptime).toBeGreaterThan(0);
    });

    it("should track active connections", () => {
      monitor.incrementActiveConnections();
      monitor.incrementActiveConnections();

      const metrics = monitor.getMetrics();
      expect(metrics.system.activeConnections).toBe(2);

      monitor.decrementActiveConnections();
      const updatedMetrics = monitor.getMetrics();
      expect(updatedMetrics.system.activeConnections).toBe(1);
    });

    it("should track concurrent requests", () => {
      monitor.incrementConcurrentRequests();
      monitor.incrementConcurrentRequests();

      const metrics = monitor.getMetrics();
      expect(metrics.system.concurrentRequests).toBe(2);

      monitor.decrementConcurrentRequests();
      const updatedMetrics = monitor.getMetrics();
      expect(updatedMetrics.system.concurrentRequests).toBe(1);
    });
  });

  describe("alerting system", () => {
    it("should generate alerts for high response times", () => {
      monitor.recordRequest(200, 600); // Exceeds 500ms threshold

      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe("warning");
      expect(alerts[0].category).toBe("performance");
      expect(alerts[0].metric).toBe("responseTime");
      expect(alerts[0].actualValue).toBe(600);
    });

    it("should generate alerts for high error rates", () => {
      // Generate 10 requests with 6 failures (60% error rate)
      for (let i = 0; i < 4; i++) {
        monitor.recordRequest(200, 150);
      }
      for (let i = 0; i < 6; i++) {
        monitor.recordRequest(500, 200);
      }

      const alerts = monitor.getAlerts();
      const errorRateAlert = alerts.find((a) => a.metric === "errorRate");
      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert.severity).toBe("error");
      expect(errorRateAlert.actualValue).toBe(0.6);
    });

    it("should generate alerts for low cache hit rates", () => {
      // Generate cache operations with low hit rate
      monitor.recordCacheHit("posts", 100);
      monitor.recordCacheMiss("posts", 80);
      monitor.recordCacheMiss("users", 90);
      monitor.recordCacheMiss("comments", 85);

      const alerts = monitor.getAlerts();
      const cacheAlert = alerts.find((a) => a.metric === "cacheHitRate");
      expect(cacheAlert).toBeDefined();
      expect(cacheAlert.severity).toBe("warning");
      expect(cacheAlert.actualValue).toBe(0.25);
    });

    it("should not generate duplicate alerts", () => {
      monitor.recordRequest(200, 600);
      monitor.recordRequest(200, 650);

      const alerts = monitor.getAlerts();
      const responseTimeAlerts = alerts.filter((a) => a.metric === "responseTime");
      expect(responseTimeAlerts).toHaveLength(1);
    });

    it("should clear resolved alerts", () => {
      monitor.recordRequest(200, 600); // Generate alert
      let alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(1);

      // Record several fast requests to resolve the alert
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(200, 100);
      }

      monitor.clearResolvedAlerts();
      alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe("historical data", () => {
    it("should store historical data when enabled", () => {
      monitor.recordRequest(200, 150);
      monitor.saveHistoricalSnapshot();

      const history = monitor.getHistoricalData();
      expect(history).toHaveLength(1);
      expect(history[0].requests.total).toBe(1);
    });

    it("should respect retention period", () => {
      const shortRetentionConfig = {
        ...mockConfig,
        retentionPeriod: 100, // 100ms
      };

      const shortTermMonitor = new PerformanceMonitor(shortRetentionConfig);

      shortTermMonitor.recordRequest(200, 150);
      shortTermMonitor.saveHistoricalSnapshot();

      // Wait for retention period to pass
      setTimeout(() => {
        shortTermMonitor.cleanupHistoricalData();
        const history = shortTermMonitor.getHistoricalData();
        expect(history).toHaveLength(0);
      }, 150);
    });

    it("should not store historical data when disabled", () => {
      const noHistoryConfig = {
        ...mockConfig,
        enableHistoricalData: false,
      };

      const noHistoryMonitor = new PerformanceMonitor(noHistoryConfig);
      noHistoryMonitor.recordRequest(200, 150);
      noHistoryMonitor.saveHistoricalSnapshot();

      const history = noHistoryMonitor.getHistoricalData();
      expect(history).toHaveLength(0);
    });
  });

  describe("real-time monitoring", () => {
    it("should start and stop monitoring", () => {
      expect(monitor.isRunning()).toBe(false);

      monitor.start();
      expect(monitor.isRunning()).toBe(true);

      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });

    it("should collect metrics at specified intervals", async () => {
      const fastConfig = {
        ...mockConfig,
        collectInterval: 50,
      };

      const fastMonitor = new PerformanceMonitor(fastConfig);
      const originalCollect = fastMonitor.collectSystemMetrics;
      let collectCount = 0;

      fastMonitor.collectSystemMetrics = () => {
        collectCount++;
        originalCollect.call(fastMonitor);
      };

      fastMonitor.start();

      await new Promise((resolve) => {
        setTimeout(() => {
          fastMonitor.stop();
          expect(collectCount).toBeGreaterThan(0);
          resolve();
        }, 120);
      });
    });
  });

  describe("reporting", () => {
    it("should generate performance report", () => {
      monitor.recordRequest(200, 150);
      monitor.recordRequest(200, 180);
      monitor.recordCacheHit("posts", 100);
      monitor.recordToolUsage("wp_get_posts", 200, true);

      const report = monitor.generateReport();

      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("requests");
      expect(report).toHaveProperty("cache");
      expect(report).toHaveProperty("tools");
      expect(report).toHaveProperty("alerts");

      expect(report.summary.totalRequests).toBe(2);
      expect(report.cache.hitRate).toBe(1);
      expect(report.tools.mostUsedTool).toBe("wp_get_posts");
    });

    it("should generate report with time range", () => {
      monitor.recordRequest(200, 150);
      monitor.saveHistoricalSnapshot();

      const report = monitor.generateReport(60000); // Last minute
      expect(report).toBeDefined();
    });

    it("should export report as JSON", () => {
      monitor.recordRequest(200, 150);

      const jsonReport = monitor.exportReport("json");
      expect(typeof jsonReport).toBe("string");
      expect(() => JSON.parse(jsonReport)).not.toThrow();
    });

    it("should export report as CSV", () => {
      monitor.recordRequest(200, 150);

      const csvReport = monitor.exportReport("csv");
      expect(typeof csvReport).toBe("string");
      expect(csvReport).toContain("metric,value");
    });
  });

  describe("benchmarking", () => {
    it("should run performance benchmark", async () => {
      const mockEndpoint = jest.fn().mockResolvedValue({ status: 200 });

      const benchmark = await monitor.runBenchmark({
        endpoint: mockEndpoint,
        duration: 100,
        concurrency: 2,
        targetRPS: 10,
      });

      expect(benchmark).toHaveProperty("duration");
      expect(benchmark).toHaveProperty("totalRequests");
      expect(benchmark).toHaveProperty("successfulRequests");
      expect(benchmark).toHaveProperty("averageLatency");
      expect(benchmark).toHaveProperty("throughput");

      expect(benchmark.totalRequests).toBeGreaterThan(0);
      expect(benchmark.successfulRequests).toBeGreaterThan(0);
      expect(benchmark.averageLatency).toBeGreaterThan(0);
    });

    it("should handle benchmark errors", async () => {
      const mockEndpoint = jest.fn().mockRejectedValue(new Error("Endpoint error"));

      const benchmark = await monitor.runBenchmark({
        endpoint: mockEndpoint,
        duration: 100,
        concurrency: 1,
      });

      expect(benchmark.failedRequests).toBeGreaterThan(0);
      expect(benchmark.successfulRequests).toBe(0);
    });
  });

  describe("health checks", () => {
    it("should return healthy status with good metrics", () => {
      monitor.recordRequest(200, 100);
      monitor.recordCacheHit("posts", 50);

      const health = monitor.getHealthStatus();
      expect(health.status).toBe("healthy");
      expect(health.score).toBeGreaterThan(80);
    });

    it("should return degraded status with performance issues", () => {
      monitor.recordRequest(200, 600); // Slow response
      monitor.recordRequest(500, 200); // Error

      const health = monitor.getHealthStatus();
      expect(health.status).toBe("degraded");
      expect(health.score).toBeLessThan(80);
    });

    it("should return critical status with severe issues", () => {
      // Generate many errors
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(500, 1000);
      }

      const health = monitor.getHealthStatus();
      expect(health.status).toBe("critical");
      expect(health.score).toBeLessThan(50);
    });
  });

  describe("memory management", () => {
    it("should limit metrics history size", () => {
      const limitedConfig = {
        ...mockConfig,
        maxHistorySize: 5,
      };

      const limitedMonitor = new PerformanceMonitor(limitedConfig);

      // Add more snapshots than the limit
      for (let i = 0; i < 10; i++) {
        limitedMonitor.recordRequest(200, 150);
        limitedMonitor.saveHistoricalSnapshot();
      }

      const history = limitedMonitor.getHistoricalData();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should clear old data on cleanup", () => {
      monitor.recordRequest(200, 150);
      monitor.saveHistoricalSnapshot();

      // Manually age the data
      const history = monitor.getHistoricalData();
      if (history.length > 0) {
        history[0].timestamp = Date.now() - 120000; // 2 minutes old
      }

      monitor.cleanupHistoricalData();
      const cleanedHistory = monitor.getHistoricalData();
      expect(cleanedHistory).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle zero requests gracefully", () => {
      const metrics = monitor.getMetrics();
      expect(metrics.requests.averageResponseTime).toBe(0);
      expect(metrics.requests.requestsPerSecond).toBe(0);
    });

    it("should handle negative response times", () => {
      monitor.recordRequest(200, -50);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid tool names", () => {
      expect(() => {
        monitor.recordToolUsage("", 100, true);
      }).not.toThrow();

      expect(() => {
        monitor.recordToolUsage(null, 100, true);
      }).not.toThrow();
    });

    it("should handle concurrent metric updates", () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            monitor.recordRequest(200, 100 + i);
          }),
        );
      }

      return Promise.all(promises).then(() => {
        const metrics = monitor.getMetrics();
        expect(metrics.requests.total).toBe(100);
      });
    });
  });
});
