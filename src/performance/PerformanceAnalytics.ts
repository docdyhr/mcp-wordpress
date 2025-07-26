/**
 * Advanced Performance Analytics for WordPress MCP Server
 * Provides insights, predictions, and optimization recommendations
 */

import { PerformanceMetrics } from "./PerformanceMonitor.js";
import { MetricsCollector } from "./MetricsCollector.js";

export interface AnalyticsConfig {
  enablePredictiveAnalysis: boolean;
  enableAnomalyDetection: boolean;
  enableTrendAnalysis: boolean;
  lookbackPeriod: number; // in milliseconds
  sensitivityLevel: "low" | "medium" | "high";
}

export interface PerformanceTrend {
  metric: string;
  direction: "improving" | "declining" | "stable";
  changeRate: number; // percentage change
  confidence: number; // 0-1
  prediction: {
    nextValue: number;
    timeframe: number; // milliseconds
    confidence: number;
  };
}

export interface PerformanceAnomaly {
  timestamp: number;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  severity: "minor" | "moderate" | "major" | "critical";
  possibleCauses: string[];
}

export interface PerformanceInsight {
  id: string;
  category: "optimization" | "scaling" | "maintenance" | "alert";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: "performance" | "reliability" | "cost" | "user_experience";
  recommendation: string;
  estimatedImprovement: string;
  implementationEffort: "low" | "medium" | "high";
  relatedMetrics: string[];
}

export interface BenchmarkComparison {
  category: string;
  currentValue: number;
  benchmarkValue: number;
  percentile: number; // Where current performance ranks (0-100)
  status: "excellent" | "good" | "average" | "below_average" | "poor";
  improvement: number; // How much improvement needed to reach next tier
}

/**
 * Performance Analytics Engine
 */
export class PerformanceAnalytics {
  private collector: MetricsCollector;
  private config: AnalyticsConfig;
  private historicalData: PerformanceMetrics[] = [];
  private detectedAnomalies: PerformanceAnomaly[] = [];
  private generatedInsights: PerformanceInsight[] = [];

  // Performance benchmarks (based on industry standards)
  private benchmarks = {
    responseTime: {
      excellent: 200, // <200ms
      good: 500, // 200-500ms
      average: 1000, // 500ms-1s
      below_average: 2000, // 1-2s
      poor: Infinity, // >2s
    },
    cacheHitRate: {
      excellent: 0.95, // >95%
      good: 0.85, // 85-95%
      average: 0.7, // 70-85%
      below_average: 0.5, // 50-70%
      poor: 0, // <50%
    },
    errorRate: {
      excellent: 0.001, // <0.1%
      good: 0.01, // 0.1-1%
      average: 0.02, // 1-2%
      below_average: 0.05, // 2-5%
      poor: Infinity, // >5%
    },
    memoryUsage: {
      excellent: 50, // <50%
      good: 70, // 50-70%
      average: 80, // 70-80%
      below_average: 90, // 80-90%
      poor: 100, // >90%
    },
  };

  constructor(collector: MetricsCollector, config: Partial<AnalyticsConfig> = {}) {
    this.collector = collector;
    this.config = {
      enablePredictiveAnalysis: true,
      enableAnomalyDetection: true,
      enableTrendAnalysis: true,
      lookbackPeriod: 24 * 60 * 60 * 1000, // 24 hours
      sensitivityLevel: "medium",
      ...config,
    };
  }

