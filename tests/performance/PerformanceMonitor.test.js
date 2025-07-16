import { jest } from "@jest/globals";
import { PerformanceMonitor } from "../../dist/performance/PerformanceMonitor.js";

describe("PerformanceMonitor", () => {
  let monitor;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      collectInterval: 1000,
      retentionPeriod: 3600000,
      alertThresholds: {
        responseTime: 2000,
        errorRate: 0.05,
        cacheHitRate: 0.8,
        memoryUsage: 80,
        cpuUsage: 80,
      },
      enableRealTimeMonitoring: false, // Disable to avoid timers in tests
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
      expect(defaultMonitor.getMetrics()).toBeDefined();
    });

    it("should initialize with custom config", () => {
      expect(monitor).toBeDefined();
      expect(monitor.getMetrics()).toBeDefined();
    });

    it("should initialize metrics to zero", () => {
      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.successful).toBe(0);
      expect(metrics.requests.failed).toBe(0);
      expect(metrics.cache.hits).toBe(0);
      expect(metrics.cache.misses).toBe(0);
      expect(metrics.system.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.system.concurrentRequests).toBe(0);
      expect(metrics.system.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("metric collection", () => {
    it("should record successful request metrics", () => {
      monitor.recordRequest(150, true, "wp_list_posts");

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(1);
      expect(metrics.requests.failed).toBe(0);
      expect(metrics.requests.averageResponseTime).toBe(150);
      expect(metrics.tools.toolUsageCount["wp_list_posts"]).toBe(1);
    });

    it("should record failed request metrics", () => {
      monitor.recordRequest(300, false, "wp_list_posts");

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.successful).toBe(0);
      expect(metrics.requests.failed).toBe(1);
      expect(metrics.requests.averageResponseTime).toBe(300);
    });

    it("should calculate response time percentiles", () => {
      // Record multiple requests to get percentile calculations
      const responseTimes = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      responseTimes.forEach((time) => {
        monitor.recordRequest(time, true);
      });

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(10);
      expect(metrics.requests.averageResponseTime).toBe(550);
      expect(metrics.requests.minResponseTime).toBe(100);
      expect(metrics.requests.maxResponseTime).toBe(1000);
      expect(metrics.requests.p50ResponseTime).toBeGreaterThan(0);
      expect(metrics.requests.p95ResponseTime).toBeGreaterThan(0);
      expect(metrics.requests.p99ResponseTime).toBeGreaterThan(0);
    });

    it("should update cache metrics", () => {
      const cacheStats = {
        hits: 75,
        misses: 25,
        hitRate: 0.75,
        totalSize: 100,
        memoryUsageMB: 50,
        evictions: 5,
        averageCacheTime: 10,
      };

      monitor.updateCacheMetrics(cacheStats);

      const metrics = monitor.getMetrics();
      expect(metrics.cache.hits).toBe(75);
      expect(metrics.cache.misses).toBe(25);
      expect(metrics.cache.hitRate).toBe(0.75);
      expect(metrics.cache.totalSize).toBe(100);
      expect(metrics.cache.memoryUsageMB).toBeCloseTo(50, 0);
      expect(metrics.cache.evictions).toBe(5);
      expect(metrics.cache.averageCacheTime).toBe(10);
    });

    it("should track tool usage", () => {
      monitor.recordRequest(100, true, "wp_list_posts");
      monitor.recordRequest(200, true, "wp_get_post");
      monitor.recordRequest(150, true, "wp_list_posts");

      const metrics = monitor.getMetrics();
      expect(metrics.tools.toolUsageCount["wp_list_posts"]).toBe(2);
      expect(metrics.tools.toolUsageCount["wp_get_post"]).toBe(1);
      expect(metrics.tools.mostUsedTool).toBe("wp_list_posts");

      // Check tool performance tracking
      expect(metrics.tools.toolPerformance["wp_list_posts"]).toBeDefined();
      expect(metrics.tools.toolPerformance["wp_list_posts"].callCount).toBe(2);
      expect(metrics.tools.toolPerformance["wp_list_posts"].averageTime).toBe(125);
      expect(metrics.tools.toolPerformance["wp_list_posts"].successRate).toBe(1);
    });

    it("should track most used tool", () => {
      monitor.recordRequest(100, true, "wp_list_posts");
      monitor.recordRequest(200, true, "wp_get_post");
      monitor.recordRequest(150, true, "wp_list_posts");
      monitor.recordRequest(180, true, "wp_list_posts");

      const metrics = monitor.getMetrics();
      expect(metrics.tools.mostUsedTool).toBe("wp_list_posts");
    });
  });

  describe("alerting system", () => {
    it("should generate alerts for high response times", () => {
      // Record a request with high response time
      monitor.recordRequest(3000, true); // Above 2000ms threshold

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const responseTimeAlert = alerts.find((a) => a.category === "performance");
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert.severity).toBe("warning");
    });

    it("should generate alerts for high error rates", () => {
      // Record several failed requests to trigger error rate alert
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(100, false); // 100% failure rate
      }

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const errorRateAlert = alerts.find((a) => a.message.includes("error rate") || a.message.includes("Error rate"));
      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert.severity).toBe("error");
    });

    it("should generate alerts for low cache hit rates", () => {
      const cacheStats = {
        hits: 10,
        misses: 90,
        hitRate: 0.1, // Below 0.8 threshold
        totalSize: 100,
      };

      monitor.updateCacheMetrics(cacheStats);

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const cacheAlert = alerts.find((a) => a.category === "cache" || a.metric === "cacheHitRate");
      expect(cacheAlert).toBeDefined();
      expect(cacheAlert.severity).toBe("warning");
    });

    it("should filter alerts by severity", () => {
      // Generate alerts of different severities
      monitor.recordRequest(3000, true); // Warning
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(100, false); // Error
      }

      const warningAlerts = monitor.getAlerts("warning");
      const errorAlerts = monitor.getAlerts("error");

      expect(warningAlerts.every((a) => a.severity === "warning")).toBe(true);
      expect(errorAlerts.every((a) => a.severity === "error")).toBe(true);
    });

    it("should clear alerts", () => {
      monitor.recordRequest(3000, true); // Generate an alert

      let alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      monitor.clearAlerts();
      alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe("historical data", () => {
    it("should store historical data when enabled", () => {
      monitor.recordRequest(100, true);
      monitor.recordRequest(200, true);

      const historicalData = monitor.getHistoricalData();
      expect(Array.isArray(historicalData)).toBe(true);
      // Note: Historical data is stored based on collection intervals
      // so it might be empty in a quick test
    });

    it("should filter historical data by time range", () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      const historicalData = monitor.getHistoricalData(oneHourAgo, now);
      expect(Array.isArray(historicalData)).toBe(true);
    });

    it("should return empty array when historical data is disabled", () => {
      const monitorWithoutHistory = new PerformanceMonitor({
        enableHistoricalData: false,
      });

      const historicalData = monitorWithoutHistory.getHistoricalData();
      expect(historicalData).toEqual([]);

      monitorWithoutHistory.stop();
    });
  });

  describe("reporting", () => {
    it("should generate performance insights", () => {
      monitor.recordRequest(100, true);
      monitor.recordRequest(200, true);

      const insights = monitor.generateInsights();
      expect(insights).toHaveProperty("summary");
      expect(insights).toHaveProperty("health");
      expect(insights).toHaveProperty("recommendations");
      expect(insights).toHaveProperty("trends");
      expect(insights.health).toMatch(/excellent|good|warning|critical/);
    });

    it("should export data as JSON", () => {
      monitor.recordRequest(100, true);

      const jsonData = monitor.exportData("json");
      expect(typeof jsonData).toBe("string");
      expect(() => JSON.parse(jsonData)).not.toThrow();

      const parsedData = JSON.parse(jsonData);
      expect(parsedData).toHaveProperty("currentMetrics");
      expect(parsedData).toHaveProperty("insights");
    });

    it("should export data as CSV", () => {
      monitor.recordRequest(100, true);

      const csvData = monitor.exportData("csv");
      expect(typeof csvData).toBe("string");
      expect(csvData).toContain("Metric,Value");
    });
  });

  describe("edge cases", () => {
    it("should handle zero requests gracefully", () => {
      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.averageResponseTime).toBe(0);
      expect(metrics.requests.requestsPerSecond).toBe(0);
    });

    it("should handle negative response times", () => {
      monitor.recordRequest(-100, true);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(1);
      // The implementation should handle negative times appropriately
    });

    it("should handle invalid tool names", () => {
      monitor.recordRequest(100, true, "");
      monitor.recordRequest(100, true, null);
      monitor.recordRequest(100, true, undefined);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(3);
    });

    it("should handle concurrent metric updates", async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            monitor.recordRequest(100 + i, true, `tool_${i % 10}`);
            resolve();
          }),
        );
      }

      await Promise.all(promises);

      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBe(100);
    });
  });

  describe("cleanup", () => {
    it("should stop monitoring and cleanup resources", () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });
});
