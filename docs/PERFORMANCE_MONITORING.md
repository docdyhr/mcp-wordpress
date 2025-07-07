# Performance Monitoring System

The MCP WordPress Server includes a comprehensive performance monitoring system that provides real-time insights, historical analysis, and optimization recommendations for your WordPress API operations.

## 🎯 Overview

The performance monitoring system consists of three main components:

- **PerformanceMonitor**: Core metrics collection and alerting
- **MetricsCollector**: Real-time data gathering and client integration  
- **PerformanceAnalytics**: Advanced analysis, trends, and predictions

## 🚀 Key Features

### Real-Time Monitoring

- **Response Time Tracking**: Monitor API response times with percentile analysis (P50, P95, P99)
- **Error Rate Monitoring**: Track success/failure rates across all operations
- **Cache Performance**: Monitor cache hit rates, memory usage, and efficiency
- **System Resources**: Track memory usage, CPU utilization, and uptime
- **Tool Usage Analytics**: Monitor which MCP tools are used most frequently

### Historical Analysis

- **Performance Trends**: Analyze performance changes over time
- **Predictive Analytics**: Forecast future performance based on historical data
- **Anomaly Detection**: Automatically detect unusual performance patterns
- **Benchmark Comparisons**: Compare against industry standards

### Intelligent Insights

- **Optimization Recommendations**: Get actionable suggestions for performance improvements
- **ROI Estimates**: Understand the impact of potential optimizations
- **Alert System**: Receive notifications for performance issues
- **Automated Reporting**: Generate comprehensive performance reports

## 🛠️ MCP Tools

The system provides 6 new MCP tools for performance management:

### 1. `wp_performance_stats`

Get real-time performance statistics and metrics.

```bash
# Get overview of current performance
wp_performance_stats

# Get detailed cache metrics
wp_performance_stats --category=cache --format=detailed

# Get site-specific metrics (multi-site)
wp_performance_stats --site=site1 --category=all
```

**Parameters:**

- `site` (optional): Specific site ID for multi-site setups
- `category`: `overview`, `requests`, `cache`, `system`, `tools`, `all` (default: `overview`)
- `format`: `summary`, `detailed`, `raw` (default: `summary`)

**Example Output:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "overallHealth": "Good",
      "performanceScore": 78,
      "totalRequests": 1250,
      "averageResponseTime": "245ms",
      "cacheHitRate": "85.2%",
      "errorRate": "2.1%",
      "uptime": "2d 14h 30m"
    }
  }
}
```

### 2. `wp_performance_history`

Get historical performance data and trend analysis.

```bash
# Get 24-hour performance history
wp_performance_history

# Get specific metrics for the last week
wp_performance_history --timeframe=7d --metrics=responseTime,cacheHitRate

# Get history with trend analysis
wp_performance_history --timeframe=6h --includeTrends=true
```

**Parameters:**

- `site` (optional): Specific site ID
- `timeframe`: `1h`, `6h`, `12h`, `24h`, `7d` (default: `24h`)
- `metrics`: Array of specific metrics to include
- `includeTrends`: Include trend analysis (default: `true`)

### 3. `wp_performance_benchmark`

Compare current performance against industry benchmarks.

```bash
# Compare all metrics against benchmarks
wp_performance_benchmark

# Compare specific category with recommendations
wp_performance_benchmark --category=response_time --includeRecommendations=true
```

**Parameters:**

- `site` (optional): Specific site ID
- `category`: `response_time`, `cache_performance`, `error_rate`, `system_resources`, `all`
- `includeRecommendations`: Include improvement suggestions (default: `true`)

**Example Output:**

```json
{
  "benchmarks": [
    {
      "category": "Response Time",
      "currentValue": 245,
      "status": "🟡 Good",
      "percentile": 75,
      "improvement": {
        "needed": 45,
        "description": "Reduce by 45ms"
      }
    }
  ],
  "overallRanking": {
    "percentile": 78,
    "status": "Above Average"
  }
}
```

### 4. `wp_performance_alerts`

Get performance alerts and anomaly detection results.

```bash
# Get all recent alerts
wp_performance_alerts

# Get critical alerts only
wp_performance_alerts --severity=critical --limit=10

# Get cache-related alerts with anomalies
wp_performance_alerts --category=cache --includeAnomalies=true
```

**Parameters:**

- `site` (optional): Specific site ID
- `severity`: `info`, `warning`, `error`, `critical`
- `category`: `performance`, `cache`, `system`, `wordpress`
- `limit`: Maximum alerts to return (default: `20`)
- `includeAnomalies`: Include detected anomalies (default: `true`)

### 5. `wp_performance_optimize`

Get optimization recommendations and insights.

```bash
# Get speed optimization recommendations
wp_performance_optimize --focus=speed

