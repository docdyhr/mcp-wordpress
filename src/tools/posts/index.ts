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

import { WordPressClient } from "@/client/api.js";
import { CreatePostRequest, PostQueryParams, PostStatus, UpdatePostRequest, WordPressPost } from "@/types/wordpress.js";
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
   * @param params - Query parameters for filtering posts (may include MCP fields)
   * @returns Formatted list of posts or error message
   */
  public async handleListPosts(
    client: WordPressClient,
    params: PostQueryParams | Record<string, unknown>,
  ): Promise<WordPressPost[] | string> {
    // Handle null/undefined params
    if (!params) {
      params = {};
    }

    // Extract only the relevant query parameters, excluding MCP-specific fields
    const queryParams: PostQueryParams = {};

    if (params.page !== undefined) queryParams.page = params.page as number;
    if (params.per_page !== undefined) queryParams.per_page = params.per_page as number;
    if (params.search !== undefined) queryParams.search = params.search as string;
    if (params.orderby !== undefined) queryParams.orderby = params.orderby as string;
    if (params.order !== undefined) queryParams.order = params.order as "asc" | "desc";
    if (params.status !== undefined) {
      // Handle both string and array forms
      const statusValue = params.status;
      if (Array.isArray(statusValue)) {
        queryParams.status = statusValue as PostStatus[];
      } else {
        queryParams.status = [statusValue as PostStatus];
      }
    }
    if (params.categories !== undefined) queryParams.categories = params.categories as number[];
    if (params.tags !== undefined) queryParams.tags = params.tags as number[];
    if (params.offset !== undefined) queryParams.offset = params.offset as number;

    return handleListPosts(client, queryParams);
  }

  /**
   * Retrieves a single WordPress post with detailed information.
   *
   * @param client - WordPress client instance
   * @param params - Parameters including post ID (may include MCP fields)
   * @returns Detailed post information or error message
   */
  public async handleGetPost(
    client: WordPressClient,
    params: { id: number } | Record<string, unknown>,
  ): Promise<WordPressPost | string> {
    // Extract only the relevant parameters
    const postParams = {
      id: params.id as number,
    };

    return handleGetPost(client, postParams);
  }

  /**
   * Creates a new WordPress post with validation and feedback.
   *
   * @param client - WordPress client instance
   * @param params - Post creation parameters (may include additional MCP fields like 'site')
   * @returns Created post information or error message
   */
  public async handleCreatePost(
    client: WordPressClient,
    params: CreatePostRequest | Record<string, unknown>,
  ): Promise<WordPressPost | string> {
    // Extract only the relevant post creation parameters, excluding MCP-specific fields like 'site'
    const postParams: CreatePostRequest = {
      title: params.title as string,
    };

    if (params.content !== undefined) postParams.content = params.content as string;
    if (params.status !== undefined) postParams.status = params.status as PostStatus;
    if (params.excerpt !== undefined) postParams.excerpt = params.excerpt as string;
    if (params.categories !== undefined) postParams.categories = params.categories as number[];
    if (params.tags !== undefined) postParams.tags = params.tags as number[];
    if (params.featured_media !== undefined) postParams.featured_media = params.featured_media as number;
    if (params.date !== undefined) postParams.date = params.date as string;

    return handleCreatePost(client, postParams);
  }

  /**
   * Updates an existing WordPress post with change tracking.
   *
   * @param client - WordPress client instance
   * @param params - Post update parameters including ID (may include MCP fields)
   * @returns Updated post information or error message
   */
  public async handleUpdatePost(
    client: WordPressClient,
    params: (UpdatePostRequest & { id: number }) | Record<string, unknown>,
  ): Promise<WordPressPost | string> {
    // Extract only the relevant update parameters
    const updateParams: UpdatePostRequest & { id: number } = {
      id: params.id as number,
    };

    if (params.title !== undefined) updateParams.title = params.title as string;
    if (params.content !== undefined) updateParams.content = params.content as string;
    if (params.status !== undefined) updateParams.status = params.status as PostStatus;
    if (params.excerpt !== undefined) updateParams.excerpt = params.excerpt as string;
    if (params.categories !== undefined) updateParams.categories = params.categories as number[];
    if (params.tags !== undefined) updateParams.tags = params.tags as number[];
    if (params.featured_media !== undefined) updateParams.featured_media = params.featured_media as number;
    if (params.date !== undefined) updateParams.date = params.date as string;

    return handleUpdatePost(client, updateParams);
  }

  /**
   * Deletes a WordPress post with options for trash or permanent deletion.
   *
   * @param client - WordPress client instance
   * @param params - Deletion parameters including ID and force option (may include MCP fields)
   * @returns Deletion result or error message
   */
  public async handleDeletePost(
    client: WordPressClient,
    params: { id: number; force?: boolean } | Record<string, unknown>,
  ): Promise<{ deleted: boolean; previous?: WordPressPost } | string> {
    // Extract only the relevant parameters
    const deleteParams: { id: number; force?: boolean } = {
      id: params.id as number,
    };

    if (params.force !== undefined) {
      deleteParams.force = params.force as boolean;
    }

    return handleDeletePost(client, deleteParams);
  }

  /**
   * Retrieves revision history for a WordPress post.
   *
   * @param client - WordPress client instance
   * @param params - Parameters including post ID (may include MCP fields)
   * @returns Post revisions or error message
   */
  public async handleGetPostRevisions(
    client: WordPressClient,
    params: { id: number } | Record<string, unknown>,
  ): Promise<WordPressPost[] | string> {
    // Extract only the relevant parameters
    const revisionParams = {
      id: params.id as number,
    };

    return handleGetPostRevisions(client, revisionParams);
  }
}

// Export everything for easy imports
export { postToolDefinitions } from "./PostToolDefinitions.js";
export * from "./PostHandlers.js";

// Default export for backwards compatibility
export default PostTools;
