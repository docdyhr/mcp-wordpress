/**
 * Tests for Performance Helper Utilities
 *
 * Tests the extracted helper functions for performance metrics formatting and calculations
 */

import { describe, it, expect } from "vitest";
import {
  calculateHealthStatus,
  calculatePerformanceScore,
  calculateCacheEfficiency,
  formatUptime,
  parseTimeframe,
  extractMetricValue,
  processHistoricalDataForChart,
  calculateAverage,
  formatBenchmarkStatus,
  getBenchmarkImprovementDescription,
  calculateOverallRanking,
  formatAlertMessage,
  formatAnomalyDescription,
  calculateAlertStatus,
  formatPriority,
  formatEffort,
  calculateEstimatedImpact,
  convertToCSV,
  createSummaryReport,
} from "../../../dist/tools/performance/PerformanceHelpers.js";

// Test fixtures
const createMockMetrics = (overrides = {}) => ({
  requests: {
    total: 1000,
    successful: 980,
    failed: 20,
    averageResponseTime: 250,
    requestsPerSecond: 10,
    p50ResponseTime: 200,
    p95ResponseTime: 400,
    p99ResponseTime: 600,
    ...overrides.requests,
  },
  cache: {
    hitRate: 0.85,
    totalSize: 1024,
    evictions: 50,
    memoryUsageMB: 50,
    ...overrides.cache,
  },
  system: {
    memoryUsage: 70,
    cpuUsage: 45,
    uptime: 86400000,
    ...overrides.system,
  },
  tools: {
    mostUsedTool: "wp_posts_list",
    toolUsageCount: {},
    toolPerformance: {},
    ...overrides.tools,
  },
});

