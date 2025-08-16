/**
 * Intelligent caching system for WordPress MCP Server
 * Implements multi-layer caching with TTL, LRU eviction, and site-specific keys
 */

import * as crypto from "crypto";
import { ConfigHelpers } from "../config/Config.js";

export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
  etag?: string | undefined;
  lastModified?: string | undefined;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableLRU: boolean;
  enableStats: boolean;
  sitePrefix?: string;
}

/**
 * High-performance in-memory cache with TTL and LRU eviction
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    hitRate: 0,
  };

  constructor(private config: CacheConfig) {
    // Start cleanup interval (skip in test environment to avoid timer issues)
    if (!ConfigHelpers.isTest()) {
      this.startCleanupInterval();
    }
  }

  /**
   * Generate cache key with site prefix and parameter hash
   */
  generateKey(siteId: string, endpoint: string, params?: Record<string, unknown>): string {
    const baseKey = `${siteId}:${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }

    // Create deterministic hash of parameters
    const paramHash = crypto
      .createHash("md5")
      .update(JSON.stringify(this.normalizeParams(params)))
      .digest("hex")
      .substring(0, 8);

    return `${baseKey}:${paramHash}`;
  }

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.stats.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttl: number = this.config.defaultTTL, etag?: string, lastModified?: string): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      etag,
      lastModified,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    // If updating existing entry, remove from access order first
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.totalSize = this.cache.size;
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.removeFromAccessOrder(key);
      this.stats.totalSize = this.cache.size;
    }
    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.totalSize = 0;
  }

  /**
   * Clear cache entries for specific site
   */
  clearSite(siteId: string): number {
    let cleared = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${siteId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
      cleared++;
    }

    return cleared;
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: RegExp): number {
    let cleared = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
      cleared++;
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entry with metadata
   */
  getEntry(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    return { ...entry };
  }

  /**
   * Check if entry supports conditional requests
   */
  supportsConditionalRequest(key: string): boolean {
    const entry = this.cache.get(key);
    return !!(entry && (entry.etag || entry.lastModified));
  }

  /**
   * Get conditional request headers
   */
  getConditionalHeaders(key: string): Record<string, string> {
    const entry = this.cache.get(key);
    if (!entry) return {};

    const headers: Record<string, string> = {};

    if (entry.etag) {
      headers["If-None-Match"] = entry.etag;
    }

    if (entry.lastModified) {
      headers["If-Modified-Since"] = entry.lastModified;
    }

    return headers;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.stats.evictions++;
    this.stats.totalSize = this.cache.size;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    if (!this.config.enableLRU) return;

    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Normalize parameters for consistent hashing
   */
  private normalizeParams(params: unknown): unknown {
    if (typeof params !== "object" || params === null) {
      return params;
    }

    if (Array.isArray(params)) {
      // Recursively normalize each item in the array
      return params.map((item) => this.normalizeParams(item));
    }

    // Sort object keys for consistent hashing
    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(params).sort();

    for (const key of keys) {
      normalized[key] = this.normalizeParams((params as Record<string, unknown>)[key]);
    }

    return normalized;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Start periodic cleanup of expired entries
   * Note: This uses setInterval and is not called in test environments to avoid Jest timer issues
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop the cleanup interval and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    this.stats.totalSize = this.cache.size;
  }
}

/**
 * Cache configuration presets for different data types
 */
export const CachePresets = {
  // Static data: site settings, user roles
  STATIC: {
    ttl: 4 * 60 * 60 * 1000, // 4 hours
    cacheControl: "public, max-age=14400",
  },

  // Semi-static: categories, tags, user profiles
  SEMI_STATIC: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    cacheControl: "public, max-age=7200",
  },

  // Dynamic: posts, pages, comments
  DYNAMIC: {
    ttl: 15 * 60 * 1000, // 15 minutes
    cacheControl: "public, max-age=900",
  },

  // Session: authentication, current user
  SESSION: {
    ttl: 30 * 60 * 1000, // 30 minutes
    cacheControl: "private, max-age=1800",
  },

  // Fast changing: real-time data
  REALTIME: {
    ttl: 60 * 1000, // 1 minute
    cacheControl: "public, max-age=60",
  },
};
