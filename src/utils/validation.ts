import * as path from "path";
import { WordPressAPIError } from "../types/client.js";

/**
 * Security-focused validation utilities for MCP WordPress
 */

/**
 * Validates and sanitizes numeric IDs with comprehensive edge case handling
 */
export function validateId(id: any, fieldName: string = "id"): number {
  // Handle null/undefined
  if (id === null || id === undefined) {
    throw new WordPressAPIError(`${fieldName} is required`, 400, "MISSING_PARAMETER");
  }

  // Convert to string first to handle various input types
  const strId = String(id).trim();

  // Check for empty string after trim
  if (strId === "") {
    throw new WordPressAPIError(`${fieldName} cannot be empty`, 400, "INVALID_PARAMETER");
  }

  // Handle decimal inputs
  if (strId.includes(".")) {
    throw new WordPressAPIError(`${fieldName} must be a whole number, not a decimal`, 400, "INVALID_PARAMETER");
  }

  const numId = parseInt(strId, 10);

  // Check for NaN
  if (isNaN(numId)) {
    throw new WordPressAPIError(`Invalid ${fieldName}: "${id}" is not a valid number`, 400, "INVALID_PARAMETER");
  }

  // Check for negative or zero
  if (numId <= 0) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: must be a positive number (got ${numId})`,
      400,
      "INVALID_PARAMETER",
    );
  }

  // Check for max int32 limit (WordPress database limit)
  if (numId > 2147483647) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: exceeds maximum allowed value (2147483647)`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return numId;
}

/**
 * Validates string length within bounds
 */
export function validateString(value: any, fieldName: string, minLength: number = 1, maxLength: number = 1000): string {
  if (typeof value !== "string") {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be a string`, 400, "INVALID_PARAMETER");
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: length must be between ${minLength} and ${maxLength} characters`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return trimmed;
}

/**
 * Validates and sanitizes file paths to prevent directory traversal
 */
export function validateFilePath(userPath: string, allowedBasePath: string): string {
  // Normalize the path to remove ../ and other dangerous patterns
  const normalizedPath = path.normalize(userPath);
  const resolvedPath = path.resolve(allowedBasePath, normalizedPath);

  // Ensure the resolved path is within the allowed directory
  if (!resolvedPath.startsWith(path.resolve(allowedBasePath))) {
    throw new WordPressAPIError("Invalid file path: access denied", 403, "PATH_TRAVERSAL_ATTEMPT");
  }

  return resolvedPath;
}

/**
 * Validates WordPress post status values
 */
export function validatePostStatus(status: string): string {
  const validStatuses = ["publish", "draft", "pending", "private", "future", "auto-draft", "trash"];
  if (!validStatuses.includes(status)) {
    throw new WordPressAPIError(`Invalid status: must be one of ${validStatuses.join(", ")}`, 400, "INVALID_PARAMETER");
  }
  return status;
}

/**
 * Validates and sanitizes URLs with enhanced edge case handling
 */
export function validateUrl(url: string, fieldName: string = "url"): string {
  // Check for empty or whitespace-only URLs
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new WordPressAPIError(`${fieldName} cannot be empty`, 400, "INVALID_PARAMETER");
  }

  // Remove trailing slashes for consistency
  const cleanUrl = trimmedUrl.replace(/\/+$/, "");

  // Check for common URL mistakes
  if (!cleanUrl.match(/^https?:\/\//i)) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: must start with http:// or https:// (got "${cleanUrl}")`,
      400,
      "INVALID_PARAMETER",
    );
  }

  try {
    const urlObj = new URL(cleanUrl);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new WordPressAPIError(
        `Invalid ${fieldName}: only HTTP and HTTPS protocols are allowed`,
        400,
        "INVALID_PARAMETER",
      );
    }

    // Validate hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      throw new WordPressAPIError(`Invalid ${fieldName}: hostname is missing or too short`, 400, "INVALID_PARAMETER");
    }

    // Check for localhost in production
    if (process.env.NODE_ENV === "production" && (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1")) {
      throw new WordPressAPIError(
        `Invalid ${fieldName}: localhost URLs are not allowed in production`,
        400,
        "INVALID_PARAMETER",
      );
    }

    // Validate port if present
    if (urlObj.port) {
      const port = parseInt(urlObj.port);
      if (port < 1 || port > 65535) {
        throw new WordPressAPIError(
          `Invalid ${fieldName}: port number must be between 1 and 65535`,
          400,
          "INVALID_PARAMETER",
        );
      }
    }

    return cleanUrl;
  } catch (error) {
    if (error instanceof WordPressAPIError) {
      throw error;
    }
    throw new WordPressAPIError(`Invalid ${fieldName}: malformed URL "${cleanUrl}"`, 400, "INVALID_PARAMETER");
  }
}

