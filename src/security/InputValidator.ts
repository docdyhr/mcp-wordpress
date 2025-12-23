/**
 * Comprehensive Input Validation and Sanitization System
 * Provides security-focused validation for all MCP tool inputs
 */

import { z } from "zod";
import { LoggerFactory } from "@/utils/logger.js";

const logger = LoggerFactory.security();

// Common validation patterns
const URL_PATTERN = /^https?:\/\/[^\s<>'"{}|\\^`\[\]]+$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SLUG_PATTERN = /^[a-z0-9-]+$/;
// Patterns for detecting dangerous content (used for validation, not sanitization)
const SCRIPT_TAG_PATTERN = /<script/gi;
const SCRIPT_END_PATTERN = /<\/script/gi;
const SQL_INJECTION_PATTERN = /('|(\\')|(;)|(\\x00)|(\\n)|(\\r)|(\\x1a)|(\\x22)|(\\x27)|(\\x5c)|(\\x60))/i;

/**
 * Security validation schemas
 */
export const SecuritySchemas = {
  // Safe string with XSS protection
  safeString: z
    .string()
    .max(10000, "String too long")
    .refine((val) => !SCRIPT_TAG_PATTERN.test(val) && !SCRIPT_END_PATTERN.test(val), "Script tags not allowed")
    .refine((val) => !/javascript\s*:/i.test(val), "JavaScript URLs not allowed")
    .refine((val) => !/data\s*:/i.test(val), "Data URLs not allowed")
    .refine((val) => !val.includes("onerror="), "Event handlers not allowed")
    .refine((val) => !val.includes("onload="), "Event handlers not allowed")
    .refine((val) => !val.includes("onfocus="), "Event handlers not allowed"),

  // HTML content with basic sanitization
  htmlContent: z
    .string()
    .max(100000, "Content too long")
    .refine((val) => !SCRIPT_TAG_PATTERN.test(val) && !SCRIPT_END_PATTERN.test(val), "Script tags not allowed")
    .refine((val) => !/javascript\s*:/i.test(val), "JavaScript URLs not allowed")
    .refine((val) => !val.includes("on[a-z]+="), "Event handlers not allowed"),

  // URL validation
  url: z
    .string()
    .url("Invalid URL format")
    .regex(URL_PATTERN, "URL contains invalid characters")
    .refine((val) => !/javascript\s*:/i.test(val), "JavaScript URLs not allowed")
    .refine((val) => !/data\s*:/i.test(val), "Data URLs not allowed"),

  // Email validation
  email: z
    .string()
    .email("Invalid email format")
    .regex(EMAIL_PATTERN, "Email contains invalid characters")
    .max(254, "Email too long"),

  // Slug validation (for URLs, usernames, etc.)
  slug: z
    .string()
    .min(1, "Slug cannot be empty")
    .max(100, "Slug too long")
    .regex(SLUG_PATTERN, "Slug can only contain lowercase letters, numbers, and hyphens"),

  // WordPress post/page content
  wpContent: z
    .string()
    .max(1000000, "Content too long")
    .refine(
      (val) => !SCRIPT_TAG_PATTERN.test(val) && !SCRIPT_END_PATTERN.test(val),
      "Script tags not allowed in content",
    )
    .refine((val) => !/javascript\s*:/i.test(val), "JavaScript URLs not allowed"),

  // Site ID validation
  siteId: z
    .string()
    .min(1, "Site ID cannot be empty")
    .max(50, "Site ID too long")
    .regex(/^[a-zA-Z0-9\-_]+$/, "Site ID can only contain letters, numbers, hyphens, and underscores"),

  // WordPress ID (numeric)
  wpId: z.number().int("ID must be an integer").positive("ID must be positive").max(999999999, "ID too large"),

  // Search query with SQL injection protection
  searchQuery: z
    .string()
    .max(500, "Search query too long")
    .refine((val) => !SQL_INJECTION_PATTERN.test(val), "Invalid characters in search query")
    .refine((val) => !val.includes("--"), "SQL comments not allowed")
    .refine((val) => !val.includes("/*"), "SQL comments not allowed"),

  // File path validation
  filePath: z
    .string()
    .max(500, "File path too long")
    .refine((val) => !val.includes(".."), "Path traversal not allowed")
    .refine((val) => !val.includes("<"), "Invalid characters in path")
    .refine((val) => !val.includes(">"), "Invalid characters in path"),

  // Password (for display/logging - never log actual passwords)
  passwordMask: z.string().transform(() => "[REDACTED]"),

  // WordPress application password format
  appPassword: z
    .string()
    .regex(/^[a-zA-Z0-9\s]{24}$/, "Invalid application password format")
    .transform((val) => val.replace(/\s/g, " ")), // Normalize spaces
};

