import * as path from 'path';
import { WordPressAPIError } from '../types/client.js';

/**
 * Security-focused validation utilities for MCP WordPress
 */

/**
 * Validates and sanitizes numeric IDs
 */
export function validateId(id: any, fieldName: string = 'id'): number {
  const numId = parseInt(String(id), 10);
  if (isNaN(numId) || numId <= 0) {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be a positive number`, 400, 'INVALID_PARAMETER');
  }
  return numId;
}

/**
 * Validates string length within bounds
 */
export function validateString(
  value: any, 
  fieldName: string, 
  minLength: number = 1, 
  maxLength: number = 1000
): string {
  if (typeof value !== 'string') {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be a string`, 400, 'INVALID_PARAMETER');
  }
  
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: length must be between ${minLength} and ${maxLength} characters`,
      400,
      'INVALID_PARAMETER'
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
    throw new WordPressAPIError('Invalid file path: access denied', 403, 'PATH_TRAVERSAL_ATTEMPT');
  }
  
  return resolvedPath;
}

/**
 * Validates WordPress post status values
 */
export function validatePostStatus(status: string): string {
  const validStatuses = ['publish', 'draft', 'pending', 'private', 'future', 'auto-draft', 'trash'];
  if (!validStatuses.includes(status)) {
    throw new WordPressAPIError(
      `Invalid status: must be one of ${validStatuses.join(', ')}`,
      400,
      'INVALID_PARAMETER'
    );
  }
  return status;
}

/**
 * Validates and sanitizes URLs
 */
export function validateUrl(url: string, fieldName: string = 'url'): string {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol');
    }
    return urlObj.toString();
  } catch {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be a valid URL`, 400, 'INVALID_PARAMETER');
  }
}

/**
 * Validates file size
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 10): void {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (sizeInBytes > maxSizeInBytes) {
    throw new WordPressAPIError(
      `File size exceeds maximum allowed size of ${maxSizeInMB}MB`,
      413,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Validates MIME types for file uploads
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new WordPressAPIError(
      `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`,
      415,
      'UNSUPPORTED_MEDIA_TYPE'
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
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized;
}

/**
 * Validates array input
 */
export function validateArray<T>(
  value: any,
  fieldName: string,
  minItems: number = 0,
  maxItems: number = 100
): T[] {
  if (!Array.isArray(value)) {
    throw new WordPressAPIError(`Invalid ${fieldName}: must be an array`, 400, 'INVALID_PARAMETER');
  }
  
  if (value.length < minItems || value.length > maxItems) {
    throw new WordPressAPIError(
      `Invalid ${fieldName}: array must contain between ${minItems} and ${maxItems} items`,
      400,
      'INVALID_PARAMETER'
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
    throw new WordPressAPIError('Invalid email address format', 400, 'INVALID_PARAMETER');
  }
  return email.toLowerCase();
}

/**
 * Validates username format
 */
export function validateUsername(username: string): string {
  // WordPress username rules: alphanumeric, space, underscore, hyphen, period, @ symbol
  const usernameRegex = /^[a-zA-Z0-9 _.\-@]+$/;
  if (!usernameRegex.test(username)) {
    throw new WordPressAPIError(
      'Invalid username: can only contain letters, numbers, spaces, and _.-@ symbols',
      400,
      'INVALID_PARAMETER'
    );
  }
  
  if (username.length < 3 || username.length > 60) {
    throw new WordPressAPIError(
      'Invalid username: must be between 3 and 60 characters',
      400,
      'INVALID_PARAMETER'
    );
  }
  
  return username;
}

/**
 * Rate limiting tracker (simple in-memory implementation)
 * For production, use Redis or similar
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  check(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record || record.resetTime < now) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return;
    }
    
    if (record.count >= this.maxAttempts) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      throw new WordPressAPIError(
        `Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`,
        429,
        'RATE_LIMIT_EXCEEDED'
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
  sanitized = sanitized.replace(/(\b(union|select|insert|update|delete|drop|create)\b)/gi, '');
  
  // Remove special characters that might be used for injection
  sanitized = sanitized.replace(/[<>'"`;\\]/g, '');
  
  return sanitized;
}
