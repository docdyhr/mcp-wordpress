/**
 * Performance Monitoring MCP Tools for WordPress Server
 * Provides comprehensive performance insights and management
 */

import type { ToolDefinition } from "../server/ToolRegistry.js";
import { PerformanceMonitor } from "../performance/PerformanceMonitor.js";
import { MetricsCollector } from "../performance/MetricsCollector.js";
import { PerformanceAnalytics } from "../performance/PerformanceAnalytics.js";
import { toolWrapper } from "../utils/toolWrapper.js";
import { ConfigHelpers } from "../config/Config.js";
import { LoggerFactory } from "../utils/logger.js";

/**
 * Performance Tools Class
 */
export default class PerformanceTools {
  private monitor: PerformanceMonitor;
  private collector: MetricsCollector;
  private analytics: PerformanceAnalytics;
  private logger = LoggerFactory.performance();
  private historicalDataInterval?: NodeJS.Timeout | undefined;

  constructor(clients?: Map<string, unknown>) {
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
        if (client.cacheManager) {
          this.collector.registerCacheManager(siteId, client.cacheManager);
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
  private async getPerformanceStats(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, category = "overview", format = "summary" } = params;

      // Get current metrics
      const metrics = this.collector.collectCurrentMetrics();

      // Get site-specific metrics if requested
      let siteMetrics = null;
      if (site) {
        siteMetrics = this.collector.getSiteMetrics(site);
      }

      // Filter by category
      const result: Record<string, unknown> = {};

      if (category === "overview" || category === "all") {
        result.overview = {
          overallHealth: this.calculateHealthStatus(metrics),
          performanceScore: this.calculatePerformanceScore(metrics),
          totalRequests: metrics.requests.total,
          averageResponseTime: `${metrics.requests.averageResponseTime.toFixed(0)}ms`,
          cacheHitRate: `${(metrics.cache.hitRate * 100).toFixed(1)}%`,
          errorRate: `${((metrics.requests.failed / Math.max(metrics.requests.total, 1)) * 100).toFixed(2)}%`,
          uptime: this.formatUptime(metrics.system.uptime),
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
          efficiency: this.calculateCacheEfficiency(metrics.cache),
        };
      }

      if (category === "system" || category === "all") {
        result.system = {
          ...metrics.system,
          memoryUsage: `${metrics.system.memoryUsage}%`,
          cpuUsage: `${metrics.system.cpuUsage}%`,
          uptime: this.formatUptime(metrics.system.uptime),
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
  private async getPerformanceHistory(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, timeframe = "24h", metrics: requestedMetrics, includeTrends = true } = params;

      // Convert timeframe to milliseconds
      const timeframMs = this.parseTimeframe(timeframe);
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
      const chartData = this.processHistoricalDataForChart(historicalData, requestedMetrics);

      return {
        success: true,
        data: {
          timeframe,
          dataPoints: historicalData.length,
          historicalData: chartData,
          trends: trends || [],
          summary: {
            averageResponseTime: this.calculateAverage(historicalData.map((d) => d.requests.averageResponseTime)),
            averageCacheHitRate: this.calculateAverage(historicalData.map((d) => d.cache.hitRate)),
            averageErrorRate: this.calculateAverage(
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
  private async getBenchmarkComparison(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, category = "all", includeRecommendations = true } = params;

      // Get benchmark comparisons
      const benchmarks = this.analytics.benchmarkPerformance();

      // Filter by category if specified
      let filteredBenchmarks = benchmarks;
      if (category !== "all") {
        const categoryMap: Record<string, string> = {
          response_time: "Response Time",
          cache_performance: "Cache Hit Rate",
          error_rate: "Error Rate",
          system_resources: "Memory Usage",
        };
        const targetCategory = categoryMap[category];
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
            status: this.formatBenchmarkStatus(benchmark.status),
            improvement:
              benchmark.improvement > 0
                ? {
                    needed: benchmark.improvement,
                    description: this.getBenchmarkImprovementDescription(benchmark),
                  }
                : null,
          })),
          overallRanking: this.calculateOverallRanking(benchmarks),
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
  private async getPerformanceAlerts(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, severity, category, limit = 20, includeAnomalies = true } = params;

      // Get alerts from monitor
      let alerts = this.monitor.getAlerts(severity);

      // Filter by category if specified
      if (category) {
        alerts = alerts.filter((alert) => alert.category === category);
      }

      // Limit results
      alerts = alerts.slice(-limit);

      // Get anomalies if requested
      let anomalies: unknown[] = [];
      if (includeAnomalies) {
        anomalies = this.analytics.getAnomalies(severity);
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
            formattedMessage: this.formatAlertMessage(alert),
          })),
          anomalies: anomalies.map((anomaly) => ({
            ...anomaly,
            timestamp: new Date(anomaly.timestamp).toISOString(),
            formattedDescription: this.formatAnomalyDescription(anomaly),
          })),
          summary: {
            alerts: alertSummary,
            anomalies: anomalySummary,
            overallStatus: this.calculateAlertStatus(alertSummary, anomalySummary),
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
  private async getOptimizationRecommendations(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, focus = "speed", priority = "all", includeROI = true, includePredictions = true } = params;

      // Generate optimization plan
      const optimizationPlan = this.analytics.generateOptimizationPlan();

      // Filter by priority
      let recommendations = [];
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
      let predictions = null;
      if (includePredictions) {
        predictions = this.analytics.predictPerformance(60); // 1 hour prediction
      }

      return {
        success: true,
        data: {
          recommendations: recommendations.map((rec) => ({
            ...rec,
            formattedPriority: this.formatPriority(rec.priority),
            formattedEffort: this.formatEffort(rec.implementationEffort),
          })),
          roi: includeROI ? optimizationPlan.estimatedROI : null,
          predictions: predictions || null,
          summary: {
            totalRecommendations: recommendations.length,
            quickWins: optimizationPlan.quickWins.length,
            mediumTerm: optimizationPlan.mediumTerm.length,
            longTerm: optimizationPlan.longTerm.length,
            estimatedImpact: this.calculateEstimatedImpact(recommendations),
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
  private async exportPerformanceReport(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return toolWrapper(async () => {
      const { site, format = "json", includeHistorical = true, includeAnalytics = true, timeRange = "24h" } = params;

      // Generate comprehensive analytics report
      const report = this.analytics.exportAnalyticsReport();

      // Add additional data based on parameters
      const exportData: Record<string, unknown> = {
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
        const timeframMs = this.parseTimeframe(timeRange);
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
        formattedOutput = this.convertToCSV(exportData);
      } else if (format === "summary") {
        formattedOutput = this.createSummaryReport(exportData);
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

  // Helper methods

  private calculateHealthStatus(metrics: Record<string, unknown>): string {
    let score = 100;

    if (metrics.requests.averageResponseTime > 2000) score -= 30;
    else if (metrics.requests.averageResponseTime > 1000) score -= 15;

    const errorRate = metrics.requests.failed / Math.max(metrics.requests.total, 1);
    if (errorRate > 0.05) score -= 30;
    else if (errorRate > 0.02) score -= 15;

    if (metrics.cache.hitRate < 0.7) score -= 25;
    else if (metrics.cache.hitRate < 0.85) score -= 10;

    if (metrics.system.memoryUsage > 85) score -= 15;

    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    if (score >= 40) return "Poor";
    return "Critical";
  }

  private calculatePerformanceScore(metrics: Record<string, unknown>): number {
    let score = 100;

    // Response time scoring
    if (metrics.requests.averageResponseTime > 3000) score -= 40;
    else if (metrics.requests.averageResponseTime > 1500) score -= 25;
    else if (metrics.requests.averageResponseTime > 800) score -= 10;

    // Error rate scoring
    const errorRate = metrics.requests.failed / Math.max(metrics.requests.total, 1);
    if (errorRate > 0.1) score -= 30;
    else if (errorRate > 0.05) score -= 20;
    else if (errorRate > 0.02) score -= 10;

    // Cache performance scoring
    if (metrics.cache.hitRate < 0.5) score -= 20;
    else if (metrics.cache.hitRate < 0.75) score -= 10;
    else if (metrics.cache.hitRate < 0.9) score -= 5;

    // System resource scoring
    if (metrics.system.memoryUsage > 90) score -= 10;
    else if (metrics.system.memoryUsage > 80) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateCacheEfficiency(cacheMetrics: Record<string, unknown>): string {
    const efficiency =
      cacheMetrics.hitRate * 100 + (cacheMetrics.totalSize > 0 ? 10 : 0) - (cacheMetrics.evictions > 100 ? 10 : 0);

    if (efficiency >= 95) return "Excellent";
    if (efficiency >= 85) return "Good";
    if (efficiency >= 70) return "Fair";
    return "Poor";
  }

  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private parseTimeframe(timeframe: string): number {
    const map: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    return map[timeframe] || map["24h"];
  }

  private processHistoricalDataForChart(data: unknown[], requestedMetrics?: string[]): Record<string, unknown> {
    if (!data.length) return {};

    const allMetrics = ["responseTime", "cacheHitRate", "errorRate", "memoryUsage", "requestVolume"];
    const metricsToProcess = requestedMetrics || allMetrics;

    const result: Record<string, unknown> = {};

    for (const metric of metricsToProcess) {
      result[metric] = data.map((point, index) => ({
        timestamp: point.system.uptime,
        value: this.extractMetricValue(point, metric),
        index,
      }));
    }

    return result;
  }

  private extractMetricValue(dataPoint: Record<string, unknown>, metric: string): number {
    switch (metric) {
      case "responseTime":
        return dataPoint.requests.averageResponseTime;
      case "cacheHitRate":
        return dataPoint.cache.hitRate * 100;
      case "errorRate":
        return (dataPoint.requests.failed / Math.max(dataPoint.requests.total, 1)) * 100;
      case "memoryUsage":
        return dataPoint.system.memoryUsage;
      case "requestVolume":
        return dataPoint.requests.requestsPerSecond;
      default:
        return 0;
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private formatBenchmarkStatus(status: string): string {
    const statusMap: Record<string, string> = {
      excellent: "🟢 Excellent",
      good: "🟡 Good",
      average: "🟠 Average",
      below_average: "🔴 Below Average",
      poor: "⚫ Poor",
    };
    return statusMap[status] || status;
  }

  private getBenchmarkImprovementDescription(benchmark: Record<string, unknown>): string {
    const improvements: Record<string, string> = {
      "Response Time": `Reduce by ${benchmark.improvement.toFixed(0)}ms`,
      "Cache Hit Rate": `Increase by ${benchmark.improvement.toFixed(1)}%`,
      "Error Rate": `Reduce by ${benchmark.improvement.toFixed(2)}%`,
      "Memory Usage": `Reduce by ${benchmark.improvement.toFixed(0)}%`,
    };
    return improvements[benchmark.category] || `Improve by ${benchmark.improvement}`;
  }

  private calculateOverallRanking(benchmarks: Record<string, unknown>[]): {
    percentile: number;
    status: string;
  } {
    const statuses = benchmarks.map((b) => b.status);
    const excellentCount = statuses.filter((s) => s === "excellent").length;
    const goodCount = statuses.filter((s) => s === "good").length;

    const percentile = ((excellentCount + goodCount * 0.8) / statuses.length) * 100;

    let status = "Needs Improvement";
    if (percentile >= 90) status = "Top Performer";
    else if (percentile >= 75) status = "Above Average";
    else if (percentile >= 50) status = "Average";

    return { percentile: Math.round(percentile), status };
  }

  private formatAlertMessage(alert: Record<string, unknown>): string {
    return `${alert.severity.toUpperCase()}: ${alert.message} (${alert.metric}: ${alert.actualValue} vs threshold: ${alert.threshold})`;
  }

  private formatAnomalyDescription(anomaly: Record<string, unknown>): string {
    const direction = anomaly.actualValue > anomaly.expectedValue ? "higher" : "lower";
    return `${anomaly.metric} is ${Math.abs(anomaly.deviation).toFixed(1)}% ${direction} than expected (${anomaly.expectedValue.toFixed(2)} vs ${anomaly.actualValue.toFixed(2)})`;
  }

  private calculateAlertStatus(alertSummary: Record<string, unknown>, anomalySummary: Record<string, unknown>): string {
    const critical = alertSummary.critical + anomalySummary.critical;
    const high = alertSummary.error + anomalySummary.major;

    if (critical > 0) return "Critical Issues Detected";
    if (high > 2) return "High Priority Issues";
    if (alertSummary.warning + anomalySummary.moderate > 5) return "Performance Warnings";
    return "System Healthy";
  }

  private formatPriority(priority: string): string {
    const map: Record<string, string> = {
      critical: "🔴 Critical",
      high: "🟠 High",
      medium: "🟡 Medium",
      low: "🟢 Low",
    };
    return map[priority] || priority;
  }

  private formatEffort(effort: string): string {
    const map: Record<string, string> = {
      low: "⚡ Low Effort",
      medium: "⚖️ Medium Effort",
      high: "🏋️ High Effort",
    };
    return map[effort] || effort;
  }

  private calculateEstimatedImpact(recommendations: Record<string, unknown>[]): string {
    const highImpact = recommendations.filter((r) => ["critical", "high"].includes(r.priority)).length;
    const totalImpact = recommendations.length;

    if (highImpact >= 3) return "Significant Performance Gains Expected";
    if (totalImpact >= 5) return "Moderate Performance Improvements";
    if (totalImpact > 0) return "Minor Performance Optimizations";
    return "System Already Optimized";
  }

  private convertToCSV(data: Record<string, unknown>): string {
    // Simplified CSV conversion for current metrics
    const metrics = data.currentMetrics;
    const csv = [
      "Metric,Value,Unit",
      `Total Requests,${metrics.requests.total},count`,
      `Average Response Time,${metrics.requests.averageResponseTime.toFixed(0)},ms`,
      `Success Rate,${((metrics.requests.successful / Math.max(metrics.requests.total, 1)) * 100).toFixed(1)},%`,
      `Cache Hit Rate,${(metrics.cache.hitRate * 100).toFixed(1)},%`,
      `Cache Size,${metrics.cache.totalSize},entries`,
      `Memory Usage,${metrics.system.memoryUsage},percent`,
      `Uptime,${metrics.system.uptime},ms`,
    ];

    return csv.join("\n");
  }

  private createSummaryReport(data: Record<string, unknown>): Record<string, unknown> {
    const metrics = data.currentMetrics;
    return {
      summary: `Performance Report - ${new Date().toISOString()}`,
      overallHealth: this.calculateHealthStatus(metrics),
      keyMetrics: {
        averageResponseTime: `${metrics.requests.averageResponseTime.toFixed(0)}ms`,
        cacheEfficiency: `${(metrics.cache.hitRate * 100).toFixed(1)}%`,
        systemLoad: `${metrics.system.memoryUsage}%`,
        errorRate: `${((metrics.requests.failed / Math.max(metrics.requests.total, 1)) * 100).toFixed(2)}%`,
      },
      recommendations: data.analytics?.insights?.slice(0, 3) || [],
      nextSteps: "Review detailed metrics and implement high-priority optimizations",
    };
  }

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
      } catch (error) {
        this.logger.error("Failed to collect historical metrics", {
          error: error instanceof Error ? error.message : String(error),
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
