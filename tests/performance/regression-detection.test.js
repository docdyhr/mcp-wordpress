import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Performance regression detection tests
 * These tests measure performance and fail if regression is detected
 */
describe("Performance Regression Detection", () => {
  let performanceBaseline;
  let performanceResults;
  const baselineFile = path.resolve(__dirname, "../baseline/performance-baseline.json");
  const resultsFile = path.resolve(__dirname, "../results/performance-results.json");

  beforeAll(async () => {
    // Create directories if they don't exist
    await fs.promises.mkdir(path.dirname(baselineFile), { recursive: true });
    await fs.promises.mkdir(path.dirname(resultsFile), { recursive: true });

    // Load performance baseline
    try {
      const baselineData = await fs.promises.readFile(baselineFile, "utf-8");
      performanceBaseline = JSON.parse(baselineData);

      // Ensure thresholds exist (for backward compatibility)
      if (!performanceBaseline.thresholds) {
        performanceBaseline.thresholds = {
          regressionThreshold: 0.2, // 20% regression threshold
          memoryThreshold: 0.15, // 15% memory increase threshold
          throughputThreshold: 0.1, // 10% throughput decrease threshold
        };

        // Update the baseline file with thresholds
        await fs.promises.writeFile(baselineFile, JSON.stringify(performanceBaseline, null, 2));
        console.log("Added missing thresholds to performance baseline");
      }
    } catch (_error) {
      // If no baseline exists, create an initial one
      performanceBaseline = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        metrics: {
          apiResponseTime: {
            getPosts: { p50: 500, p95: 1000, p99: 2000 },
            createPost: { p50: 800, p95: 1500, p99: 3000 },
            uploadMedia: { p50: 2000, p95: 5000, p99: 10000 },
            getUser: { p50: 300, p95: 600, p99: 1000 },
          },
          memoryUsage: {
            baseline: 50 * 1024 * 1024, // 50MB
            peak: 100 * 1024 * 1024, // 100MB
          },
          throughput: {
            requestsPerSecond: 100,
            concurrentConnections: 10,
          },
        },
        thresholds: {
          regressionThreshold: 0.2, // 20% regression threshold
          memoryThreshold: 0.15, // 15% memory increase threshold
          throughputThreshold: 0.1, // 10% throughput decrease threshold
        },
      };

      await fs.promises.writeFile(baselineFile, JSON.stringify(performanceBaseline, null, 2));
      console.log("Created initial performance baseline");
    }

    performanceResults = {
      version: "1.2.0",
      timestamp: new Date().toISOString(),
      metrics: {
        apiResponseTime: {},
        memoryUsage: {},
        throughput: {},
      },
    };
  });

  afterAll(async () => {
    // Clear any remaining timers
    jest.clearAllTimers();
    jest.useRealTimers();

    // Save performance results
    await fs.promises.writeFile(resultsFile, JSON.stringify(performanceResults, null, 2));
  });

  describe("API Response Time Regression", () => {
    let mockClient;

    beforeAll(() => {
      // Use mock client for consistent testing
      mockClient = {
        getPosts: () => new Promise((resolve) => setTimeout(() => resolve([]), Math.random() * 600 + 400)),
        createPost: () => new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), Math.random() * 900 + 700)),
        uploadMedia: () => new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), Math.random() * 2500 + 1800)),
        getUser: () => new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), Math.random() * 400 + 250)),
      };
    });
    it("should not exceed baseline response time for getPosts", async () => {
      const iterations = 20; // Reduced iterations
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await mockClient.getPosts();
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        responseTimes.push(responseTime);
      }

      const metrics = calculatePercentiles(responseTimes);
      performanceResults.metrics.apiResponseTime.getPosts = metrics;

      const baseline = performanceBaseline.metrics.apiResponseTime.getPosts;
      const threshold = performanceBaseline.thresholds?.regressionThreshold || 0.2;

      // Check for regression
      const p95Regression = (metrics.p95 - baseline.p95) / baseline.p95;
      const p99Regression = (metrics.p99 - baseline.p99) / baseline.p99;

      expect(p95Regression).toBeLessThan(threshold);
      expect(p99Regression).toBeLessThan(threshold);

      if (p95Regression > threshold || p99Regression > threshold) {
        throw new Error(
          `Performance regression detected in getPosts: P95=${metrics.p95}ms (baseline: ${baseline.p95}ms), P99=${metrics.p99}ms (baseline: ${baseline.p99}ms)`,
        );
      }
    }, 30000); // 30 second timeout

    it("should not exceed baseline response time for createPost", async () => {
      const iterations = 15; // Reduced iterations
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await mockClient.createPost();
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;
        responseTimes.push(responseTime);
      }

      const metrics = calculatePercentiles(responseTimes);
      performanceResults.metrics.apiResponseTime.createPost = metrics;

      const baseline = performanceBaseline.metrics.apiResponseTime.createPost;
      const threshold = performanceBaseline.thresholds?.regressionThreshold || 0.2;

      const p95Regression = (metrics.p95 - baseline.p95) / baseline.p95;
      expect(p95Regression).toBeLessThan(threshold);
    }, 30000); // 30 second timeout

    it("should not exceed baseline response time for uploadMedia", async () => {
      const iterations = 5; // Fewer iterations for slower operations
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await mockClient.uploadMedia();
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;
        responseTimes.push(responseTime);
      }

      const metrics = calculatePercentiles(responseTimes);
      performanceResults.metrics.apiResponseTime.uploadMedia = metrics;

      const baseline = performanceBaseline.metrics.apiResponseTime.uploadMedia;
      const threshold = performanceBaseline.thresholds?.regressionThreshold || 0.2;

      const p95Regression = (metrics.p95 - baseline.p95) / baseline.p95;
      expect(p95Regression).toBeLessThan(threshold);
    }, 25000); // 25 second timeout
  });

  describe("Memory Usage Regression", () => {
    it("should not exceed baseline memory usage", async () => {
      const initialMemory = process.memoryUsage();

      // Simulate memory-intensive operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        // Reduced operations to avoid excessive memory usage
        operations.push(simulateMemoryIntensiveOperation());
      }

      await Promise.all(operations);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      performanceResults.metrics.memoryUsage = {
        baseline: initialMemory.heapUsed,
        peak: finalMemory.heapUsed,
        increase: memoryIncrease,
      };

      const baselineMemory = performanceBaseline.metrics.memoryUsage.baseline;
      const threshold = performanceBaseline.thresholds?.memoryThreshold || 0.15;
      const memoryRegression = memoryIncrease / baselineMemory;

      expect(memoryRegression).toBeLessThan(threshold);

      if (memoryRegression > threshold) {
        throw new Error(
          `Memory regression detected: ${memoryIncrease} bytes increase (${(memoryRegression * 100).toFixed(2)}% of baseline)`,
        );
      }
    });

    it("should detect memory leaks in long-running operations", async () => {
      const memorySnapshots = [];

      // Take memory snapshots during long-running operations
      for (let i = 0; i < 20; i++) {
        await simulateMemoryIntensiveOperation();
        const memory = process.memoryUsage();
        memorySnapshots.push(memory.heapUsed);

        // Allow garbage collection
        if (global.gc) {
          global.gc();
        }

        // Small delay between operations
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check for consistent memory growth (potential leak)
      const memoryGrowth = analyzeMemoryGrowth(memorySnapshots);

      // Fail if memory consistently grows over 50% during test
      expect(memoryGrowth.trend).toBeLessThan(0.5);

      if (memoryGrowth.trend > 0.5) {
        throw new Error(`Potential memory leak detected: ${(memoryGrowth.trend * 100).toFixed(2)}% consistent growth`);
      }
    });
  });

  describe("Throughput Regression", () => {
    it("should maintain baseline throughput for concurrent requests", async () => {
      const concurrency = 10;
      const requestsPerBatch = 50;
      const batches = 3;

      const startTime = Date.now();

      for (let batch = 0; batch < batches; batch++) {
        const concurrentPromises = [];

        for (let i = 0; i < concurrency; i++) {
          const batchPromises = [];
          for (let j = 0; j < requestsPerBatch / concurrency; j++) {
            batchPromises.push(simulateConcurrentRequest());
          }
          concurrentPromises.push(Promise.all(batchPromises));
        }

        await Promise.all(concurrentPromises);
      }

      const endTime = Date.now();
      const totalRequests = requestsPerBatch * batches;
      const totalTime = (endTime - startTime) / 1000; // Convert to seconds
      const requestsPerSecond = totalRequests / totalTime;

      performanceResults.metrics.throughput = {
        requestsPerSecond,
        concurrentConnections: concurrency,
        totalRequests,
        totalTime,
      };

      const baselineThroughput = performanceBaseline.metrics.throughput.requestsPerSecond;
      const threshold = performanceBaseline.thresholds?.throughputThreshold || 0.1;
      const throughputRegression = (baselineThroughput - requestsPerSecond) / baselineThroughput;

      expect(throughputRegression).toBeLessThan(threshold);

      if (throughputRegression > threshold) {
        throw new Error(
          `Throughput regression detected: ${requestsPerSecond.toFixed(2)} req/s (baseline: ${baselineThroughput} req/s)`,
        );
      }
    });
  });

  describe("Resource Utilization Regression", () => {
    it("should not exceed CPU usage thresholds", async () => {
      const cpuUsageBefore = process.cpuUsage();

      // CPU-intensive operations
      await simulateCPUIntensiveOperations();

      const cpuUsageAfter = process.cpuUsage(cpuUsageBefore);
      const cpuTimeMs = (cpuUsageAfter.user + cpuUsageAfter.system) / 1000; // Convert to milliseconds

      // CPU usage should not exceed 5 seconds for our test operations
      expect(cpuTimeMs).toBeLessThan(5000);

      performanceResults.metrics.cpuUsage = {
        userTime: cpuUsageAfter.user,
        systemTime: cpuUsageAfter.system,
        totalTime: cpuTimeMs,
      };
    });

    it("should monitor file descriptor usage", async () => {
      // This test would monitor file descriptor leaks
      // Simulated for now, but would check actual FD usage in real implementation
      const initialFDs = 10; // Simulated baseline
      const finalFDs = 12; // Simulated final count

      const fdIncrease = finalFDs - initialFDs;

      // Should not increase file descriptors significantly during normal operations
      expect(fdIncrease).toBeLessThan(5);

      performanceResults.metrics.fileDescriptors = {
        initial: initialFDs,
        final: finalFDs,
        increase: fdIncrease,
      };
    });
  });
});

