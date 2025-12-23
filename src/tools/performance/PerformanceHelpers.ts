/**
 * Performance Helper Utilities
 * Extracted helper functions for performance metrics formatting and calculations
 */

import type { PerformanceMetrics } from "@/performance/PerformanceMonitor.js";
import type { BenchmarkComparison, PerformanceAnomaly } from "@/performance/PerformanceAnalytics.js";

/**
 * Performance alert interface
 */
export interface PerformanceAlert {
  severity: string;
  category: string;
  message: string;
  metric: string;
  actualValue: number;
  threshold: number;
  timestamp: number;
}

/**
 * Calculate overall health status from metrics
 */
export function calculateHealthStatus(metrics: PerformanceMetrics): string {
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

/**
 * Calculate performance score from metrics
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
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

/**
 * Calculate cache efficiency rating
 */
export function calculateCacheEfficiency(cacheMetrics: PerformanceMetrics["cache"]): string {
  const efficiency =
    cacheMetrics.hitRate * 100 + (cacheMetrics.totalSize > 0 ? 10 : 0) - (cacheMetrics.evictions > 100 ? 10 : 0);

  if (efficiency >= 95) return "Excellent";
  if (efficiency >= 85) return "Good";
  if (efficiency >= 70) return "Fair";
  return "Poor";
}

/**
 * Format uptime in human-readable format
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Parse timeframe string to milliseconds
 */
export function parseTimeframe(timeframe: string): number {
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

/**
 * Extract metric value from data point
 */
export function extractMetricValue(dataPoint: PerformanceMetrics, metric: string): number {
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

/**
 * Process historical data for charting
 */
export function processHistoricalDataForChart(
  data: PerformanceMetrics[],
  requestedMetrics?: string[],
): Record<string, unknown> {
  if (!data.length) return {};

  const allMetrics = ["responseTime", "cacheHitRate", "errorRate", "memoryUsage", "requestVolume"];
  const metricsToProcess = requestedMetrics || allMetrics;

  const result: Record<string, unknown> = {};

  for (const metric of metricsToProcess) {
    result[metric] = data.map((point, index) => ({
      timestamp: point.system.uptime,
      value: extractMetricValue(point, metric),
      index,
    }));
  }

  return result;
}

/**
 * Calculate average of number array
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Format benchmark status with emoji
 */
export function formatBenchmarkStatus(status: string): string {
  const statusMap: Record<string, string> = {
    excellent: "🟢 Excellent",
    good: "🟡 Good",
    average: "🟠 Average",
    below_average: "🔴 Below Average",
    poor: "⚫ Poor",
  };
  return statusMap[status] || status;
}

/**
 * Get benchmark improvement description
 */
export function getBenchmarkImprovementDescription(benchmark: BenchmarkComparison): string {
  const improvements: Record<string, string> = {
    "Response Time": `Reduce by ${benchmark.improvement.toFixed(0)}ms`,
    "Cache Hit Rate": `Increase by ${benchmark.improvement.toFixed(1)}%`,
    "Error Rate": `Reduce by ${benchmark.improvement.toFixed(2)}%`,
    "Memory Usage": `Reduce by ${benchmark.improvement.toFixed(0)}%`,
  };
  return improvements[benchmark.category] || `Improve by ${benchmark.improvement}`;
}

/**
 * Calculate overall ranking from benchmarks
 */
export function calculateOverallRanking(benchmarks: BenchmarkComparison[]): { percentile: number; status: string } {
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

/**
 * Format alert message
 */
export function formatAlertMessage(alert: PerformanceAlert): string {
  return `${alert.severity.toUpperCase()}: ${alert.message} (${alert.metric}: ${alert.actualValue} vs threshold: ${alert.threshold})`;
}

/**
 * Format anomaly description
 */
export function formatAnomalyDescription(anomaly: PerformanceAnomaly): string {
  const direction = anomaly.actualValue > anomaly.expectedValue ? "higher" : "lower";
  return `${anomaly.metric} is ${Math.abs(anomaly.deviation).toFixed(1)}% ${direction} than expected (${anomaly.expectedValue.toFixed(2)} vs ${anomaly.actualValue.toFixed(2)})`;
}

/**
 * Calculate alert status from summaries
 */
export function calculateAlertStatus(
  alertSummary: { critical: number; error: number; warning: number },
  anomalySummary: {
    critical: number;
    major: number;
    moderate: number;
    minor: number;
  },
): string {
  const critical = alertSummary.critical + anomalySummary.critical;
  const high = alertSummary.error + anomalySummary.major;

  if (critical > 0) return "Critical Issues Detected";
  if (high > 2) return "High Priority Issues";
  if (alertSummary.warning + anomalySummary.moderate > 5) return "Performance Warnings";
  return "System Healthy";
}

/**
 * Format priority with emoji
 */
export function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    critical: "🔴 Critical",
    high: "🟠 High",
    medium: "🟡 Medium",
    low: "🟢 Low",
  };
  return map[priority] || priority;
}

/**
 * Format effort with emoji
 */
export function formatEffort(effort: string): string {
  const map: Record<string, string> = {
    low: "⚡ Low Effort",
    medium: "⚖️ Medium Effort",
    high: "🏋️ High Effort",
  };
  return map[effort] || effort;
}

/**
 * Calculate estimated impact from recommendations
 */
export function calculateEstimatedImpact(recommendations: Array<{ priority: string }>): string {
  const highImpact = recommendations.filter((r) => ["critical", "high"].includes(r.priority)).length;
  const totalImpact = recommendations.length;

  if (highImpact >= 3) return "Significant Performance Gains Expected";
  if (totalImpact >= 5) return "Moderate Performance Improvements";
  if (totalImpact > 0) return "Minor Performance Optimizations";
  return "System Already Optimized";
}

/**
 * Convert metrics data to CSV format
 */
export function convertToCSV(data: { currentMetrics: PerformanceMetrics }): string {
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

/**
 * Create summary report from data
 */
export function createSummaryReport(data: {
  currentMetrics: PerformanceMetrics;
  analytics?: { insights?: unknown[] };
}): Record<string, unknown> {
  const metrics = data.currentMetrics;
  return {
    summary: `Performance Report - ${new Date().toISOString()}`,
    overallHealth: calculateHealthStatus(metrics),
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
