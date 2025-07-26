/**
 * Performance Monitoring System for WordPress MCP Server
 * Collects, analyzes, and reports performance metrics
 */

export interface PerformanceMetrics {
  // Request Performance
  requests: {
    total: number;
    successful: number;
    failed: number;
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
    memoryUsage: number;
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
  private historicalData: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceConfig;
  private startTime: number;
  private responseTimes: number[] = [];
  private collectionTimer?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.startTime = Date.now();
    this.config = {
      collectInterval: 30000, // 30 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        responseTime: 2000, // 2 seconds
        errorRate: 0.05, // 5%
        cacheHitRate: 0.8, // 80%
        memoryUsage: 80, // 80%
        cpuUsage: 80, // 80%
      },
      enableRealTimeMonitoring: true,
      enableHistoricalData: true,
      enableAlerts: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();

    if (this.config.enableRealTimeMonitoring) {
      this.startCollection();
    }
  }

  /**
   * Initialize empty metrics structure
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
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
  recordRequest(responseTime: number, success: boolean, toolName?: string): void {
    this.metrics.requests.total++;

    if (success) {
      this.metrics.requests.successful++;
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
   * Update cache metrics from cache manager
   */
  updateCacheMetrics(cacheStats: any): void {
    this.metrics.cache = {
      hits: cacheStats.hits || 0,
      misses: cacheStats.misses || 0,
      hitRate: cacheStats.hitRate || 0,
      totalSize: cacheStats.totalSize || 0,
      memoryUsageMB: this.estimateCacheMemoryUsage(cacheStats.totalSize),
      evictions: cacheStats.evictions || 0,
      averageCacheTime: 0.5, // Sub-millisecond average
    };
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.metrics.system = {
      cpuUsage: this.getCpuUsage(),
      memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
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
    return { ...this.metrics };
  }

  /**
   * Get historical performance data
   */
  getHistoricalData(startTime?: number, endTime?: number): PerformanceMetrics[] {
    if (!this.config.enableHistoricalData) {
      return [];
    }

    let data = [...this.historicalData];

    if (startTime) {
      data = data.filter((m) => m.system.uptime >= startTime);
    }

    if (endTime) {
      data = data.filter((m) => m.system.uptime <= endTime);
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
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Start automatic metric collection
   */
  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      const snapshot = this.getMetrics();

      if (this.config.enableHistoricalData) {
        this.historicalData.push(snapshot);
        this.cleanupOldData();
      }
    }, this.config.collectInterval);
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
    const thresholds = this.config.alertThresholds;

    // Response time alert
    if (this.metrics.requests.averageResponseTime > thresholds.responseTime) {
      this.addAlert(
        "warning",
        "performance",
        `High response time: ${this.metrics.requests.averageResponseTime}ms`,
        "averageResponseTime",
        thresholds.responseTime,
        this.metrics.requests.averageResponseTime,
        "Consider enabling caching or optimizing queries",
      );
    }

    // Error rate alert
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > thresholds.errorRate) {
      this.addAlert(
        "error",
        "performance",
        `High error rate: ${Math.round(errorRate * 100)}%`,
        "errorRate",
        thresholds.errorRate,
        errorRate,
        "Check WordPress connectivity and authentication",
      );
    }

    // Cache hit rate alert
    if (this.metrics.cache.hitRate < thresholds.cacheHitRate) {
      this.addAlert(
        "warning",
        "cache",
        `Low cache hit rate: ${Math.round(this.metrics.cache.hitRate * 100)}%`,
        "cacheHitRate",
        thresholds.cacheHitRate,
        this.metrics.cache.hitRate,
        "Consider cache warming or adjusting TTL values",
      );
    }
  }

  /**
   * Add performance alert
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
    const alert: PerformanceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
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
  private convertToCSV(data: any): string {
    // Simplified CSV conversion for metrics
    const metrics = data.currentMetrics;
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
    this.historicalData = this.historicalData.filter((data) => data.system.uptime > cutoff);
  }
}