  /**
   * Add historical data point for analysis
   */
  addDataPoint(metrics: PerformanceMetrics): void {
    this.historicalData.push(metrics);

    // Limit historical data to lookback period
    const cutoff = Date.now() - this.config.lookbackPeriod;
    this.historicalData = this.historicalData.filter((data) => data.system.uptime > cutoff);

    // Run analysis on new data
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies(metrics);
    }
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends(): PerformanceTrend[] {
    if (!this.config.enableTrendAnalysis || this.historicalData.length < 5) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // Analyze response time trend
    trends.push(
      this.analyzeTrend(
        "responseTime",
        this.historicalData.map((d) => d.requests.averageResponseTime),
      ),
    );

    // Analyze cache hit rate trend
    trends.push(
      this.analyzeTrend(
        "cacheHitRate",
        this.historicalData.map((d) => d.cache.hitRate),
      ),
    );

    // Analyze error rate trend
    trends.push(
      this.analyzeTrend(
        "errorRate",
        this.historicalData.map((d) => (d.requests.total > 0 ? d.requests.failed / d.requests.total : 0)),
      ),
    );

    // Analyze memory usage trend
    trends.push(
      this.analyzeTrend(
        "memoryUsage",
        this.historicalData.map((d) => d.system.memoryUsage),
      ),
    );

    // Analyze request volume trend
    trends.push(
      this.analyzeTrend(
        "requestVolume",
        this.historicalData.map((d) => d.requests.requestsPerSecond),
      ),
    );

    return trends;
  }

  /**
   * Generate performance insights
   */
  generateInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const currentMetrics = this.collector.collectCurrentMetrics();
    const trends = this.analyzeTrends();

    // Cache optimization insights
    if (currentMetrics.cache.hitRate < 0.8) {
      insights.push({
        id: "cache-optimization-1",
        category: "optimization",
        priority: "high",
        title: "Improve Cache Hit Rate",
        description: `Current cache hit rate is ${(currentMetrics.cache.hitRate * 100).toFixed(1)}%, which is below optimal performance.`,
        impact: "performance",
        recommendation: "Implement cache warming strategies and optimize TTL values for frequently accessed data.",
        estimatedImprovement: "20-40% reduction in response times",
        implementationEffort: "medium",
        relatedMetrics: ["cacheHitRate", "responseTime"],
      });
    }

    // Response time insights
    if (currentMetrics.requests.averageResponseTime > 1000) {
      insights.push({
        id: "response-time-1",
        category: "optimization",
        priority: "high",
        title: "Reduce Response Times",
        description: `Average response time of ${currentMetrics.requests.averageResponseTime.toFixed(0)}ms is above recommended threshold.`,
        impact: "user_experience",
        recommendation: "Enable aggressive caching, optimize database queries, or consider upgrading server resources.",
        estimatedImprovement: "50-70% reduction in response times",
        implementationEffort: "medium",
        relatedMetrics: ["responseTime", "cacheHitRate"],
      });
    }

    // Memory usage insights
    if (currentMetrics.system.memoryUsage > 80) {
      insights.push({
        id: "memory-usage-1",
        category: "scaling",
        priority: "medium",
        title: "Memory Usage Optimization",
        description: `Memory usage at ${currentMetrics.system.memoryUsage}% is approaching limits.`,
        impact: "reliability",
        recommendation: "Increase cache size limits, implement cache eviction policies, or scale server resources.",
        estimatedImprovement: "Improved system stability",
        implementationEffort: "low",
        relatedMetrics: ["memoryUsage", "cacheSize"],
      });
    }

    // Tool usage insights
    const toolMetrics = currentMetrics.tools;
    if (Object.keys(toolMetrics.toolUsageCount).length > 0) {
      const mostUsed = Object.entries(toolMetrics.toolUsageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      insights.push({
        id: "tool-usage-1",
        category: "optimization",
        priority: "low",
        title: "Optimize Frequently Used Tools",
        description: `Most used tools: ${mostUsed.map(([tool]) => tool).join(", ")}. Consider optimizing these workflows.`,
        impact: "performance",
        recommendation: "Create cached workflows or batch operations for frequently used tools.",
        estimatedImprovement: "10-20% reduction in API calls",
        implementationEffort: "high",
        relatedMetrics: ["toolUsage", "requestVolume"],
      });
    }

    // Trend-based insights
    const responseTimeTrend = trends.find((t) => t.metric === "responseTime");
    if (responseTimeTrend && responseTimeTrend.direction === "declining" && responseTimeTrend.changeRate > 10) {
      insights.push({
        id: "trend-response-time-1",
        category: "alert",
        priority: "high",
        title: "Response Time Degradation Detected",
        description: `Response times are declining at ${responseTimeTrend.changeRate.toFixed(1)}% rate.`,
        impact: "performance",
        recommendation: "Investigate recent changes, check WordPress site health, and monitor resource usage.",
        estimatedImprovement: "Prevent further degradation",
        implementationEffort: "medium",
        relatedMetrics: ["responseTime", "errorRate"],
      });
    }

    this.generatedInsights = insights;
    return insights;
  }

