/**
 * WordPress API Client - Refactored with Manager Architecture
 * Re-exports the new modular WordPressClient for backward compatibility
 */

// Re-export the new modular client for backward compatibility
export { WordPressClient as default } from "./WordPressClient.js";
export { WordPressClient } from "./WordPressClient.js";

// Re-export manager classes for internal development
export {
  BaseManager,
  AuthenticationManager,
  RequestManager,
} from "./managers/index.js";

// Re-export all types
export type {
  IWordPressClient,
  WordPressClientConfig,
  AuthConfig,
  AuthMethod,
  HTTPMethod,
  RequestOptions,
  ClientStats,
} from "../types/client.js";
export {
  WordPressAPIError,
  AuthenticationError,
  RateLimitError,
} from "../types/client.js";
export type {
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
  UpdateMediaRequest,
} from "../types/wordpress.js";