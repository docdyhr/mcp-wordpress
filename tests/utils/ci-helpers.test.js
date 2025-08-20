/**
 * Tests for CI Environment Detection and Test Configuration Utilities
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isCI,
  PERFORMANCE_THRESHOLDS,
  getPerformanceThresholds,
  runEnvironmentAwarePerformanceTest,
  getTestTimeout,
  skipInCI,
} from "./ci-helpers.js";

describe("CI Helpers", () => {
  let originalCI;

  beforeEach(() => {
    // Store original CI environment
    originalCI = process.env.CI;
    // Mock console.log to prevent test output pollution
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original CI environment
    if (originalCI !== undefined) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
    vi.restoreAllMocks();
  });

  describe("isCI", () => {
    it("should return true when CI environment variable is set", () => {
      process.env.CI = "true";
      expect(isCI()).toBe(true);
    });

    it("should return true when CI environment variable is any truthy value", () => {
      process.env.CI = "1";
      expect(isCI()).toBe(true);
    });

    it("should return false when CI environment variable is not set", () => {
      delete process.env.CI;
      expect(isCI()).toBe(false);
    });

    it("should return false when CI environment variable is empty", () => {
      process.env.CI = "";
      expect(isCI()).toBe(false);
    });
  });

  describe("PERFORMANCE_THRESHOLDS", () => {
    it("should have CI thresholds with lower values", () => {
      expect(PERFORMANCE_THRESHOLDS.CI).toEqual({
        CACHE_WRITE_THROUGHPUT: 10000,
        CACHE_READ_THROUGHPUT: 8000,
        MIXED_WORKLOAD_THROUGHPUT: 5000,
      });
    });

    it("should have LOCAL thresholds with higher values", () => {
      expect(PERFORMANCE_THRESHOLDS.LOCAL).toEqual({
        CACHE_WRITE_THROUGHPUT: 30000,
        CACHE_READ_THROUGHPUT: 20000,
        MIXED_WORKLOAD_THROUGHPUT: 15000,
      });
    });

    it("should have CI thresholds lower than LOCAL thresholds", () => {
      const ci = PERFORMANCE_THRESHOLDS.CI;
      const local = PERFORMANCE_THRESHOLDS.LOCAL;

      expect(ci.CACHE_WRITE_THROUGHPUT).toBeLessThan(local.CACHE_WRITE_THROUGHPUT);
      expect(ci.CACHE_READ_THROUGHPUT).toBeLessThan(local.CACHE_READ_THROUGHPUT);
      expect(ci.MIXED_WORKLOAD_THROUGHPUT).toBeLessThan(local.MIXED_WORKLOAD_THROUGHPUT);
    });
  });

  describe("getPerformanceThresholds", () => {
    it("should return CI thresholds when in CI environment", () => {
      process.env.CI = "true";
      expect(getPerformanceThresholds()).toBe(PERFORMANCE_THRESHOLDS.CI);
    });

    it("should return LOCAL thresholds when not in CI environment", () => {
      delete process.env.CI;
      expect(getPerformanceThresholds()).toBe(PERFORMANCE_THRESHOLDS.LOCAL);
    });

    it("should return consistent thresholds for the same environment", () => {
      process.env.CI = "true";
      const thresholds1 = getPerformanceThresholds();
      const thresholds2 = getPerformanceThresholds();
      expect(thresholds1).toBe(thresholds2);
    });
  });

  describe("runEnvironmentAwarePerformanceTest", () => {
    it("should run basic validation in CI environment", () => {
      process.env.CI = "true";
      const scalingAssertions = vi.fn();
      const basicValidation = vi.fn();

      runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);

      expect(scalingAssertions).not.toHaveBeenCalled();
      expect(basicValidation).toHaveBeenCalledOnce();
    });

    it("should run scaling assertions in local environment", () => {
      delete process.env.CI;
      const scalingAssertions = vi.fn();
      const basicValidation = vi.fn();

      runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);

      expect(scalingAssertions).toHaveBeenCalledOnce();
      expect(basicValidation).not.toHaveBeenCalled();
    });

    it("should handle exceptions in scaling assertions", () => {
      delete process.env.CI;
      const scalingAssertions = vi.fn().mockImplementation(() => {
        throw new Error("Scaling test failed");
      });
      const basicValidation = vi.fn();

      expect(() => {
        runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);
      }).toThrow("Scaling test failed");

      expect(scalingAssertions).toHaveBeenCalledOnce();
      expect(basicValidation).not.toHaveBeenCalled();
    });

    it("should handle exceptions in basic validation", () => {
      process.env.CI = "true";
      const scalingAssertions = vi.fn();
      const basicValidation = vi.fn().mockImplementation(() => {
        throw new Error("Basic validation failed");
      });

      expect(() => {
        runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);
      }).toThrow("Basic validation failed");

      expect(scalingAssertions).not.toHaveBeenCalled();
      expect(basicValidation).toHaveBeenCalledOnce();
    });
  });

  describe("getTestTimeout", () => {
    it("should return CI timeout when in CI environment", () => {
      process.env.CI = "true";
      expect(getTestTimeout(5000, 30000)).toBe(30000);
    });

    it("should return local timeout when not in CI environment", () => {
      delete process.env.CI;
      expect(getTestTimeout(5000, 30000)).toBe(5000);
    });

    it("should use default values when no parameters provided", () => {
      delete process.env.CI;
      expect(getTestTimeout()).toBe(5000); // local default

      process.env.CI = "true";
      expect(getTestTimeout()).toBe(30000); // CI default
    });

    it("should handle custom timeout values", () => {
      process.env.CI = "true";
      expect(getTestTimeout(1000, 10000)).toBe(10000);

      delete process.env.CI;
      expect(getTestTimeout(1000, 10000)).toBe(1000);
    });
  });

  describe("skipInCI", () => {
    it("should return true and log message when in CI environment", () => {
      process.env.CI = "true";
      const result = skipInCI("Test is flaky");

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith("⚠️  Skipping test in CI: Test is flaky");
    });

    it("should return false and not log when not in CI environment", () => {
      delete process.env.CI;
      const result = skipInCI("Test is flaky");

      expect(result).toBe(false);
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should use default reason when none provided", () => {
      process.env.CI = "true";
      const result = skipInCI();

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith("⚠️  Skipping test in CI: Test is environment-dependent");
    });

    it("should handle empty reason string", () => {
      process.env.CI = "true";
      const result = skipInCI("");

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith("⚠️  Skipping test in CI: ");
    });
  });

  describe("Integration Tests", () => {
    it("should work together for CI environment workflow", () => {
      process.env.CI = "true";

      // Should detect CI environment
      expect(isCI()).toBe(true);

      // Should use CI thresholds
      const thresholds = getPerformanceThresholds();
      expect(thresholds).toBe(PERFORMANCE_THRESHOLDS.CI);
      expect(thresholds.CACHE_WRITE_THROUGHPUT).toBe(10000);

      // Should use CI timeout
      expect(getTestTimeout(5000, 30000)).toBe(30000);

      // Should skip tests in CI
      expect(skipInCI()).toBe(true);

      // Should run basic validation instead of scaling
      const scalingAssertions = vi.fn();
      const basicValidation = vi.fn();
      runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);
      expect(basicValidation).toHaveBeenCalled();
      expect(scalingAssertions).not.toHaveBeenCalled();
    });

    it("should work together for local environment workflow", () => {
      delete process.env.CI;

      // Should detect non-CI environment
      expect(isCI()).toBe(false);

      // Should use LOCAL thresholds
      const thresholds = getPerformanceThresholds();
      expect(thresholds).toBe(PERFORMANCE_THRESHOLDS.LOCAL);
      expect(thresholds.CACHE_WRITE_THROUGHPUT).toBe(30000);

      // Should use local timeout
      expect(getTestTimeout(5000, 30000)).toBe(5000);

      // Should not skip tests in local
      expect(skipInCI()).toBe(false);

      // Should run scaling assertions instead of basic validation
      const scalingAssertions = vi.fn();
      const basicValidation = vi.fn();
      runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation);
      expect(scalingAssertions).toHaveBeenCalled();
      expect(basicValidation).not.toHaveBeenCalled();
    });
  });
});