  /**
   * Compare performance against benchmarks
   */
  benchmarkPerformance(): BenchmarkComparison[] {
    const currentMetrics = this.collector.collectCurrentMetrics();
    const comparisons: BenchmarkComparison[] = [];

    // Response time benchmark
    comparisons.push(
      this.createBenchmarkComparison(
        "Response Time",
        currentMetrics.requests.averageResponseTime,
        this.benchmarks.responseTime,
        false, // lower is better
      ),
    );

    // Cache hit rate benchmark
    comparisons.push(
      this.createBenchmarkComparison(
        "Cache Hit Rate",
        currentMetrics.cache.hitRate * 100,
        Object.fromEntries(Object.entries(this.benchmarks.cacheHitRate).map(([k, v]) => [k, v * 100])),
        true, // higher is better
      ),
    );

    // Error rate benchmark
    const errorRate =
      currentMetrics.requests.total > 0 ? (currentMetrics.requests.failed / currentMetrics.requests.total) * 100 : 0;
    comparisons.push(
      this.createBenchmarkComparison(
        "Error Rate",
        errorRate,
        Object.fromEntries(Object.entries(this.benchmarks.errorRate).map(([k, v]) => [k, v * 100])),
        false, // lower is better
      ),
    );

    // Memory usage benchmark
    comparisons.push(
      this.createBenchmarkComparison(
        "Memory Usage",
        currentMetrics.system.memoryUsage,
        this.benchmarks.memoryUsage,
        false, // lower is better
      ),
    );

    return comparisons;
  }

  /**
   * Predict future performance based on trends
   */
  predictPerformance(timeframeMinutes: number = 60): {
    predictions: Array<{
      metric: string;
      currentValue: number;
      predictedValue: number;
      confidence: number;
      trend: "improving" | "declining" | "stable";
    }>;
    alerts: string[];
  } {
    if (!this.config.enablePredictiveAnalysis) {
      return { predictions: [], alerts: [] };
    }

    const trends = this.analyzeTrends();
    const predictions: any[] = [];
    const alerts: string[] = [];

    for (const trend of trends) {
      const _timeframeMs = timeframeMinutes * 60 * 1000;
      const predictedValue = trend.prediction.nextValue;

      predictions.push({
        metric: trend.metric,
        currentValue: this.getCurrentMetricValue(trend.metric),
        predictedValue,
        confidence: trend.confidence,
        trend: trend.direction,
      });

      // Generate alerts for concerning predictions
      if (trend.metric === "responseTime" && predictedValue > 2000 && trend.direction === "declining") {
        alerts.push(`Response times predicted to exceed 2s in ${timeframeMinutes} minutes`);
      }

      if (trend.metric === "cacheHitRate" && predictedValue < 0.5 && trend.direction === "declining") {
        alerts.push(`Cache hit rate predicted to drop below 50% in ${timeframeMinutes} minutes`);
      }

      if (trend.metric === "memoryUsage" && predictedValue > 90 && trend.direction === "declining") {
        alerts.push(`Memory usage predicted to exceed 90% in ${timeframeMinutes} minutes`);
      }
    }

    return { predictions, alerts };
  }

