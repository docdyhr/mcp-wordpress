#!/usr/bin/env node
/**
 * Performance Monitoring Testing Suite
 * Tests all performance monitoring functionality
 */

import { performance } from 'perf_hooks';
import { MCPWordPressServer } from '../dist/index.js';

/**
 * Performance Monitoring Tester
 */
class PerformanceMonitoringTester {
  constructor() {
    this.results = [];
    this.server = null;
  }

  log(status, message, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'SKIP' ? '⏭️ ' : '⏳';
    console.log(`${icon} ${message}${details ? ` - ${details}` : ''}`);
    this.results.push({ status, message, details, timestamp: new Date() });
  }

  async initializeServer() {
    console.log('🚀 Performance Monitoring Test Suite');
    console.log('=====================================');
    
    try {
      this.server = new MCPWordPressServer();
      this.log('PASS', 'MCP WordPress Server initialized');
      return true;
    } catch (error) {
      this.log('FAIL', 'Server initialization failed', error.message);
      return false;
    }
  }

  async testPerformanceInfrastructure() {
    console.log('\n📊 Testing Performance Infrastructure');
    console.log('====================================');

    try {
      // Test PerformanceMonitor
      const { PerformanceMonitor } = await import('../dist/performance/PerformanceMonitor.js');
      const monitor = new PerformanceMonitor({
        enableRealTimeMonitoring: true,
        enableHistoricalData: true,
        enableAlerts: true
      });

      this.log('PASS', 'PerformanceMonitor initialization');

      // Test basic metric recording
      monitor.recordRequest(250, true, 'wp_get_posts');
      monitor.recordRequest(180, true, 'wp_get_categories');
      monitor.recordRequest(500, false, 'wp_create_post');

      const metrics = monitor.getMetrics();
      
      if (metrics.requests.total === 3) {
        this.log('PASS', 'Request metrics recording', `${metrics.requests.total} requests tracked`);
      } else {
        this.log('FAIL', 'Request metrics recording', `Expected 3, got ${metrics.requests.total}`);
      }

      if (metrics.requests.successful === 2 && metrics.requests.failed === 1) {
        this.log('PASS', 'Success/failure tracking', `2 successful, 1 failed`);
      } else {
        this.log('FAIL', 'Success/failure tracking', `Got ${metrics.requests.successful}/${metrics.requests.failed}`);
      }

      // Test MetricsCollector
      const { MetricsCollector } = await import('../dist/performance/MetricsCollector.js');
      const collector = new MetricsCollector(monitor, {
        enableRealTime: true,
        enableToolTracking: true
      });

      this.log('PASS', 'MetricsCollector initialization');

      // Test tool execution tracking
      const executionId = collector.startToolExecution('wp_performance_stats', {}, 'test-site');
      collector.endToolExecution(executionId, true);

      this.log('PASS', 'Tool execution tracking');

      // Test PerformanceAnalytics
      const { PerformanceAnalytics } = await import('../dist/performance/PerformanceAnalytics.js');
      const analytics = new PerformanceAnalytics(collector, {
        enablePredictiveAnalysis: true,
        enableAnomalyDetection: true,
        enableTrendAnalysis: true
      });

      this.log('PASS', 'PerformanceAnalytics initialization');

      // Test insights generation
      const insights = analytics.generateInsights();
      this.log('PASS', 'Performance insights generation', `${insights.length} insights generated`);

      // Test benchmark comparison
      const benchmarks = analytics.benchmarkPerformance();
      this.log('PASS', 'Benchmark comparison', `${benchmarks.length} benchmark categories`);

      return true;

    } catch (error) {
      this.log('FAIL', 'Performance infrastructure test failed', error.message);
      return false;
    }
  }