# Get quick wins with ROI estimates
wp_performance_optimize --priority=quick_wins --includeROI=true

# Get all recommendations with predictions
wp_performance_optimize --priority=all --includePredictions=true
```

**Parameters:**

- `site` (optional): Specific site ID
- `focus`: `speed`, `reliability`, `efficiency`, `scaling` (default: `speed`)
- `priority`: `quick_wins`, `medium_term`, `long_term`, `all` (default: `all`)
- `includeROI`: Include ROI estimates (default: `true`)
- `includePredictions`: Include performance predictions (default: `true`)

**Example Output:**

```json
{
  "recommendations": [
    {
      "title": "Improve Cache Hit Rate",
      "priority": "🟠 High",
      "description": "Current cache hit rate is 75.2%, below optimal performance.",
      "recommendation": "Implement cache warming strategies and optimize TTL values.",
      "estimatedImprovement": "20-40% reduction in response times",
      "implementationEffort": "⚖️ Medium Effort",
      "timeline": "quick_wins"
    }
  ],
  "roi": {
    "performanceGain": 35,
    "implementationCost": "medium",
    "timeToValue": 7
  }
}
```

### 6. `wp_performance_export`

Export comprehensive performance report.

```bash
# Export JSON report with all data
wp_performance_export

# Export CSV summary for spreadsheet analysis
wp_performance_export --format=csv --timeRange=7d

# Export summary report
wp_performance_export --format=summary --includeAnalytics=true
```

**Parameters:**

- `site` (optional): Specific site ID
- `format`: `json`, `csv`, `summary` (default: `json`)
- `includeHistorical`: Include historical data (default: `true`)
- `includeAnalytics`: Include analytics and insights (default: `true`)
- `timeRange`: `1h`, `6h`, `24h`, `7d`, `30d` (default: `24h`)

## 📊 Performance Metrics

### Response Time Metrics

- **Average Response Time**: Mean response time across all requests
- **Percentiles**: P50 (median), P95, P99 response times
- **Min/Max**: Fastest and slowest response times
- **Requests Per Second**: Request throughput rate

### Cache Performance Metrics

- **Hit Rate**: Percentage of requests served from cache
- **Cache Size**: Number of cached entries
- **Memory Usage**: Estimated memory consumption
- **Evictions**: Number of cache entries removed due to space limits
- **Cache Efficiency**: Overall cache performance rating

### System Metrics

- **Memory Usage**: Current memory consumption percentage
- **CPU Usage**: Estimated CPU utilization
- **Uptime**: System operational time
- **Active Connections**: Number of concurrent connections

### Tool Usage Metrics

- **Most Used Tool**: Tool with highest usage count
- **Tool Performance**: Response times and success rates per tool
- **Usage Distribution**: Frequency of tool usage

## 🔍 Performance Analysis

### Trend Analysis

The system automatically analyzes performance trends using linear regression:

- **Direction**: `improving`, `declining`, or `stable`
- **Change Rate**: Percentage change over time
- **Confidence**: Statistical confidence in the trend (0-1)
- **Predictions**: Forecasted future values

### Anomaly Detection

Automatic detection of unusual performance patterns:

- **Z-Score Analysis**: Statistical deviation from normal patterns
- **Configurable Sensitivity**: `low`, `medium`, `high` detection levels
- **Severity Classification**: `minor`, `moderate`, `major`, `critical`
- **Possible Causes**: AI-generated suggestions for anomaly causes

### Benchmark Comparisons

Compare against industry standards:

- **Response Time**: `<200ms` (excellent), `200-500ms` (good), `500ms-1s` (average)
- **Cache Hit Rate**: `>95%` (excellent), `85-95%` (good), `70-85%` (average)
- **Error Rate**: `<0.1%` (excellent), `0.1-1%` (good), `1-2%` (average)
- **Memory Usage**: `<50%` (excellent), `50-70%` (good), `70-80%` (average)

## ⚡ Integration with Caching System

The performance monitoring system is deeply integrated with the intelligent caching system:

### Automatic Cache Metrics

- **Real-time cache statistics** from all registered cache managers
- **Site-specific cache isolation** for multi-site installations
- **Cache efficiency calculations** with performance impact analysis

### Cache Performance Insights

- **Cache warming recommendations** based on usage patterns
- **TTL optimization suggestions** for different data types
- **Memory optimization** recommendations

### Cache Management Integration

- Performance monitoring **automatically registers** with cache managers
- **Request interception** for transparent performance tracking
- **Cache invalidation tracking** for data consistency monitoring

## 🚨 Alert System

### Alert Types

- **Performance Degradation**: Response times exceeding thresholds
- **Error Rate Spikes**: Increased failure rates
- **Cache Performance Issues**: Low hit rates or high memory usage
- **System Resource Warnings**: High memory or CPU usage

### Alert Configuration

Configure alert thresholds in your monitoring setup:

```javascript
const monitor = new PerformanceMonitor({
  alertThresholds: {
    responseTime: 2000,     // 2 seconds
    errorRate: 0.05,        // 5%
    cacheHitRate: 0.8,      // 80%
    memoryUsage: 80,        // 80%
    cpuUsage: 80           // 80%
  }
});
```

### Alert Severity Levels

- **🔴 Critical**: Immediate attention required
- **🟠 Error**: Significant performance impact
- **🟡 Warning**: Performance degradation detected
- **🔵 Info**: Informational notices

## 📈 Optimization Workflow

### 1. Monitor Current Performance

```bash
wp_performance_stats --format=detailed
```

### 2. Analyze Historical Trends

```bash
wp_performance_history --timeframe=7d --includeTrends=true
```

### 3. Compare Against Benchmarks

```bash
wp_performance_benchmark --includeRecommendations=true
```

### 4. Check for Alerts and Anomalies

```bash
wp_performance_alerts --includeAnomalies=true
```

### 5. Get Optimization Recommendations

```bash
wp_performance_optimize --focus=speed --includeROI=true
```

### 6. Export Comprehensive Report

```bash
wp_performance_export --format=json --includeAnalytics=true
```

## 🔧 Configuration

### Performance Monitor Configuration

```javascript
const config = {
  collectInterval: 30000,           // 30 seconds
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  enableRealTimeMonitoring: true,
  enableHistoricalData: true,
  enableAlerts: true,
  alertThresholds: {
    responseTime: 2000,
    errorRate: 0.05,
    cacheHitRate: 0.8,
    memoryUsage: 80,
    cpuUsage: 80
  }
};
```

### Metrics Collector Configuration

```javascript
const config = {
  enableRealTime: true,
  collectInterval: 30000,
  enableToolTracking: true,
  enableRequestInterception: true,
  enableCacheIntegration: true,
  enableSystemMetrics: true
};
```

### Analytics Configuration

```javascript
const config = {
  enablePredictiveAnalysis: true,
  enableAnomalyDetection: true,
  enableTrendAnalysis: true,
  lookbackPeriod: 24 * 60 * 60 * 1000, // 24 hours
  sensitivityLevel: 'medium' // low, medium, high
};
```

## 🎯 Best Practices

### 1. Regular Monitoring

- Check performance stats daily with `wp_performance_stats`
- Review weekly trends with `wp_performance_history --timeframe=7d`
- Monitor alerts regularly with `wp_performance_alerts`

### 2. Proactive Optimization

- Implement quick wins from `wp_performance_optimize --priority=quick_wins`
- Address critical alerts immediately
- Follow benchmark recommendations

### 3. Data-Driven Decisions

- Use historical data to identify patterns
- Compare before/after optimization results
- Export reports for stakeholder communication

### 4. Multi-Site Management

- Monitor each site individually
- Compare performance across sites
- Implement site-specific optimizations

## 🔍 Troubleshooting

### Common Issues

**1. High Response Times**

```bash
# Check current performance
wp_performance_stats --category=requests