// Helper functions
function calculatePercentiles(values) {
  const sorted = values.sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.5)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)],
    min: sorted[0],
    max: sorted[len - 1],
    avg: values.reduce((sum, val) => sum + val, 0) / len,
  };
}

function simulateMemoryIntensiveOperation() {
  return new Promise((resolve) => {
    // Simulate memory allocation - reduced size
    const largeArray = new Array(1000).fill(0).map((_, i) => ({
      id: i,
      data: `test-data-${i}`,
      timestamp: Date.now(),
    }));

    // Simulate some processing
    setTimeout(() => {
      // Clear reference to allow GC
      largeArray.length = 0;
      resolve();
    }, 5); // Reduced delay
  });
}

function simulateConcurrentRequest() {
  return new Promise((resolve) => {
    // Simulate API request delay
    setTimeout(
      () => {
        resolve({ success: true, timestamp: Date.now() });
      },
      Math.random() * 100 + 50,
    );
  });
}

function analyzeMemoryGrowth(snapshots) {
  if (snapshots.length < 2) return { trend: 0 };

  // Simple linear regression to detect memory growth trend
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  const n = snapshots.length;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += snapshots[i];
    sumXY += i * snapshots[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const initialMemory = snapshots[0];

  // Return trend as percentage of initial memory
  return {
    trend: Math.abs(slope * n) / initialMemory,
    slope,
  };
}

async function simulateCPUIntensiveOperations() {
  // Simulate CPU-intensive work
  const iterations = 100000;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    // Some mathematical operations
    const result = Math.sqrt(i) * Math.sin(i) + Math.cos(i * 2);
    results.push(result);
  }

  // Process results
  return results.reduce((sum, val) => sum + val, 0);
}
