/**
 * Performance Monitoring MCP Tools for WordPress Server
 * Provides comprehensive performance insights and management
 */

import type { ToolDefinition } from "@/server/ToolRegistry.js";
import { PerformanceMonitor, type PerformanceMetrics } from "@/performance/PerformanceMonitor.js";
import { MetricsCollector } from "@/performance/MetricsCollector.js";
import {
  PerformanceAnalytics,
  type BenchmarkComparison,
  type PerformanceAnomaly,
} from "@/performance/PerformanceAnalytics.js";
import { toolWrapper } from "@/utils/toolWrapper.js";
import { ConfigHelpers } from "@/config/Config.js";
import { LoggerFactory } from "@/utils/logger.js";
import type { WordPressClient } from "@/client/api.js";

// Import helper functions
import {
  calculateHealthStatus,
  calculatePerformanceScore,
  calculateCacheEfficiency,
  formatUptime,
  parseTimeframe,
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
  type PerformanceAlert,
} from "./PerformanceHelpers.js";

/**
 * Performance Tools Class
 * Provides MCP tools for WordPress performance monitoring
 */
export default class PerformanceTools {
  private monitor: PerformanceMonitor;
  private collector: MetricsCollector;
  private analytics: PerformanceAnalytics;
  private logger: ReturnType<typeof LoggerFactory.performance>;
  private historicalDataInterval?: NodeJS.Timeout | undefined;

  constructor(clients?: Map<string, unknown>) {
    // Initialize logger first
    this.logger = LoggerFactory.performance();

    // Initialize performance monitoring system
    this.monitor = new PerformanceMonitor({
      enableRealTimeMonitoring: true,
      enableHistoricalData: true,
      enableAlerts: true,
    });

    this.collector = new MetricsCollector(this.monitor, {
      enableRealTime: true,
      enableToolTracking: true,
      enableCacheIntegration: true,
    });

    this.analytics = new PerformanceAnalytics(this.collector, {
      enablePredictiveAnalysis: true,
      enableAnomalyDetection: true,
      enableTrendAnalysis: true,
    });

    // Register clients if provided
    if (clients) {
      for (const [siteId, client] of clients) {
        this.collector.registerClient(siteId, client);

        // Register cache manager if client has one
        const possibleCacheMgr = (client as Record<string, unknown>)?.cacheManager as unknown;
        if (possibleCacheMgr) {
          this.collector.registerCacheManager(siteId, possibleCacheMgr);
        }
      }
    }

    // Only start historical data collection in production environments
    if (ConfigHelpers.isProd() || ConfigHelpers.isDev()) {
      this.startHistoricalDataCollection();
    }
  }

