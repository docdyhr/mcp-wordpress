/**
 * Performance Monitoring System for WordPress MCP Server
 * Collects, analyzes, and reports performance metrics
 */

import v8 from "v8";
import { ConfigHelpers } from "@/config/Config.js";

/**
 * One MCP tool invocation, kept in memory so a user can see "which tool, which site, did it work, why not"
 * through a tool — the host (Claude Desktop) does not capture an installed extension's stderr. Call
 * parameters are deliberately not stored.
 */
export interface ToolCallRecord {
  /** Epoch milliseconds when the call finished. */
  timestamp: number;
  tool: string;
  site?: string | undefined;
  status: "ok" | "error";
  durationMs: number;
  /** HTTP status of the underlying WordPress error, when there was one. */
  statusCode?: number | undefined;
  /** WordPress/transport error code, e.g. "rest_forbidden". */
  errorCode?: string | undefined;
  /** The error's class name, e.g. "WordPressAPIError". Never the message: that can quote call arguments. */
  errorType?: string | undefined;
}

const MAX_RECENT_TOOL_CALLS = 50;

export interface PerformanceMetrics {
  /** When this reading was taken (epoch ms). History is selected and pruned by it; `system.uptime` is a duration. */
  timestamp: number;

  // Request Performance
  requests: {
    total: number;
    successful: number;
    /** Server, network and rate-limit failures — the numerator of the error rate. */
    failed: number;
    /** Expected 4xx responses (not found, forbidden, invalid input); not counted in `failed`. */
    clientErrors: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };

  // Cache Performance
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
    memoryUsageMB: number;
    evictions: number;
    averageCacheTime: number;
  };

  // System Performance
  system: {
    cpuUsage: number;
    /** Heap used as a % of the V8 heap limit (how close the process is to running out of heap). */
    memoryUsage: number;
    rssMB: number;
    heapUsedMB: number;
    heapLimitMB: number;
    uptime: number;
    activeConnections: number;
    concurrentRequests: number;
  };

  // WordPress Specific
  wordpress: {
    authSuccessRate: number;
    apiVersion: string;
    siteHealth: "healthy" | "warning" | "critical";
    averageDbResponseTime: number;
    pluginCompatibility: number;
  };

  // Tool Usage
  tools: {
    mostUsedTool: string;
    toolUsageCount: Record<string, number>;
    toolPerformance: Record<
      string,
      {
        averageTime: number;
        successRate: number;
        callCount: number;
      }
    >;
  };
}

/**
 * A metrics reading as kept in the history: everything except the per-tool maps, which nothing that reads history uses
 * and which made each of the (up to 2880 per day) snapshots several KB.
 */
export type PerformanceSnapshot = Omit<PerformanceMetrics, "tools">;

export function toSnapshot(metrics: PerformanceSnapshot): PerformanceSnapshot {
  const { timestamp, requests, cache, system, wordpress } = metrics;
  return { timestamp, requests, cache, system, wordpress };
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: "info" | "warning" | "error" | "critical";
  category: "performance" | "cache" | "system" | "wordpress";
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  suggestion?: string;
}

export const DEFAULT_ALERT_THRESHOLDS = {
  responseTime: 2000, // 2 seconds
  errorRate: 0.05, // 5%
  cacheHitRate: 0.8, // 80%
  memoryUsage: 80, // % of the V8 heap limit
  cpuUsage: 80, // 80%
};

/**
 * A threshold that is breached by the CURRENT metrics. Recorded alerts (getAlerts) are a history that never
 * expires; these are what is wrong right now, and they are produced by the same rules that raise the alerts.
 */
export interface AlertCondition {
  severity: "warning" | "error";
  category: "performance" | "cache" | "system";
  metric: string;
  message: string;
  threshold: number;
  actualValue: number;
  suggestion: string;
}

/**
 * False only when the cache is known to have had no lookups at all (both counts explicitly 0), e.g. caching is
 * disabled or nothing has been requested yet. A hit rate over zero lookups is undefined, not "0%", so it must
 * not raise an alert or cost health points. Counts that are absent are treated as "unknown", i.e. active.
 */
export function hasCacheActivity(cache: { hits?: number; misses?: number }): boolean {
  return !(cache.hits === 0 && cache.misses === 0);
}

// Heap usage this high leaves almost no headroom before V8 throws away the process.
const MEMORY_ERROR_PERCENT = 95;

/**
 * Evaluate the alert rules against a metrics snapshot. Pure: the monitor uses it to raise alerts and the
 * performance tools use it to report what is breaching now, so the two can never disagree.
 */