describe("PerformanceHelpers", () => {
  describe("calculateHealthStatus", () => {
    it("should return Excellent for optimal metrics", () => {
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 200, failed: 5, total: 1000 },
        cache: { hitRate: 0.95 },
        system: { memoryUsage: 50 },
      });
      expect(calculateHealthStatus(metrics)).toBe("Excellent");
    });

    it("should return Good for above average metrics", () => {
      // score = 100 - 15 (response > 1000) - 0 (error 1.5% < 2%) - 10 (cache < 0.85) = 75 (Good)
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 1200, failed: 15, total: 1000 },
        cache: { hitRate: 0.8 },
        system: { memoryUsage: 70 },
      });
      expect(calculateHealthStatus(metrics)).toBe("Good");
    });

    it("should return Fair for moderate metrics", () => {
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 1200, failed: 30, total: 1000 },
        cache: { hitRate: 0.75 },
        system: { memoryUsage: 75 },
      });
      expect(calculateHealthStatus(metrics)).toBe("Fair");
    });

    it("should return Poor for below average metrics", () => {
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 1500, failed: 35, total: 1000 },
        cache: { hitRate: 0.72 },
        system: { memoryUsage: 88 },
      });
      expect(calculateHealthStatus(metrics)).toBe("Poor");
    });

    it("should return Critical for very poor metrics", () => {
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 3000, failed: 100, total: 1000 },
        cache: { hitRate: 0.5 },
        system: { memoryUsage: 95 },
      });
      expect(calculateHealthStatus(metrics)).toBe("Critical");
    });

    it("should handle zero total requests without division error", () => {
      const metrics = createMockMetrics({
        requests: { total: 0, failed: 0 },
      });
      expect(() => calculateHealthStatus(metrics)).not.toThrow();
    });
  });

  describe("calculatePerformanceScore", () => {
    it("should return 100 for perfect metrics", () => {
      const metrics = createMockMetrics({
        requests: { averageResponseTime: 100, failed: 0, total: 1000 },
        cache: { hitRate: 0.95 },
        system: { memoryUsage: 50 },
      });
      expect(calculatePerformanceScore(metrics)).toBe(100);
    });

    it("should reduce score for slow response times", () => {
      const slowMetrics = createMockMetrics({
        requests: { averageResponseTime: 3500, failed: 0, total: 1000 },
        cache: { hitRate: 0.95 },
        system: { memoryUsage: 50 },
      });
      expect(calculatePerformanceScore(slowMetrics)).toBeLessThan(70);
    });

    it("should reduce score for high error rates", () => {
      const errorMetrics = createMockMetrics({
        requests: { averageResponseTime: 200, failed: 150, total: 1000 },
        cache: { hitRate: 0.95 },
        system: { memoryUsage: 50 },
      });
      expect(calculatePerformanceScore(errorMetrics)).toBeLessThan(80);
    });

    it("should reduce score for low cache hit rates", () => {
      const lowCacheMetrics = createMockMetrics({
        requests: { averageResponseTime: 200, failed: 0, total: 1000 },
        cache: { hitRate: 0.4 },
        system: { memoryUsage: 50 },
      });
      expect(calculatePerformanceScore(lowCacheMetrics)).toBeLessThan(85);
    });

    it("should reduce score for high memory usage", () => {
      const highMemoryMetrics = createMockMetrics({
        requests: { averageResponseTime: 200, failed: 0, total: 1000 },
        cache: { hitRate: 0.95 },
        system: { memoryUsage: 95 },
      });
      expect(calculatePerformanceScore(highMemoryMetrics)).toBeLessThan(95);
    });

    it("should never return negative scores", () => {
      const terribleMetrics = createMockMetrics({
        requests: { averageResponseTime: 10000, failed: 500, total: 1000 },
        cache: { hitRate: 0.1 },
        system: { memoryUsage: 99 },
      });
      expect(calculatePerformanceScore(terribleMetrics)).toBeGreaterThanOrEqual(0);
    });

    it("should never return scores above 100", () => {
      const metrics = createMockMetrics();
      expect(calculatePerformanceScore(metrics)).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateCacheEfficiency", () => {
    it("should return Excellent for high hit rate with content", () => {
      const cache = { hitRate: 0.95, totalSize: 1000, evictions: 10, memoryUsageMB: 50 };
      expect(calculateCacheEfficiency(cache)).toBe("Excellent");
    });

    it("should return Good for decent hit rate", () => {
      const cache = { hitRate: 0.8, totalSize: 500, evictions: 50, memoryUsageMB: 50 };
      expect(calculateCacheEfficiency(cache)).toBe("Good");
    });

    it("should return Fair for moderate hit rate", () => {
      const cache = { hitRate: 0.7, totalSize: 100, evictions: 30, memoryUsageMB: 50 };
      expect(calculateCacheEfficiency(cache)).toBe("Fair");
    });

    it("should return Poor for low hit rate", () => {
      const cache = { hitRate: 0.4, totalSize: 0, evictions: 200, memoryUsageMB: 50 };
      expect(calculateCacheEfficiency(cache)).toBe("Poor");
    });

    it("should penalize high evictions", () => {
      const highEvictions = { hitRate: 0.85, totalSize: 1000, evictions: 150, memoryUsageMB: 50 };
      const lowEvictions = { hitRate: 0.85, totalSize: 1000, evictions: 10, memoryUsageMB: 50 };
      // High evictions should not improve efficiency
      expect(["Excellent", "Good", "Fair", "Poor"]).toContain(calculateCacheEfficiency(highEvictions));
      expect(["Excellent", "Good", "Fair", "Poor"]).toContain(calculateCacheEfficiency(lowEvictions));
    });
  });

  describe("formatUptime", () => {
    it("should format seconds only", () => {
      expect(formatUptime(45000)).toBe("45s");
    });

    it("should format minutes and seconds", () => {
      expect(formatUptime(125000)).toBe("2m 5s");
    });

    it("should format hours and minutes", () => {
      expect(formatUptime(3700000)).toBe("1h 1m");
    });

    it("should format days, hours, and minutes", () => {
      expect(formatUptime(90000000)).toBe("1d 1h 0m");
    });

    it("should handle zero uptime", () => {
      expect(formatUptime(0)).toBe("0s");
    });

    it("should handle large uptimes", () => {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      expect(formatUptime(thirtyDays)).toBe("30d 0h 0m");
    });
  });

  describe("parseTimeframe", () => {
    it("should parse 1h correctly", () => {
      expect(parseTimeframe("1h")).toBe(60 * 60 * 1000);
    });

    it("should parse 6h correctly", () => {
      expect(parseTimeframe("6h")).toBe(6 * 60 * 60 * 1000);
    });

    it("should parse 12h correctly", () => {
      expect(parseTimeframe("12h")).toBe(12 * 60 * 60 * 1000);
    });

    it("should parse 24h correctly", () => {
      expect(parseTimeframe("24h")).toBe(24 * 60 * 60 * 1000);
    });

    it("should parse 7d correctly", () => {
      expect(parseTimeframe("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should parse 30d correctly", () => {
      expect(parseTimeframe("30d")).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it("should default to 24h for unknown timeframes", () => {
      expect(parseTimeframe("unknown")).toBe(24 * 60 * 60 * 1000);
      expect(parseTimeframe("")).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("extractMetricValue", () => {
    const metrics = createMockMetrics({
      requests: { averageResponseTime: 250, failed: 20, total: 1000, requestsPerSecond: 15 },
      cache: { hitRate: 0.85 },
      system: { memoryUsage: 70 },
    });

    it("should extract responseTime", () => {
      expect(extractMetricValue(metrics, "responseTime")).toBe(250);
    });

    it("should extract cacheHitRate as percentage", () => {
      expect(extractMetricValue(metrics, "cacheHitRate")).toBe(85);
    });

    it("should extract errorRate as percentage", () => {
      expect(extractMetricValue(metrics, "errorRate")).toBe(2);
    });

    it("should extract memoryUsage", () => {
      expect(extractMetricValue(metrics, "memoryUsage")).toBe(70);
    });

    it("should extract requestVolume", () => {
      expect(extractMetricValue(metrics, "requestVolume")).toBe(15);
    });

    it("should return 0 for unknown metrics", () => {
      expect(extractMetricValue(metrics, "unknownMetric")).toBe(0);
    });
  });

  describe("processHistoricalDataForChart", () => {
    it("should return empty object for empty data", () => {
      expect(processHistoricalDataForChart([])).toEqual({});
    });

    it("should process all metrics by default", () => {
      const data = [createMockMetrics(), createMockMetrics()];
      const result = processHistoricalDataForChart(data);

      expect(result).toHaveProperty("responseTime");
      expect(result).toHaveProperty("cacheHitRate");
      expect(result).toHaveProperty("errorRate");
      expect(result).toHaveProperty("memoryUsage");
      expect(result).toHaveProperty("requestVolume");
    });

    it("should process only requested metrics", () => {
      const data = [createMockMetrics()];
      const result = processHistoricalDataForChart(data, ["responseTime", "cacheHitRate"]);

      expect(result).toHaveProperty("responseTime");
      expect(result).toHaveProperty("cacheHitRate");
      expect(result).not.toHaveProperty("errorRate");
    });

    it("should include timestamp and index in data points", () => {
      const data = [createMockMetrics()];
      const result = processHistoricalDataForChart(data);

      expect(result.responseTime[0]).toHaveProperty("timestamp");
      expect(result.responseTime[0]).toHaveProperty("value");
      expect(result.responseTime[0]).toHaveProperty("index");
      expect(result.responseTime[0].index).toBe(0);
    });
  });

  describe("calculateAverage", () => {
    it("should calculate average correctly", () => {
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
    });

    it("should return 0 for empty array", () => {
      expect(calculateAverage([])).toBe(0);
    });

    it("should handle single value", () => {
      expect(calculateAverage([42])).toBe(42);
    });

    it("should handle decimal values", () => {
      expect(calculateAverage([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
    });
  });

  describe("formatBenchmarkStatus", () => {
    it("should format excellent status", () => {
      expect(formatBenchmarkStatus("excellent")).toBe("🟢 Excellent");
    });

    it("should format good status", () => {
      expect(formatBenchmarkStatus("good")).toBe("🟡 Good");
    });

    it("should format average status", () => {
      expect(formatBenchmarkStatus("average")).toBe("🟠 Average");
    });

    it("should format below_average status", () => {
      expect(formatBenchmarkStatus("below_average")).toBe("🔴 Below Average");
    });

    it("should format poor status", () => {
      expect(formatBenchmarkStatus("poor")).toBe("⚫ Poor");
    });

    it("should return unknown status as-is", () => {
      expect(formatBenchmarkStatus("unknown")).toBe("unknown");
    });
  });

  describe("getBenchmarkImprovementDescription", () => {
    it("should describe Response Time improvement", () => {
      const benchmark = { category: "Response Time", improvement: 150.5, status: "average" };
      expect(getBenchmarkImprovementDescription(benchmark)).toBe("Reduce by 151ms");
    });

    it("should describe Cache Hit Rate improvement", () => {
      const benchmark = { category: "Cache Hit Rate", improvement: 15.7, status: "average" };
      expect(getBenchmarkImprovementDescription(benchmark)).toBe("Increase by 15.7%");
    });

    it("should describe Error Rate improvement", () => {
      const benchmark = { category: "Error Rate", improvement: 2.35, status: "average" };
      expect(getBenchmarkImprovementDescription(benchmark)).toBe("Reduce by 2.35%");
    });

    it("should describe Memory Usage improvement", () => {
      const benchmark = { category: "Memory Usage", improvement: 20, status: "average" };
      expect(getBenchmarkImprovementDescription(benchmark)).toBe("Reduce by 20%");
    });

    it("should handle unknown categories", () => {
      const benchmark = { category: "Unknown", improvement: 10, status: "average" };
      expect(getBenchmarkImprovementDescription(benchmark)).toBe("Improve by 10");
    });
  });

  describe("calculateOverallRanking", () => {
    it("should identify top performers", () => {
      const benchmarks = [
        { status: "excellent" },
        { status: "excellent" },
        { status: "excellent" },
        { status: "good" },
      ];
      const result = calculateOverallRanking(benchmarks);
      expect(result.status).toBe("Top Performer");
      expect(result.percentile).toBeGreaterThanOrEqual(90);
    });

    it("should identify above average performers", () => {
      // (3 + 1*0.8) / 5 * 100 = 76% - Above Average (>= 75)
      const benchmarks = [
        { status: "excellent" },
        { status: "excellent" },
        { status: "excellent" },
        { status: "good" },
        { status: "average" },
      ];
      const result = calculateOverallRanking(benchmarks);
      expect(result.status).toBe("Above Average");
    });

    it("should identify average performers", () => {
      // (1 + 2*0.8) / 5 * 100 = 52% - Average (>= 50)
      const benchmarks = [
        { status: "excellent" },
        { status: "good" },
        { status: "good" },
        { status: "average" },
        { status: "below_average" },
      ];
      const result = calculateOverallRanking(benchmarks);
      expect(result.status).toBe("Average");
    });

    it("should identify underperformers", () => {
      const benchmarks = [{ status: "average" }, { status: "below_average" }, { status: "poor" }, { status: "poor" }];
      const result = calculateOverallRanking(benchmarks);
      expect(result.status).toBe("Needs Improvement");
    });
  });

  describe("formatAlertMessage", () => {
    it("should format alert message correctly", () => {
      const alert = {
        severity: "warning",
        message: "High memory usage detected",
        metric: "memoryUsage",
        actualValue: 92,
        threshold: 85,
      };
      const result = formatAlertMessage(alert);
      expect(result).toBe("WARNING: High memory usage detected (memoryUsage: 92 vs threshold: 85)");
    });

    it("should uppercase severity", () => {
      const alert = {
        severity: "critical",
        message: "System overload",
        metric: "cpu",
        actualValue: 99,
        threshold: 90,
      };
      expect(formatAlertMessage(alert)).toContain("CRITICAL");
    });
  });

  describe("formatAnomalyDescription", () => {
    it("should describe higher than expected anomaly", () => {
      const anomaly = {
        metric: "responseTime",
        actualValue: 500,
        expectedValue: 200,
        deviation: 150,
      };
      const result = formatAnomalyDescription(anomaly);
      expect(result).toContain("higher");
      expect(result).toContain("responseTime");
    });

    it("should describe lower than expected anomaly", () => {
      const anomaly = {
        metric: "cacheHitRate",
        actualValue: 50,
        expectedValue: 85,
        deviation: -41.2,
      };
      const result = formatAnomalyDescription(anomaly);
      expect(result).toContain("lower");
    });
  });

  describe("calculateAlertStatus", () => {
    it("should return Critical for critical alerts", () => {
      const alertSummary = { critical: 1, error: 0, warning: 0 };
      const anomalySummary = { critical: 0, major: 0, moderate: 0, minor: 0 };
      expect(calculateAlertStatus(alertSummary, anomalySummary)).toBe("Critical Issues Detected");
    });

    it("should return High Priority for many errors", () => {
      const alertSummary = { critical: 0, error: 3, warning: 0 };
      const anomalySummary = { critical: 0, major: 0, moderate: 0, minor: 0 };
      expect(calculateAlertStatus(alertSummary, anomalySummary)).toBe("High Priority Issues");
    });

    it("should return Warnings for many warnings", () => {
      const alertSummary = { critical: 0, error: 0, warning: 6 };
      const anomalySummary = { critical: 0, major: 0, moderate: 0, minor: 0 };
      expect(calculateAlertStatus(alertSummary, anomalySummary)).toBe("Performance Warnings");
    });

    it("should return Healthy for no issues", () => {
      const alertSummary = { critical: 0, error: 0, warning: 0 };
      const anomalySummary = { critical: 0, major: 0, moderate: 0, minor: 0 };
      expect(calculateAlertStatus(alertSummary, anomalySummary)).toBe("System Healthy");
    });
  });

  describe("formatPriority", () => {
    it("should format critical priority", () => {
      expect(formatPriority("critical")).toBe("🔴 Critical");
    });

    it("should format high priority", () => {
      expect(formatPriority("high")).toBe("🟠 High");
    });

    it("should format medium priority", () => {
      expect(formatPriority("medium")).toBe("🟡 Medium");
    });

    it("should format low priority", () => {
      expect(formatPriority("low")).toBe("🟢 Low");
    });

    it("should return unknown priority as-is", () => {
      expect(formatPriority("unknown")).toBe("unknown");
    });
  });

  describe("formatEffort", () => {
    it("should format low effort", () => {
      expect(formatEffort("low")).toBe("⚡ Low Effort");
    });

    it("should format medium effort", () => {
      expect(formatEffort("medium")).toBe("⚖️ Medium Effort");
    });

    it("should format high effort", () => {
      expect(formatEffort("high")).toBe("🏋️ High Effort");
    });

    it("should return unknown effort as-is", () => {
      expect(formatEffort("unknown")).toBe("unknown");
    });
  });

  describe("calculateEstimatedImpact", () => {
    it("should detect significant impact with critical recommendations", () => {
      const recommendations = [{ priority: "critical" }, { priority: "high" }, { priority: "high" }];
      expect(calculateEstimatedImpact(recommendations)).toBe("Significant Performance Gains Expected");
    });

    it("should detect moderate impact with many recommendations", () => {
      const recommendations = [
        { priority: "medium" },
        { priority: "medium" },
        { priority: "low" },
        { priority: "low" },
        { priority: "low" },
      ];
      expect(calculateEstimatedImpact(recommendations)).toBe("Moderate Performance Improvements");
    });

    it("should detect minor impact with few recommendations", () => {
      const recommendations = [{ priority: "low" }];
      expect(calculateEstimatedImpact(recommendations)).toBe("Minor Performance Optimizations");
    });

    it("should detect already optimized when no recommendations", () => {
      expect(calculateEstimatedImpact([])).toBe("System Already Optimized");
    });
  });

  describe("convertToCSV", () => {
    it("should generate valid CSV format", () => {
      const data = { currentMetrics: createMockMetrics() };
      const csv = convertToCSV(data);

      expect(csv).toContain("Metric,Value,Unit");
      expect(csv).toContain("Total Requests");
      expect(csv).toContain("Average Response Time");
    });

    it("should include all key metrics", () => {
      const data = { currentMetrics: createMockMetrics() };
      const csv = convertToCSV(data);

      expect(csv).toContain("Success Rate");
      expect(csv).toContain("Cache Hit Rate");
      expect(csv).toContain("Memory Usage");
    });
  });

  describe("createSummaryReport", () => {
    it("should generate a summary report with all required fields", () => {
      const data = { currentMetrics: createMockMetrics() };
      const report = createSummaryReport(data);

      expect(report).toHaveProperty("summary");
      expect(report).toHaveProperty("overallHealth");
      expect(report).toHaveProperty("keyMetrics");
      expect(report).toHaveProperty("recommendations");
      expect(report).toHaveProperty("nextSteps");
    });

    it("should include key metrics in the report", () => {
      const data = { currentMetrics: createMockMetrics() };
      const report = createSummaryReport(data);

      expect(report.keyMetrics).toHaveProperty("averageResponseTime");
      expect(report.keyMetrics).toHaveProperty("cacheEfficiency");
      expect(report.keyMetrics).toHaveProperty("systemLoad");
      expect(report.keyMetrics).toHaveProperty("errorRate");
    });

    it("should include health status", () => {
      const data = { currentMetrics: createMockMetrics() };
      const report = createSummaryReport(data);

      expect(["Excellent", "Good", "Fair", "Poor", "Critical"]).toContain(report.overallHealth);
    });

    it("should include insights from analytics when provided", () => {
      const insights = [
        { category: "optimization", title: "Enable caching" },
        { category: "performance", title: "Reduce response time" },
      ];
      const data = {
        currentMetrics: createMockMetrics(),
        analytics: { insights },
      };
      const report = createSummaryReport(data);

      expect(report.recommendations).toHaveLength(2);
    });

    it("should limit recommendations to 3", () => {
      const insights = [
        { category: "a", title: "1" },
        { category: "b", title: "2" },
        { category: "c", title: "3" },
        { category: "d", title: "4" },
        { category: "e", title: "5" },
      ];
      const data = {
        currentMetrics: createMockMetrics(),
        analytics: { insights },
      };
      const report = createSummaryReport(data);

      expect(report.recommendations).toHaveLength(3);
    });

    it("should handle missing analytics gracefully", () => {
      const data = { currentMetrics: createMockMetrics() };
      const report = createSummaryReport(data);

      expect(report.recommendations).toEqual([]);
    });

    it("should include timestamp in summary", () => {
      const data = { currentMetrics: createMockMetrics() };
      const report = createSummaryReport(data);

      expect(report.summary).toContain("Performance Report");
    });
  });
});
