/**
 * Enhanced Security-Focused Validation Utilities - Legacy Export Module
 *
 * This file maintains backward compatibility while the codebase transitions
 * to the new modular structure. The actual implementations have been refactored
 * into focused modules under ./validation/ directory.
 *
 * @deprecated Use direct imports from ./validation/ modules instead
 * @see ./validation/index.ts for the new modular implementation
 */

// Re-export everything from the modular structure for backward compatibility
export {
  // Core validators
  validateId,
  validateString,
  validateArray,

  // Security validators
  validateFilePath,
  validateFileSize,
  validateMimeType,
  sanitizeHtml,

  // Network validators
  validateUrl,
  validateEmail,
  validateUsername,

  // WordPress-specific validators
  validatePostStatus,
  validateSearchQuery,
  validatePaginationParams,
  validatePostParams,

  // Rate limiting
  RateLimiter,
  authRateLimiter,

  // Type re-exports
  type WordPressId,
  WordPressAPIError,
} from "./validation/index.js";

// Legacy re-exports for specific components (advanced usage)
export { validateId as validateWordPressId } from "./validation/core.js";
export { validatePostParams as validatePostData } from "./validation/wordpress.js";
export { sanitizeHtml as cleanHtml } from "./validation/security.js";
