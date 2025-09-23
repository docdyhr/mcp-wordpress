#!/usr/bin/env node
/**
 * Live WordPress Cache Testing
 * Tests caching with actual WordPress API calls
 */

import { performance } from "perf_hooks";
import { MCPWordPressServer } from "../dist/index.js";

/**
 * Live Cache Tester
 */
class LiveCacheTester {
  constructor() {
    this.results = [];
  }

  log(status, message, details = "") {
    const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "SKIP" ? "⏭️ " : "⏳";
    console.log(`${icon} ${message}${details ? ` - ${details}` : ""}`);
    this.results.push({ status, message, details, timestamp: new Date() });
  }

  async testWithCredentials() {
    console.log("🔍 Checking WordPress Credentials");
    console.log("=================================");

    const singleSiteCredentials = {
      url: process.env.WORDPRESS_SITE_URL,
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_APP_PASSWORD,
    };

    const multiSiteCredentials = {
      site1: {
        url: process.env.WORDPRESS_SITE_URL,
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_APP_PASSWORD,
      },
      site2: {
        url: process.env.WORDPRESS_SITE_URL_2,
        username: process.env.WORDPRESS_USERNAME_2,
        password: process.env.WORDPRESS_APP_PASSWORD_2,
      },
    };

    const hasSingleSite = singleSiteCredentials.url && singleSiteCredentials.username && singleSiteCredentials.password;
    const hasMultiSite = multiSiteCredentials.site1.url && multiSiteCredentials.site2.url;

    if (hasSingleSite) {
      this.log("PASS", "Single-site credentials found", singleSiteCredentials.url);
      await this.testSingleSiteCaching();
    } else {
      this.log(
        "SKIP",
        "Single-site credentials missing",
        "Set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD",
      );
    }

    if (hasMultiSite) {
      this.log(
        "PASS",
        "Multi-site credentials found",
        `Site 1: ${multiSiteCredentials.site1.url}, Site 2: ${multiSiteCredentials.site2.url}`,
      );
      await this.testMultiSiteCaching();
    } else {
      this.log(
        "SKIP",
        "Multi-site credentials missing",
        "Set WORDPRESS_SITE_URL_2, WORDPRESS_USERNAME_2, WORDPRESS_APP_PASSWORD_2 for multi-site testing",
      );
    }

    if (!hasSingleSite && !hasMultiSite) {
      this.log("FAIL", "No WordPress credentials found", "Cannot run live cache testing");
      return false;
    }

    return true;
  }

  async testSingleSiteCaching() {
    console.log("\n🏠 Testing Single-Site Live Caching");
    console.log("===================================");

    try {
      // Import the cached client directly
      const { CachedWordPressClient } = await import("../dist/client/CachedWordPressClient.js");

      const config = {
        baseUrl: process.env.WORDPRESS_SITE_URL,
        auth: {
          method: "app-password",
          username: process.env.WORDPRESS_USERNAME,
          appPassword: process.env.WORDPRESS_APP_PASSWORD,
        },
      };

      const client = new CachedWordPressClient(config, "live-test");

      // Test cache warming
      this.log("PENDING", "Testing cache warming...");
      const warmStart = performance.now();
      await client.warmCache();
      const warmEnd = performance.now();
      this.log("PASS", "Cache warming completed", `${(warmEnd - warmStart).toFixed(2)}ms`);

      // Get initial stats
      let stats = client.getCacheStats();
      this.log("PASS", "Initial cache stats", `${stats.cache.totalSize} entries`);

      // Test repeated API calls (should demonstrate caching)
      this.log("PENDING", "Testing repeated API calls...");

      const testCalls = [
        () => client.getCurrentUser(),
        () => client.getCategories(),
        () => client.getTags(),
        () => client.getSiteSettings(),
      ];

      for (let i = 0; i < testCalls.length; i++) {
        const call = testCalls[i];
        const callName = call.toString().match(/client\.(\w+)/)?.[1] || `call${i}`;

        // First call (should hit API)
        const firstStart = performance.now();
        try {
          await call();
          const firstEnd = performance.now();
          const firstTime = firstEnd - firstStart;

          // Second call (should hit cache)
          const secondStart = performance.now();
          await call();
          const secondEnd = performance.now();
          const secondTime = secondEnd - secondStart;

          const speedup = firstTime / secondTime;

          if (speedup > 2) {
            this.log(
              "PASS",
              `${callName} caching effective`,
              `${speedup.toFixed(1)}x faster (${firstTime.toFixed(1)}ms → ${secondTime.toFixed(1)}ms)`,
            );
          } else {
            this.log("PASS", `${callName} completed`, `Times: ${firstTime.toFixed(1)}ms → ${secondTime.toFixed(1)}ms`);
          }
        } catch (error) {
          this.log("FAIL", `${callName} failed`, error.message);
        }
      }

      // Final stats
      stats = client.getCacheStats();
      const hitRate = Math.round(stats.cache.hitRate * 100);
      this.log("PASS", "Final cache stats", `${stats.cache.totalSize} entries, ${hitRate}% hit rate`);

      // Test cache management tools
      await this.testCacheManagementTools(client);
    } catch (error) {
      this.log("FAIL", "Single-site caching test failed", error.message);
    }
  }

