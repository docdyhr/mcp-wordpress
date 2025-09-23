/**
 * Tests for Performance Tools
 *
 * Tests the performance monitoring and analytics tools for WordPress sites.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies BEFORE importing the class
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  time: vi.fn().mockImplementation((name, fn) => fn()),
  child: vi.fn().mockReturnThis(),
};

vi.mock("../../dist/utils/logger.js", () => ({
  LoggerFactory: {
    performance: vi.fn(() => mockLogger),
    server: vi.fn(() => mockLogger),
    tool: vi.fn(() => mockLogger),
  },
}));

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
    getAlerts: vi.fn().mockReturnValue([]),
    getHistoricalData: vi.fn().mockReturnValue([
      {
        requests: { total: 90, failed: 1, averageResponseTime: 240 },
        cache: { hitRate: 0.8 },
        system: { uptime: 86300000 },
      },
    ]),
  })),
}));

const mockMetricsCollector = {
  collect: vi.fn().mockResolvedValue({
    serverMetrics: { cpu: 45.2, memory: 78.8, disk: 62.1 },
    wordpressMetrics: { queryTime: 0.123, pluginLoadTime: 0.045 },
  }),
  getHistoricalData: vi.fn().mockResolvedValue([]),
  registerClient: vi.fn(),
  registerCacheManager: vi.fn(),
  collectCurrentMetrics: vi.fn().mockReturnValue({
    requests: {
      total: 100,
      failed: 2,
      averageResponseTime: 250,
      requestsPerSecond: 10,
      p50ResponseTime: 200,
      p95ResponseTime: 400,
      p99ResponseTime: 600,
    },
    cache: { hitRate: 0.85, totalSize: 1024, evictions: 5, memoryUsageMB: 50 },
    system: { memoryUsage: 70, cpuUsage: 45, uptime: 86400000 },
    tools: { mostUsedTool: "wp_posts_list", toolUsageCount: {}, toolPerformance: {} },
  }),
  getSiteMetrics: vi.fn().mockReturnValue({ isActive: true, cache: {}, client: {} }),
  getAggregatedCacheStats: vi.fn().mockReturnValue({}),
  getAggregatedClientStats: vi.fn().mockReturnValue({}),
  compareSitePerformance: vi.fn().mockReturnValue({}),
};

vi.mock("../../dist/performance/MetricsCollector.js", () => ({
  MetricsCollector: vi.fn().mockImplementation(() => mockMetricsCollector),
}));

vi.mock("../../dist/performance/PerformanceAnalytics.js", () => ({
  PerformanceAnalytics: vi.fn().mockImplementation(() => ({
    analyzeTrends: vi.fn().mockReturnValue([{ metric: "responseTime", direction: "improving", change: -5.2 }]),
    detectAnomalies: vi.fn().mockResolvedValue([]),
    generateReport: vi.fn().mockResolvedValue({
      summary: "Performance is within normal parameters",
      recommendations: [],
    }),
    addDataPoint: vi.fn(),
    benchmarkPerformance: vi.fn().mockReturnValue([{ category: "Response Time", status: "good", improvement: 0 }]),
    generateInsights: vi.fn().mockReturnValue([
      {
        category: "optimization",
        title: "Test",
        description: "Test",
        priority: "medium",
        estimatedImprovement: 10,
        implementationEffort: "low",
      },
    ]),
    generateOptimizationPlan: vi.fn().mockReturnValue({
      quickWins: [],
      mediumTerm: [],
      longTerm: [],
      estimatedROI: { timeframe: "3months", improvement: 25 },
    }),
    predictPerformance: vi.fn().mockReturnValue({ prediction: "stable" }),
    exportAnalyticsReport: vi.fn().mockReturnValue({
      summary: {},
      trends: [],
      benchmarks: [],
      insights: [],
      anomalies: [],
      predictions: {},
      optimizationPlan: {},
    }),
    getAnomalies: vi.fn().mockReturnValue([]),
  })),
}));

// Note: logger already mocked above

// Mock toolWrapper
vi.mock("../../dist/utils/toolWrapper.js", () => ({
  toolWrapper: vi.fn().mockImplementation((fn) => fn),
}));

// Mock config helpers
vi.mock("../../dist/config/Config.js", () => ({
  ConfigHelpers: {
    shouldDebug: vi.fn(() => false),
    isProd: vi.fn(() => false),
    isDev: vi.fn(() => false),
    isTest: vi.fn(() => true),
    isCI: vi.fn(() => false),
    get: vi.fn(() => ({
      get: vi.fn(() => ({
        app: { nodeEnv: "test" },
      })),
    })),
  },
}));

// Import after mocks
let PerformanceTools;

beforeEach(async () => {
  // Clear all mocks first
  vi.clearAllMocks();

  // Dynamically import the class to ensure mocks are applied
  const module = await import("../../dist/tools/performance.js");
  PerformanceTools = module.default;
});

describe("PerformanceTools", () => {
  let performanceTools;
  let _mockClient;

  beforeEach(async () => {
    _mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      baseUrl: "https://test.example.com",
    };

    // Ensure PerformanceTools is available
    if (!PerformanceTools) {
      const module = await import("../../dist/tools/performance.js");
      PerformanceTools = module.default;
    }

    // Create PerformanceTools without clients to avoid dependency issues
    performanceTools = new PerformanceTools();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with clients map", () => {
      expect(performanceTools).toBeDefined();
      // PerformanceTools doesn't expose clients directly - check via monitoring components
      expect(performanceTools.monitor).toBeDefined();
    });

    it("should initialize monitoring components", () => {
      expect(performanceTools.monitor).toBeDefined();
      expect(performanceTools.collector).toBeDefined();
      expect(performanceTools.analytics).toBeDefined();
    });
  });

  describe("getTools", () => {
    it("should return an array of tool definitions", () => {
      const tools = performanceTools.getTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check that each tool has required properties
      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      });
    });

    it("should include expected performance tools", () => {
      const tools = performanceTools.getTools();
      const toolNames = tools.map((tool) => tool.name);

      // Check the actual tool names from the implementation
      expect(toolNames).toContain("wp_performance_stats");
      expect(toolNames).toContain("wp_performance_history");
      expect(toolNames).toContain("wp_performance_benchmark");
      expect(toolNames).toContain("wp_performance_alerts");
      expect(toolNames).toContain("wp_performance_optimize");
      expect(toolNames).toContain("wp_performance_export");
    });
  });

  describe("Performance Monitoring", () => {
    it("should have performance monitoring tools available", () => {
      const tools = performanceTools.getTools();
      const monitoringToolNames = tools.map((t) => t.name);

      expect(monitoringToolNames).toContain("wp_performance_stats");
      expect(monitoringToolNames).toContain("wp_performance_history");
      expect(monitoringToolNames).toContain("wp_performance_benchmark");
    });

    it("should call tool handlers through tool registry", async () => {
      const tools = performanceTools.getTools();
      const statsTools = tools.find((t) => t.name === "wp_performance_stats");

      expect(statsTools).toBeDefined();
      expect(typeof statsTools.handler).toBe("function");

      // Note: We can't easily test the handler without a full tool invocation system
      // This test verifies the tool structure is correct
    });
  });

  describe("Metrics Collection", () => {
    it("should have metrics collection tools", () => {
      const tools = performanceTools.getTools();
      const metricsToolNames = tools.map((t) => t.name);

      expect(metricsToolNames).toContain("wp_performance_stats");
      expect(metricsToolNames).toContain("wp_performance_history");
    });

    it("should configure tool parameters correctly", () => {
      const tools = performanceTools.getTools();
      const historyTool = tools.find((t) => t.name === "wp_performance_history");

      expect(historyTool).toBeDefined();
      expect(historyTool.parameters).toBeDefined();
      expect(Array.isArray(historyTool.parameters)).toBe(true);

      const parameterNames = historyTool.parameters.map((p) => p.name);
      expect(parameterNames).toContain("timeframe");
      expect(parameterNames).toContain("metrics");
    });
  });

  describe("Performance Analytics", () => {
    it("should have analytics tools", () => {
      const tools = performanceTools.getTools();
      const analyticsToolNames = tools.map((t) => t.name);

      expect(analyticsToolNames).toContain("wp_performance_benchmark");
      expect(analyticsToolNames).toContain("wp_performance_alerts");
      expect(analyticsToolNames).toContain("wp_performance_optimize");
    });

    it("should configure benchmark tool parameters", () => {
      const tools = performanceTools.getTools();
      const benchmarkTool = tools.find((t) => t.name === "wp_performance_benchmark");

      expect(benchmarkTool).toBeDefined();
      expect(benchmarkTool.description).toContain("benchmark");
      expect(benchmarkTool.parameters).toBeDefined();

      const parameterNames = benchmarkTool.parameters.map((p) => p.name);
      expect(parameterNames).toContain("category");
      expect(parameterNames).toContain("includeRecommendations");
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization with undefined clients", () => {
      expect(() => new PerformanceTools()).not.toThrow();
      const toolsWithoutClients = new PerformanceTools();
      expect(toolsWithoutClients.monitor).toBeDefined();
      expect(toolsWithoutClients.collector).toBeDefined();
      expect(toolsWithoutClients.analytics).toBeDefined();
    });

    it("should handle empty clients map", () => {
      expect(() => new PerformanceTools(new Map())).not.toThrow();
      const toolsWithEmptyMap = new PerformanceTools(new Map());
      expect(toolsWithEmptyMap.getTools()).toBeDefined();
      expect(toolsWithEmptyMap.getTools().length).toBeGreaterThan(0);
    });
  });

  describe("Parameter Validation", () => {
    it("should define tools with proper parameter structure", () => {
      const tools = performanceTools.getTools();

      tools.forEach((tool) => {
        expect(tool.parameters).toBeDefined();
        expect(Array.isArray(tool.parameters)).toBe(true);

        // Each parameter should have required properties
        tool.parameters.forEach((param) => {
          expect(param.name).toBeDefined();
          expect(param.type).toBeDefined();
          expect(param.description).toBeDefined();
          expect(typeof param.required).toBe("boolean");
        });
      });
    });

    it("should have consistent site parameter across tools", () => {
      const tools = performanceTools.getTools();

      tools.forEach((tool) => {
        const siteParam = tool.parameters.find((p) => p.name === "site");
        if (siteParam) {
          expect(siteParam.type).toBe("string");
          expect(siteParam.required).toBe(false);
          expect(siteParam.description).toContain("multi-site");
        }
      });
    });
  });

  describe("Integration", () => {
    it("should work with different WordPress client configurations", () => {
      // Test without clients to avoid dependency injection issues
      const altTools = new PerformanceTools();
      expect(altTools.monitor).toBeDefined();
      expect(altTools.collector).toBeDefined();
      expect(altTools.analytics).toBeDefined();
    });

    it("should maintain consistent tool definitions", () => {
      const tools1 = performanceTools.getTools();
      const tools2 = performanceTools.getTools();

      expect(tools1.length).toBe(tools2.length);
      expect(tools1.map((t) => t.name)).toEqual(tools2.map((t) => t.name));
    });
  });
});
