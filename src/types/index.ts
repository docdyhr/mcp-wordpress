/**
 * Type Exports
 *
 * Central export point for all TypeScript types
 */

// WordPress API Types
export * from "./wordpress.js";

// MCP Types
export * from "./mcp.js";

// Client Types
export * from "./client.js";

// Enhanced Types (New) - Selective exports to avoid conflicts
export type { 
  WordPressId, 
  PostId, 
  UserId, 
  MediaId, 
  CommentId, 
  CategoryId, 
  TagId,
  Result,
  DeepReadonly,
  ToolResult,
  NonEmptyArray,
  createWordPressId,
  createSuccess,
  createError
} from "./enhanced.js";

// Request Types (New)
export * from "./requests.js";

// Tool Types (New) - Selective exports to avoid conflicts
export type { 
  BaseToolParams,
  CreatePostParams,
  UpdatePostParams,
  GetPostParams,
  ListPostsParams,
  DeletePostParams,
  CreatePageParams,
  UpdatePageParams,
  GetPageParams,
  ListPagesParams,
  DeletePageParams,
  ToolDefinition as EnhancedToolDefinition,
  ToolRegistry as EnhancedToolRegistry
} from "./tools.js";

// Common Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type Nullable<T> = T | null;
export type AsyncResult<T> = Promise<T>;

// Generic ID type
export type ID = number | string;

// Generic Error Response
export interface ErrorResponse {
  error: true;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Generic Success Response
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// Combined Response Type
export type APIResult<T> = SuccessResponse<T> | ErrorResponse;

// Pagination Metadata
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    first?: string;
    last?: string;
    next?: string;
    previous?: string;
  };
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  charset?: string;
  collate?: string;
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  file?: string;
  console?: boolean;
  format?: "json" | "text";
}

export interface ServerConfig {
  host: string;
  port: number;
  env: "development" | "production" | "test";
  debug: boolean;
  logging: LoggingConfig;
}

// Environment Variables Type
export interface Environment {
  WORDPRESS_SITE_URL: string;
  WORDPRESS_USERNAME: string;
  WORDPRESS_APP_PASSWORD?: string;
  WORDPRESS_PASSWORD?: string;
  WORDPRESS_AUTH_METHOD: string;
  WORDPRESS_JWT_SECRET?: string;
  WORDPRESS_API_KEY?: string;
  DEBUG?: string;
  NODE_ENV?: string;
  LOG_LEVEL?: string;
}

// Validation Schema Types
export interface ValidationRule {
  type: "required" | "string" | "number" | "boolean" | "email" | "url" | "enum" | "array" | "object";
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum_values?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[];
}

// Cache Types
export interface CacheEntry<T> {
  value: T;
  expiry: number;
  created: number;
}

export interface CacheOptions {
  ttl?: number; // time to live in milliseconds
  maxSize?: number;
  strategy?: "lru" | "fifo" | "ttl";
}

// Event Types
export interface EventData {
  type: string;
  timestamp: number;
  data?: Record<string, any>;
}

export type EventHandler<T = EventData> = (event: T) => void | Promise<void>;

// Performance Metrics
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Health Check Types
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  checks: Record<
    string,
    {
      status: "pass" | "fail" | "warn";
      message?: string;
      duration?: number;
    }
  >;
  uptime: number;
  version: string;
}

// Debugging Types
export interface DebugInfo {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

// Type Utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type Awaited<T> = T extends Promise<infer U> ? U : T;

// Brand types for better type safety
export type Brand<T, B> = T & { __brand: B };

export type WordPressID = Brand<number, "WordPressID">;
export type UserID = Brand<number, "UserID">;
export type PostID = Brand<number, "PostID">;
export type MediaID = Brand<number, "MediaID">;
export type CommentID = Brand<number, "CommentID">;
export type CategoryID = Brand<number, "CategoryID">;
export type TagID = Brand<number, "TagID">;

// Function Types
export type AsyncFunction<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => Promise<TReturn>;
export type SyncFunction<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;
export type AnyFunction<TArgs extends any[] = any[], TReturn = any> =
  | SyncFunction<TArgs, TReturn>
  | AsyncFunction<TArgs, TReturn>;

// Conditional Types
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type IsEqual<T, U> = T extends U ? (U extends T ? true : false) : false;
export type IsArray<T> = T extends any[] ? true : false;
export type IsObject<T> = T extends object ? (T extends any[] ? false : true) : false;