  /**
   * Generate optimization recommendations with ROI estimates
   */
  generateOptimizationPlan(): {
    quickWins: PerformanceInsight[];
    mediumTerm: PerformanceInsight[];
    longTerm: PerformanceInsight[];
    estimatedROI: {
      performanceGain: number; // percentage
      implementationCost: "low" | "medium" | "high";
      timeToValue: number; // days
    };
  } {
    const insights = this.generateInsights();

    const quickWins = insights.filter(
      (i) => i.implementationEffort === "low" && ["high", "critical"].includes(i.priority),
    );

    const mediumTerm = insights.filter((i) => i.implementationEffort === "medium");

    const longTerm = insights.filter((i) => i.implementationEffort === "high");

    // Estimate ROI based on current performance issues
    const currentMetrics = this.collector.collectCurrentMetrics();
    let estimatedGain = 0;

    if (currentMetrics.cache.hitRate < 0.8) estimatedGain += 30;
    if (currentMetrics.requests.averageResponseTime > 1000) estimatedGain += 40;
    if (currentMetrics.system.memoryUsage > 80) estimatedGain += 20;

    return {
      quickWins,
      mediumTerm,
      longTerm,
      estimatedROI: {
        performanceGain: Math.min(estimatedGain, 80), // Cap at 80%
        implementationCost: quickWins.length > 2 ? "low" : mediumTerm.length > 2 ? "medium" : "high",
        timeToValue: quickWins.length > 0 ? 1 : mediumTerm.length > 0 ? 7 : 30,
      },
    };
  }

  /**
   * Get anomalies detected in recent data
   */
  getAnomalies(severity?: string): PerformanceAnomaly[] {
    if (severity) {
      return this.detectedAnomalies.filter((a) => a.severity === severity);
    }
    return [...this.detectedAnomalies];
  }