  /**
   * Get all performance monitoring tools
   */
  getTools(): ToolDefinition[] {
    return [
      {
        name: "wp_performance_stats",
        description: "Get real-time performance statistics and metrics",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "category",
            type: "string",
            description: "Category of metrics to return (overview, requests, cache, system, tools, all)",
            required: false,
          },
          {
            name: "format",
            type: "string",
            description: "Detail level of the response (summary, detailed, raw)",
            required: false,
          },
        ],
        handler: this.getPerformanceStats.bind(this),
      },
      {
        name: "wp_performance_history",
        description: "Get historical performance data and trends",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "timeframe",
            type: "string",
            description: "Time period for historical data (1h, 6h, 12h, 24h, 7d)",
            required: false,
          },
          {
            name: "metrics",
            type: "array",
            description:
              "Specific metrics to include (responseTime, cacheHitRate, errorRate, memoryUsage, requestVolume)",
            required: false,
          },
          {
            name: "includeTrends",
            type: "boolean",
            description: "Include trend analysis (default: true)",
            required: false,
          },
        ],
        handler: this.getPerformanceHistory.bind(this),
      },
      {
        name: "wp_performance_benchmark",
        description: "Compare current performance against industry benchmarks",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "category",
            type: "string",
            description: "Benchmark category (response_time, cache_performance, error_rate, system_resources, all)",
            required: false,
          },
          {
            name: "includeRecommendations",
            type: "boolean",
            description: "Include improvement recommendations (default: true)",
            required: false,
          },
        ],
        handler: this.getBenchmarkComparison.bind(this),
      },
      {
        name: "wp_performance_alerts",
        description: "Get performance alerts and anomaly detection results",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "severity",
            type: "string",
            description: "Filter alerts by severity level (info, warning, error, critical)",
            required: false,
          },
          {
            name: "category",
            type: "string",
            description: "Filter alerts by category (performance, cache, system, wordpress)",
            required: false,
          },
          {
            name: "limit",
            type: "number",
            description: "Maximum number of alerts to return (default: 20)",
            required: false,
          },
          {
            name: "includeAnomalies",
            type: "boolean",
            description: "Include detected anomalies (default: true)",
            required: false,
          },
        ],
        handler: this.getPerformanceAlerts.bind(this),
      },
      {
        name: "wp_performance_optimize",
        description: "Get optimization recommendations and insights",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "focus",
            type: "string",
            description: "Optimization focus area (speed, reliability, efficiency, scaling)",
            required: false,
          },
          {
            name: "priority",
            type: "string",
            description: "Implementation timeline (quick_wins, medium_term, long_term, all)",
            required: false,
          },
          {
            name: "includeROI",
            type: "boolean",
            description: "Include ROI estimates (default: true)",
            required: false,
          },
          {
            name: "includePredictions",
            type: "boolean",
            description: "Include performance predictions (default: true)",
            required: false,
          },
        ],
        handler: this.getOptimizationRecommendations.bind(this),
      },
      {
        name: "wp_performance_export",
        description: "Export comprehensive performance report",
        parameters: [
          {
            name: "site",
            type: "string",
            description: "Specific site ID for multi-site setups (optional for single site)",
            required: false,
          },
          {
            name: "format",
            type: "string",
            description: "Export format (json, csv, summary)",
            required: false,
          },
          {
            name: "includeHistorical",
            type: "boolean",
            description: "Include historical data (default: true)",
            required: false,
          },
          {
            name: "includeAnalytics",
            type: "boolean",
            description: "Include analytics and insights (default: true)",
            required: false,
          },
          {
            name: "timeRange",
            type: "string",
            description: "Time range for data export (1h, 6h, 24h, 7d, 30d)",
            required: false,
          },
        ],
        handler: this.exportPerformanceReport.bind(this),
      },
    ];
  }

  /**
   * Get real-time performance statistics
   */
  private async getPerformanceStats(_client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        category = "overview",
        format = "summary",
      } = params as { site?: string; category?: string; format?: string };

      // Get current metrics
      const metrics = this.collector.collectCurrentMetrics();

      // Get site-specific metrics if requested
      let siteMetrics = null;
      if (site) {
        siteMetrics = this.collector.getSiteMetrics(site as string);
      }

      // Filter by category
      const result: Record<string, unknown> = {};

      if (category === "overview" || category === "all") {
        result.overview = {
          overallHealth: calculateHealthStatus(metrics),
          performanceScore: calculatePerformanceScore(metrics),
          totalRequests: metrics.requests.total,
          averageResponseTime: `${metrics.requests.averageResponseTime.toFixed(0)}ms`,
          cacheHitRate: `${(metrics.cache.hitRate * 100).toFixed(1)}%`,
          errorRate: `${((metrics.requests.failed / Math.max(metrics.requests.total, 1)) * 100).toFixed(2)}%`,
          uptime: formatUptime(metrics.system.uptime),
        };
      }

      if (category === "requests" || category === "all") {
        result.requests = {
          ...metrics.requests,
          requestsPerSecond: metrics.requests.requestsPerSecond.toFixed(2),
          p50ResponseTime: `${metrics.requests.p50ResponseTime}ms`,
          p95ResponseTime: `${metrics.requests.p95ResponseTime}ms`,
          p99ResponseTime: `${metrics.requests.p99ResponseTime}ms`,
        };
      }

      if (category === "cache" || category === "all") {
        result.cache = {
          ...metrics.cache,
          hitRate: `${(metrics.cache.hitRate * 100).toFixed(1)}%`,
          memoryUsage: `${metrics.cache.memoryUsageMB.toFixed(1)}MB`,
          efficiency: calculateCacheEfficiency(metrics.cache),
        };
      }

      if (category === "system" || category === "all") {
        result.system = {
          ...metrics.system,
          memoryUsage: `${metrics.system.memoryUsage}%`,
          cpuUsage: `${metrics.system.cpuUsage}%`,
          uptime: formatUptime(metrics.system.uptime),
        };
      }

      if (category === "tools" || category === "all") {
        result.tools = {
          mostUsedTool: metrics.tools.mostUsedTool,
          totalToolCalls: Object.values(metrics.tools.toolUsageCount).reduce(
            (sum: number, count: unknown) => sum + (typeof count === "number" ? count : 0),
            0,
          ),
          topTools: Object.entries(metrics.tools.toolUsageCount)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([tool, count]) => ({ tool, count })),
          toolPerformance: format === "detailed" ? metrics.tools.toolPerformance : undefined,
        };
      }

      // Add site-specific data if requested
      if (siteMetrics && siteMetrics.isActive) {
        result.siteSpecific = {
          siteId: site,
          cache: siteMetrics.cache,
          client: siteMetrics.client,
        };
      }

      // Add metadata
      result.metadata = {
        timestamp: new Date().toISOString(),
        category,
        format,
        site: site || "all",
        monitoringEnabled: true,
      };

      return {
        success: true,
        data: result,
      };
    });
  }

  /**
   * Get historical performance data and trends
   */
  private async getPerformanceHistory(_client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        timeframe = "24h",
        metrics: requestedMetrics,
        includeTrends = true,
      } = params as {
        site?: string;
        timeframe?: string;
        metrics?: string[];
        includeTrends?: boolean;
      };

      // Convert timeframe to milliseconds
      const timeframMs = parseTimeframe(timeframe);
      const startTime = Date.now() - timeframMs;

      // Get historical data
      const historicalData = this.monitor.getHistoricalData(startTime);

      // Analyze trends if requested
      let trends = null;
      if (includeTrends) {
        // Add current data for trend analysis
        this.analytics.addDataPoint(this.collector.collectCurrentMetrics());
        trends = this.analytics.analyzeTrends();

        // Filter trends by requested metrics
        if (requestedMetrics && Array.isArray(requestedMetrics)) {
          trends = trends.filter((trend) => requestedMetrics.includes(trend.metric));
        }
      }

      // Process historical data for charting
      const chartData = processHistoricalDataForChart(historicalData, requestedMetrics as string[] | undefined);

      return {
        success: true,
        data: {
          timeframe,
          dataPoints: historicalData.length,
          historicalData: chartData,
          trends: trends || [],
          summary: {
            averageResponseTime: calculateAverage(historicalData.map((d) => d.requests.averageResponseTime)),
            averageCacheHitRate: calculateAverage(historicalData.map((d) => d.cache.hitRate)),
            averageErrorRate: calculateAverage(
              historicalData.map((d) => (d.requests.total > 0 ? d.requests.failed / d.requests.total : 0)),
            ),
            totalRequests: historicalData.reduce((sum, d) => sum + d.requests.total, 0),
          },
          metadata: {
            timestamp: new Date().toISOString(),
            site: site || "all",
            requestedMetrics: requestedMetrics || ["all"],
          },
        },
      };
    });
  }

  /**
   * Get benchmark comparison
   */
  private async getBenchmarkComparison(_client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        category = "all",
        includeRecommendations = true,
      } = params as {
        site?: string;
        category?: string;
        includeRecommendations?: boolean;
      };

      // Get benchmark comparisons
      const benchmarks = this.analytics.benchmarkPerformance() as BenchmarkComparison[];

      // Filter by category if specified
      let filteredBenchmarks = benchmarks;
      if (category !== "all") {
        const categoryMap: Record<string, string> = {
          response_time: "Response Time",
          cache_performance: "Cache Hit Rate",
          error_rate: "Error Rate",
          system_resources: "Memory Usage",
        };
        const targetCategory = categoryMap[category as string];
        if (targetCategory) {
          filteredBenchmarks = benchmarks.filter((b) => b.category === targetCategory);
        }
      }

      // Get recommendations if requested
      let recommendations = null;
      if (includeRecommendations) {
        const insights = this.analytics.generateInsights();
        recommendations = insights
          .filter((insight) => insight.category === "optimization")
          .map((insight) => ({
            title: insight.title,
            description: insight.description,
            priority: insight.priority,
            estimatedImprovement: insight.estimatedImprovement,
            implementationEffort: insight.implementationEffort,
          }));
      }

      return {
        success: true,
        data: {
          benchmarks: filteredBenchmarks.map((benchmark) => ({
            ...benchmark,
            status: formatBenchmarkStatus(benchmark.status),
            improvement:
              benchmark.improvement > 0
                ? {
                    needed: benchmark.improvement,
                    description: getBenchmarkImprovementDescription(benchmark),
                  }
                : null,
          })),
          overallRanking: calculateOverallRanking(benchmarks),
          recommendations: recommendations || [],
          metadata: {
            timestamp: new Date().toISOString(),
            category,
            site: site || "all",
            benchmarkVersion: "2024-industry-standards",
          },
        },
      };
    });
  }

  /**
   * Get performance alerts and anomalies
   */
  private async getPerformanceAlerts(_client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        severity,
        category,
        limit = 20,
        includeAnomalies = true,
      } = params as {
        site?: string;
        severity?: string;
        category?: string;
        limit?: number;
        includeAnomalies?: boolean;
      };

      // Get alerts from monitor
      let alerts = this.monitor.getAlerts(severity) as PerformanceAlert[];

      // Filter by category if specified
      if (category) {
        alerts = alerts.filter((alert) => alert.category === category);
      }

      // Limit results
      alerts = alerts.slice(-(limit as number));

      // Get anomalies if requested
      let anomalies: PerformanceAnomaly[] = [];
      if (includeAnomalies) {
        anomalies = this.analytics.getAnomalies(severity) as PerformanceAnomaly[];
      }

      // Calculate alert summary
      const alertSummary = {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        error: alerts.filter((a) => a.severity === "error").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      };

      const anomalySummary = {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === "critical").length,
        major: anomalies.filter((a) => a.severity === "major").length,
        moderate: anomalies.filter((a) => a.severity === "moderate").length,
        minor: anomalies.filter((a) => a.severity === "minor").length,
      };

      return {
        success: true,
        data: {
          alerts: alerts.map((alert) => ({
            ...alert,
            timestamp: new Date(alert.timestamp).toISOString(),
            formattedMessage: formatAlertMessage(alert),
          })),
          anomalies: anomalies.map((anomaly) => ({
            ...anomaly,
            timestamp: new Date(anomaly.timestamp).toISOString(),
            formattedDescription: formatAnomalyDescription(anomaly),
          })),
          summary: {
            alerts: alertSummary,
            anomalies: anomalySummary,
            overallStatus: calculateAlertStatus(alertSummary, anomalySummary),
          },
          metadata: {
            timestamp: new Date().toISOString(),
            filters: { severity, category, site: site || "all" },
            limit,
          },
        },
      };
    });
  }

  /**
   * Get optimization recommendations
   */
  private async getOptimizationRecommendations(
    _client: WordPressClient,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        focus = "speed",
        priority = "all",
        includeROI = true,
        includePredictions = true,
      } = params as {
        site?: string;
        focus?: string;
        priority?: string;
        includeROI?: boolean;
        includePredictions?: boolean;
      };

      // Generate optimization plan
      const optimizationPlan = this.analytics.generateOptimizationPlan();

      // Filter by priority
      let recommendations: Array<{
        priority: string;
        impact: string;
        implementationEffort: string;
        [key: string]: unknown;
      }> = [];
      if (priority === "quick_wins" || priority === "all") {
        recommendations.push(
          ...optimizationPlan.quickWins.map((r) => ({
            ...r,
            timeline: "quick_wins",
          })),
        );
      }
      if (priority === "medium_term" || priority === "all") {
        recommendations.push(
          ...optimizationPlan.mediumTerm.map((r) => ({
            ...r,
            timeline: "medium_term",
          })),
        );
      }
      if (priority === "long_term" || priority === "all") {
        recommendations.push(
          ...optimizationPlan.longTerm.map((r) => ({
            ...r,
            timeline: "long_term",
          })),
        );
      }

      // Filter by focus area
      if (focus !== "speed") {
        const focusMap: Record<string, string[]> = {
          reliability: ["reliability"],
          efficiency: ["cost", "performance"],
          scaling: ["performance", "reliability"],
        };
        const targetImpacts = focusMap[focus] || [];
        recommendations = recommendations.filter((r) => targetImpacts.includes(r.impact));
      }

      // Get predictions if requested
      let predictions: Record<string, unknown> | null = null;
      if (includePredictions) {
        predictions = this.analytics.predictPerformance(60); // 1 hour prediction
      }

      return {
        success: true,
        data: {
          recommendations: recommendations.map((rec) => ({
            ...rec,
            formattedPriority: formatPriority(rec.priority),
            formattedEffort: formatEffort(rec.implementationEffort),
          })),
          roi: includeROI ? optimizationPlan.estimatedROI : null,
          predictions: predictions || null,
          summary: {
            totalRecommendations: recommendations.length,
            quickWins: optimizationPlan.quickWins.length,
            mediumTerm: optimizationPlan.mediumTerm.length,
            longTerm: optimizationPlan.longTerm.length,
            estimatedImpact: calculateEstimatedImpact(recommendations),
          },
          metadata: {
            timestamp: new Date().toISOString(),
            focus,
            priority,
            site: site || "all",
          },
        },
      };
    });
  }

  /**
   * Export comprehensive performance report
   */
  private async exportPerformanceReport(_client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    return toolWrapper(async () => {
      const {
        site,
        format = "json",
        includeHistorical = true,
        includeAnalytics = true,
        timeRange = "24h",
      } = params as {
        site?: string;
        format?: string;
        includeHistorical?: boolean;
        includeAnalytics?: boolean;
        timeRange?: string;
      };

      // Generate comprehensive analytics report
      const report = this.analytics.exportAnalyticsReport();

      // Add additional data based on parameters
      const exportData: {
        currentMetrics: PerformanceMetrics;
        [key: string]: unknown;
      } = {
        metadata: {
          generatedAt: new Date().toISOString(),
          site: site || "all",
          timeRange,
          format,
          version: "1.0.0",
        },
        summary: report.summary,
        currentMetrics: this.collector.collectCurrentMetrics(),
      };

      if (includeHistorical) {
        const timeframMs = parseTimeframe(timeRange);
        const startTime = Date.now() - timeframMs;
        exportData.historicalData = this.monitor.getHistoricalData(startTime);
      }

      if (includeAnalytics) {
        exportData.analytics = {
          trends: report.trends,
          benchmarks: report.benchmarks,
          insights: report.insights,
          anomalies: report.anomalies,
          predictions: report.predictions,
          optimizationPlan: report.optimizationPlan,
        };
      }

      // Add aggregated statistics
      exportData.aggregatedStats = {
        cache: this.collector.getAggregatedCacheStats(),
        client: this.collector.getAggregatedClientStats(),
      };

      // Add site comparison if multi-site
      if (!site) {
        exportData.siteComparison = this.collector.compareSitePerformance();
      }

      // Format output based on requested format
      let formattedOutput: unknown;
      if (format === "csv") {
        formattedOutput = convertToCSV(exportData);
      } else if (format === "summary") {
        formattedOutput = createSummaryReport(exportData);
      } else {
        formattedOutput = exportData;
      }

      return {
        success: true,
        data: formattedOutput,
        metadata: {
          timestamp: new Date().toISOString(),
          format,
          dataSize: JSON.stringify(exportData).length,
          site: site || "all",
        },
      };
    });
  }

  /**
   * Start historical data collection
   */
  private startHistoricalDataCollection(): void {
    // Skip in test environments to prevent performance issues
    if (ConfigHelpers.isTest() || ConfigHelpers.isCI()) {
      this.logger.debug("Skipping historical data collection in test/CI environment");
      return;
    }

    // Adjust collection frequency based on environment
    const interval = ConfigHelpers.isDev() ? 60000 : 30000; // 1 minute in dev, 30 seconds in prod

    this.logger.info("Starting historical data collection", {
      interval: `${interval / 1000}s`,
      environment: ConfigHelpers.get().get().app.nodeEnv,
    });

    this.historicalDataInterval = setInterval(() => {
      try {
        const currentMetrics = this.collector.collectCurrentMetrics();
        this.analytics.addDataPoint(currentMetrics);
        this.logger.debug("Historical metrics collected", {
          timestamp: new Date().toISOString(),
        });
      } catch (_error) {
        this.logger.error("Failed to collect historical metrics", {
          _error: _error instanceof Error ? _error.message : String(_error),
        });
      }
    }, interval);
  }

  /**
   * Stop historical data collection and cleanup resources
   */
  public destroy(): void {
    if (this.historicalDataInterval) {
      clearInterval(this.historicalDataInterval);
      this.historicalDataInterval = undefined;
      this.logger.info("Historical data collection stopped");
    }
  }
}
