/**
 * Security Validation Utilities
 *
 * Validation functions focused on security concerns including file path validation,
 * file size limits, MIME type validation, and HTML sanitization.
 */

import * as path from "path";
import { WordPressAPIError } from "../../types/client.js";

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
 * Sanitizes HTML content to prevent XSS attacks with comprehensive security measures
 *
 * This implementation addresses GitHub Advanced Security findings by:
 * 1. Using multiple targeted passes to prevent bypasses
 * 2. Handling all variations of dangerous elements and attributes
 * 3. Preserving safe HTML content while removing threats
 * 4. Properly handling malformed and encoded content
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let sanitized = html;

  // First pass: Remove all script elements and variations
  // Standard script tags with content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "");
  // Self-closing script tags
  sanitized = sanitized.replace(/<script\b[^>]*\/>/gi, "");
  // Script tags with whitespace variations
  sanitized = sanitized.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "");
  // Opening script tags (malformed)
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, "");
  // Closing script tags (malformed)
  sanitized = sanitized.replace(/<\/script\s*>/gi, "");

  // Second pass: Remove dangerous elements
  const dangerousElements = [
    "iframe",
    "object",
    "embed",
    "applet",
    "base",
    "meta",
    "link",
    "style",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "option",
  ];

  for (const element of dangerousElements) {
    // Complete tags with content
    sanitized = sanitized.replace(
      new RegExp(`<${element}\\b[^<]*(?:(?!<\\/${element}>)<[^<]*)*<\\/${element}\\s*>`, "gi"),
      "",
    );
    // Self-closing tags
    sanitized = sanitized.replace(new RegExp(`<${element}\\b[^>]*\\/>`, "gi"), "");
    // Opening tags only
    sanitized = sanitized.replace(new RegExp(`<${element}\\b[^>]*>`, "gi"), "");
  }

  // Third pass: Remove event handlers - more precise matching
  // Event handlers with double quotes
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "");
  // Event handlers with single quotes
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");
  // Event handlers without quotes
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Fourth pass: Remove dangerous URL protocols
  const dangerousProtocols = [
    "javascript:",
    "vbscript:",
    "data:",
    "livescript:",
    "mocha:",
    "view-source:",
    "jar:",
    "ms-its:",
    "mhtml:",
    "x-javascript:",
  ];

  for (const protocol of dangerousProtocols) {
    const escapedProtocol = protocol.replace(":", "\\s*:\\s*");
    // In attribute values with double quotes
    sanitized = sanitized.replace(
      new RegExp(`(href|src|action|formaction|background|poster|cite)\\s*=\\s*"[^"]*${escapedProtocol}[^"]*"`, "gi"),
      '$1=""',
    );
    // In attribute values with single quotes
    sanitized = sanitized.replace(
      new RegExp(`(href|src|action|formaction|background|poster|cite)\\s*=\\s*'[^']*${escapedProtocol}[^']*'`, "gi"),
      '$1=""',
    );
    // In attribute values without quotes
    sanitized = sanitized.replace(
      new RegExp(
        `(href|src|action|formaction|background|poster|cite)\\s*=\\s*[^\\s"'>]*${escapedProtocol}[^\\s"'>]*`,
        "gi",
      ),
      '$1=""',
    );
  }

  // Fifth pass: Remove style attributes (can contain expressions)
  sanitized = sanitized.replace(/\s+style\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s+style\s*=\s*'[^']*'/gi, "");
  sanitized = sanitized.replace(/\s+style\s*=\s*[^\s>]+/gi, "");

  // Sixth pass: Handle encoded scripts and entities
  sanitized = sanitized.replace(/&lt;script/gi, "&lt;removed");
  sanitized = sanitized.replace(/&lt;\/script/gi, "&lt;/removed");
  sanitized = sanitized.replace(/&#60;script/gi, "&#60;removed");
  sanitized = sanitized.replace(/&#x3c;script/gi, "&#x3c;removed");
  // Also handle closing script in entities
  sanitized = sanitized.replace(/&#60;\/script/gi, "&#60;/removed");
  sanitized = sanitized.replace(/&#x3c;\/script/gi, "&#x3c;/removed");

  // Seventh pass: Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  // Eighth pass: Clean up any remaining script fragments - be more specific
  sanitized = sanitized.replace(/<script[^>]*>/gi, "");
  sanitized = sanitized.replace(/<\/script[^>]*>/gi, "");

  // Final pass: Clean up extra whitespace but preserve structure
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}