/**
 * Validates file size
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 10): void {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (sizeInBytes > maxSizeInBytes) {
    throw new WordPressAPIError(`File size exceeds maximum allowed size of ${maxSizeInMB}MB`, 413, "FILE_TOO_LARGE");
  }
}

/**
 * Validates MIME types for file uploads
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new WordPressAPIError(
      `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(", ")}`,
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }
}

/**
 * Sanitizes HTML content to prevent XSS
 * Note: This is a basic implementation. For production use,
 * consider using a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  return sanitized;
}

/**
 * Validates array input
 */
export function validateArray<T>(value: any, fieldName: string, minItems: number = 0, maxItems: number = 100): T[] {
  if (!Array.isArray(value)) {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be an array`, 400, "INVALID_PARAMETER");
  }

  if (value.length < minItems || value.length > maxItems) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: array must contain between ${minItems} and ${maxItems} items`,
      400,
      "INVALID_PARAMETER",
    );
  }

  return value;
}

/**
 * Validates email addresses
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new WordPressAPIError("Invalid email address format", 400, "INVALID_PARAMETER");
  }
  return email.toLowerCase();
}

/**
 * Validates username format with enhanced security checks
 */
export function validateUsername(username: string): string {
  // Trim and check for empty
  const trimmed = username.trim();
  if (!trimmed) {
    throw new WordPressAPIError("Username cannot be empty", 400, "INVALID_PARAMETER");
  }

  // WordPress username rules: alphanumeric, space, underscore, hyphen, period, @ symbol
  const usernameRegex = /^[a-zA-Z0-9 _.\-@]+$/;
  if (!usernameRegex.test(trimmed)) {
    throw new WordPressAPIError(
      "Invalid username: can only contain letters, numbers, spaces, and _.-@ symbols",
      400,
      "INVALID_PARAMETER",
    );
  }

  // Length validation
  if (trimmed.length < 3 || trimmed.length > 60) {
    throw new WordPressAPIError(
      `Invalid username: must be between 3 and 60 characters (got ${trimmed.length})`,
      400,
      "INVALID_PARAMETER",
    );
  }

  // Check for consecutive spaces
  if (/\s{2,}/.test(trimmed)) {
    throw new WordPressAPIError("Invalid username: cannot contain consecutive spaces", 400, "INVALID_PARAMETER");
  }

  // Security: Prevent common problematic usernames
  const blacklist = ["admin", "root", "wordpress", "wp-admin", "administrator"];
  if (blacklist.includes(trimmed.toLowerCase())) {
    throw new WordPressAPIError(`Username "${trimmed}" is reserved and cannot be used`, 400, "RESERVED_USERNAME");
  }

  return trimmed;
}

/**
 * Rate limiting tracker (simple in-memory implementation)
 * For production, use Redis or similar
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000, // 1 minute
  ) {}

  check(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || record.resetTime < now) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return;
    }

    if (record.count >= this.maxAttempts) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      throw new WordPressAPIError(
        `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
        429,
        "RATE_LIMIT_EXCEEDED",
      );
    }

    record.count++;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Export a default rate limiter for authentication attempts
export const authRateLimiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes

/**
 * Validates and sanitizes search queries
 */
