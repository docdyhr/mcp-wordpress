/**
 * WordPress Posts Tools - Legacy Import Module
 *
 * This file maintains backward compatibility while the codebase transitions
 * to the new modular structure. The actual implementation has been refactored
 * into focused modules under ./posts/ directory.
 *
 * @deprecated Use direct imports from ./posts/ modules instead
 * @see ./posts/index.ts for the new modular implementation
 */

// Re-export the refactored PostTools class for backward compatibility
export { PostTools as default, PostTools } from "./posts/index.js";

// Re-export types and handlers for advanced usage
export type { CreatePostRequest, PostQueryParams, UpdatePostRequest, WordPressPost } from "@/types/wordpress.js";

// Re-export specific components for granular imports
export { postToolDefinitions } from "./posts/PostToolDefinitions.js";
export {
  handleListPosts,
  handleGetPost,
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
  handleGetPostRevisions,
} from "./posts/PostHandlers.js";
