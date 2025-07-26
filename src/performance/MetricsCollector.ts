/**
 * Real-time Metrics Collector for WordPress MCP Server
 * Integrates with existing client and cache systems
 */

import { PerformanceMonitor, PerformanceMetrics } from "./PerformanceMonitor.js";
import type { CacheStats } from "../cache/CacheManager.js";
import type { ClientStats } from "../types/client.js";

export interface CollectorConfig {
  enableRealTime: boolean;
  collectInterval: number;
  enableToolTracking: boolean;
  enableRequestInterception: boolean;
  enableCacheIntegration: boolean;
  enableSystemMetrics: boolean;
}

export interface RequestMetadata {
  toolName?: string;
  siteId?: string;
  endpoint: string;
  method: string;
  startTime: number;
  fromCache: boolean;
}

export interface ToolExecutionContext {
  toolName: string;
  parameters: any;
  startTime: number;
  siteId: string | undefined;
}

/**
 * Metrics Collector - Central hub for all performance data
 */
export class MetricsCollector {
  private monitor: PerformanceMonitor;
  private config: CollectorConfig;
  private activeRequests: Map<string, RequestMetadata> = new Map();
  private activeTools: Map<string, ToolExecutionContext> = new Map();
  private clientInstances: Map<string, any> = new Map();
  private cacheManagers: Map<string, any> = new Map();

  constructor(monitor: PerformanceMonitor, config: Partial<CollectorConfig> = {}) {
    this.monitor = monitor;
    this.config = {
      enableRealTime: true,
      collectInterval: 30000, // 30 seconds
      enableToolTracking: true,
      enableRequestInterception: true,
      enableCacheIntegration: true,
      enableSystemMetrics: true,
      ...config,
    };

    if (this.config.enableRealTime) {
      this.startRealTimeCollection();
    }
  }

  /**
   * Register a WordPress client for monitoring
   */
  registerClient(siteId: string, client: any): void {
    this.clientInstances.set(siteId, client);

    if (this.config.enableRequestInterception) {
      this.interceptClientRequests(siteId, client);
    }
  }

  /**
   * Register a cache manager for monitoring
   */
  registerCacheManager(siteId: string, cacheManager: any): void {
    this.cacheManagers.set(siteId, cacheManager);
  }

  /**
   * Start tracking a tool execution
   */
  startToolExecution(toolName: string, parameters: any, siteId?: string): string {
    const executionId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.activeTools.set(executionId, {
      toolName,
      parameters,
      startTime: Date.now(),
      siteId,
    });

    return executionId;
  }

  /**
   * End tool execution and record metrics
   */
  endToolExecution(executionId: string, success: boolean, error?: Error): void {
    const context = this.activeTools.get(executionId);
    if (!context) return;

    const responseTime = Date.now() - context.startTime;

    // Record in performance monitor
    this.monitor.recordRequest(responseTime, success, context.toolName);

    this.activeTools.delete(executionId);
  }

  /**
   * Record a raw request (bypass tool tracking)
   */
  recordRawRequest(responseTime: number, success: boolean, endpoint: string, fromCache: boolean = false): void {
    this.monitor.recordRequest(responseTime, success);
  }

  /**
   * Collect current metrics from all sources
   */
  collectCurrentMetrics(): PerformanceMetrics {
    // Update cache metrics from all registered cache managers
    this.updateCacheMetrics();

    // Update client metrics from all registered clients
    this.updateClientMetrics();

    // Get current metrics from monitor
    return this.monitor.getMetrics();
  }

  /**
   * Get aggregated cache statistics
   */
  getAggregatedCacheStats(): CacheStats {
    const aggregated: CacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
    };

    for (const [_siteId, cacheManager] of this.cacheManagers) {
      if (cacheManager && typeof cacheManager.getStats === "function") {
        const stats = cacheManager.getStats();
        aggregated.hits += stats.hits || 0;
        aggregated.misses += stats.misses || 0;
        aggregated.evictions += stats.evictions || 0;
        aggregated.totalSize += stats.totalSize || 0;
      }
    }

    // Calculate overall hit rate
    const total = aggregated.hits + aggregated.misses;
    aggregated.hitRate = total > 0 ? aggregated.hits / total : 0;

