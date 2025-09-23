#!/usr/bin/env node
/**
 * Comprehensive Cache Configuration Testing
 * Tests both single-site and multi-site caching scenarios
 */

import { performance } from "perf_hooks";
import { MCPWordPressServer } from "../dist/index.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Test Results Tracker
 */
class TestResults {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  addTest(name, status, details = "") {
    this.tests.push({ name, status, details, timestamp: new Date() });
    if (status === "PASS") this.passed++;
    if (status === "FAIL") this.failed++;

    const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏳";
    console.log(`${icon} ${name}${details ? ` - ${details}` : ""}`);
  }

  summary() {
    console.log("\n📊 Test Summary");
    console.log("================");
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Success Rate: ${Math.round((this.passed / this.tests.length) * 100)}%`);
  }
}

/**
 * Configuration Helper
 */
class ConfigHelper {
  static backupConfig() {
    const configPath = "mcp-wordpress.config.json";
    const backupPath = "mcp-wordpress.config.json.backup";

    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
      return true;
    }
    return false;
  }

  static restoreConfig() {
    const configPath = "mcp-wordpress.config.json";
    const backupPath = "mcp-wordpress.config.json.backup";

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, configPath);
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  }

  static createSingleSiteConfig() {
    // Remove multi-site config to force single-site mode
    const configPath = "mcp-wordpress.config.json";
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }

  static createMultiSiteConfig() {
    const config = {
      sites: [
        {
          id: "test-site-1",
          name: "Test Site 1",
          config: {
            WORDPRESS_SITE_URL: process.env.WORDPRESS_SITE_URL || "https://example1.com",
            WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME || "test1",
            WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD || "test-pass-1",
          },
        },
        {
          id: "test-site-2",
          name: "Test Site 2",
          config: {
            WORDPRESS_SITE_URL: process.env.WORDPRESS_SITE_URL_2 || "https://example2.com",
            WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME_2 || "test2",
            WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD_2 || "test-pass-2",
          },
        },
      ],
    };

    fs.writeFileSync("mcp-wordpress.config.json", JSON.stringify(config, null, 2));
  }
}

/**
 * Cache Tester
 */
class CacheTester {
  constructor(results) {
    this.results = results;
  }

  async testCacheInfrastructure() {
    console.log("\n🔧 Testing Cache Infrastructure");
    console.log("===============================");

    try {
      const { CacheManager, HttpCacheWrapper, CacheInvalidation } = await import("../dist/cache/index.js");

      // Test CacheManager
      const cacheManager = new CacheManager({
        maxSize: 10,
        defaultTTL: 1000,
        enableLRU: true,
        enableStats: true,
      });

      // Basic operations
      cacheManager.set("test-key", { data: "test" });
      const result = cacheManager.get("test-key");

      if (result && result.data === "test") {
        this.results.addTest("CacheManager basic operations", "PASS");
      } else {
        this.results.addTest("CacheManager basic operations", "FAIL", "Failed to retrieve cached data");
        return false;
      }

      // Key generation
      const key1 = cacheManager.generateKey("site1", "posts", { per_page: 10 });
      const key2 = cacheManager.generateKey("site1", "posts", { per_page: 10 });
      const key3 = cacheManager.generateKey("site2", "posts", { per_page: 10 });

      if (key1 === key2 && key1 !== key3) {
        this.results.addTest("Cache key generation consistency", "PASS");
      } else {
        this.results.addTest("Cache key generation consistency", "FAIL", "Keys not consistent");
        return false;
      }

      // Site isolation
      cacheManager.set(key1, { site: "site1" });
      cacheManager.set(key3, { site: "site2" });

      const cleared = cacheManager.clearSite("site1");
      const site1Data = cacheManager.get(key1);
      const site2Data = cacheManager.get(key3);

      if (!site1Data && site2Data && site2Data.site === "site2") {
        this.results.addTest("Site-specific cache isolation", "PASS");
      } else {
        this.results.addTest("Site-specific cache isolation", "FAIL", "Site isolation failed");
        return false;
      }

      // HttpCacheWrapper
      const httpCache = new HttpCacheWrapper(cacheManager, "test-site");
      const mockRequest = async () => ({
        data: { id: 1, title: "Test" },
        status: 200,
        headers: {},
      });

      const response1 = await httpCache.request(mockRequest, {
        method: "GET",
        url: "https://example.com/wp-json/wp/v2/posts",
        headers: {},
        params: {},
      });

      if (response1.data.id === 1) {
        this.results.addTest("HttpCacheWrapper basic functionality", "PASS");
      } else {
        this.results.addTest("HttpCacheWrapper basic functionality", "FAIL");
        return false;
      }

      return true;
    } catch (error) {
      this.results.addTest("Cache infrastructure", "FAIL", error.message);
      return false;
    }
  }

  async testSingleSiteConfiguration() {
    console.log("\n🏠 Testing Single-Site Configuration");
    console.log("====================================");

    try {
      // Backup existing config
      ConfigHelper.backupConfig();

      // Create single-site setup
      ConfigHelper.createSingleSiteConfig();

      // Test server initialization
      const server = new MCPWordPressServer();
      this.results.addTest("Single-site server initialization", "PASS");

      // Test cache tools exist
      const { CacheTools } = await import("../dist/tools/index.js");
      const cacheTools = new CacheTools(new Map([["default", {}]]));
      const tools = cacheTools.getTools();

      if (tools.length === 4) {
        this.results.addTest("Single-site cache tools registration", "PASS", `${tools.length} tools available`);
      } else {
        this.results.addTest("Single-site cache tools registration", "FAIL", `Expected 4 tools, got ${tools.length}`);
      }

      // Test cache with default site
      const hasCredentials =
        process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD;

      if (hasCredentials) {
        // Test actual cache operations
        await this.testLiveCacheOperations("default");
      } else {
        this.results.addTest("Single-site live testing", "SKIP", "No WordPress credentials provided");
      }
    } catch (error) {
      this.results.addTest("Single-site configuration", "FAIL", error.message);
    } finally {
      // Restore config
      ConfigHelper.restoreConfig();
    }
  }

  async testMultiSiteConfiguration() {
    console.log("\n🏢 Testing Multi-Site Configuration");
    console.log("===================================");

    try {
      // Backup existing config
      ConfigHelper.backupConfig();

      // Create multi-site setup
      ConfigHelper.createMultiSiteConfig();

      // Test server initialization
      const server = new MCPWordPressServer();
      this.results.addTest("Multi-site server initialization", "PASS");

      // Test site isolation
      await this.testMultiSiteCacheIsolation();

      // Test cross-site operations
      await this.testCrossSiteOperations();
    } catch (error) {
      this.results.addTest("Multi-site configuration", "FAIL", error.message);
    } finally {
      // Restore config
      ConfigHelper.restoreConfig();
    }
  }

  async testMultiSiteCacheIsolation() {
    try {
      const { CacheManager } = await import("../dist/cache/index.js");

      const cacheManager = new CacheManager({
        maxSize: 100,
        defaultTTL: 10000,
        enableLRU: true,
        enableStats: true,
      });

      // Test site isolation
      const site1Key = cacheManager.generateKey("test-site-1", "posts", {});
      const site2Key = cacheManager.generateKey("test-site-2", "posts", {});

      cacheManager.set(site1Key, { site: "site1", data: "site1-data" });
      cacheManager.set(site2Key, { site: "site2", data: "site2-data" });

      // Clear site1 only
      const cleared = cacheManager.clearSite("test-site-1");

      const site1Data = cacheManager.get(site1Key);
      const site2Data = cacheManager.get(site2Key);

      if (!site1Data && site2Data && site2Data.site === "site2") {
        this.results.addTest(
          "Multi-site cache isolation",
          "PASS",
          `Cleared ${cleared} entries for site1, site2 unaffected`,
        );
      } else {
        this.results.addTest("Multi-site cache isolation", "FAIL", "Cache isolation failed between sites");
      }
    } catch (error) {
      this.results.addTest("Multi-site cache isolation", "FAIL", error.message);
    }
  }

  async testCrossSiteOperations() {
    try {
      const { CacheManager } = await import("../dist/cache/index.js");

      const cacheManager = new CacheManager({
        maxSize: 100,
        defaultTTL: 10000,
        enableLRU: true,
        enableStats: true,
      });

      // Simulate different sites with same endpoint
      const sites = ["test-site-1", "test-site-2"];
      const endpoints = ["posts", "categories", "users"];

      // Populate cache for all sites and endpoints
      for (const site of sites) {
        for (const endpoint of endpoints) {
          const key = cacheManager.generateKey(site, endpoint, {});
          cacheManager.set(key, { site, endpoint, data: `${site}-${endpoint}` });
        }
      }

      // Test pattern clearing across sites
      const postsPattern = /posts/;
      const clearedPosts = cacheManager.clearPattern(postsPattern);

      // Verify only posts were cleared, other endpoints remain
      let remainingEntries = 0;
      let clearedPostsCount = 0;

      for (const site of sites) {
        for (const endpoint of endpoints) {
          const key = cacheManager.generateKey(site, endpoint, {});
          const data = cacheManager.get(key);

          if (endpoint === "posts") {
            if (!data) clearedPostsCount++;
          } else {
            if (data) remainingEntries++;
          }
        }
      }

      if (clearedPostsCount === 2 && remainingEntries === 4) {
        this.results.addTest(
          "Cross-site pattern clearing",
          "PASS",
          `Cleared posts from all sites, preserved other data`,
        );
      } else {
        this.results.addTest(
          "Cross-site pattern clearing",
          "FAIL",
          `Expected to clear 2 posts, preserve 4 others. Cleared: ${clearedPostsCount}, Remaining: ${remainingEntries}`,
        );
      }
    } catch (error) {
      this.results.addTest("Cross-site operations", "FAIL", error.message);
    }
  }

  async testLiveCacheOperations(siteId) {
    // This would test with actual WordPress if credentials are available
    this.results.addTest(`Live cache operations for ${siteId}`, "SKIP", "Requires live WordPress testing");
  }

  async testCacheInvalidation() {
    console.log("\n🗑️  Testing Cache Invalidation");
    console.log("==============================");

    try {
      const { CacheManager, HttpCacheWrapper, CacheInvalidation } = await import("../dist/cache/index.js");

      const cacheManager = new CacheManager({
        maxSize: 100,
        defaultTTL: 10000,
        enableLRU: true,
        enableStats: true,
      });

      const httpCache = new HttpCacheWrapper(cacheManager, "test-site");
      const invalidation = new CacheInvalidation(httpCache);

      // Pre-populate cache
      httpCache.warm("posts", [{ id: 1 }, { id: 2 }]);
      httpCache.warm("posts/1", { id: 1, title: "Test Post" });
      httpCache.warm("categories", [{ id: 1, name: "Test Category" }]);

      const statsBefore = cacheManager.getStats();

      // Trigger invalidation event
      await invalidation.trigger({
        type: "update",
        resource: "posts",
        id: 1,
        siteId: "test-site",
        timestamp: Date.now(),
      });

      const statsAfter = cacheManager.getStats();

      if (statsAfter.totalSize < statsBefore.totalSize) {
        this.results.addTest(
          "Cache invalidation triggers",
          "PASS",
          `Entries reduced from ${statsBefore.totalSize} to ${statsAfter.totalSize}`,
        );
      } else {
        this.results.addTest("Cache invalidation triggers", "FAIL", "No cache entries were invalidated");
      }
    } catch (error) {
      this.results.addTest("Cache invalidation", "FAIL", error.message);
    }
  }

  async testCachePerformance() {
    console.log("\n⚡ Testing Cache Performance");
    console.log("============================");

    try {
      const { CacheManager } = await import("../dist/cache/index.js");

      const cacheManager = new CacheManager({
        maxSize: 1000,
        defaultTTL: 10000,
        enableLRU: true,
        enableStats: true,
      });

      // Performance test: Set operations
      const setStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(`perf-test-${i}`, { id: i, data: `test-data-${i}` });
      }
      const setEnd = performance.now();
      const setTime = setEnd - setStart;

      // Performance test: Get operations
      const getStart = performance.now();
      let hits = 0;
      for (let i = 0; i < 1000; i++) {
        const result = cacheManager.get(`perf-test-${i}`);
        if (result) hits++;
      }
      const getEnd = performance.now();
      const getTime = getEnd - getStart;

      const stats = cacheManager.getStats();

      this.results.addTest(
        "Cache performance - 1000 sets",
        "PASS",
        `${setTime.toFixed(2)}ms (${(setTime / 1000).toFixed(3)}ms per op)`,
      );
      this.results.addTest(
        "Cache performance - 1000 gets",
        "PASS",
        `${getTime.toFixed(2)}ms (${(getTime / 1000).toFixed(3)}ms per op)`,
      );
      this.results.addTest(
        "Cache hit rate",
        hits === 1000 ? "PASS" : "FAIL",
        `${hits}/1000 hits (${stats.hitRate * 100}%)`,
      );
    } catch (error) {
      this.results.addTest("Cache performance", "FAIL", error.message);
    }
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log("🧪 MCP WordPress Cache Configuration Tests");
  console.log("==========================================");

  const results = new TestResults();
  const tester = new CacheTester(results);

  try {
    // Infrastructure tests
    await tester.testCacheInfrastructure();

    // Configuration tests
    await tester.testSingleSiteConfiguration();
    await tester.testMultiSiteConfiguration();

    // Invalidation tests
    await tester.testCacheInvalidation();

    // Performance tests
    await tester.testCachePerformance();

    // Summary
    results.summary();

    if (results.failed === 0) {
      console.log("\n🎉 All tests passed! Cache system is ready for production.");
    } else {
      console.log(`\n⚠️  ${results.failed} test(s) failed. Please review and fix issues.`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