  /**
   * Export comprehensive analytics report
   */
  exportAnalyticsReport(): {
    timestamp: string;
    summary: {
      overallHealth: string;
      keyInsights: number;
      criticalAlerts: number;
      performanceScore: number;
    };
    trends: PerformanceTrend[];
    benchmarks: BenchmarkComparison[];
    insights: PerformanceInsight[];
    anomalies: PerformanceAnomaly[];
    predictions: any;
    optimizationPlan: any;
  } {
    const currentMetrics = this.collector.collectCurrentMetrics();
    const performanceScore = this.calculatePerformanceScore(currentMetrics);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        overallHealth: this.calculateOverallHealth(performanceScore),
        keyInsights: this.generatedInsights.length,
        criticalAlerts: this.generatedInsights.filter((i) => i.priority === "critical").length,
        performanceScore,
      },
      trends: this.analyzeTrends(),
      benchmarks: this.benchmarkPerformance(),
      insights: this.generateInsights(),
      anomalies: this.getAnomalies(),
      predictions: this.predictPerformance(),
      optimizationPlan: this.generateOptimizationPlan(),
    };
  }

  /**
   * Analyze trend for a specific metric
   */
  private analyzeTrend(metricName: string, values: number[]): PerformanceTrend {
    if (values.length < 3) {
      return {
        metric: metricName,
        direction: "stable",
        changeRate: 0,
        confidence: 0,
        prediction: {
          nextValue: values[values.length - 1] || 0,
          timeframe: 0,
          confidence: 0,
        },
      };
    }

    // Calculate linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map((xi) => xi * xi).reduce((a, b) => a + b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const totalSumSquares = y.map((yi) => Math.pow(yi - yMean, 2)).reduce((a, b) => a + b, 0);
    const residualSumSquares = y
      .map((yi, i) => {
        const predicted = slope * x[i] + intercept;
        return Math.pow(yi - predicted, 2);
      })
      .reduce((a, b) => a + b, 0);

    const rSquared = 1 - residualSumSquares / totalSumSquares;

    // Determine direction and change rate
    const currentValue = values[values.length - 1];
    const previousValue = values[values.length - 2];
    const changeRate = Math.abs((currentValue - previousValue) / previousValue) * 100;

    let direction: "improving" | "declining" | "stable" = "stable";
    if (Math.abs(slope) > 0.1) {
      // For metrics where lower is better (response time, error rate)
      if (["responseTime", "errorRate", "memoryUsage"].includes(metricName)) {
        direction = slope < 0 ? "improving" : "declining";
      } else {
        // For metrics where higher is better (cache hit rate)
        direction = slope > 0 ? "improving" : "declining";
      }
    }

    // Predict next value
    const nextValue = slope * n + intercept;

    return {
      metric: metricName,
      direction,
      changeRate,
      confidence: Math.max(0, Math.min(1, rSquared)),
      prediction: {
        nextValue: Math.max(0, nextValue),
        timeframe: 30 * 60 * 1000, // 30 minutes
        confidence: Math.max(0, Math.min(1, rSquared * 0.8)), // Slightly lower confidence for predictions
      },
    };
  }

  /**
   * Detect anomalies in current metrics
   */
  private detectAnomalies(metrics: PerformanceMetrics): void {
    if (this.historicalData.length < 10) return; // Need historical context

    const recentData = this.historicalData.slice(-10);

    // Check response time anomalies
    const responseTimes = recentData.map((d) => d.requests.averageResponseTime);
    this.checkMetricAnomaly(
      "responseTime",
      metrics.requests.averageResponseTime,
      responseTimes,
      "Response time spike detected",
    );

    // Check cache hit rate anomalies
    const hitRates = recentData.map((d) => d.cache.hitRate);
    this.checkMetricAnomaly("cacheHitRate", metrics.cache.hitRate, hitRates, "Cache hit rate drop detected");

    // Check error rate anomalies
    const errorRates = recentData.map((d) => (d.requests.total > 0 ? d.requests.failed / d.requests.total : 0));
    const currentErrorRate = metrics.requests.total > 0 ? metrics.requests.failed / metrics.requests.total : 0;
    this.checkMetricAnomaly("errorRate", currentErrorRate, errorRates, "Error rate spike detected");
  }

  /**
   * Check if a metric value is anomalous
   */
  private checkMetricAnomaly(
    metricName: string,
    currentValue: number,
    historicalValues: number[],
    description: string,
  ): void {
    if (historicalValues.length < 5) return;

    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const variance = historicalValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / historicalValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate z-score
    const zScore = Math.abs((currentValue - mean) / standardDeviation);

    // Determine sensitivity threshold
    let threshold = 2; // Default for medium sensitivity
    if (this.config.sensitivityLevel === "low") threshold = 3;
    if (this.config.sensitivityLevel === "high") threshold = 1.5;

    if (zScore > threshold) {
      const deviation = ((currentValue - mean) / mean) * 100;

      let severity: "minor" | "moderate" | "major" | "critical" = "minor";
      if (zScore > 4) severity = "critical";
      else if (zScore > 3) severity = "major";
      else if (zScore > 2.5) severity = "moderate";

      const anomaly: PerformanceAnomaly = {
        timestamp: Date.now(),
        metric: metricName,
        expectedValue: mean,
        actualValue: currentValue,
        deviation,
        severity,
        possibleCauses: this.generatePossibleCauses(metricName, currentValue > mean),
      };

      this.detectedAnomalies.push(anomaly);

      // Limit anomaly history
      if (this.detectedAnomalies.length > 100) {
        this.detectedAnomalies = this.detectedAnomalies.slice(-50);
      }
    }
  }

  /**
   * Generate possible causes for anomalies
   */
  private generatePossibleCauses(metricName: string, isIncrease: boolean): string[] {
    const causes: string[] = [];

    if (metricName === "responseTime" && isIncrease) {
      causes.push("High server load", "Database performance issues", "Network latency", "Cache miss increase");
    } else if (metricName === "cacheHitRate" && !isIncrease) {
      causes.push("Cache invalidation event", "New data requests", "Cache size limit reached", "TTL expiration");
    } else if (metricName === "errorRate" && isIncrease) {
      causes.push("WordPress site issues", "Authentication problems", "Network connectivity", "Plugin conflicts");
    }

    return causes;
  }

  /**
   * Create benchmark comparison
   */
  private createBenchmarkComparison(
    category: string,
    currentValue: number,
    benchmarks: any,
    higherIsBetter: boolean,
  ): BenchmarkComparison {
    let status: "excellent" | "good" | "average" | "below_average" | "poor" = "poor";
    let percentile = 0;
    let improvement = 0;

    if (higherIsBetter) {
      if (currentValue >= benchmarks.excellent) status = "excellent";
      else if (currentValue >= benchmarks.good) status = "good";
      else if (currentValue >= benchmarks.average) status = "average";
      else if (currentValue >= benchmarks.below_average) status = "below_average";

      // Calculate improvement needed
      if (status !== "excellent") {
        const nextTier =
          status === "good"
            ? benchmarks.excellent
            : status === "average"
              ? benchmarks.good
              : status === "below_average"
                ? benchmarks.average
                : benchmarks.below_average;
        improvement = nextTier - currentValue;
      }
    } else {
      if (currentValue <= benchmarks.excellent) status = "excellent";
      else if (currentValue <= benchmarks.good) status = "good";
      else if (currentValue <= benchmarks.average) status = "average";
      else if (currentValue <= benchmarks.below_average) status = "below_average";

      // Calculate improvement needed
      if (status !== "excellent") {
        const nextTier =
          status === "good"
            ? benchmarks.excellent
            : status === "average"
              ? benchmarks.good
              : status === "below_average"
                ? benchmarks.average
                : benchmarks.below_average;
        improvement = currentValue - nextTier;
      }
    }

    // Calculate percentile (simplified)
    percentile =
      status === "excellent"
        ? 95
        : status === "good"
          ? 80
          : status === "average"
            ? 60
            : status === "below_average"
              ? 30
              : 10;

    return {
      category,
      currentValue,
      benchmarkValue: benchmarks.excellent,
      percentile,
      status,
      improvement,
    };
  }

  /**
   * Get current value for a metric
   */
  private getCurrentMetricValue(metricName: string): number {
    const current = this.collector.collectCurrentMetrics();

    switch (metricName) {
      case "responseTime":
        return current.requests.averageResponseTime;
      case "cacheHitRate":
        return current.cache.hitRate;
      case "errorRate":
        return current.requests.total > 0 ? current.requests.failed / current.requests.total : 0;
      case "memoryUsage":
        return current.system.memoryUsage;
      case "requestVolume":
        return current.requests.requestsPerSecond;
      default:
        return 0;
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Response time (30% weight)
    if (metrics.requests.averageResponseTime > 2000) score -= 30;
    else if (metrics.requests.averageResponseTime > 1000) score -= 15;
    else if (metrics.requests.averageResponseTime > 500) score -= 5;

    // Error rate (25% weight)
    const errorRate = metrics.requests.total > 0 ? metrics.requests.failed / metrics.requests.total : 0;
    if (errorRate > 0.05) score -= 25;
    else if (errorRate > 0.02) score -= 15;
    else if (errorRate > 0.01) score -= 5;

    // Cache performance (25% weight)
    if (metrics.cache.hitRate < 0.5) score -= 25;
    else if (metrics.cache.hitRate < 0.7) score -= 15;
    else if (metrics.cache.hitRate < 0.85) score -= 5;

    // System resources (20% weight)
    if (metrics.system.memoryUsage > 90) score -= 20;
    else if (metrics.system.memoryUsage > 80) score -= 10;
    else if (metrics.system.memoryUsage > 70) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(score: number): string {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  }
}
