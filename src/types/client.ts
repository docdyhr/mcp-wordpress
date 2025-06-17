/**
 * WordPress API Client Types
 * 
 * TypeScript definitions for the WordPress REST API client
 */

import type { 
  WordPressPost, 
  WordPressPage, 
  WordPressMedia, 
  WordPressUser, 
  WordPressComment,
  WordPressCategory,
  WordPressTag,
  WordPressSiteSettings,
  WordPressApplicationPassword,
  PostQueryParams,
  MediaQueryParams,
  UserQueryParams,
  CommentQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagRequest,
  UpdateTagRequest,
  UploadMediaRequest,
  UpdateMediaRequest
} from './wordpress.js';

// Authentication Configuration
export type AuthMethod = 'app-password' | 'jwt' | 'basic' | 'api-key' | 'cookie';

export interface AuthConfig {
  method: AuthMethod;
  username?: string;
  password?: string;
  appPassword?: string;
  apiKey?: string;
  secret?: string;
  nonce?: string;
  token?: string;
  clientId?: string;
}

// Client Configuration
export interface WordPressClientConfig {
  baseUrl: string;
  auth: AuthConfig;
  timeout?: number;
  maxRetries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

// HTTP Method Types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request Options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

// API Response Wrapper
export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Rate Limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  window: number;
}

// Client Statistics
export interface ClientStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: number;
  rateLimitHits: number;
  authFailures: number;
}

// WordPress API Client Interface
export interface IWordPressClient {
  // Configuration
  readonly config: WordPressClientConfig;
  readonly isAuthenticated: boolean;
  readonly stats: ClientStats;

  // Core Methods
  initialize(): Promise<void>;
  authenticate(): Promise<boolean>;
  disconnect(): Promise<void>;

