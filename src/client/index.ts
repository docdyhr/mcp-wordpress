/**
 * Client Barrel Export
 * Centralized exports for all client classes and utilities
 */

// Main Client Classes
export { WordPressClient } from "./api.js";
export { CachedWordPressClient } from "./CachedWordPressClient.js";
export { SEOWordPressClient } from "./SEOWordPressClient.js";
export { MockWordPressClient } from "./MockWordPressClient.js";

// Authentication utilities
export * from "./auth.js";

// Manager exports (already has its own index)
export * from "./managers/index.js";
