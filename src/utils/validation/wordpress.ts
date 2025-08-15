/**
 * WordPress-Specific Validation Utilities
 *
 * Validation functions specific to WordPress data structures including post parameters,
 * pagination, search queries, and status validation.
 */

import { WordPressAPIError } from "../../types/client.js";
import { validateId } from "./core.js";
import { validateString, validateArray } from "./core.js";
import { sanitizeHtml } from "./security.js";

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
export function validatePaginationParams(params: { page?: unknown; per_page?: unknown; offset?: unknown }): {
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
export function validatePostParams(params: unknown): Record<string, unknown> {
  const validated: Record<string, unknown> = {};

  // Type guard to ensure params is an object
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new WordPressAPIError("Post parameters must be an object", 400, "INVALID_PARAMETER");
  }

  const typedParams = params as Record<string, unknown>;

  // Title validation
  if (!typedParams.title || typeof typedParams.title !== "string") {
    throw new WordPressAPIError("Post title is required and must be a string", 400, "INVALID_PARAMETER");
  }
  validated.title = validateString(typedParams.title, "title", 1, 200);

  // Content validation
  if (typedParams.content !== undefined) {
    validated.content = sanitizeHtml(String(typedParams.content));
  }

  // Status validation with context
  if (typedParams.status) {
    if (typeof typedParams.status !== "string") {
      throw new WordPressAPIError("Status must be a string", 400, "INVALID_PARAMETER");
    }
    validated.status = validatePostStatus(typedParams.status);

    // Future posts need a date
    if (validated.status === "future" && !typedParams.date) {
      throw new WordPressAPIError("Future posts require a 'date' parameter", 400, "MISSING_PARAMETER");
    }
  }

  // Categories and tags validation
  if (typedParams.categories) {
    const categories = validateArray<unknown>(typedParams.categories, "categories", 0, 50);
    validated.categories = categories.map((id: unknown) => validateId(id, "category ID"));
  }

  if (typedParams.tags) {
    const tags = validateArray<unknown>(typedParams.tags, "tags", 0, 100);
    validated.tags = tags.map((id: unknown) => validateId(id, "tag ID"));
  }

  // Featured media validation
  if (typedParams.featured_media !== undefined) {
    if (typedParams.featured_media === null || typedParams.featured_media === 0) {
      // Allow null or 0 to remove featured media
      validated.featured_media = 0;
    } else {
      validated.featured_media = validateId(typedParams.featured_media, "featured_media");
    }
  }

  // Date validation for scheduled posts
  if (typedParams.date) {
    try {
      const date = new Date(String(typedParams.date));
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
