/**
 * Cache system exports
 * Provides centralized access to all caching components
 */

export { CacheManager, CachePresets } from './CacheManager.js';
export { HttpCacheWrapper } from './HttpCacheWrapper.js';
export { CacheInvalidation, WordPressCachePatterns, CacheWarmer } from './CacheInvalidation.js';
export { CachedWordPressClient } from '../client/CachedWordPressClient.js';

export type {
  CacheEntry,
  CacheStats,
  CacheConfig
} from './CacheManager.js';

export type {
  HttpCacheOptions,
  CachedResponse,
  RequestOptions
} from './HttpCacheWrapper.js';

export type {
  InvalidationRule,
  InvalidationEvent
} from './CacheInvalidation.js';