export function validateSearchQuery(query: string): string {
  // Remove potentially dangerous characters while preserving search functionality
  let sanitized = query.trim();

  // Limit length to prevent DoS
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Remove SQL-like patterns (basic protection)
  sanitized = sanitized.replace(/(\b(union|select|insert|update|delete|drop|create)\b)/gi, "");

  // Remove special characters that might be used for injection
  sanitized = sanitized.replace(/[<>'"`;\\]/g, "");

  return sanitized;
}

/**
 * Validates pagination parameters as a set
 */
export function validatePaginationParams(params: { page?: any; per_page?: any; offset?: any }): {
  page?: number;
  per_page?: number;
  offset?: number;
} {
  const validated: { page?: number; per_page?: number; offset?: number } = {};

  // Validate page
  if (params.page !== undefined) {
    const page = parseInt(String(params.page), 10);
    if (isNaN(page) || page < 1) {
      throw new WordPressAPIError("Page must be a positive integer", 400, "INVALID_PARAMETER");
    }
    if (page > 10000) {
      throw new WordPressAPIError("Page number too high (max 10000)", 400, "INVALID_PARAMETER");
    }
    validated.page = page;
  }

  // Validate per_page
  if (params.per_page !== undefined) {
    const perPage = parseInt(String(params.per_page), 10);
    if (isNaN(perPage) || perPage < 1) {
      throw new WordPressAPIError("Per page must be a positive integer", 400, "INVALID_PARAMETER");
    }
    if (perPage > 100) {
      throw new WordPressAPIError(`Per page exceeds maximum allowed (100), got ${perPage}`, 400, "INVALID_PARAMETER");
    }
    validated.per_page = perPage;
  }

  // Validate offset
  if (params.offset !== undefined) {
    const offset = parseInt(String(params.offset), 10);
    if (isNaN(offset) || offset < 0) {
      throw new WordPressAPIError("Offset must be a non-negative integer", 400, "INVALID_PARAMETER");
    }
    if (offset > 1000000) {
      throw new WordPressAPIError("Offset too large (max 1000000)", 400, "INVALID_PARAMETER");
    }
    validated.offset = offset;
  }

  // Check for conflicting parameters
  if (validated.page && validated.offset) {
    throw new WordPressAPIError(
      "Cannot use both 'page' and 'offset' parameters together",
      400,
      "CONFLICTING_PARAMETERS",
    );
  }

  return validated;
}

/**
 * Validates complex post creation parameters
 */
export function validatePostParams(params: any): any {
  const validated: any = {};

  // Title validation
  if (!params.title || typeof params.title !== "string") {
    throw new WordPressAPIError("Post title is required and must be a string", 400, "INVALID_PARAMETER");
  }
  validated.title = validateString(params.title, "title", 1, 200);

  // Content validation
  if (params.content !== undefined) {
    validated.content = sanitizeHtml(String(params.content));
  }

  // Status validation with context
  if (params.status) {
    validated.status = validatePostStatus(params.status);

    // Future posts need a date
    if (validated.status === "future" && !params.date) {
      throw new WordPressAPIError("Future posts require a 'date' parameter", 400, "MISSING_PARAMETER");
    }
  }

  // Categories and tags validation
  if (params.categories) {
    validated.categories = validateArray(params.categories, "categories", 0, 50);
    validated.categories = validated.categories.map((id: any) => validateId(id, "category ID"));
  }

  if (params.tags) {
    validated.tags = validateArray(params.tags, "tags", 0, 100);
    validated.tags = validated.tags.map((id: any) => validateId(id, "tag ID"));
  }

  // Date validation for scheduled posts
  if (params.date) {
    try {
      const date = new Date(params.date);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      // WordPress expects ISO 8601 format
      validated.date = date.toISOString();
    } catch {
      throw new WordPressAPIError(
        "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)",
        400,
        "INVALID_PARAMETER",
      );
    }
  }

  return validated;
}
