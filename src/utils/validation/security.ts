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