    return aggregated;
  }

  /**
   * Get aggregated client statistics
   */
  getAggregatedClientStats(): ClientStats {
    const aggregated: ClientStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      authFailures: 0,
    };

    const responseTimes: number[] = [];

    for (const [_siteId, client] of this.clientInstances) {
      if (client && typeof client.getStats === "function") {
        const stats = client.getStats();
        aggregated.totalRequests += stats.totalRequests || 0;
        aggregated.successfulRequests += stats.successfulRequests || 0;
        aggregated.failedRequests += stats.failedRequests || 0;
        aggregated.rateLimitHits += stats.rateLimitHits || 0;
        aggregated.authFailures += stats.authFailures || 0;

        if (stats.averageResponseTime) {
          responseTimes.push(stats.averageResponseTime);
        }
      }
    }

    // Calculate overall average response time
    if (responseTimes.length > 0) {
      aggregated.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    return aggregated;
  }

  /**
   * Get performance summary for specific site
   */
  getSiteMetrics(siteId: string): {
    cache?: CacheStats;
    client?: ClientStats;
    isActive: boolean;
  } {
    const result: any = { isActive: false };

    const cacheManager = this.cacheManagers.get(siteId);
    if (cacheManager && typeof cacheManager.getStats === "function") {
      result.cache = cacheManager.getStats();
      result.isActive = true;
    }

    const client = this.clientInstances.get(siteId);
    if (client && typeof client.getStats === "function") {
      result.client = client.getStats();
      result.isActive = true;
    }

    return result;
  }

  /**
   * Generate performance comparison between sites
   */
  compareSitePerformance(): {
    sites: string[];
    comparison: Record<
      string,
      {
        responseTime: number;
        cacheHitRate: number;
        errorRate: number;
        requestCount: number;
        ranking: number;
      }
    >;
    bestPerforming: string;
    worstPerforming: string;
  } {
    const sites = Array.from(this.clientInstances.keys());
    const comparison: any = {};
    const rankings: Array<{ site: string; score: number }> = [];

    for (const siteId of sites) {
      const metrics = this.getSiteMetrics(siteId);

      const responseTime = metrics.client?.averageResponseTime || 0;
      const cacheHitRate = metrics.cache?.hitRate || 0;
      const errorRate = metrics.client ? metrics.client.failedRequests / Math.max(metrics.client.totalRequests, 1) : 0;
      const requestCount = metrics.client?.totalRequests || 0;

      // Calculate performance score (lower is better for response time and error rate)
      const score = responseTime / 1000 + errorRate * 100 - cacheHitRate * 50 + requestCount * 0.001;

      comparison[siteId] = {
        responseTime,
        cacheHitRate,
        errorRate,
        requestCount,
        ranking: 0, // Will be set after sorting
      };

      rankings.push({ site: siteId, score });
    }

    // Sort by performance score
    rankings.sort((a, b) => a.score - b.score);

    // Assign rankings
    rankings.forEach((item, index) => {
      comparison[item.site].ranking = index + 1;
    });

    return {
      sites,
      comparison,
      bestPerforming: rankings[0]?.site || "",
      worstPerforming: rankings[rankings.length - 1]?.site || "",
    };
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(): {
    critical: string[];
    recommended: string[];
    optional: string[];
  } {
    const metrics = this.collectCurrentMetrics();
    const critical: string[] = [];
    const recommended: string[] = [];
    const optional: string[] = [];

    // Critical issues
    if (metrics.requests.averageResponseTime > 5000) {
      critical.push("Response times are critically high (>5s). Enable caching immediately.");
    }

    const errorRate = metrics.requests.failed / Math.max(metrics.requests.total, 1);
    if (errorRate > 0.1) {
      critical.push("Error rate is critically high (>10%). Check WordPress connectivity.");
    }

    // Recommended optimizations
    if (metrics.cache.hitRate < 0.8) {
      recommended.push("Cache hit rate is below 80%. Consider cache warming or TTL adjustment.");
    }

    if (metrics.requests.averageResponseTime > 2000) {
      recommended.push("Response times could be improved. Consider enabling more aggressive caching.");
    }

    if (metrics.system.memoryUsage > 80) {
      recommended.push("Memory usage is high. Consider increasing cache size limits or server resources.");
    }

    // Optional optimizations
    if (metrics.cache.totalSize < 100) {
      optional.push("Cache utilization is low. Consider pre-warming with frequently accessed data.");
    }

    if (Object.keys(metrics.tools.toolUsageCount).length > 10) {
      optional.push("Many tools are being used. Consider creating custom workflows for common operations.");
    }

    return { critical, recommended, optional };
  }

  /**
   * Export detailed performance report
   */
  exportDetailedReport(): {
    timestamp: string;
    overview: PerformanceMetrics;
    siteComparison: any;
    aggregatedStats: {
      cache: CacheStats;
      client: ClientStats;
    };
    optimizations: any;
    alerts: any[];
  } {
    return {
      timestamp: new Date().toISOString(),
      overview: this.collectCurrentMetrics(),
      siteComparison: this.compareSitePerformance(),
      aggregatedStats: {
        cache: this.getAggregatedCacheStats(),
        client: this.getAggregatedClientStats(),
      },
      optimizations: this.generateOptimizationSuggestions(),
      alerts: this.monitor.getAlerts(),
    };
  }

  /**
   * Start real-time metric collection
   */
  private startRealTimeCollection(): void {
    setInterval(() => {
      this.updateCacheMetrics();
      this.updateClientMetrics();
    }, this.config.collectInterval);
  }

  /**
   * Update cache metrics in performance monitor
   */
  private updateCacheMetrics(): void {
    const aggregatedStats = this.getAggregatedCacheStats();
    this.monitor.updateCacheMetrics(aggregatedStats);
  }

  /**
   * Update client metrics in performance monitor
   */
  private updateClientMetrics(): void {
    // Client metrics are updated through request interception
    // This method can be used for additional client-specific metrics
  }

  /**
   * Intercept client requests for automatic tracking
   */
  private interceptClientRequests(siteId: string, client: any): void {
    if (!client.request || typeof client.request !== "function") {
      return;
    }

    const originalRequest = client.request.bind(client);

    client.request = async (...args: any[]) => {
      const startTime = Date.now();
      const requestId = `${siteId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Extract metadata
      const metadata: RequestMetadata = {
        siteId,
        endpoint: args[0] || "unknown",
        method: args[1] || "GET",
        startTime,
        fromCache: false,
      };

      this.activeRequests.set(requestId, metadata);

      try {
        const result = await originalRequest(...args);
        const responseTime = Date.now() - startTime;

        // Check if response came from cache
        const _fromCache = result.cached || false;

        this.monitor.recordRequest(responseTime, true);
        this.activeRequests.delete(requestId);

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.monitor.recordRequest(responseTime, false);
        this.activeRequests.delete(requestId);

        throw error;
      }
    };
  }

  /**
   * Stop all monitoring and cleanup
   */
  stop(): void {
    this.monitor.stop();
    this.activeRequests.clear();
    this.activeTools.clear();
  }
}