  // Generic HTTP Methods
  request<T = any>(method: HTTPMethod, endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  get<T = any>(endpoint: string, options?: RequestOptions): Promise<T>;
  post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T>;
  delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T>;

  // Posts
  getPosts(params?: PostQueryParams): Promise<WordPressPost[]>;
  getPost(id: number, context?: 'view' | 'embed' | 'edit'): Promise<WordPressPost>;
  createPost(data: CreatePostRequest): Promise<WordPressPost>;
  updatePost(data: UpdatePostRequest): Promise<WordPressPost>;
  deletePost(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressPost }>;
  getPostRevisions(id: number): Promise<WordPressPost[]>;

  // Pages
  getPages(params?: PostQueryParams): Promise<WordPressPage[]>;
  getPage(id: number, context?: 'view' | 'embed' | 'edit'): Promise<WordPressPage>;
  createPage(data: CreatePageRequest): Promise<WordPressPage>;
  updatePage(data: UpdatePageRequest): Promise<WordPressPage>;
  deletePage(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressPage }>;
  getPageRevisions(id: number): Promise<WordPressPage[]>;

  // Media
  getMedia(params?: MediaQueryParams): Promise<WordPressMedia[]>;
  getMediaItem(id: number, context?: 'view' | 'embed' | 'edit'): Promise<WordPressMedia>;
  uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia>;
  uploadFile(fileData: Buffer, filename: string, mimeType: string, meta?: Partial<UploadMediaRequest>, options?: RequestOptions): Promise<WordPressMedia>;
  updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia>;
  deleteMedia(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressMedia }>;

  // Users
  getUsers(params?: UserQueryParams): Promise<WordPressUser[]>;
  getUser(id: number | 'me', context?: 'view' | 'embed' | 'edit'): Promise<WordPressUser>;
  createUser(data: CreateUserRequest): Promise<WordPressUser>;
  updateUser(data: UpdateUserRequest): Promise<WordPressUser>;
  deleteUser(id: number, reassign?: number): Promise<{ deleted: boolean; previous?: WordPressUser }>;
  getCurrentUser(): Promise<WordPressUser>;

  // Comments
  getComments(params?: CommentQueryParams): Promise<WordPressComment[]>;
  getComment(id: number, context?: 'view' | 'embed' | 'edit'): Promise<WordPressComment>;
  createComment(data: CreateCommentRequest): Promise<WordPressComment>;
  updateComment(data: UpdateCommentRequest): Promise<WordPressComment>;
  deleteComment(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressComment }>;
  approveComment(id: number): Promise<WordPressComment>;
  rejectComment(id: number): Promise<WordPressComment>;
  spamComment(id: number): Promise<WordPressComment>;

  // Taxonomies
  getCategories(params?: { search?: string; exclude?: number[]; include?: number[]; order?: 'asc' | 'desc'; orderby?: string; hide_empty?: boolean; parent?: number; post?: number; slug?: string }): Promise<WordPressCategory[]>;
  getCategory(id: number): Promise<WordPressCategory>;
  createCategory(data: CreateCategoryRequest): Promise<WordPressCategory>;
  updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory>;
  deleteCategory(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressCategory }>;

  getTags(params?: { search?: string; exclude?: number[]; include?: number[]; order?: 'asc' | 'desc'; orderby?: string; hide_empty?: boolean; post?: number; slug?: string }): Promise<WordPressTag[]>;
  getTag(id: number): Promise<WordPressTag>;
  createTag(data: CreateTagRequest): Promise<WordPressTag>;
  updateTag(data: UpdateTagRequest): Promise<WordPressTag>;
  deleteTag(id: number, force?: boolean): Promise<{ deleted: boolean; previous?: WordPressTag }>;

  // Site Management
  getSiteSettings(): Promise<WordPressSiteSettings>;
  updateSiteSettings(settings: Partial<WordPressSiteSettings>): Promise<WordPressSiteSettings>;
  getSiteInfo(): Promise<{
    name: string;
    description: string;
    url: string;
    home: string;
    gmt_offset: number;
    timezone_string: string;
    namespaces: string[];
    authentication: Record<string, any>;
    routes: Record<string, any>;
  }>;

  // Application Passwords
  getApplicationPasswords(userId?: number | 'me'): Promise<WordPressApplicationPassword[]>;
  createApplicationPassword(userId: number | 'me', name: string, appId?: string): Promise<WordPressApplicationPassword>;
  deleteApplicationPassword(userId: number | 'me', uuid: string): Promise<{ deleted: boolean }>;

  // Search
  search(query: string, types?: string[], subtype?: string): Promise<Array<{
    id: number;
    title: string;
    url: string;
    type: string;
    subtype: string;
  }>>;

  // Utility Methods
  ping(): Promise<boolean>;
  getServerInfo(): Promise<Record<string, any>>;
  validateEndpoint(endpoint: string): boolean;
  buildUrl(endpoint: string, params?: Record<string, any>): string;
}

// Authentication Provider Interface
export interface IAuthProvider {
  readonly method: AuthMethod;
  authenticate(client: IWordPressClient): Promise<boolean>;
  addAuthHeaders(headers: Record<string, string>): void;
  refreshAuth?(): Promise<boolean>;
  validateAuth?(): Promise<boolean>;
}

// Error Types
export class WordPressAPIError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public data?: any;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    data?: any
  ) {
    super(message);
    this.name = 'WordPressAPIError';
    if (statusCode !== undefined) this.statusCode = statusCode;
    if (code !== undefined) this.code = code;
    if (data !== undefined) this.data = data;
  }
}

export class AuthenticationError extends WordPressAPIError {
  constructor(message: string, method: AuthMethod) {
    super(message, 401, 'authentication_failed');
    this.name = 'AuthenticationError';
    this.data = { method };
  }
}

export class RateLimitError extends WordPressAPIError {
  constructor(message: string, resetTime: number) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.data = { resetTime };
  }
}

export class ValidationError extends WordPressAPIError {
  constructor(message: string, field?: string) {
    super(message, 400, 'validation_failed');
    this.name = 'ValidationError';
    this.data = { field };
  }
}

// Type Guards
export function isWordPressAPIError(error: any): error is WordPressAPIError {
  return error instanceof WordPressAPIError;
}

export function isAuthenticationError(error: any): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

// Response Type Guards
export function isWordPressPost(obj: any): obj is WordPressPost {
  return obj && typeof obj.id === 'number' && obj.type === 'post';
}

export function isWordPressPage(obj: any): obj is WordPressPage {
  return obj && typeof obj.id === 'number' && obj.type === 'page';
}

export function isWordPressMedia(obj: any): obj is WordPressMedia {
  return obj && typeof obj.id === 'number' && obj.media_type;
}

export function isWordPressUser(obj: any): obj is WordPressUser {
  return obj && typeof obj.id === 'number' && obj.username;
}

export function isWordPressComment(obj: any): obj is WordPressComment {
  return obj && typeof obj.id === 'number' && typeof obj.post === 'number';
}