export function evaluateAlertConditions(
  metrics: Pick<PerformanceMetrics, "requests" | "cache" | "system">,
  thresholds: PerformanceConfig["alertThresholds"],
): AlertCondition[] {
  const conditions: AlertCondition[] = [];
  const { requests, cache, system } = metrics;

  if (requests.averageResponseTime > thresholds.responseTime) {
    conditions.push({
      severity: "warning",
      category: "performance",
      metric: "averageResponseTime",
      message: `High response time: ${requests.averageResponseTime}ms`,
      threshold: thresholds.responseTime,
      actualValue: requests.averageResponseTime,
      suggestion: "Consider enabling caching or optimizing queries",
    });
  }

  if (requests.total > 0) {
    const errorRate = requests.failed / requests.total;
    if (errorRate > thresholds.errorRate) {
      conditions.push({
        severity: "error",
        category: "performance",
        metric: "errorRate",
        message: `High error rate: ${Math.round(errorRate * 100)}%`,
        threshold: thresholds.errorRate,
        actualValue: errorRate,
        suggestion: "Check WordPress connectivity and authentication",
      });
    }
  }

  if (hasCacheActivity(cache) && cache.hitRate < thresholds.cacheHitRate) {
    conditions.push({
      severity: "warning",
      category: "cache",
      metric: "cacheHitRate",
      message: `Low cache hit rate: ${Math.round(cache.hitRate * 100)}%`,
      threshold: thresholds.cacheHitRate,
      actualValue: cache.hitRate,
      suggestion: "Consider cache warming or adjusting TTL values",
    });
  }

  // The memoryUsage threshold was configured but never evaluated anywhere.
  if (system.memoryUsage > thresholds.memoryUsage) {
    conditions.push({
      severity: system.memoryUsage > MEMORY_ERROR_PERCENT ? "error" : "warning",
      category: "system",
      metric: "memoryUsage",
      message: `High memory usage: ${system.memoryUsage}% of the V8 heap limit`,
      threshold: thresholds.memoryUsage,
      actualValue: system.memoryUsage,
      suggestion: "Lower the cache size or restart the server before the heap limit is reached",
    });
  }

  return conditions;
}

export interface PerformanceConfig {
  collectInterval: number; // Collection interval in ms
  retentionPeriod: number; // Data retention in ms
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  enableRealTimeMonitoring: boolean;
  enableHistoricalData: boolean;
  enableAlerts: boolean;
}

