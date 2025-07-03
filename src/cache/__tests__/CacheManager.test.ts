/**
 * Tests for CacheManager
 */

import { CacheManager, CachePresets } from '../CacheManager.js';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      defaultTTL: 1000,
      enableLRU: true,
      enableStats: true
    });
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      const key = 'test-key';
      const value = { data: 'test value' };

      cacheManager.set(key, value);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    test('should check if key exists', () => {
      const key = 'exists-test';
      expect(cacheManager.has(key)).toBe(false);

      cacheManager.set(key, 'value');
      expect(cacheManager.has(key)).toBe(true);
    });

    test('should delete entries', () => {
      const key = 'delete-test';
      cacheManager.set(key, 'value');
      
      expect(cacheManager.has(key)).toBe(true);
      const deleted = cacheManager.delete(key);
      
      expect(deleted).toBe(true);
      expect(cacheManager.has(key)).toBe(false);
    });

    test('should clear all entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      expect(cacheManager.getStats().totalSize).toBe(2);
      
      cacheManager.clear();
      
      expect(cacheManager.getStats().totalSize).toBe(0);
      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', async () => {
      const key = 'ttl-test';
      const shortTTL = 50; // 50ms
      
      cacheManager.set(key, 'value', shortTTL);
      expect(cacheManager.get(key)).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cacheManager.get(key)).toBeNull();
    });

    test('should not expire entries before TTL', () => {
      const key = 'no-expire-test';
      const longTTL = 10000; // 10 seconds
      
      cacheManager.set(key, 'value', longTTL);
      expect(cacheManager.get(key)).toBe('value');
    });

    test('should use default TTL when not specified', () => {
      const key = 'default-ttl-test';
      cacheManager.set(key, 'value');
      
      const entry = cacheManager.getEntry(key);
      expect(entry?.ttl).toBe(1000);
    });
  });

  describe('Key Generation', () => {
    test('should generate consistent keys for same parameters', () => {
      const siteId = 'site1';
      const endpoint = 'posts';
      const params = { per_page: 10, status: 'publish' };
      
      const key1 = cacheManager.generateKey(siteId, endpoint, params);
      const key2 = cacheManager.generateKey(siteId, endpoint, params);
      
      expect(key1).toBe(key2);
    });

    test('should generate different keys for different parameters', () => {
      const siteId = 'site1';
      const endpoint = 'posts';
      const params1 = { per_page: 10 };
      const params2 = { per_page: 20 };
      
      const key1 = cacheManager.generateKey(siteId, endpoint, params1);
      const key2 = cacheManager.generateKey(siteId, endpoint, params2);
      
      expect(key1).not.toBe(key2);
    });

    test('should include site ID in key', () => {
      const endpoint = 'posts';
      const params = { per_page: 10 };
      
      const key1 = cacheManager.generateKey('site1', endpoint, params);
      const key2 = cacheManager.generateKey('site2', endpoint, params);
      
      expect(key1).toContain('site1:');
      expect(key2).toContain('site2:');
      expect(key1).not.toBe(key2);
    });

    test('should handle undefined parameters', () => {
      const key1 = cacheManager.generateKey('site1', 'posts');
      const key2 = cacheManager.generateKey('site1', 'posts', undefined);
      const key3 = cacheManager.generateKey('site1', 'posts', {});
      
      expect(key1).toBe(key2);
      expect(key1).toBe(key3);
    });
  });

  describe('Site-Specific Operations', () => {
    test('should clear cache for specific site', () => {
      cacheManager.set('site1:posts:abc123', 'value1');
      cacheManager.set('site1:pages:def456', 'value2');
      cacheManager.set('site2:posts:ghi789', 'value3');
      
      const cleared = cacheManager.clearSite('site1');
      
      expect(cleared).toBe(2);
      expect(cacheManager.has('site1:posts:abc123')).toBe(false);
      expect(cacheManager.has('site1:pages:def456')).toBe(false);
      expect(cacheManager.has('site2:posts:ghi789')).toBe(true);
    });

    test('should clear cache matching pattern', () => {
      cacheManager.set('site1:posts:list', 'value1');
      cacheManager.set('site1:posts:123', 'value2');
      cacheManager.set('site1:pages:456', 'value3');
      
      const pattern = /site1:posts/;
      const cleared = cacheManager.clearPattern(pattern);
      
      expect(cleared).toBe(2);
      expect(cacheManager.has('site1:posts:list')).toBe(false);
      expect(cacheManager.has('site1:posts:123')).toBe(false);
      expect(cacheManager.has('site1:pages:456')).toBe(true);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used items when at capacity', () => {
      const smallCache = new CacheManager({
        maxSize: 3,
        defaultTTL: 10000,
        enableLRU: true,
        enableStats: true
      });

      // Fill cache to capacity
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2'); 
      smallCache.set('key3', 'value3');
      
      expect(smallCache.getStats().totalSize).toBe(3);
      
      // Access key1 to make it more recently used
      smallCache.get('key1');
      
      // Add new item, should evict key2 (least recently used)
      smallCache.set('key4', 'value4');
      
      expect(smallCache.has('key1')).toBe(true);  // Recently accessed
      expect(smallCache.has('key2')).toBe(false); // Should be evicted
      expect(smallCache.has('key3')).toBe(true);  // Recently added
      expect(smallCache.has('key4')).toBe(true);  // Just added
      expect(smallCache.getStats().evictions).toBe(1);
    });
  });

  describe('ETags and Conditional Requests', () => {
    test('should store and retrieve ETags', () => {
      const key = 'etag-test';
      const value = { data: 'test' };
      const etag = '"abc123"';
      
      cacheManager.set(key, value, 1000, etag);
      
      const entry = cacheManager.getEntry(key);
      expect(entry?.etag).toBe(etag);
    });

    test('should support conditional request headers', () => {
      const key = 'conditional-test';
      const etag = '"abc123"';
      const lastModified = 'Wed, 21 Oct 2015 07:28:00 GMT';
      
      cacheManager.set(key, { data: 'test' }, 1000, etag, lastModified);
      
      expect(cacheManager.supportsConditionalRequest(key)).toBe(true);
      
      const headers = cacheManager.getConditionalHeaders(key);
      expect(headers['If-None-Match']).toBe(etag);
      expect(headers['If-Modified-Since']).toBe(lastModified);
    });

    test('should not support conditional requests without ETags', () => {
      const key = 'no-etag-test';
      cacheManager.set(key, { data: 'test' });
      
      expect(cacheManager.supportsConditionalRequest(key)).toBe(false);
      expect(cacheManager.getConditionalHeaders(key)).toEqual({});
    });
  });

  describe('Statistics', () => {
    test('should track cache hits and misses', () => {
      const key = 'stats-test';
      
      // Miss
      cacheManager.get(key);
      let stats = cacheManager.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      
      // Hit
      cacheManager.set(key, 'value');
      cacheManager.get(key);
      stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should track total size', () => {
      const stats1 = cacheManager.getStats();
      expect(stats1.totalSize).toBe(0);
      
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      const stats2 = cacheManager.getStats();
      expect(stats2.totalSize).toBe(2);
    });

    test('should calculate hit rate correctly', () => {
      cacheManager.set('key1', 'value1');
      
      // 3 hits, 2 misses = 60% hit rate
      cacheManager.get('key1'); // hit
      cacheManager.get('key1'); // hit  
      cacheManager.get('key1'); // hit
      cacheManager.get('key2'); // miss
      cacheManager.get('key3'); // miss
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.6);
    });
  });

  describe('Cache Presets', () => {
    test('should have predefined cache presets', () => {
      expect(CachePresets.STATIC.ttl).toBeGreaterThan(CachePresets.DYNAMIC.ttl);
      expect(CachePresets.SEMI_STATIC.ttl).toBeGreaterThan(CachePresets.DYNAMIC.ttl);
      expect(CachePresets.SESSION.ttl).toBeGreaterThan(CachePresets.DYNAMIC.ttl);
      
      expect(CachePresets.STATIC.cacheControl).toContain('public');
      expect(CachePresets.SESSION.cacheControl).toContain('private');
    });
  });
});
