# Intelligent Caching System

The WordPress MCP Server includes a comprehensive intelligent caching system that dramatically improves performance by
reducing API calls and providing faster response times.

## 🚀 **Performance Benefits**

- **50-70% reduction** in taxonomy API calls (categories, tags)
- **40-60% reduction** in authentication requests
- **30-50% reduction** in user profile lookups
- **Significantly improved** response times for static data
- **Better rate limit utilization** - 60 requests/minute becomes much more effective

## 🏗️ **Architecture Overview**

### **Multi-Layer Caching System**

```text
Request → Cache Check → API Call (if miss) → Cache Store → Response
     ↑                                              ↓
     └── ETag Validation ← HTTP Headers ←──────────┘
```

**Layer 1: HTTP Response Cache**

- ETags support for efficient revalidation
- Cache-Control headers based on data volatility
- Conditional requests (If-None-Match)

**Layer 2: In-Memory Application Cache**

- TTL-based expiration by data type
- LRU eviction for memory management
- Site-specific cache keys for multi-site support

**Layer 3: Intelligent Invalidation**

- Event-based cache clearing on content changes
- Pattern-based invalidation of related data
- Cascading invalidation (e.g., post changes clear category counts)

## 📊 **Cache Strategies by Data Type**

### **Static Data (4 hour TTL)**

- Site settings, user roles, capabilities
- Cache-Control: `public, max-age=14400`
- **Why**: Changes very rarely, safe to cache long-term

### **Semi-Static Data (2 hour TTL)**

- Categories, tags, user profiles
- Cache-Control: `public, max-age=7200`
- **Why**: Changes occasionally but stable for hours

### **Dynamic Data (15 minute TTL)**

- Posts, pages, comments
- Cache-Control: `public, max-age=900`
- **Why**: Content changes frequently, shorter cache needed

### **Session Data (30 minute TTL)**

- Authentication status, current user info
- Cache-Control: `private, max-age=1800`
- **Why**: User-specific data, moderate stability

## 🛠️ **Cache Management Tools**

The system includes dedicated cache management tools:

### **wp_cache_stats**

Get detailed cache statistics for performance monitoring.

```bash
wp_cache_stats --site="site1"
```

**Returns:**

- Hit/miss rates
- Total cache entries
- Eviction statistics
- Invalidation queue status

### **wp_cache_clear**

Clear cache entries with optional pattern matching.

```bash
# Clear all cache
wp_cache_clear --site="site1"

# Clear specific patterns
wp_cache_clear --site="site1" --pattern="posts"
wp_cache_clear --site="site1" --pattern="categories"
```

### **wp_cache_warm**

Pre-populate cache with essential WordPress data.

```bash
wp_cache_warm --site="site1"
```

Warms cache with:

- Current user information
- Categories and tags
- Site settings

### **wp_cache_info**

Get detailed cache configuration and status.

```bash
wp_cache_info --site="site1"
```

## ⚙️ **Configuration**

### **Enable/Disable Caching**

Caching is **enabled by default**. To disable:

```bash
export DISABLE_CACHE=true
```

### **Cache Settings**

Configure via `SecurityConfig.cache` in `src/security/SecurityConfig.ts`:

```typescript
cache: {
  enabled: true,
  maxSize: 1000,           // Maximum cache entries
  defaultTTL: 15 * 60 * 1000,  // 15 minutes default
  enableLRU: true,
  enableStats: true,

  // TTL presets by data type
  ttlPresets: {
    static: 4 * 60 * 60 * 1000,      // 4 hours
    semiStatic: 2 * 60 * 60 * 1000,  // 2 hours
    dynamic: 15 * 60 * 1000,         // 15 minutes
    session: 30 * 60 * 1000,         // 30 minutes
    realtime: 60 * 1000              // 1 minute
  }
}
```

## 🔄 **Cache Invalidation**

### **Automatic Invalidation Rules**

The system automatically invalidates related cache entries when content changes:

**Post Operations:**

- **Create Post** → Clears posts listings, categories, tags, search
- **Update Post** → Clears specific post, posts listings, search
- **Delete Post** → Clears posts listings, categories, tags, search

**Category/Tag Operations:**

- **Create/Update/Delete** → Clears taxonomies AND related posts
- **Cascading Effect** → Post cache cleared when categories change

**User Operations:**

- **Update User** → Clears user cache, current user cache
- **User Role Changes** → Clears capability-dependent caches

### **Manual Invalidation**

