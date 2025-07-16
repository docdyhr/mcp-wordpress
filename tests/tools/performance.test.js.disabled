import { jest } from "@jest/globals";
import PerformanceTools from "../../dist/tools/performance.js";

describe("PerformanceTools", () => {
  let performanceTools;
  let mockClient;
  let mockPerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPerformanceMonitor = {
      getMetrics: jest.fn(),
      getReportAsJSON: jest.fn(),
      clearHistory: jest.fn(),
      getHealthStatus: jest.fn(),
      getMetricDetails: jest.fn(),
      runBenchmark: jest.fn(),
    };

    mockClient = {
      performanceMonitor: mockPerformanceMonitor,
    };

    performanceTools = new PerformanceTools();
  });

  describe("getTools", () => {
    it("should return an array of performance tools", () => {
      const tools = performanceTools.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("wp_performance_metrics");
      expect(toolNames).toContain("wp_performance_report");
      expect(toolNames).toContain("wp_performance_clear");
      expect(toolNames).toContain("wp_performance_health");
      expect(toolNames).toContain("wp_performance_details");
      expect(toolNames).toContain("wp_performance_benchmark");
    });

    it("should have proper tool definitions", () => {
      const tools = performanceTools.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.handler).toBe("function");
      });
    });
  });

  describe("wp_performance_metrics", () => {
    it("should return current performance metrics", async () => {
      const mockMetrics = {
        requestLatency: {
          current: 150,
          average: 200,
          min: 100,
          max: 500,
          p95: 450,
          p99: 490,
        },
        cachePerformance: {
          hitRate: 0.85,
          hits: 850,
          misses: 150,
          totalRequests: 1000,
        },
        errorRate: {
          rate: 0.02,
          totalErrors: 20,
          totalRequests: 1000,
        },
        memoryUsage: {
          used: 104857600, // 100MB
          total: 1073741824, // 1GB
          percentage: 0.0976,
        },
        throughput: {
          requestsPerSecond: 50,
          bytesPerSecond: 512000,
        },
      };

      mockPerformanceMonitor.getMetrics.mockReturnValue(mockMetrics);

      const tools = performanceTools.getTools();
      const metricsTool = tools.find((t) => t.name === "wp_performance_metrics");
      const result = await metricsTool.handler({}, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Performance Metrics");
      expect(text).toContain("Request Latency:");
      expect(text).toContain("Current: 150ms");
      expect(text).toContain("Average: 200ms");
      expect(text).toContain("P95: 450ms");
      expect(text).toContain("Cache Performance:");
      expect(text).toContain("Hit Rate: 85.00%");
      expect(text).toContain("Error Rate: 2.00%");
      expect(text).toContain("Memory Usage: 100.00 MB / 1024.00 MB (9.76%)");
      expect(text).toContain("Throughput: 50.0 req/s");
    });

    it("should filter metrics by type", async () => {
      const mockMetrics = {
        requestLatency: { current: 150, average: 200 },
        cachePerformance: { hitRate: 0.85 },
      };

      mockPerformanceMonitor.getMetrics.mockReturnValue(mockMetrics);

      const tools = performanceTools.getTools();
      const metricsTool = tools.find((t) => t.name === "wp_performance_metrics");
      const result = await metricsTool.handler({ metric_type: "latency" }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Performance Metrics (latency)");
      expect(text).toContain("Request Latency:");
      expect(text).not.toContain("Cache Performance:");
    });

    it("should handle empty metrics", async () => {
      mockPerformanceMonitor.getMetrics.mockReturnValue({});

      const tools = performanceTools.getTools();
      const metricsTool = tools.find((t) => t.name === "wp_performance_metrics");
      const result = await metricsTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("No performance metrics available");
    });

    it("should handle metrics errors", async () => {
      mockPerformanceMonitor.getMetrics.mockImplementation(() => {
        throw new Error("Failed to get metrics");
      });

      const tools = performanceTools.getTools();
      const metricsTool = tools.find((t) => t.name === "wp_performance_metrics");
      const result = await metricsTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to get performance metrics");
      expect(result.content[0].text).toContain("Failed to get metrics");
    });
  });

  describe("wp_performance_report", () => {
    it("should generate performance report", async () => {
      const mockReport = {
        summary: {
          period: "Last 24 hours",
          totalRequests: 10000,
          averageLatency: 200,
          cacheHitRate: 0.85,
          errorRate: 0.02,
          uptime: 0.999,
        },
        trends: {
          latencyTrend: "improving",
          errorTrend: "stable",
          throughputTrend: "increasing",
        },
        recommendations: [
          "Consider increasing cache TTL for better hit rate",
          "Monitor memory usage during peak hours",
        ],
        alerts: [{ level: "warning", message: "High latency detected at 14:00" }],
      };

      mockPerformanceMonitor.getReportAsJSON.mockReturnValue(mockReport);

      const tools = performanceTools.getTools();
      const reportTool = tools.find((t) => t.name === "wp_performance_report");
      const result = await reportTool.handler({}, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Performance Report");
      expect(text).toContain("Period: Last 24 hours");
      expect(text).toContain("Total Requests: 10,000");
      expect(text).toContain("Average Latency: 200ms");
      expect(text).toContain("Cache Hit Rate: 85.00%");
      expect(text).toContain("Uptime: 99.90%");
      expect(text).toContain("Trends:");
      expect(text).toContain("Latency: improving");
      expect(text).toContain("Recommendations:");
      expect(text).toContain("Consider increasing cache TTL");
      expect(text).toContain("⚠️ High latency detected at 14:00");
    });

    it("should filter report by time range", async () => {
      const mockReport = {
        summary: { period: "Last 1 hour" },
        trends: {},
        recommendations: [],
      };

      mockPerformanceMonitor.getReportAsJSON.mockReturnValue(mockReport);

      const tools = performanceTools.getTools();
      const reportTool = tools.find((t) => t.name === "wp_performance_report");
      const result = await reportTool.handler({ time_range: "1h" }, mockClient);

      expect(mockPerformanceMonitor.getReportAsJSON).toHaveBeenCalledWith("1h");
      expect(result.content[0].text).toContain("Period: Last 1 hour");
    });

    it("should show JSON format when requested", async () => {
      const mockReport = { test: "data" };
      mockPerformanceMonitor.getReportAsJSON.mockReturnValue(mockReport);

      const tools = performanceTools.getTools();
      const reportTool = tools.find((t) => t.name === "wp_performance_report");
      const result = await reportTool.handler({ format: "json" }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("```json");
      expect(text).toContain('"test": "data"');
    });
  });

  describe("wp_performance_clear", () => {
    it("should clear performance history", async () => {
      mockPerformanceMonitor.clearHistory.mockResolvedValue(undefined);

      const tools = performanceTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_performance_clear");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("✅ Performance history cleared successfully");
      expect(mockPerformanceMonitor.clearHistory).toHaveBeenCalled();
    });

    it("should handle clear errors", async () => {
      mockPerformanceMonitor.clearHistory.mockRejectedValue(new Error("Clear failed"));

      const tools = performanceTools.getTools();
      const clearTool = tools.find((t) => t.name === "wp_performance_clear");
      const result = await clearTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to clear performance history");
      expect(result.content[0].text).toContain("Clear failed");
    });
  });

  describe("wp_performance_health", () => {
    it("should show healthy status", async () => {
      const mockHealth = {
        status: "healthy",
        score: 95,
        checks: {
          latency: { status: "good", value: 150, threshold: 500 },
          errorRate: { status: "good", value: 0.01, threshold: 0.05 },
          cacheHitRate: { status: "good", value: 0.85, threshold: 0.7 },
          memory: { status: "good", value: 0.45, threshold: 0.8 },
        },
        issues: [],
      };

      mockPerformanceMonitor.getHealthStatus.mockReturnValue(mockHealth);

      const tools = performanceTools.getTools();
      const healthTool = tools.find((t) => t.name === "wp_performance_health");
      const result = await healthTool.handler({}, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Performance Health");
      expect(text).toContain("Status: ✅ HEALTHY");
      expect(text).toContain("Health Score: 95/100");
      expect(text).toContain("✅ Latency: 150ms (threshold: 500ms)");
      expect(text).toContain("✅ Error Rate: 1.00% (threshold: 5.00%)");
      expect(text).toContain("✅ Cache Hit Rate: 85.00% (threshold: 70.00%)");
      expect(text).toContain("No issues detected");
    });

    it("should show degraded status with issues", async () => {
      const mockHealth = {
        status: "degraded",
        score: 70,
        checks: {
          latency: { status: "warning", value: 600, threshold: 500 },
          errorRate: { status: "critical", value: 0.08, threshold: 0.05 },
        },
        issues: [
          { severity: "warning", message: "High latency detected" },
          { severity: "critical", message: "Error rate exceeds threshold" },
        ],
      };

      mockPerformanceMonitor.getHealthStatus.mockReturnValue(mockHealth);

      const tools = performanceTools.getTools();
      const healthTool = tools.find((t) => t.name === "wp_performance_health");
      const result = await healthTool.handler({}, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Status: ⚠️ DEGRADED");
      expect(text).toContain("⚠️ Latency: 600ms (threshold: 500ms)");
      expect(text).toContain("❌ Error Rate: 8.00% (threshold: 5.00%)");
      expect(text).toContain("Issues Detected:");
      expect(text).toContain("⚠️ High latency detected");
      expect(text).toContain("❌ Error rate exceeds threshold");
    });
  });

  describe("wp_performance_details", () => {
    it("should show detailed metrics", async () => {
      const mockDetails = {
        requestLatency: {
          samples: 1000,
          current: 150,
          average: 200,
          min: 50,
          max: 1000,
          p50: 180,
          p75: 250,
          p90: 400,
          p95: 600,
          p99: 900,
          histogram: [
            { range: "0-100ms", count: 200 },
            { range: "100-200ms", count: 500 },
            { range: "200-500ms", count: 250 },
            { range: "500ms+", count: 50 },
          ],
        },
      };

      mockPerformanceMonitor.getMetricDetails.mockReturnValue(mockDetails);

      const tools = performanceTools.getTools();
      const detailsTool = tools.find((t) => t.name === "wp_performance_details");
      const result = await detailsTool.handler({ metric: "latency" }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Detailed Metrics: latency");
      expect(text).toContain("Request Latency:");
      expect(text).toContain("Samples: 1,000");
      expect(text).toContain("P50: 180ms");
      expect(text).toContain("P95: 600ms");
      expect(text).toContain("Distribution:");
      expect(text).toContain("0-100ms: 200 (20.0%)");
    });

    it("should handle missing metric details", async () => {
      mockPerformanceMonitor.getMetricDetails.mockReturnValue(null);

      const tools = performanceTools.getTools();
      const detailsTool = tools.find((t) => t.name === "wp_performance_details");
      const result = await detailsTool.handler({ metric: "unknown" }, mockClient);

      expect(result.content[0].text).toContain("No detailed metrics available for: unknown");
    });
  });

  describe("wp_performance_benchmark", () => {
    it("should run performance benchmark", async () => {
      const mockBenchmark = {
        duration: 10000,
        totalRequests: 1000,
        successfulRequests: 980,
        failedRequests: 20,
        averageLatency: 150,
        minLatency: 50,
        maxLatency: 500,
        p95Latency: 300,
        throughput: 100,
        concurrency: 10,
      };

      mockPerformanceMonitor.runBenchmark.mockResolvedValue(mockBenchmark);

      const tools = performanceTools.getTools();
      const benchmarkTool = tools.find((t) => t.name === "wp_performance_benchmark");
      const result = await benchmarkTool.handler({ duration: 10 }, mockClient);

      const text = result.content[0].text;
      expect(text).toContain("Performance Benchmark Results");
      expect(text).toContain("Duration: 10s");
      expect(text).toContain("Total Requests: 1,000");
      expect(text).toContain("Success Rate: 98.00%");
      expect(text).toContain("Average Latency: 150ms");
      expect(text).toContain("Throughput: 100.0 req/s");
      expect(mockPerformanceMonitor.runBenchmark).toHaveBeenCalledWith({
        duration: 10000,
        concurrency: 10,
        targetRPS: undefined,
      });
    });

    it("should handle benchmark errors", async () => {
      mockPerformanceMonitor.runBenchmark.mockRejectedValue(new Error("Benchmark failed"));

      const tools = performanceTools.getTools();
      const benchmarkTool = tools.find((t) => t.name === "wp_performance_benchmark");
      const result = await benchmarkTool.handler({}, mockClient);

      expect(result.content[0].text).toContain("Failed to run performance benchmark");
      expect(result.content[0].text).toContain("Benchmark failed");
    });
  });

  describe("parameter validation", () => {
    it("should have proper parameter definitions", () => {
      const tools = performanceTools.getTools();

      const metricsTool = tools.find((t) => t.name === "wp_performance_metrics");
      const metricTypeParam = metricsTool.parameters.find((p) => p.name === "metric_type");
      expect(metricTypeParam.enum).toContain("latency");
      expect(metricTypeParam.enum).toContain("cache");
      expect(metricTypeParam.enum).toContain("errors");

      const benchmarkTool = tools.find((t) => t.name === "wp_performance_benchmark");
      const durationParam = benchmarkTool.parameters.find((p) => p.name === "duration");
      expect(durationParam.default).toBe(30);
      expect(durationParam.minimum).toBe(1);
      expect(durationParam.maximum).toBe(300);
    });
  });
});
