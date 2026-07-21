/**
 * Network Validation Utilities
 *
 * Validation functions for network-related data including URLs, email addresses,
 * and username validation with security considerations.
 */

import net from "node:net";
import { WordPressAPIError } from "@/types/client.js";

/**
 * Hostnames that are always disallowed regardless of format, in addition to the
 * IP-range checks below — primarily cloud metadata endpoints reachable by name.
 */
const DISALLOWED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata.goog"]);

/** Private/reserved IPv4 ranges, including link-local (covers 169.254.169.254 cloud metadata). */
const IPV4_PRIVATE_RANGES: RegExp[] = [
  /^127\./, // loopback 127.0.0.0/8
  /^10\./, // private 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // private 172.16.0.0/12
  /^192\.168\./, // private 192.168.0.0/16
  /^169\.254\./, // link-local 169.254.0.0/16
  /^0\.0\.0\.0$/, // unspecified
];

function isDisallowedIPv4(address: string): boolean {
  return IPV4_PRIVATE_RANGES.some((range) => range.test(address));
}

function isDisallowedIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") {
    return true; // loopback / unspecified
  }
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) {
    return true; // link-local fe80::/10
  }
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) {
    return true; // unique local fc00::/7
  }

  // IPv4-mapped/-compatible addresses (e.g. ::ffff:169.254.169.254) must inherit the IPv4 check
  const mapped = normalized.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isDisallowedIPv4(mapped[1]);
  }

  return false;
}

/**
 * True if `hostname` is a loopback, private, link-local, unique-local, or known
 * cloud-metadata address/name. This is the single source of truth for the SSRF
 * denylist — shared by `ConfigurationSchema`'s `UrlSchema`,
 * `WordPressClient.validateAndSanitizeUrl`, and `validateUrl` below, so the
 * policy can't drift between call sites.
 *
 * Callers should skip this check entirely when `ALLOW_PRIVATE_URLS=true`.
 */
export function isDisallowedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const unbracketed = normalized.startsWith("[") && normalized.endsWith("]") ? normalized.slice(1, -1) : normalized;

  if (DISALLOWED_HOSTNAMES.has(unbracketed)) {
    return true;
  }
  if (net.isIPv4(unbracketed)) {
    return isDisallowedIPv4(unbracketed);
  }
  if (net.isIPv6(unbracketed)) {
    return isDisallowedIPv6(unbracketed);
  }
  return false;
}

/** True when the operator has explicitly opted in to private/loopback URLs (local dev). */
export function isPrivateUrlAllowed(): boolean {
  return process.env.ALLOW_PRIVATE_URLS === "true";
}

/** True when the operator has explicitly opted in to plain-HTTP URLs (local dev). */
export function isInsecureHttpAllowed(): boolean {
  return process.env.ALLOW_INSECURE_HTTP === "true";
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

    if (urlObj.protocol === "http:" && !isInsecureHttpAllowed()) {
      throw new WordPressAPIError(
        `Invalid ${fieldName}: HTTP is not allowed, use HTTPS (set ALLOW_INSECURE_HTTP=true to override for local development)`,
        400,
        "INVALID_PARAMETER",
      );
    }

    if (isDisallowedHostname(urlObj.hostname) && !isPrivateUrlAllowed()) {
      throw new WordPressAPIError(
        `Invalid ${fieldName}: private/localhost URLs are not allowed (set ALLOW_PRIVATE_URLS=true to override for local development)`,
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
