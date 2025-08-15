/**
 * Validation Utilities - Modular Export Index
 *
 * This module re-exports all validation functions from their focused modules
 * for backward compatibility and convenient imports.
 *
 * @example
 * ```typescript
 * // Import all validators (backward compatible)
 * import { validateId, validateUrl, validatePostParams } from "./utils/validation";
 *
 * // Or import from specific modules
 * import { validateId } from "./utils/validation/core";
 * import { validateUrl } from "./utils/validation/network";
 * import { validatePostParams } from "./utils/validation/wordpress";
 * ```
 */

// Core validators - basic data types
export { validateId, validateString, validateArray } from "./core.js";

// Security validators - file and content safety
export { validateFilePath, validateFileSize, validateMimeType, sanitizeHtml } from "./security.js";

// Network validators - URLs, emails, usernames
export { validateUrl, validateEmail, validateUsername } from "./network.js";

// WordPress-specific validators
export { validatePostStatus, validateSearchQuery, validatePaginationParams, validatePostParams } from "./wordpress.js";

// Rate limiting utilities
export { RateLimiter, authRateLimiter } from "./rateLimit.js";

// Re-export type dependencies for convenience
export type { WordPressId } from "../../types/enhanced.js";
export { WordPressAPIError } from "../../types/client.js";
