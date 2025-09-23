/**
 * Enhanced Request Types for WordPress API Client
 *
 * This file provides strongly-typed request interfaces to replace
 * loose typing throughout the codebase.
 */

import type { DeepReadonly } from "./enhanced.js";

// Generic HTTP Request Structure
export interface HTTPRequestConfig {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly url: string;
  readonly headers?: DeepReadonly<Record<string, string>>;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

export interface HTTPRequestWithData extends HTTPRequestConfig {
  readonly data?: unknown;
  readonly contentType?: string;
}

export interface HTTPRequestWithParams extends HTTPRequestConfig {
  readonly params?: DeepReadonly<Record<string, string | number | boolean>>;
}

export interface HTTPRequestFull extends HTTPRequestWithData, HTTPRequestWithParams {}

// Request Queue Types
export interface QueuedRequest {
  readonly id: string;
  readonly config: HTTPRequestFull;
  readonly timestamp: Date;
  readonly priority: "low" | "medium" | "high";
  readonly retries: number;
  readonly maxRetries: number;
}

export interface QueuedRequestCallback {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
}

export interface RequestQueueItem extends QueuedRequest {
  readonly callback: QueuedRequestCallback;
}

// Form Data Types for File Uploads
export interface FileUpload {
  readonly filename: string;
  readonly mimeType: string;
  readonly data: Buffer | Uint8Array | ReadableStream;
  readonly size?: number;
}

export interface FormDataField {
  readonly name: string;
  readonly value: string | number | boolean | FileUpload;
}

export interface FormDataConfig {
  readonly fields: readonly FormDataField[];
  readonly boundary?: string;
}

// Response Types
export interface HTTPResponse<T = unknown> {
  readonly status: number;
  readonly statusText: string;
  readonly headers: DeepReadonly<Record<string, string>>;
  readonly data: T;
  readonly config: HTTPRequestConfig;
  readonly timestamp: Date;
}

export interface ErrorResponse {
  readonly status: number;
  readonly statusText: string;
  readonly message: string;
  readonly code?: string;
  readonly data?: unknown;
}

// Authentication Request Types
export interface AuthenticationRequest {
  readonly method: "app-password" | "jwt" | "basic" | "api-key" | "cookie";
  readonly credentials: DeepReadonly<{
    readonly username?: string;
    readonly password?: string;
    readonly token?: string;
    readonly apiKey?: string;
    readonly nonce?: string;
  }>;
}

export interface AuthenticationResponse {
  readonly success: boolean;
  readonly token?: string;
  readonly expires?: Date;
  readonly user?: {
    readonly id: number;
    readonly username: string;
    readonly roles: readonly string[];
  };
  readonly method: string;
}

// WordPress Specific Request Types
export interface WordPressQueryParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?: string;
  readonly offset?: number;
  readonly include?: readonly number[];
  readonly exclude?: readonly number[];
  readonly slug?: readonly string[];
  readonly status?: readonly string[];
  readonly author?: number;
  readonly author_exclude?: readonly number[];
  readonly before?: string;
  readonly after?: string;
}

export interface PostSpecificParams extends WordPressQueryParams {
  readonly categories?: readonly number[];
  readonly categories_exclude?: readonly number[];
  readonly tags?: readonly number[];
  readonly tags_exclude?: readonly number[];
  readonly sticky?: boolean;
  readonly format?: readonly string[];
}

export interface MediaSpecificParams extends WordPressQueryParams {
  readonly parent?: number;
  readonly parent_exclude?: readonly number[];
  readonly media_type?: "image" | "video" | "text" | "application" | "audio";
  readonly mime_type?: string;
}

export interface UserSpecificParams extends WordPressQueryParams {
  readonly roles?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly who?: "authors";
  readonly has_published_posts?: readonly string[];
}

export interface CommentSpecificParams extends WordPressQueryParams {
  readonly author_email?: string;
  readonly parent?: readonly number[];
  readonly parent_exclude?: readonly number[];
  readonly post?: readonly number[];
  readonly type?: "comment" | "trackback" | "pingback";
  readonly password?: string;
}

// Batch Request Types
export interface BatchOperation<TParams = unknown> {
  readonly id: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly endpoint: string;
  readonly params?: TParams;
  readonly data?: unknown;
}

export interface BatchRequest {
  readonly operations: readonly BatchOperation[];
  readonly parallel?: boolean;
  readonly stopOnError?: boolean;
  readonly timeout?: number;
}

export interface BatchOperationResult<TData = unknown> {
  readonly id: string;
  readonly success: boolean;
  readonly status: number;
  readonly data?: TData;
  readonly error?: ErrorResponse;
  readonly duration: number;
}