/**
 * Input sanitization functions
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content by removing dangerous elements
   */
  static sanitizeHtml(input: string): string {
    let result = input;
    let previous = "";

    // Apply sanitization repeatedly until no more changes occur
    // This prevents bypass via nested dangerous patterns like "jajavascript:vascript:"
    while (result !== previous) {
      previous = result;
      result = result
        .replace(/<script[^>]*>/gi, "") // Remove script open tags
        .replace(/<\/script[^>]*>/gi, "") // Remove script close tags
        .replace(/javascript\s*:/gi, "") // Remove javascript: URLs (with optional whitespace)
        .replace(/data\s*:/gi, "") // Remove data: URLs (with optional whitespace)
        .replace(/vbscript\s*:/gi, "") // Remove vbscript: URLs
        .replace(/on[a-z]+\s*=/gi, "") // Remove event handlers
        .replace(/<iframe[^>]*>/gi, "") // Remove iframes
        .replace(/<object[^>]*>/gi, "") // Remove objects
        .replace(/<embed[^>]*>/gi, ""); // Remove embeds
    }

    return result;
  }

  /**
   * Sanitize search queries to prevent SQL injection
   */
  static sanitizeSearchQuery(query: string): string {
    return query
      .replace(/['"\\;]/g, "") // Remove quotes and backslashes
      .replace(/--/g, "") // Remove SQL comments
      .replace(/\/\*/g, "") // Remove SQL comments
      .replace(/\*/g, "") // Remove wildcards
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  static sanitizeFilePath(path: string): string {
    return path
      .replace(/\.\./g, "") // Remove directory traversal
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/[|&;$`\\]/g, "") // Remove shell metacharacters
      .trim();
  }

  /**
   * Encode output for safe display
   */
  static encodeOutput(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
}

/**
 * Security validation decorator for tool methods
 */
export function validateSecurity(schema: z.ZodSchema) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        // Validate input parameters
        const params = args[0] || {};
        const validatedParams = schema.parse(params);

        // Log security validation (without sensitive data)
        logger.info(`Security validation passed for ${propertyName}`, {
          timestamp: new Date().toISOString(),
          method: propertyName,
          paramCount: typeof validatedParams === "object" && validatedParams ? Object.keys(validatedParams).length : 0,
        });

        // Call original method with validated params
        return await method.call(this, validatedParams, ...args.slice(1));
      } catch (_error) {
        // Log security validation failure
        logger.error(`Security validation failed for ${propertyName}`, {
          timestamp: new Date().toISOString(),
          method: propertyName,
          _error:
            _error instanceof z.ZodError ? _error.issues : _error instanceof Error ? _error.message : String(_error),
        });

        throw new SecurityValidationError(
          `Security validation failed for ${propertyName}`,
          _error instanceof z.ZodError
            ? _error.issues
            : [
                {
                  message: _error instanceof Error ? _error.message : String(_error),
                },
              ],
        );
      }
    };

    return descriptor;
  };
}

/**
 * Custom security validation error
 */
export class SecurityValidationError extends Error {
  public readonly issues: Array<z.ZodIssue | { message: string }>;

  constructor(message: string, issues: Array<z.ZodIssue | { message: string }> = []) {
    super(message);
    this.name = "SecurityValidationError";
    this.issues = issues;
  }
}

/**
 * Tool-specific validation schemas
 */
export const ToolSchemas = {
  // Post creation/update
  postData: z.object({
    site: SecuritySchemas.siteId.optional(),
    title: SecuritySchemas.safeString.optional(),
    content: SecuritySchemas.wpContent.optional(),
    excerpt: SecuritySchemas.safeString.optional(),
    status: z.enum(["publish", "draft", "private", "pending"]).optional(),
    slug: SecuritySchemas.slug.optional(),
    categories: z.array(SecuritySchemas.wpId).optional(),
    tags: z.array(SecuritySchemas.wpId).optional(),
  }),

  // User creation/update
  userData: z.object({
    site: SecuritySchemas.siteId.optional(),
    username: SecuritySchemas.slug,
    email: SecuritySchemas.email,
    password: SecuritySchemas.safeString.optional(),
    roles: z.array(z.string()).optional(),
    firstName: SecuritySchemas.safeString.optional(),
    lastName: SecuritySchemas.safeString.optional(),
  }),

  // Search parameters
  searchParams: z.object({
    site: SecuritySchemas.siteId.optional(),
    query: SecuritySchemas.searchQuery,
    type: z.enum(["post", "page", "any"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),

  // Media upload
  mediaUpload: z.object({
    site: SecuritySchemas.siteId.optional(),
    filename: SecuritySchemas.filePath,
    title: SecuritySchemas.safeString.optional(),
    caption: SecuritySchemas.safeString.optional(),
    description: SecuritySchemas.safeString.optional(),
  }),

  // Site settings
  siteSettings: z.object({
    site: SecuritySchemas.siteId.optional(),
    title: SecuritySchemas.safeString.optional(),
    description: SecuritySchemas.safeString.optional(),
    url: SecuritySchemas.url.optional(),
    adminEmail: SecuritySchemas.email.optional(),
  }),

  // Generic list parameters
  listParams: z.object({
    site: SecuritySchemas.siteId.optional(),
    page: z.number().int().min(1).max(1000).optional(),
    perPage: z.number().int().min(1).max(100).optional(),
    search: SecuritySchemas.searchQuery.optional(),
    orderBy: z.string().max(50).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  }),

  // ID-based operations
  idParams: z.object({
    site: SecuritySchemas.siteId.optional(),
    id: SecuritySchemas.wpId,
  }),
};

/**
 * Rate limiting and DoS protection
 */
export class SecurityLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>();
  private static readonly RATE_LIMIT = 1000; // requests per window
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute

  /**
   * Check if request is within rate limits
   */
  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = identifier;
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (current.count >= this.RATE_LIMIT) {
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// Start cleanup interval
setInterval(() => SecurityLimiter.cleanup(), 60000); // Clean up every minute