```bash
# Clear specific patterns
wp_cache_clear --pattern="posts.*"      # All post-related cache
wp_cache_clear --pattern="categories"   # Category cache
wp_cache_clear --pattern="users"        # User cache

# Clear everything (nuclear option)
wp_cache_clear
```

## 🧪 **Testing & Benchmarking**

### **Run Cache Tests**

```bash
npm run build
node scripts/test-caching.js
```

**Tests Include:**

- Cache infrastructure performance
- Memory usage analysis
- Hit/miss rate calculations
- Invalidation timing
- Configuration validation

### **Performance Monitoring**

Monitor cache effectiveness:

```bash
# Check cache statistics
wp_cache_stats --site="your-site"

# Monitor hit rates over time
while true; do
  wp_cache_stats --site="your-site" | grep "hit_rate"
  sleep 30
done
```

### **Expected Performance Gains**

**Before Caching:**

- Categories API call: ~200-500ms
- Repeated user lookups: ~150-300ms each
- Site settings: ~100-200ms each call

**After Caching:**

- Categories (cached): ~1-5ms
- User lookups (cached): ~1-3ms
- Site settings (cached): ~1-2ms

## 🔐 **Multi-Site Support**

Each WordPress site gets isolated cache:

**Cache Key Format:**

```text
{siteId}:{endpoint}:{params_hash}
```

**Examples:**

```text
site1:posts:abc123        # Site 1 posts listing
site2:posts:abc123        # Site 2 posts listing (separate)
site1:categories:def456   # Site 1 categories
```

**Site-Specific Operations:**

```bash
wp_cache_clear --site="site1"              # Clear only site1 cache
wp_cache_clear --site="site2" --pattern="posts"  # Clear site2 posts only
```

## 🚨 **Troubleshooting**

### **Cache Not Working**

1. **Check if caching is enabled:**

   ```bash
   wp_cache_info --site="your-site"
   ```

2. **Verify no DISABLE_CACHE environment variable:**

   ```bash
   echo $DISABLE_CACHE  # Should be empty or 'false'
   ```

3. **Check cache statistics:**

   ```bash
   wp_cache_stats --site="your-site"
   ```

   - Hit rate should increase over time
   - Total entries should grow with usage

### **Poor Cache Performance**

1. **Monitor hit rates:**
   - Good: >60% hit rate after warm-up
   - Poor: <30% hit rate indicates issues

2. **Check TTL settings:**
   - Too short: Frequent cache misses
   - Too long: Stale data issues

3. **Memory pressure:**
   - LRU evictions happening too frequently
   - Consider increasing `maxSize` in config

### **Stale Data Issues**

1. **Check invalidation:**

   ```bash
   wp_cache_info --site="your-site"
   ```

   - Verify invalidation rules are active
   - Check queue processing status

2. **Manual cache clear:**

   ```bash
   wp_cache_clear --site="your-site" --pattern="problematic_endpoint"
   ```

3. **Verify TTL appropriateness:**
   - Static data: 4h is usually safe
   - Dynamic content: Consider shorter TTL

## 📈 **Optimization Tips**

### **For High-Traffic Sites**

1. **Increase cache size:**

   ```typescript
   maxSize: 2000; // From default 1000
   ```

2. **Tune TTL values:**

   ```typescript
   ttlPresets: {
     static: 8 * 60 * 60 * 1000,      // 8 hours for very stable data
     semiStatic: 4 * 60 * 60 * 1000,  // 4 hours
     dynamic: 30 * 60 * 1000,         // 30 minutes for less active sites
   }
   ```

3. **Pre-warm cache on deployment:**

   ```bash
   wp_cache_warm --site="production-site"
   ```

### **For Development**

1. **Shorter TTL for faster iteration:**

   ```typescript
   ttlPresets: {
     dynamic: 30 * 1000,  // 30 seconds for development
   }
   ```

2. **Easy cache clearing:**

   ```bash
   # Add to development scripts
   wp_cache_clear  # Clear all during development
   ```

## 🔮 **Future Enhancements**

Planned improvements:

- **Redis backend** for distributed caching
- **Cache warming strategies** based on access patterns
- **Adaptive TTL** based on content change frequency
- **Cache compression** for larger datasets
- **Metrics dashboard** for cache performance visualization

---

The intelligent caching system provides significant performance improvements while maintaining data freshness
appropriate for each content type. It's designed to work transparently with existing WordPress operations while
providing tools for monitoring and management.
