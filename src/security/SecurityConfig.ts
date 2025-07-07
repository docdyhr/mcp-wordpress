/**
 * Security configuration and constants for MCP WordPress
 */

import { randomBytes } from "crypto";

export const SecurityConfig = {
  // Rate limiting
  rateLimiting: {
    default: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
    },
    authentication: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 5,
    },
    upload: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    },
  },

  // File upload restrictions
  fileUpload: {
    maxSizeMB: 10,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ],
    // Dangerous file extensions to block
    blockedExtensions: [
      ".exe",
      ".bat",
      ".cmd",
      ".com",
      ".pif",
      ".scr",
      ".vbs",
      ".js",
      ".jar",
      ".zip",
      ".rar",
      ".tar",
      ".php",
      ".php3",
      ".php4",
      ".php5",
      ".phtml",
      ".sh",
      ".bash",
      ".zsh",
      ".fish",
      ".ps1",
      ".psm1",
    ],
  },

  // Input validation
  validation: {
    maxStringLength: 1000,
    maxTitleLength: 200,
    maxContentLength: 50000,
    maxExcerptLength: 500,
    maxUrlLength: 2048,
    maxUsernameLength: 60,
    minUsernameLength: 3,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },

  // Request timeouts (milliseconds)
  timeouts: {
    default: 30000, // 30 seconds
    upload: 600000, // 10 minutes
    auth: 10000, // 10 seconds
  },

  // Security headers
  headers: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
  },

  // Error messages (generic to avoid information disclosure)
  errorMessages: {
    authentication: "Authentication failed. Please check your credentials.",
    authorization: "You do not have permission to perform this action.",
    validation: "Invalid input provided.",
    rateLimit: "Too many requests. Please try again later.",
    serverError: "An error occurred processing your request.",
    notFound: "The requested resource was not found.",
  },

  // Logging configuration
  logging: {
    // Fields to exclude from logs
    excludeFields: [
      "password",
      "appPassword",
      "app_password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "session",
      "key",
      "apiKey",
      "api_key",
    ],
    // Patterns to redact in log messages
    redactPatterns: [
      /password["\s:=]+["']?([^"'\s]+)["']?/gi,
      /token["\s:=]+["']?([^"'\s]+)["']?/gi,
      /secret["\s:=]+["']?([^"'\s]+)["']?/gi,
      /key["\s:=]+["']?([^"'\s]+)["']?/gi,
    ],
  },

  // Cache configuration
  cache: {
    // Default cache settings
    enabled: true,
    maxSize: 1000, // Maximum number of cached entries
    defaultTTL: 15 * 60 * 1000, // 15 minutes default TTL
    enableLRU: true,
    enableStats: true,

    // TTL presets by data type (milliseconds)
    ttlPresets: {
      static: 4 * 60 * 60 * 1000, // 4 hours - site settings, user roles
      semiStatic: 2 * 60 * 60 * 1000, // 2 hours - categories, tags, user profiles
      dynamic: 15 * 60 * 1000, // 15 minutes - posts, pages, comments
      session: 30 * 60 * 1000, // 30 minutes - authentication, current user
      realtime: 60 * 1000, // 1 minute - real-time data
    },

    // Cache-Control headers by data type
    cacheHeaders: {
      static: "public, max-age=14400", // 4 hours
      semiStatic: "public, max-age=7200", // 2 hours
      dynamic: "public, max-age=900", // 15 minutes
      session: "private, max-age=1800", // 30 minutes
      realtime: "public, max-age=60", // 1 minute
    },

    // Invalidation settings
    invalidation: {
      enabled: true,
      batchSize: 100, // Max events to process in one batch
      queueTimeout: 5000, // Max time to wait before processing queue (ms)
      enableCascading: true, // Allow cascading invalidations
    },

    // Memory management
    cleanup: {
      interval: 60 * 1000, // Cleanup interval in milliseconds (1 minute)
      maxMemoryMB: 50, // Maximum memory usage for cache
      evictionThreshold: 0.8, // Start evicting when 80% full
    },
  },
};

/**
 * Security utility functions
 */
export class SecurityUtils {
  /**
   * Redact sensitive information from objects
   */
  static redactSensitiveData(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in redacted) {
      if (
        SecurityConfig.logging.excludeFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        )
      ) {
        redacted[key] = "[REDACTED]";
      } else if (typeof redacted[key] === "object") {
        redacted[key] = SecurityUtils.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }

  /**
   * Redact sensitive patterns from strings
   */
  static redactString(str: string): string {
    let redacted = str;
    for (const pattern of SecurityConfig.logging.redactPatterns) {
      redacted = redacted.replace(pattern, (match, value) => {
        return match.replace(value, "[REDACTED]");
      });
    }
    return redacted;
  }

  /**
   * Generate secure random strings
   */
  static generateSecureToken(length: number = 32): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint8Array(length);

    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for Node.js
      const buffer = randomBytes(length);
      array.set(buffer);
    }

    return Array.from(array, (byte) => chars[byte % chars.length]).join("");
  }

  /**
   * Check if a file extension is allowed
   */
  static isFileExtensionAllowed(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return !SecurityConfig.fileUpload.blockedExtensions.includes(ext);
  }

  /**
   * Sanitize log output
   */
  static sanitizeForLog(data: any): any {
    if (typeof data === "string") {
      return SecurityUtils.redactString(data);
    }
    if (typeof data === "object") {
      return SecurityUtils.redactSensitiveData(data);
    }
    return data;
  }
}

/**
 * Secure error handler that prevents information disclosure
 */
export function createSecureError(
  error: any,
  fallbackMessage: string = SecurityConfig.errorMessages.serverError,
): Error {
  // Log the actual error for debugging (with sanitization)
  if (process.env.NODE_ENV !== "production") {
    console.error("Secure Error:", SecurityUtils.sanitizeForLog(error));
  }

  // Return generic error to prevent information disclosure
  const secureError = new Error(fallbackMessage);

  // Preserve error code if it's safe
  if (error && typeof error.code === "string" && !error.code.includes("_")) {
    (secureError as any).code = error.code;
  }

  return secureError;
}

// Import path for file extension checking
import * as path from "path";

/**
 * Environment-specific security settings
 */
export function getEnvironmentSecurity(): {
  strictMode: boolean;
  verboseErrors: boolean;
  enforceHttps: boolean;
  } {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    strictMode: isProduction,
    verboseErrors: !isProduction,
    enforceHttps: isProduction,
  };
}