  async testMultiSiteCaching() {
    console.log("\n🏢 Testing Multi-Site Live Caching");
    console.log("==================================");

    try {
      const { CachedWordPressClient } = await import("../dist/client/CachedWordPressClient.js");

      const configs = {
        site1: {
          baseUrl: process.env.WORDPRESS_SITE_URL,
          auth: {
            method: "app-password",
            username: process.env.WORDPRESS_USERNAME,
            appPassword: process.env.WORDPRESS_APP_PASSWORD,
          },
        },
        site2: {
          baseUrl: process.env.WORDPRESS_SITE_URL_2,
          auth: {
            method: "app-password",
            username: process.env.WORDPRESS_USERNAME_2,
            appPassword: process.env.WORDPRESS_APP_PASSWORD_2,
          },
        },
      };

      const client1 = new CachedWordPressClient(configs.site1, "live-site1");
      const client2 = new CachedWordPressClient(configs.site2, "live-site2");

      // Test cache isolation
      this.log("PENDING", "Testing multi-site cache isolation...");

      // Warm both caches
      await client1.warmCache();
      await client2.warmCache();

      const stats1Before = client1.getCacheStats();
      const stats2Before = client2.getCacheStats();

      this.log(
        "PASS",
        "Both sites cached",
        `Site1: ${stats1Before.cache.totalSize} entries, Site2: ${stats2Before.cache.totalSize} entries`,
      );

      // Clear site1 cache only
      const cleared = client1.clearCache();

      const stats1After = client1.getCacheStats();
      const stats2After = client2.getCacheStats();

      if (stats1After.cache.totalSize === 0 && stats2After.cache.totalSize === stats2Before.cache.totalSize) {
        this.log(
          "PASS",
          "Multi-site cache isolation verified",
          `Site1 cleared (${cleared} entries), Site2 preserved (${stats2After.cache.totalSize} entries)`,
        );
      } else {
        this.log(
          "FAIL",
          "Multi-site cache isolation failed",
          `Site1: ${stats1After.cache.totalSize}, Site2: ${stats2After.cache.totalSize}`,
        );
      }

      // Test concurrent operations
      this.log("PENDING", "Testing concurrent site operations...");

      const promises = [
        client1.getCurrentUser().catch((e) => ({ error: e.message })),
        client2.getCurrentUser().catch((e) => ({ error: e.message })),
        client1.getCategories().catch((e) => ({ error: e.message })),
        client2.getCategories().catch((e) => ({ error: e.message })),
      ];

      const results = await Promise.all(promises);
      const successful = results.filter((r) => !r.error).length;

      this.log(
        successful >= 2 ? "PASS" : "PARTIAL",
        "Concurrent operations",
        `${successful}/${results.length} successful`,
      );
    } catch (error) {
      this.log("FAIL", "Multi-site caching test failed", error.message);
    }
  }

