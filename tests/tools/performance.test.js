/**
 * Tests for Performance Tools
 * 
 * Tests the performance monitoring and analytics tools for WordPress sites.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PerformanceTools } from "@/tools/performance.js";

// Mock the performance dependencies
vi.mock("../../dist/performance/PerformanceMonitor.js", () => ({
  PerformanceMonitor: vi.fn().mockImplementation(() => ({
    startMonitoring: vi.fn().mockResolvedValue({ status: "monitoring_started" }),
    stopMonitoring: vi.fn().mockResolvedValue({ status: "monitoring_stopped" }),
    getCurrentMetrics: vi.fn().mockResolvedValue({
      timestamp: Date.now(),
      responseTime: 250,
      memoryUsage: 85.5,
      cacheHitRate: 0.85,
      activeConnections: 12,
    }),
    getAlerts: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../dist/performance/MetricsCollector.js", () => ({
  MetricsCollector: vi.fn().mockImplementation(() => ({
    collect: vi.fn().mockResolvedValue({
      serverMetrics: {
        cpu: 45.2,
        memory: 78.8,
        disk: 62.1,
      },
      wordpressMetrics: {
        queryTime: 0.123,
        pluginLoadTime: 0.045,
      },
    }),
    getHistoricalData: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../dist/performance/PerformanceAnalytics.js", () => ({
  PerformanceAnalytics: vi.fn().mockImplementation(() => ({
    analyzeTrends: vi.fn().mockResolvedValue({
      trends: {
        responseTime: { direction: "improving", change: -5.2 },
        memoryUsage: { direction: "stable", change: 0.1 },
      },
    }),
    detectAnomalies: vi.fn().mockResolvedValue([]),
    generateReport: vi.fn().mockResolvedValue({
      summary: "Performance is within normal parameters",
      recommendations: [],
    }),
  })),
}));

// Mock logger to avoid console output
vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    tool: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      time: vi.fn().mockImplementation((name, fn) => fn()),
    }),
  },
}));

// Mock toolWrapper
vi.mock("../../dist/utils/toolWrapper.js", () => ({
  toolWrapper: vi.fn().mockImplementation((fn) => fn),
}));

describe("PerformanceTools", () => {
  let performanceTools;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      baseUrl: "https://test.example.com",
    };

    performanceTools = new PerformanceTools(mockClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with a WordPress client", () => {
      expect(performanceTools).toBeDefined();
      expect(performanceTools.client).toBe(mockClient);
    });

    it("should initialize monitoring components", () => {
      expect(performanceTools.monitor).toBeDefined();
      expect(performanceTools.metricsCollector).toBeDefined();
      expect(performanceTools.analytics).toBeDefined();
    });
  });

  describe("getTools", () => {
    it("should return an array of tool definitions", () => {
      const tools = performanceTools.getTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check that each tool has required properties
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include expected performance tools", () => {
      const tools = performanceTools.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain("wp_performance_monitor");
      expect(toolNames).toContain("wp_performance_metrics");
      expect(toolNames).toContain("wp_performance_analytics");
    });
  });

  describe("Performance Monitoring", () => {
    it("should start performance monitoring", async () => {
      const result = await performanceTools.startMonitoring({});
      
      expect(result).toBeDefined();
      expect(result.status).toBe("monitoring_started");
    });

    it("should stop performance monitoring", async () => {
      const result = await performanceTools.stopMonitoring({});
      
      expect(result).toBeDefined();
      expect(result.status).toBe("monitoring_stopped");
    });

    it("should get current performance metrics", async () => {
      const result = await performanceTools.getCurrentMetrics({});
      
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.responseTime).toBeDefined();
      expect(result.memoryUsage).toBeDefined();
      expect(result.cacheHitRate).toBeDefined();
    });

    it("should handle monitoring with site parameter", async () => {
      const result = await performanceTools.startMonitoring({ site: "test-site" });
      
      expect(result).toBeDefined();
      expect(result.status).toBe("monitoring_started");
    });
  });

  describe("Metrics Collection", () => {
    it("should collect performance metrics", async () => {
      const result = await performanceTools.collectMetrics({});
      
      expect(result).toBeDefined();
      expect(result.serverMetrics).toBeDefined();
      expect(result.wordpressMetrics).toBeDefined();
    });

    it("should collect metrics with custom parameters", async () => {
      const params = {
        includeServerMetrics: true,
        includeWordPressMetrics: true,
        timeRange: "1h",
      };
      
      const result = await performanceTools.collectMetrics(params);
      
      expect(result).toBeDefined();
    });

    it("should handle historical data requests", async () => {
      const result = await performanceTools.getHistoricalMetrics({
        timeRange: "24h",
        granularity: "1h",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Performance Analytics", () => {
    it("should analyze performance trends", async () => {
      const result = await performanceTools.analyzeTrends({});
      
      expect(result).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.trends.responseTime).toBeDefined();
    });

    it("should detect performance anomalies", async () => {
      const result = await performanceTools.detectAnomalies({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should generate performance report", async () => {
      const result = await performanceTools.generateReport({
        period: "7d",
        includeRecommendations: true,
      });
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle monitoring startup errors", async () => {
      const mockMonitor = performanceTools.monitor;
      mockMonitor.startMonitoring.mockRejectedValue(new Error("Failed to start monitoring"));
      
      await expect(performanceTools.startMonitoring({})).rejects.toThrow("Failed to start monitoring");
    });

    it("should handle metrics collection errors", async () => {
      const mockCollector = performanceTools.metricsCollector;
      mockCollector.collect.mockRejectedValue(new Error("Collection failed"));
      
      await expect(performanceTools.collectMetrics({})).rejects.toThrow("Collection failed");
    });

    it("should handle analytics errors gracefully", async () => {
      const mockAnalytics = performanceTools.analytics;
      mockAnalytics.analyzeTrends.mockRejectedValue(new Error("Analysis failed"));
      
      await expect(performanceTools.analyzeTrends({})).rejects.toThrow("Analysis failed");
    });
  });

  describe("Parameter Validation", () => {
    it("should validate time range parameters", async () => {
      const invalidParams = {
        timeRange: "invalid",
      };
      
      await expect(performanceTools.getHistoricalMetrics(invalidParams)).rejects.toThrow();
    });

    it("should handle missing required parameters", async () => {
      // Most performance tools should work with empty parameters as they have defaults
      await expect(performanceTools.getCurrentMetrics({})).resolves.toBeDefined();
    });

    it("should validate site parameter when provided", async () => {
      const validParams = { site: "valid-site" };
      
      await expect(performanceTools.startMonitoring(validParams)).resolves.toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should work with different WordPress client configurations", () => {
      const altClient = {
        get: vi.fn(),
        post: vi.fn(),
        baseUrl: "https://alt.example.com",
      };
      
      const altTools = new PerformanceTools(altClient);
      expect(altTools.client).toBe(altClient);
    });

    it("should maintain state between operations", async () => {
      await performanceTools.startMonitoring({});
      const metrics = await performanceTools.getCurrentMetrics({});
      await performanceTools.stopMonitoring({});
      
      expect(metrics).toBeDefined();
    });
  });
});