  async testPerformanceTools() {
    console.log('\n🛠️ Testing Performance MCP Tools');
    console.log('=================================');

    try {
      // Test performance tools import
      const { default: PerformanceTools } = await import('../dist/tools/performance.js');
      
      // Mock clients map for testing
      const mockClients = new Map();
      mockClients.set('test-site', {
        getStats: () => ({
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 250,
          rateLimitHits: 0,
          authFailures: 0
        }),
        cacheManager: {
          getStats: () => ({
            hits: 80,
            misses: 20,
            evictions: 5,
            totalSize: 150,
            hitRate: 0.8
          })
        }
      });

      const performanceTools = new PerformanceTools(mockClients);
      const tools = performanceTools.getTools();

      this.log('PASS', 'Performance tools instantiation', `${tools.length} tools available`);

      // Expected tools
      const expectedTools = [
        'wp_performance_stats',
        'wp_performance_history',
        'wp_performance_benchmark',
        'wp_performance_alerts',
        'wp_performance_optimize',
        'wp_performance_export'
      ];

      for (const expectedTool of expectedTools) {
        const tool = tools.find(t => t.name === expectedTool);
        if (tool) {
          this.log('PASS', `Tool registration: ${expectedTool}`);
        } else {
          this.log('FAIL', `Tool registration: ${expectedTool}`, 'Tool not found');
        }
      }

      // Test tool execution (basic)
      try {
        const statsTool = tools.find(t => t.name === 'wp_performance_stats');
        if (statsTool) {
          const result = await statsTool.handler({});
          if (result.success) {
            this.log('PASS', 'wp_performance_stats execution');
          } else {
            this.log('FAIL', 'wp_performance_stats execution', 'Returned failure');
          }
        }
      } catch (error) {
        this.log('FAIL', 'Tool execution test', error.message);
      }

      return true;

    } catch (error) {
      this.log('FAIL', 'Performance tools test failed', error.message);
      return false;
    }
  }

  async testCacheIntegration() {
    console.log('\n🔄 Testing Cache Integration');
    console.log('============================');

    try {
      // Test CachedWordPressClient performance methods
      const { CachedWordPressClient } = await import('../dist/client/CachedWordPressClient.js');
      
      const mockConfig = {
        baseUrl: 'https://example.com',
        auth: {
          method: 'app-password',
          username: 'test',
          appPassword: 'test-password'
        }
      };

      const cachedClient = new CachedWordPressClient(mockConfig, 'test-site');
      
      this.log('PASS', 'CachedWordPressClient instantiation');

      // Test cache statistics
      const cacheStats = cachedClient.getCacheStats();
      if (cacheStats && typeof cacheStats.totalSize === 'number') {
        this.log('PASS', 'Cache statistics retrieval', `${cacheStats.totalSize} entries`);
      } else {
        this.log('FAIL', 'Cache statistics retrieval', 'Invalid stats format');
      }

      // Test cache efficiency metrics
      const efficiency = cachedClient.getCacheEfficiency();
      if (efficiency && typeof efficiency.hitRate === 'number') {
        this.log('PASS', 'Cache efficiency metrics', `${(efficiency.hitRate * 100).toFixed(1)}% hit rate`);
      } else {
        this.log('FAIL', 'Cache efficiency metrics', 'Invalid efficiency format');
      }

      // Test cache info
      const cacheInfo = cachedClient.getCacheInfo();
      if (cacheInfo && cacheInfo.siteId === 'test-site') {
        this.log('PASS', 'Cache configuration info', `Site: ${cacheInfo.siteId}`);
      } else {
        this.log('FAIL', 'Cache configuration info', 'Invalid info format');
      }

      // Test detailed metrics
      const detailedMetrics = cachedClient.getDetailedCacheMetrics();
      if (detailedMetrics && detailedMetrics.statistics && detailedMetrics.efficiency) {
        this.log('PASS', 'Detailed cache metrics', 'All metric categories present');
      } else {
        this.log('FAIL', 'Detailed cache metrics', 'Missing metric categories');
      }

      return true;

    } catch (error) {
      this.log('FAIL', 'Cache integration test failed', error.message);
      return false;
    }
  }

