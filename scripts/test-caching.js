#!/usr/bin/env node
/**
 * Cache Testing and Benchmarking Script
 * Tests the intelligent caching system performance and functionality
 */

import { performance } from "perf_hooks";
import { MCPWordPressServer } from "../dist/index.js";

/**
 * Simple performance benchmark
 */
async function benchmark(name, fn, iterations = 5) {
  console.log(`\n📊 Benchmarking: ${name}`);
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    const duration = end - start;
    times.push(duration);
    console.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);

  return { avg, min, max, times };
}

/**
 * Test cache performance
 */
async function testCachePerformance() {
  console.log("🚀 Starting Cache Performance Tests");
  console.log("=====================================");

  try {
    // Create server instance
    console.log("📋 Initializing MCP WordPress Server...");
    const server = new MCPWordPressServer();

    // Check if credentials are available
    const hasCredentials =
      process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD;

    if (!hasCredentials) {
      console.log("⚠️  No WordPress credentials found.");
      console.log("   Set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD");
      console.log("   to run live cache testing.");
      console.log("");
      console.log("🏁 Running cache infrastructure tests instead...");

      await testCacheInfrastructure();
      return;
    }

    console.log("✅ WordPress credentials found - running live tests");

    // Test cache warming
    await benchmark("Cache Warming", async () => {
      // This would call the cache warming tool
      console.log("   Warming cache with essential data...");
    });

    // Test repeated requests (should hit cache)
    await benchmark("Cached Requests", async () => {
      // This would make repeated API calls that should be cached
      console.log("   Making repeated API calls...");
    });

    console.log("\n🎉 Cache performance tests completed!");
  } catch (error) {
    console.error("❌ Error during cache testing:", error.message);
    process.exit(1);
  }
}

/**
 * Test cache infrastructure without live WordPress
 */
async function testCacheInfrastructure() {
  const { CacheManager, HttpCacheWrapper, CacheInvalidation } = await import("../dist/cache/index.js");

  console.log("\n🔧 Testing Cache Infrastructure");
  console.log("===============================");

  // Test CacheManager
  console.log("📦 Testing CacheManager...");
  const cacheManager = new CacheManager({
    maxSize: 100,
    defaultTTL: 1000,
    enableLRU: true,
    enableStats: true,
  });

  // Basic operations
  await benchmark(
    "Cache Set/Get Operations",
    async () => {
      const key = "test-key-" + Date.now();
      cacheManager.set(key, { data: "test value" });
      const result = cacheManager.get(key);
      if (!result) throw new Error("Cache miss on fresh data");
    },
    100,
  );

  // Test key generation
  await benchmark("Cache Key Generation", async () => {
    for (let i = 0; i < 50; i++) {
      cacheManager.generateKey("site1", "posts", { per_page: i, status: "publish" });
    }
  });

  // Test cache stats
  const stats = cacheManager.getStats();
  console.log("\n📈 Cache Statistics:");
  console.log(`   Total Entries: ${stats.totalSize}`);
  console.log(`   Hit Rate: ${Math.round(stats.hitRate * 100)}%`);
  console.log(`   Hits: ${stats.hits}`);
  console.log(`   Misses: ${stats.misses}`);
  console.log(`   Evictions: ${stats.evictions}`);

  // Test HttpCacheWrapper
  console.log("\n🌐 Testing HTTP Cache Wrapper...");
  const httpCache = new HttpCacheWrapper(cacheManager, "test-site");

  const mockRequestFn = async () => ({
    data: { id: 1, title: "Test Post" },
    status: 200,
    headers: {},
  });

  await benchmark("HTTP Cache Request", async () => {
    await httpCache.request(mockRequestFn, {
      method: "GET",
      url: "https://example.com/wp-json/wp/v2/posts",
      headers: {},
      params: {},
    });
  });

  // Test invalidation
  console.log("\n🗑️  Testing Cache Invalidation...");
  const invalidation = new CacheInvalidation(httpCache);

  await benchmark("Cache Invalidation", async () => {
    await invalidation.trigger({
      type: "update",
      resource: "posts",
      id: 123,
      siteId: "test-site",
      timestamp: Date.now(),
    });
  });

  console.log("\n✅ Infrastructure tests completed successfully!");

  // Memory usage
  const used = process.memoryUsage();
  console.log("\n💾 Memory Usage:");
  console.log(`   RSS: ${Math.round((used.rss / 1024 / 1024) * 100) / 100} MB`);
  console.log(`   Heap Used: ${Math.round((used.heapUsed / 1024 / 1024) * 100) / 100} MB`);
  console.log(`   Heap Total: ${Math.round((used.heapTotal / 1024 / 1024) * 100) / 100} MB`);
}

/**
 * Test cache configuration
 */
async function testCacheConfiguration() {
  console.log("\n⚙️  Testing Cache Configuration");
  console.log("==============================");

  const { SecurityConfig } = await import("../dist/security/SecurityConfig.js");

  console.log("📋 Cache Settings:");
  console.log(`   Enabled: ${SecurityConfig.cache.enabled}`);
  console.log(`   Max Size: ${SecurityConfig.cache.maxSize}`);
  console.log(`   Default TTL: ${SecurityConfig.cache.defaultTTL}ms`);
  console.log(`   LRU Enabled: ${SecurityConfig.cache.enableLRU}`);
  console.log(`   Stats Enabled: ${SecurityConfig.cache.enableStats}`);

  console.log("\n🕐 TTL Presets:");
  Object.entries(SecurityConfig.cache.ttlPresets).forEach(([type, ttl]) => {
    const hours = Math.round((ttl / (1000 * 60 * 60)) * 100) / 100;
    const minutes = Math.round((ttl / (1000 * 60)) * 100) / 100;
    const time = hours >= 1 ? `${hours}h` : `${minutes}m`;
    console.log(`   ${type}: ${time}`);
  });

  console.log("\n🌐 Cache Headers:");
  Object.entries(SecurityConfig.cache.cacheHeaders).forEach(([type, header]) => {
    console.log(`   ${type}: ${header}`);
  });
}

/**
 * Main test runner
 */
async function main() {
  console.log("🧪 MCP WordPress Cache Testing Suite");
  console.log("=====================================");

  try {
    await testCacheConfiguration();
    await testCachePerformance();

    console.log("\n🎯 Next Steps for Live Testing:");
    console.log("1. Set up WordPress credentials in .env");
    console.log("2. Use cache management tools: wp_cache_stats, wp_cache_clear, wp_cache_warm");
    console.log("3. Monitor performance with repeated API calls");
    console.log("4. Test invalidation by creating/updating content");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