export interface BatchResponse {
  readonly results: readonly BatchOperationResult[];
  readonly summary: {
    readonly total: number;
    readonly successful: number;
    readonly failed: number;
    readonly duration: number;
  };
}

// Pagination Response Types
export interface PaginatedRequestParams {
  readonly page: number;
  readonly per_page: number;
  readonly total_pages?: number;
  readonly total_items?: number;
}

export interface PaginatedResponse<TData> {
  readonly data: readonly TData[];
  readonly pagination: {
    readonly current_page: number;
    readonly per_page: number;
    readonly total_pages: number;
    readonly total_items: number;
    readonly has_next: boolean;
    readonly has_previous: boolean;
  };
  readonly links?: {
    readonly self: string;
    readonly next?: string;
    readonly previous?: string;
    readonly first: string;
    readonly last: string;
  };
}

// Search Request Types
export interface SearchRequest {
  readonly query: string;
  readonly type?: readonly ("post" | "page" | "attachment" | "user" | "comment")[];
  readonly subtype?: readonly string[];
  readonly include?: readonly number[];
  readonly exclude?: readonly number[];
  readonly per_page?: number;
  readonly page?: number;
}

export interface SearchResult {
  readonly id: number;
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly subtype: string;
  readonly excerpt?: string;
  readonly date?: string;
  readonly author?: {
    readonly id: number;
    readonly name: string;
  };
}

// Upload Request Types
export interface UploadRequest {
  readonly file: FileUpload;
  readonly title?: string;
  readonly alt_text?: string;
  readonly caption?: string;
  readonly description?: string;
  readonly post?: number;
  readonly author?: number;
  readonly status?: "publish" | "future" | "draft" | "pending" | "private";
  readonly date?: string;
  readonly date_gmt?: string;
}

export interface UploadProgress {
  readonly loaded: number;
  readonly total: number;
  readonly percent: number;
  readonly rate: number;
  readonly estimated?: number;
}

export interface UploadResponse {
  readonly id: number;
  readonly title: {
    readonly rendered: string;
  };
  readonly source_url: string;
  readonly media_type: string;
  readonly mime_type: string;
  readonly upload_progress?: UploadProgress;
}

// Rate Limiting Types
export interface RateLimitConfig {
  readonly requestsPerMinute: number;
  readonly burstLimit: number;
  readonly windowSize: number;
}

export interface RateLimitState {
  readonly remaining: number;
  readonly reset: Date;
  readonly limit: number;
  readonly window: number;
}

export interface RateLimitedRequest extends HTTPRequestFull {
  readonly priority: "low" | "medium" | "high";
  readonly rateLimitKey?: string;
}

// Cache Request Types
export interface CacheableRequest extends HTTPRequestConfig {
  readonly cacheKey?: string;
  readonly cacheTTL?: number;
  readonly cacheStrategy?: "cache-first" | "network-first" | "cache-only" | "network-only";
  readonly invalidateCache?: boolean;
  readonly cacheTags?: readonly string[];
}

export interface CachedResponse<T> extends HTTPResponse<T> {
  readonly cached: boolean;
  readonly cacheAge?: number;
  readonly cacheHit: boolean;
}

// Retry Configuration Types
export interface RetryConfig {
  readonly maxRetries: number;
  readonly backoffFactor: number;
  readonly initialDelay: number;
  readonly maxDelay: number;
  readonly retryOn?: readonly number[];
  readonly retryCondition?: (error: unknown) => boolean;
}

export interface RetryAttempt {
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly delay: number;
  readonly error: unknown;
  readonly timestamp: Date;
}

// Health Check Types
export interface HealthCheckRequest {
  readonly endpoint: string;
  readonly timeout: number;
  readonly expectedStatus?: number;
  readonly expectedContent?: string;
}

export interface HealthCheckResponse {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly responseTime: number;
  readonly statusCode: number;
  readonly timestamp: Date;
  readonly details?: {
    readonly version?: string;
    readonly endpoints?: readonly string[];
    readonly authentication?: boolean;
  };
}

// Validation Types for Request Processing
export interface RequestValidationRule {
  readonly field: string;
  readonly required: boolean;
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly allowedValues?: readonly (string | number | boolean)[];
  readonly customValidator?: (value: unknown) => boolean;
}

export interface RequestValidationSchema {
  readonly rules: readonly RequestValidationRule[];
  readonly strict: boolean;
  readonly allowAdditionalFields: boolean;
}

export interface RequestValidationResult {
  readonly valid: boolean;
  readonly errors: readonly {
    readonly field: string;
    readonly message: string;
    readonly code: string;
  }[];
  readonly sanitizedData?: unknown;
}
