/**
 * WordPress Posts Tools - Refactored Module
 *
 * This module provides comprehensive WordPress post management functionality
 * through a clean, modular architecture. It combines tool definitions with
 * their corresponding handlers for complete post management capabilities.
 *
 * Features:
 * - List posts with advanced filtering and search
 * - Get individual posts with detailed metadata
 * - Create new posts with validation and feedback
 * - Update existing posts with change tracking
 * - Delete posts with trash/permanent options
 * - Retrieve post revision history
 *
 * @example
 * ```typescript
 * import { PostTools } from './tools/posts';
 *
 * const postTools = new PostTools();
 * const tools = postTools.getTools();
 *
 * // Use with MCP server
 * server.setRequestHandler(ListToolsRequestSchema, () => ({
 *   tools: [...tools, ...otherTools]
 * }));
 * ```
 */

import { WordPressClient } from "../../client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest, WordPressPost } from "../../types/wordpress.js";
import { postToolDefinitions } from "./PostToolDefinitions.js";
import {
  handleListPosts,
  handleGetPost,
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
  handleGetPostRevisions,
} from "./PostHandlers.js";

/**
 * Main PostTools class that provides WordPress post management functionality.
 *
 * This class serves as the interface between the MCP framework and WordPress
 * post operations. It combines tool definitions with their corresponding handlers
 * to provide a complete post management solution.
 *
 * The class is designed with a modular architecture:
 * - Tool definitions are separate from implementations
 * - Handlers are extracted into focused functions
 * - Business logic is isolated from framework concerns
 *
 * @since 2.0.0 (Refactored from monolithic implementation)
 */
export class PostTools {
  /**
   * Retrieves all post management tool definitions for MCP registration.
   *
   * Returns an array of tool definitions that include:
   * - wp_list_posts: Advanced post listing with filtering
   * - wp_get_post: Detailed individual post retrieval
   * - wp_create_post: New post creation with validation
   * - wp_update_post: Post updating with change tracking
   * - wp_delete_post: Post deletion with trash/permanent options
   * - wp_get_post_revisions: Post revision history
   *
   * Each tool includes comprehensive parameter validation, detailed documentation,
   * and usage examples for optimal developer experience.
   *
   * @returns Tool definitions ready for MCP server registration
   */
  public getTools(): unknown[] {
    return postToolDefinitions.map((toolDef) => ({
      ...toolDef,
      handler: this.getHandlerForTool(toolDef.name),
    }));
  }

  /**
   * Maps tool names to their corresponding handler methods.
   *
   * This method provides the binding between tool definitions and their
   * implementations, ensuring proper context and error handling.
   *
   * @param toolName - The name of the tool to get a handler for
   * @returns The bound handler method for the specified tool
   * @private
   */
  private getHandlerForTool(toolName: string) {
    switch (toolName) {
      case "wp_list_posts":
        return this.handleListPosts.bind(this);
      case "wp_get_post":
        return this.handleGetPost.bind(this);
      case "wp_create_post":
        return this.handleCreatePost.bind(this);
      case "wp_update_post":
        return this.handleUpdatePost.bind(this);
      case "wp_delete_post":
        return this.handleDeletePost.bind(this);
      case "wp_get_post_revisions":
        return this.handleGetPostRevisions.bind(this);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Handler Methods - Delegated to Extracted Functions

  /**
   * Lists WordPress posts with advanced filtering capabilities.
   *
   * @param client - WordPress client instance
   * @param params - Query parameters for filtering posts
   * @returns Formatted list of posts or error message
   */
  public async handleListPosts(client: WordPressClient, params: PostQueryParams): Promise<WordPressPost[] | string> {
    return handleListPosts(client, params);
  }

  /**
   * Retrieves a single WordPress post with detailed information.
   *
   * @param client - WordPress client instance
   * @param params - Parameters including post ID
   * @returns Detailed post information or error message
   */
  public async handleGetPost(client: WordPressClient, params: { id: number }): Promise<WordPressPost | string> {
    return handleGetPost(client, params);
  }

  /**
   * Creates a new WordPress post with validation and feedback.
   *
   * @param client - WordPress client instance
   * @param params - Post creation parameters
   * @returns Created post information or error message
   */
  public async handleCreatePost(client: WordPressClient, params: CreatePostRequest): Promise<WordPressPost | string> {
    return handleCreatePost(client, params);
  }

  /**
   * Updates an existing WordPress post with change tracking.
   *
   * @param client - WordPress client instance
   * @param params - Post update parameters including ID
   * @returns Updated post information or error message
   */
  public async handleUpdatePost(
    client: WordPressClient,
    params: UpdatePostRequest & { id: number },
  ): Promise<WordPressPost | string> {
    return handleUpdatePost(client, params);
  }

  /**
   * Deletes a WordPress post with options for trash or permanent deletion.
   *
   * @param client - WordPress client instance
   * @param params - Deletion parameters including ID and force option
   * @returns Deletion result or error message
   */
  public async handleDeletePost(
    client: WordPressClient,
    params: { id: number; force?: boolean },
  ): Promise<{ deleted: boolean; previous?: WordPressPost } | string> {
    return handleDeletePost(client, params);
  }

  /**
   * Retrieves revision history for a WordPress post.
   *
   * @param client - WordPress client instance
   * @param params - Parameters including post ID
   * @returns Post revisions or error message
   */
  public async handleGetPostRevisions(
    client: WordPressClient,
    params: { id: number },
  ): Promise<WordPressPost[] | string> {
    return handleGetPostRevisions(client, params);
  }
}

// Export everything for easy imports
export { postToolDefinitions } from "./PostToolDefinitions.js";
export * from "./PostHandlers.js";

// Default export for backwards compatibility
export default PostTools;
