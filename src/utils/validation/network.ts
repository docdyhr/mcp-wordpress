/**
 * Network Validation Utilities
 *
 * Validation functions for network-related data including URLs, email addresses,
 * and username validation with security considerations.
 */

import { WordPressAPIError } from "@/types/client.js";
import { config } from "@/config/Config.js";

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
    if (config().app.isProduction && (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1")) {
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
  } catch (_error) {
    if (_error instanceof WordPressAPIError) {
      throw _error;
    }
    throw new WordPressAPIError(`Invalid ${fieldName}: malformed URL "${cleanUrl}"`, 400, "INVALID_PARAMETER");
  }
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