# Get optimization recommendations
wp_performance_optimize --focus=speed
```

**2. Low Cache Hit Rates**

```bash
# Check cache performance
wp_performance_stats --category=cache

# Get cache-specific recommendations
wp_performance_optimize --focus=efficiency
```

**3. System Resource Issues**

```bash
# Check system metrics
wp_performance_stats --category=system

# Get scaling recommendations
wp_performance_optimize --focus=scaling
```

### Performance Debugging

1. **Enable detailed logging** in development environments
2. **Use benchmark comparisons** to identify problem areas
3. **Monitor trends** to catch performance degradation early
4. **Review optimization recommendations** regularly

## 📚 Related Documentation

- [Intelligent Caching System](./CACHING.md)
- [Security Configuration](../src/security/SecurityConfig.ts)
- [MCP Tools Overview](../README.md#available-tools)
- [Multi-Site Configuration](../CLAUDE.md#multi-site-configuration)

## 🤝 Contributing

To contribute to the performance monitoring system:

1. **Add new metrics** in `PerformanceMonitor.ts`
2. **Enhance analytics** in `PerformanceAnalytics.ts`  
3. **Create new tools** in `tools/performance.ts`
4. **Add tests** in `scripts/test-performance-monitoring.js`
5. **Update documentation** in this file

---

**🚀 The performance monitoring system helps you maintain optimal WordPress MCP server performance with real-time insights, intelligent analysis, and actionable recommendations.**
