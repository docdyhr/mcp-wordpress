/**
 * Enhanced TypeScript Types for MCP WordPress
 *
 * This file provides stronger typing, utility types, and generic constraints
 * to improve type safety throughout the codebase.
 */

// Utility Types for Better Type Safety
export type NonEmptyArray<T> = readonly [T, ...T[]];
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? DeepReadonlyArray<U>
    : T[P] extends readonly (infer U)[]
      ? DeepReadonlyArray<U>
      : T[P] extends object
        ? DeepReadonly<T[P]>
        : T[P];
};

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

// Branded Types for Domain-Specific Values
export type WordPressId = number & { readonly __brand: "WordPressId" };
export type UserId = number & { readonly __brand: "UserId" };
export type PostId = number & { readonly __brand: "PostId" };
export type MediaId = number & { readonly __brand: "MediaId" };
export type CommentId = number & { readonly __brand: "CommentId" };
export type CategoryId = number & { readonly __brand: "CategoryId" };
export type TagId = number & { readonly __brand: "TagId" };

// Helper functions to create branded types
export const createWordPressId = (id: number): WordPressId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid WordPress ID: ${id}. Must be a positive integer.`);
  }
  return id as WordPressId;
};

export const createUserId = (id: number): UserId => id as UserId;
export const createPostId = (id: number): PostId => id as PostId;
export const createMediaId = (id: number): MediaId => id as MediaId;
export const createCommentId = (id: number): CommentId => id as CommentId;
export const createCategoryId = (id: number): CategoryId => id as CategoryId;
export const createTagId = (id: number): TagId => id as TagId;

// Strict URL type
export type WordPressURL = string & { readonly __brand: "WordPressURL" };
export const createWordPressURL = (url: string): WordPressURL => {
  try {
    new URL(url);
    return url as WordPressURL;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
};

// Enhanced Error Types with Better Constraints
export interface TypedError<TCode extends string = string> extends Error {
  readonly code: TCode;
  readonly statusCode?: number;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
}

export interface ValidationError extends TypedError<"VALIDATION_ERROR"> {
  readonly field: string;
  readonly value: unknown;
  readonly constraint: string;
}

export interface APIError extends TypedError<"API_ERROR"> {
  readonly endpoint: string;
  readonly method: string;
  readonly statusCode: number;
}

// Enhanced Request/Response Types with Generic Constraints
export interface BaseRequest {
  readonly timestamp: Date;
  readonly requestId: string;
}

export interface BaseResponse<TData = unknown> {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: string;
  readonly timestamp: Date;
  readonly requestId: string;
}

export interface PaginatedResponse<TData> extends BaseResponse<TData[]> {
  readonly pagination: {
    readonly page: number;
    readonly perPage: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

// Enhanced API Client Types
export interface RequestConfig {
  readonly timeout?: number;
  readonly retries?: number;
  readonly headers?: DeepReadonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface HTTPRequestOptions extends RequestConfig {
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly url: WordPressURL;
  readonly data?: unknown;
  readonly params?: DeepReadonly<Record<string, string | number | boolean>>;
}

// Tool Handler Types with Enhanced Constraints
export interface ToolContext {
  readonly toolName: string;
  readonly executionId: string;
  readonly startTime: Date;
  readonly user?: {
    readonly id: UserId;
    readonly roles: NonEmptyArray<string>;
  };
}

export interface ToolResult<TData = unknown> {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: string;
  readonly executionTime: number;
  readonly warnings?: readonly string[];
}

export type ToolHandler<TInput, TOutput> = (
  input: DeepReadonly<TInput>,
  context: DeepReadonly<ToolContext>,
) => Promise<ToolResult<TOutput>>;

// Cache Types with Enhanced Type Safety
export interface CacheKey {
  readonly namespace: string;
  readonly operation: string;
  readonly params: DeepReadonly<Record<string, string | number | boolean>>;
}

export interface CacheEntry<TData> {
  readonly key: string;
  readonly data: TData;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly hits: number;
}

export interface CacheOptions {
  readonly ttl: number;
  readonly tags?: readonly string[];
  readonly priority?: "low" | "medium" | "high";
}

// Configuration Types with Better Validation
export interface StrictSiteConfig {
  readonly id: string;
  readonly name: string;
  readonly url: WordPressURL;
  readonly auth: DeepReadonly<{
    readonly method: "app-password" | "jwt" | "basic" | "api-key";
    readonly username: string;
    readonly password: string;
  }>;
  readonly timeout?: number;
  readonly rateLimit?: DeepReadonly<{
    readonly requestsPerMinute: number;
    readonly burstLimit: number;
  }>;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  readonly requestCount: number;
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly cacheHitRate: number;
  readonly lastUpdated: Date;
}

export interface PerformanceThresholds {
  readonly maxResponseTime: number;
  readonly maxErrorRate: number;
  readonly minCacheHitRate: number;
}

// Type Guards for Runtime Validation
export const isWordPressId = (value: unknown): value is WordPressId => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

export const isNonEmptyArray = <T>(value: unknown): value is NonEmptyArray<T> => {
  return Array.isArray(value) && value.length > 0;
};

export const isValidURL = (value: unknown): value is WordPressURL => {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// Conditional Types for Enhanced API
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// JSON Schema Type Definitions
export interface JSONSchemaDefinition {
  readonly type: "string" | "number" | "boolean" | "object" | "array" | "null";
  readonly description?: string;
  readonly required?: boolean;
  readonly enum?: readonly (string | number)[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: "email" | "uri" | "date-time" | "date" | "time";
  readonly items?: JSONSchemaDefinition;
  readonly properties?: DeepReadonly<Record<string, JSONSchemaDefinition>>;
}

// Enhanced MCP Tool Schema
export interface StrictMCPToolSchema {
  readonly type: "object";
  readonly properties: DeepReadonly<Record<string, JSONSchemaDefinition>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
}

// Result Types for Better Error Handling
export type Result<TSuccess, TError = Error> =
  | { readonly success: true; readonly data: TSuccess }
  | { readonly success: false; readonly error: TError };

export const createSuccess = <T>(data: T): Result<T> => ({ success: true, data });
export const createError = <T>(error: Error): Result<T> => ({ success: false, error });

// Async Result Type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Database Types with Enhanced Constraints
export interface DatabaseEntity {
  readonly id: WordPressId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface AuditableEntity extends DatabaseEntity {
  readonly createdBy: UserId;
  readonly updatedBy: UserId;
}

// Validation Result Types
export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly string[];
}

export type Validator<T> = (value: unknown) => ValidationResult<T>;

// Enhanced Event Types for Monitoring
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly timestamp: Date;
  readonly source: string;
  readonly correlationId: string;
}

export type EventHandler<TEvent extends DomainEvent> = (event: TEvent) => Promise<void>;

// Configuration Validation Types
export interface ConfigValidationRule<T> {
  readonly key: keyof T;
  readonly required: boolean;
  readonly validator: (value: unknown) => boolean;
  readonly errorMessage: string;
}

export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// Performance Monitoring Event Types
export type PerformanceEventType =
  | "request_started"
  | "request_completed"
  | "request_failed"
  | "cache_hit"
  | "cache_miss"
  | "auth_success"
  | "auth_failure";

export interface PerformanceEvent extends DomainEvent<PerformanceEventType> {
  readonly payload: {
    readonly duration?: number;
    readonly endpoint?: string;
    readonly statusCode?: number;
    readonly cacheKey?: string;
    readonly userId?: UserId;
  };
}