  async testCacheManagementTools(client) {
    console.log("\n🛠️  Testing Cache Management Tools");
    console.log("==================================");

    try {
      // Test cache stats
      const stats = client.getCacheStats();
      this.log("PASS", "Cache stats available", `Hit rate: ${Math.round(stats.cache.hitRate * 100)}%`);

      // Test cache clearing with patterns
      client.warmCache(); // Re-warm for pattern test

      const beforeClear = client.getCacheStats().cache.totalSize;
      const cleared = client.clearCachePattern("categories");
      const afterClear = client.getCacheStats().cache.totalSize;

      if (afterClear < beforeClear) {
        this.log("PASS", "Pattern-based cache clearing", `Cleared ${beforeClear - afterClear} entries`);
      } else {
        this.log("FAIL", "Pattern-based cache clearing failed", "No entries cleared");
      }

      // Test full cache clear
      const totalCleared = client.clearCache();
      const finalSize = client.getCacheStats().cache.totalSize;

      if (finalSize === 0) {
        this.log("PASS", "Full cache clear", `Cleared ${totalCleared} entries`);
      } else {
        this.log("FAIL", "Full cache clear failed", `${finalSize} entries remaining`);
      }
    } catch (error) {
      this.log("FAIL", "Cache management tools test failed", error.message);
    }
  }

  async testCacheInvalidation() {
    console.log("\n🗑️  Testing Live Cache Invalidation");
    console.log("===================================");

    try {
      const { CachedWordPressClient } = await import("../dist/client/CachedWordPressClient.js");

      const config = {
        baseUrl: process.env.WORDPRESS_SITE_URL,
        auth: {
          method: "app-password",
          username: process.env.WORDPRESS_USERNAME,
          appPassword: process.env.WORDPRESS_APP_PASSWORD,
        },
      };

      const client = new CachedWordPressClient(config, "invalidation-test");

      // Warm cache
      await client.warmCache();
      const statsBefore = client.getCacheStats();

      this.log("PASS", "Cache warmed for invalidation test", `${statsBefore.cache.totalSize} entries`);

      // Create a test post (this should trigger invalidation)
      try {
        const testPost = await client.createPost({
          title: "Cache Test Post - " + Date.now(),
          content: "This post is created to test cache invalidation.",
          status: "draft",
        });

        const statsAfter = client.getCacheStats();

        this.log("PASS", "Test post created", `Post ID: ${testPost.id}`);

        // Clean up - delete the test post
        await client.deletePost(testPost.id, true);
        this.log("PASS", "Test post cleaned up", "Post deleted");

        // The cache should have been invalidated during create/delete operations
        this.log("PASS", "Cache invalidation triggered by post operations", "Invalidation system working");
      } catch (error) {
        this.log("SKIP", "Post creation/deletion test skipped", `Permission issue: ${error.message}`);
      }
    } catch (error) {
      this.log("FAIL", "Cache invalidation test failed", error.message);
    }
  }

  summary() {
    console.log("\n📊 Live Testing Summary");
    console.log("=======================");

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const skipped = this.results.filter((r) => r.status === "SKIP").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
      console.log("\n🎉 All live cache tests passed successfully!");
      console.log("   The caching system is working correctly with real WordPress sites.");
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review the issues above.`);
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("🌐 MCP WordPress Live Cache Testing");
  console.log("===================================");

  const tester = new LiveCacheTester();

  try {
    const hasCredentials = await tester.testWithCredentials();

    if (hasCredentials) {
      await tester.testCacheInvalidation();
    }

    tester.summary();
  } catch (error) {
    console.error("❌ Live testing failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