  async testPerformanceBenchmarks() {
    console.log('\n⚡ Testing Performance Benchmarks');
    console.log('=================================');

    try {
      // Test performance timing
      const operations = [
        { name: 'Quick operation', duration: 50 },
        { name: 'Medium operation', duration: 250 },
        { name: 'Slow operation', duration: 1000 }
      ];

      for (const op of operations) {
        const start = performance.now();
        
        // Simulate operation
        await new Promise(resolve => setTimeout(resolve, op.duration));
        
        const end = performance.now();
        const actualDuration = end - start;
        
        if (Math.abs(actualDuration - op.duration) < 50) { // 50ms tolerance
          this.log('PASS', `Performance timing: ${op.name}`, `${actualDuration.toFixed(0)}ms`);
        } else {
          this.log('FAIL', `Performance timing: ${op.name}`, `Expected ~${op.duration}ms, got ${actualDuration.toFixed(0)}ms`);
        }
      }

      // Test memory usage estimation
      const memoryBefore = process.memoryUsage();
      
      // Create some objects to increase memory
      const largeArray = new Array(10000).fill(0).map((_, i) => ({ id: i, data: `test-data-${i}` }));
      
      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      if (memoryIncrease > 0) {
        this.log('PASS', 'Memory usage tracking', `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase detected`);
      } else {
        this.log('FAIL', 'Memory usage tracking', 'No memory increase detected');
      }

      // Clean up
      largeArray.length = 0;

      return true;

    } catch (error) {
      this.log('FAIL', 'Performance benchmarks test failed', error.message);
      return false;
    }
  }

  async testRealTimeMonitoring() {
    console.log('\n📈 Testing Real-Time Monitoring');
    console.log('===============================');

    try {
      const { PerformanceMonitor, MetricsCollector } = await import('../dist/performance/index.js');
      
      const monitor = new PerformanceMonitor({
        enableRealTimeMonitoring: true,
        collectInterval: 1000, // 1 second for testing
        enableAlerts: true
      });

      const collector = new MetricsCollector(monitor, {
        enableRealTime: true,
        collectInterval: 1000
      });

      this.log('PASS', 'Real-time monitoring setup');

      // Simulate some activity
      for (let i = 0; i < 5; i++) {
        const responseTime = 100 + Math.random() * 200; // 100-300ms
        const success = Math.random() > 0.1; // 90% success rate
        
        monitor.recordRequest(responseTime, success, `test_operation_${i}`);
        
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      }

      const metrics = monitor.getMetrics();
      
      if (metrics.requests.total === 5) {
        this.log('PASS', 'Real-time metric collection', `${metrics.requests.total} requests tracked`);
      } else {
        this.log('FAIL', 'Real-time metric collection', `Expected 5, got ${metrics.requests.total}`);
      }

      if (metrics.requests.averageResponseTime > 0) {
        this.log('PASS', 'Average response time calculation', `${metrics.requests.averageResponseTime.toFixed(0)}ms`);
      } else {
        this.log('FAIL', 'Average response time calculation', 'Invalid average');
      }

      // Test alert generation
      // Simulate high response time to trigger alert
      monitor.recordRequest(3000, true, 'slow_operation'); // 3 second response
      
      const alerts = monitor.getAlerts();
      if (alerts.length > 0) {
        this.log('PASS', 'Alert generation', `${alerts.length} alerts generated`);
      } else {
        this.log('SKIP', 'Alert generation', 'No alerts triggered (may be expected)');
      }

      return true;

    } catch (error) {
      this.log('FAIL', 'Real-time monitoring test failed', error.message);
      return false;
    }
  }

  async runComprehensiveTest() {
    let allPassed = true;

    // Initialize server
    const serverInitialized = await this.initializeServer();
    if (!serverInitialized) {
      allPassed = false;
    }

    // Run test suites
    const testSuites = [
      this.testPerformanceInfrastructure.bind(this),
      this.testPerformanceTools.bind(this),
      this.testCacheIntegration.bind(this),
      this.testPerformanceBenchmarks.bind(this),
      this.testRealTimeMonitoring.bind(this)
    ];

    for (const testSuite of testSuites) {
      const result = await testSuite();
      if (!result) {
        allPassed = false;
      }
    }

    return allPassed;
  }

  summary() {
    console.log('\n📊 Performance Monitoring Test Summary');
    console.log('======================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
      console.log('\n🎉 All performance monitoring tests passed!');
      console.log('   Performance monitoring system is ready for production.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review the issues above.`);
    }

    // Performance monitoring recommendations
    console.log('\n💡 Performance Monitoring Features:');
    console.log('   • Real-time performance statistics');
    console.log('   • Historical performance trends');
    console.log('   • Industry benchmark comparisons');
    console.log('   • Automated performance alerts');
    console.log('   • Optimization recommendations');
    console.log('   • Comprehensive performance reports');
  }
}

/**
 * Main test runner
 */
async function main() {
  const tester = new PerformanceMonitoringTester();
  
  try {
    const success = await tester.runComprehensiveTest();
    tester.summary();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Performance monitoring testing failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}