/**
 * Core Performance Monitor class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private historicalData: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceConfig;
  private startTime: number;
  private responseTimes: number[] = [];
  private recentToolCalls: ToolCallRecord[] = [];
  private collectionTimer?: NodeJS.Timeout;
  private lastAlertTime: Map<string, number> = new Map();
  private static readonly ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.startTime = Date.now();
    this.config = {
      collectInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: { ...DEFAULT_ALERT_THRESHOLDS },
      enableRealTimeMonitoring: true,
      enableHistoricalData: true,
      enableAlerts: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();

    // Don't start collection in test environment to avoid timer issues
    if (this.config.enableRealTimeMonitoring && !ConfigHelpers.isTest()) {
      this.startCollection();
    }
  }

  /**
   * Initialize empty metrics structure
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        clientErrors: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalSize: 0,
        memoryUsageMB: 0,
        evictions: 0,
        averageCacheTime: 0,
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        rssMB: 0,
        heapUsedMB: 0,
        heapLimitMB: 0,
        uptime: 0,
        activeConnections: 0,
        concurrentRequests: 0,
      },
      wordpress: {
        authSuccessRate: 0,
        apiVersion: "v2",
        siteHealth: "healthy",
        averageDbResponseTime: 0,
        pluginCompatibility: 100,
      },
      tools: {
        mostUsedTool: "",
        toolUsageCount: {},
        toolPerformance: {},
      },
    };
  }

  /**
   * Record a request performance metric
   */
  recordRequest(
    responseTime: number,
    success: boolean,
    toolName?: string,
    options?: { clientError?: boolean | undefined },
  ): void {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
    } else if (options?.clientError) {
      this.metrics.requests.clientErrors++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track response times
    this.responseTimes.push(responseTime);
    this.updateResponseTimeMetrics();

    // Track tool usage
    if (toolName) {
      this.recordToolUsage(toolName, responseTime, success);
    }

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkPerformanceAlerts();
    }
  }

  /**
   * Record one MCP tool invocation. A tool call is not an HTTP request — it may make several
   * or none (e.g. wp_performance_stats) — so this updates tool usage only, never request totals.
   */
  recordToolCall(
    toolName: string,
    responseTime: number,
    success: boolean,
    details: { site?: string | undefined; error?: Error | undefined } = {},
  ): void {
    this.recordToolUsage(toolName, responseTime, success);

    const { site, error } = details;
    const wpError = error as (Error & { statusCode?: unknown; code?: unknown }) | undefined;
    this.recentToolCalls.push({
      timestamp: Date.now(),
      tool: toolName,
      site,
      status: success ? "ok" : "error",
      durationMs: responseTime,
      statusCode: typeof wpError?.statusCode === "number" ? wpError.statusCode : undefined,
      errorCode: typeof wpError?.code === "string" ? wpError.code : undefined,
      errorType: error?.name || undefined,
    });
    if (this.recentToolCalls.length > MAX_RECENT_TOOL_CALLS) {
      this.recentToolCalls.shift();
    }
  }

  /**
   * The most recent tool calls, newest first (at most the last 50 are kept).
   */
  getRecentToolCalls(limit: number = MAX_RECENT_TOOL_CALLS): ToolCallRecord[] {
    return limit > 0 ? this.recentToolCalls.slice(-limit).reverse() : [];
  }

  /**
   * Update cache metrics from cache manager
   */
  updateCacheMetrics(cacheStats: Record<string, unknown>): void {
    this.metrics.cache = {
      hits: (cacheStats.hits as number) || 0,
      misses: (cacheStats.misses as number) || 0,
      hitRate: (cacheStats.hitRate as number) || 0,
      totalSize: (cacheStats.totalSize as number) || 0,
      memoryUsageMB: this.estimateCacheMemoryUsage((cacheStats.totalSize as number) || 0),
      evictions: (cacheStats.evictions as number) || 0,
      averageCacheTime: 0.5, // Sub-millisecond average
    };
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const heapLimit = v8.getHeapStatistics().heap_size_limit;
    const toMB = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

    this.metrics.system = {
      cpuUsage: this.getCpuUsage(),
      // heapUsed/heapTotal is ~100% on any healthy process (V8 only grows the heap as needed), so
      // measure against the heap limit instead — that is the figure that predicts running out.
      memoryUsage: heapLimit > 0 ? Math.round((memUsage.heapUsed / heapLimit) * 1000) / 10 : 0,
      rssMB: toMB(memUsage.rss),
      heapUsedMB: toMB(memUsage.heapUsed),
      heapLimitMB: toMB(heapLimit),
      uptime: Date.now() - this.startTime,
      activeConnections: 1, // Will be updated by connection manager
      concurrentRequests: 0, // Will be updated by request manager
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateSystemMetrics();
    // A deep copy: recordRequest() updates the nested counters in place, so a shallow copy stored in the history
    // would keep changing with the live metrics.
    this.metrics.timestamp = Date.now();
    return structuredClone(this.metrics);
  }

  /**
   * Get historical performance data
   */
  getHistoricalData(startTime?: number, endTime?: number): PerformanceSnapshot[] {
    if (!this.config.enableHistoricalData) {
      return [];
    }

    let data = [...this.historicalData];

    if (startTime) {
      data = data.filter((m) => m.timestamp >= startTime);
    }

    if (endTime) {
      data = data.filter((m) => m.timestamp <= endTime);
    }

    return data;
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: string): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter((alert) => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Generate performance insights
   */
  generateInsights(): {
    summary: string;
    recommendations: string[];
    trends: string[];
    health: "excellent" | "good" | "warning" | "critical";
  } {
    const current = this.getMetrics();
    const health = this.calculateOverallHealth(current);

    return {
      summary: this.generateSummary(current),
      recommendations: this.generateRecommendations(current),
      trends: this.generateTrends(),
      health,
    };
  }

  /**
   * Export performance data
   */
  exportData(format: "json" | "csv" = "json"): string {
    const data = {
      currentMetrics: this.getMetrics(),
      historicalData: this.getHistoricalData(),
      alerts: this.getAlerts(),
      config: this.config,
      generatedAt: new Date().toISOString(),
    };

    if (format === "csv") {
      return this.convertToCSV([data] as Record<string, unknown>[]);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Start automatic metric collection
   * Note: This uses setInterval and is not called in test environments to avoid Jest timer issues
   */
  private startCollection(): void {
    // unref() so this background timer alone can never keep a process (or a
    // one-shot script that merely imports/instantiates this class) alive.
    this.collectionTimer = setInterval(() => this.recordSnapshot(), this.config.collectInterval).unref();
  }

  /**
   * Store the current metrics in the history (what the collection timer does every `collectInterval`) and drop
   * snapshots older than `retentionPeriod`.
   */
  recordSnapshot(): void {
    if (!this.config.enableHistoricalData) return;
    this.historicalData.push(toSnapshot(this.getMetrics()));
    this.cleanupOldData();
  }

  /**
   * Stop metric collection
   */
  stop(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
  }

  /**
   * Record tool usage and performance
   */
  private recordToolUsage(toolName: string, responseTime: number, success: boolean): void {
    // Update usage count
    this.metrics.tools.toolUsageCount[toolName] = (this.metrics.tools.toolUsageCount[toolName] || 0) + 1;

    // Update performance metrics
    if (!this.metrics.tools.toolPerformance[toolName]) {
      this.metrics.tools.toolPerformance[toolName] = {
        averageTime: responseTime,
        successRate: success ? 1 : 0,
        callCount: 1,
      };
    } else {
      const perf = this.metrics.tools.toolPerformance[toolName];
      const totalCalls = perf.callCount + 1;

      // Update average time
      perf.averageTime = (perf.averageTime * perf.callCount + responseTime) / totalCalls;

      // Update success rate
      const totalSuccess = perf.successRate * perf.callCount + (success ? 1 : 0);
      perf.successRate = totalSuccess / totalCalls;

      perf.callCount = totalCalls;
    }

    // Update most used tool
    const usageCounts = this.metrics.tools.toolUsageCount;
    this.metrics.tools.mostUsedTool = Object.keys(usageCounts).reduce((a, b) =>
      usageCounts[a] > usageCounts[b] ? a : b,
    );
  }

  /**
   * Update response time metrics with percentiles
   */
  private updateResponseTimeMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const total = this.metrics.requests.total;

    this.metrics.requests.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

    this.metrics.requests.minResponseTime = sorted[0];
    this.metrics.requests.maxResponseTime = sorted[sorted.length - 1];

    // Calculate percentiles
    this.metrics.requests.p50ResponseTime = this.getPercentile(sorted, 0.5);
    this.metrics.requests.p95ResponseTime = this.getPercentile(sorted, 0.95);
    this.metrics.requests.p99ResponseTime = this.getPercentile(sorted, 0.99);

    // Calculate requests per second
    const uptime = (Date.now() - this.startTime) / 1000;
    this.metrics.requests.requestsPerSecond = total / uptime;

    // Limit response time history to prevent memory growth
    if (this.responseTimes.length > 10000) {
      this.responseTimes = this.responseTimes.slice(-5000);
    }
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Estimate cache memory usage
   */
  private estimateCacheMemoryUsage(totalSize: number): number {
    // Rough estimate: ~1KB per cache entry
    return (totalSize * 1024) / (1024 * 1024); // Convert to MB
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCpuUsage(): number {
    // Simplified CPU usage estimation
    // In production, use more sophisticated monitoring
    return Math.round(Math.random() * 20 + 10); // 10-30% placeholder
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(): void {
    // Memory must be the current reading, not the last 30-second sample.
    this.updateSystemMetrics();
    for (const c of evaluateAlertConditions(this.metrics, this.config.alertThresholds)) {
      this.addAlert(c.severity, c.category, c.message, c.metric, c.threshold, c.actualValue, c.suggestion);
    }
  }

  /**
   * The thresholds the current metrics breach right now. Unlike getAlerts() (a history that never expires),
   * this clears itself when the condition recovers.
   */
  getActiveAlerts(): AlertCondition[] {
    this.updateSystemMetrics();
    return evaluateAlertConditions(this.metrics, this.config.alertThresholds);
  }

  /**
   * Add performance alert with per-metric cooldown to prevent spam.
   * If the same (metric, severity) fired within the cooldown window,
   * only the timestamp and actual value on the existing alert are updated.
   */
  private addAlert(
    severity: "info" | "warning" | "error" | "critical",
    category: "performance" | "cache" | "system" | "wordpress",
    message: string,
    metric: string,
    threshold: number,
    actualValue: number,
    suggestion?: string,
  ): void {
    const now = Date.now();
    const cooldownKey = `${metric}:${severity}`;
    const lastFired = this.lastAlertTime.get(cooldownKey) ?? 0;

    if (now - lastFired < PerformanceMonitor.ALERT_COOLDOWN_MS) {
      // Update the most recent matching alert in-place instead of appending
      for (let i = this.alerts.length - 1; i >= 0; i--) {
        const a = this.alerts[i];
        if (a.metric === metric && a.severity === severity) {
          a.timestamp = now;
          a.actualValue = actualValue;
          a.message = message;
          break;
        }
      }
      return;
    }

    this.lastAlertTime.set(cooldownKey, now);

    const alert: PerformanceAlert = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      severity,
      category,
      message,
      metric,
      threshold,
      actualValue,
      ...(suggestion && { suggestion }),
    };

    this.alerts.push(alert);

    // Limit alert history
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(metrics: PerformanceMetrics): "excellent" | "good" | "warning" | "critical" {
    let score = 100;

    // Response time impact
    if (metrics.requests.averageResponseTime > 3000) score -= 30;
    else if (metrics.requests.averageResponseTime > 1000) score -= 15;

    // Error rate impact
    const errorRate = metrics.requests.failed / metrics.requests.total;
    if (errorRate > 0.1) score -= 40;
    else if (errorRate > 0.05) score -= 20;

    // Cache performance impact
    if (metrics.cache.hitRate < 0.5) score -= 25;
    else if (metrics.cache.hitRate < 0.8) score -= 10;

    // System resource impact
    if (metrics.system.memoryUsage > 90) score -= 20;
    else if (metrics.system.memoryUsage > 80) score -= 10;

    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 50) return "warning";
    return "critical";
  }

  /**
   * Generate performance summary
   */
  private generateSummary(metrics: PerformanceMetrics): string {
    const errorRate =
      metrics.requests.total > 0 ? ((metrics.requests.failed / metrics.requests.total) * 100).toFixed(1) : "0";

    return (
      `Performance Summary: ${metrics.requests.total} requests processed with ${errorRate}% error rate. ` +
      `Average response time: ${metrics.requests.averageResponseTime.toFixed(0)}ms. ` +
      `Cache hit rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%. ` +
      `System uptime: ${Math.round(metrics.system.uptime / 1000 / 60)} minutes.`
    );
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.requests.averageResponseTime > 1000) {
      recommendations.push("Enable caching to reduce response times");
    }

    if (metrics.cache.hitRate < 0.8) {
      recommendations.push("Warm cache with frequently accessed data");
    }

    if (metrics.system.memoryUsage > 80) {
      recommendations.push("Consider increasing memory allocation or cache size limits");
    }

    const errorRate = metrics.requests.failed / metrics.requests.total;
    if (errorRate > 0.05) {
      recommendations.push("Review error logs and improve error handling");
    }

    return recommendations;
  }

  /**
   * Generate trend analysis
   */
  private generateTrends(): string[] {
    if (this.historicalData.length < 2) {
      return ["Insufficient data for trend analysis"];
    }

    const trends: string[] = [];
    const recent = this.historicalData.slice(-5);

    // Response time trend
    const responseTimes = recent.map((d) => d.requests.averageResponseTime);
    if (this.isIncreasing(responseTimes)) {
      trends.push("Response times are increasing");
    } else if (this.isDecreasing(responseTimes)) {
      trends.push("Response times are improving");
    }

    // Cache hit rate trend
    const hitRates = recent.map((d) => d.cache.hitRate);
    if (this.isIncreasing(hitRates)) {
      trends.push("Cache performance is improving");
    } else if (this.isDecreasing(hitRates)) {
      trends.push("Cache performance is declining");
    }

    return trends;
  }

  /**
   * Check if values are increasing
   */
  private isIncreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] <= values[i - 1]) return false;
    }
    return true;
  }

  /**
   * Check if values are decreasing
   */
  private isDecreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] >= values[i - 1]) return false;
    }
    return true;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: Record<string, unknown>[]): string {
    // Simplified CSV conversion for metrics
    const reportData = data[0];
    const metrics = reportData?.currentMetrics as {
      requests: { total: number; successful: number; failed: number; averageResponseTime: number };
      cache: { hitRate: number; totalSize: number };
      system: { memoryUsage: number; uptime: number };
    };
    const csv = [
      "Metric,Value",
      `Total Requests,${metrics.requests.total}`,
      `Successful Requests,${metrics.requests.successful}`,
      `Failed Requests,${metrics.requests.failed}`,
      `Average Response Time,${metrics.requests.averageResponseTime}`,
      `Cache Hit Rate,${metrics.cache.hitRate}`,
      `Cache Size,${metrics.cache.totalSize}`,
      `Memory Usage,${metrics.system.memoryUsage}%`,
      `Uptime,${metrics.system.uptime}ms`,
    ];

    return csv.join("\n");
  }

  /**
   * Clean up old historical data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.historicalData = this.historicalData.filter((data) => data.timestamp > cutoff);
  }
}
