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
// Patterns for detecting dangerous content (used for validation, not sanitization).
// Deliberately NOT global (`g`/`y`) — these are only ever used with `.test()` for a boolean
// check, and a global flag makes `.test()` mutate `lastIndex` on the shared instance below,
// so repeated calls against the same (or even identical) input nondeterministically flip
// between matching and not matching. Use a fresh regex literal (safe, no shared state) or one
// of these non-global constants; never add `g`/`y` back without also switching every caller
// off `.test()`.
const SCRIPT_TAG_PATTERN = /<script/i;
const SCRIPT_END_PATTERN = /<\/script/i;
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/i;
// Anchored to an actual `data:` URI scheme rather than a bare `data\s*:` substring match: the
// latter also matches ordinary words/prose ending in "...data:" (e.g. a title like "Metadata:
// Migration Guide") or plain sentences mentioning "data:" as a topic, rejecting legitimate
// input before its handler runs. Requires a word boundary before "data" (so it can't match
// inside "Metadata") and no whitespace between the colon and the following comma (real data
// URIs never have one; prose like "data: is dangerous" always does).
const DATA_URL_PATTERN = /\bdata:[^\s,]*,/i;
// Matches a real event-handler attribute (onerror=, onclick=, onload=, ...). The previous
// version of this check used `val.includes("on[a-z]+=")`, which looks for that literal
// 9-character substring — a string that real payloads never contain — instead of compiling
// the pattern as a regex, so it silently never matched anything.
//
// Deliberately an enumerated list of actual DOM event-handler attribute names rather than a
// generic `\bon[a-z]+\s*=` wildcard: the wildcard also matches ordinary words that happen to
// start with "on" and appear before an "=" — e.g. a URL query string like `?online=true` or
// `?onboarding=1` — which would reject legitimate, harmless input.
//
// Includes the SVG SMIL animation handlers (begin/end/repeat — e.g. `<svg><animate onbegin=...>`,
// a well-known blocklist-bypass technique since generic filters built around common DOM events
// routinely miss them) and the newer focusin/focusout/beforeinput/beforetoggle/auxclick handlers,
// alongside the original DOM event list. A security review of this exact pattern flagged the
// initial version for omitting these — keep this comprehensive rather than trimming it back to
// "common" handlers only.
const EVENT_HANDLER_PATTERN =
  /\bon(?:error|load|click|dblclick|auxclick|contextmenu|mouse(?:over|out|enter|leave|down|up|move)|focus|focusin|focusout|blur|key(?:down|up|press)|submit|change|input|beforeinput|drag(?:start|end|over|enter|leave)?|drop|wheel|scroll|resize|animation(?:start|end|iteration)|transitionend|begin|end|repeat|pointer(?:down|up|move|over|out|enter|leave|cancel)|touch(?:start|end|move|cancel)|beforeunload|beforetoggle|unload|popstate|hashchange|message|copy|cut|paste|toggle|reset|select|abort|canplay|ended|pause|play|seeked|seeking|stalled|suspend|waiting|invalid|search)\s*=/i;
const SQL_INJECTION_PATTERN = /('|(\\')|(;)|(\\x00)|(\\n)|(\\r)|(\\x1a)|(\\x22)|(\\x27)|(\\x5c)|(\\x60))/i;

/**
 * True when a string contains an unmistakable XSS vector (script tag, javascript:/data: URL
 * scheme, or an inline event-handler attribute). Intended for general free-text MCP tool
 * parameters (titles, search queries, usernames, etc.) — NOT WordPress content fields, which
 * legitimately contain rich HTML/Gutenberg block markup; use isUnsafeWordPressContent instead.
 */
export function isUnsafePlainText(value: string): boolean {
  return (
    SCRIPT_TAG_PATTERN.test(value) ||
    SCRIPT_END_PATTERN.test(value) ||
    JAVASCRIPT_URL_PATTERN.test(value) ||
    DATA_URL_PATTERN.test(value) ||
    EVENT_HANDLER_PATTERN.test(value)
  );
}

/**
 * True when WordPress post/page/comment content contains an unmistakable XSS vector. Narrower
 * than isUnsafePlainText: does not reject `data:` URLs (legitimate in embedded block content)
 * and carries no length cap of its own — callers apply their own maxLength.
 */
export function isUnsafeWordPressContent(value: string): boolean {
  return (
    SCRIPT_TAG_PATTERN.test(value) ||
    SCRIPT_END_PATTERN.test(value) ||
    JAVASCRIPT_URL_PATTERN.test(value) ||
    EVENT_HANDLER_PATTERN.test(value)
  );
}

/**
 * Security validation schemas
 */
export const SecuritySchemas = {
  // Safe string with XSS protection
  safeString: z
    .string()
    .max(10000, "String too long")
    .refine((val) => !isUnsafePlainText(val), "Unsafe content (script tag, javascript:/data: URL, or event handler)"),

  // HTML content with basic sanitization
  htmlContent: z
    .string()
    .max(100000, "Content too long")
    .refine((val) => !isUnsafePlainText(val), "Unsafe content (script tag, javascript:/data: URL, or event handler)"),

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

  // WordPress post/page/comment content: deliberately more permissive than safeString/
  // htmlContent (no data: URL restriction, no length cap of its own) since legitimate
  // Gutenberg block markup and rich content must not be blindly stripped — see
  // isUnsafeWordPressContent's docstring for the exact, narrower boundary this enforces.
  wpContent: z
    .string()
    .max(1000000, "Content too long")
    .refine((val) => !isUnsafeWordPressContent(val), "Unsafe content (script tag, javascript: URL, or event handler)"),

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

// Start cleanup interval. unref() so this background timer never keeps the
// process (or a test worker) alive on its own — importing this module must
// not create a ref'ed global timer that blocks a clean process exit.
setInterval(() => SecurityLimiter.cleanup(), 60000).unref(); // Clean up every minute
