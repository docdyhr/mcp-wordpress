import { WordPressClient } from "../client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";
import { ErrorHandlers, EnhancedError } from "../utils/enhancedError.js";
import { validateId, validatePaginationParams, validatePostParams } from "../utils/validation.js";
import { WordPressDataStreamer, StreamingUtils, StreamingResult } from "../utils/streaming.js";

/**
 * Provides comprehensive tools for managing WordPress posts.
 *
 * This class encapsulates tool definitions and their corresponding handlers for:
 * - Listing posts with advanced filtering and search capabilities
 * - Creating new posts with full metadata support
 * - Updating existing posts with validation
 * - Deleting posts with trash/permanent options
 * - Retrieving individual posts with detailed information
 * - Managing post revisions and history
 *
 * @example
 * ```typescript
 * const postTools = new PostTools();
 * const tools = postTools.getTools();
 *
 * // Use with a WordPress client
 * const client = new WordPressClient(config);
 * const result = await postTools.handleListPosts(client, { per_page: 10 });
 * ```
 *
 * @since 1.0.0
 * @author MCP WordPress Team
 */
export class PostTools {
  /**
   * Retrieves the complete list of post management tools available for MCP.
   *
   * Returns an array of tool definitions that can be registered with an MCP server.
   * Each tool includes comprehensive parameter validation, error handling, and
   * detailed documentation with usage examples.
   *
   * @returns {Array<MCPTool>} An array of MCPTool definitions for post management
   *
   * @example
   * ```typescript
   * const postTools = new PostTools();
   * const tools = postTools.getTools();
   * console.log(tools.length); // 6 tools: list, get, create, update, delete, revisions
   * ```
   */
  public getTools(): any[] {
    return [
      {
        name: "wp_list_posts",
        description:
          "Lists posts from a WordPress site with comprehensive filtering options. Supports search, status filtering, and category/tag filtering with enhanced metadata display.\n\n" +
          "**Usage Examples:**\n" +
          "• Basic listing: `wp_list_posts`\n" +
          '• Search posts: `wp_list_posts --search="AI trends"`\n' +
          '• Filter by status: `wp_list_posts --status="draft"`\n' +
          "• Category filtering: `wp_list_posts --categories=[1,2,3]`\n" +
          "• Paginated results: `wp_list_posts --per_page=20 --page=2`\n" +
          '• Combined filters: `wp_list_posts --search="WordPress" --status="publish" --per_page=10`',
        parameters: [
          {
            name: "per_page",
            type: "number",
            description: "Number of items to return per page (max 100).",
          },
          {
            name: "search",
            type: "string",
            description: "Limit results to those matching a search term.",
          },
          {
            name: "status",
            type: "string",
            description: "Filter by post status.",
            enum: ["publish", "future", "draft", "pending", "private"],
          },
          {
            name: "categories",
            type: "array",
            items: { type: "number" },
            description: "Limit results to posts in specific category IDs.",
          },
          {
            name: "tags",
            type: "array",
            items: { type: "number" },
            description: "Limit results to posts with specific tag IDs.",
          },
        ],
        handler: this.handleListPosts.bind(this),
      },
      {
        name: "wp_get_post",
        description:
          "Retrieves detailed information about a single post including metadata, content statistics, and management links.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the post.",
          },
        ],
        handler: this.handleGetPost.bind(this),
      },
      {
        name: "wp_create_post",
        description:
          "Creates a new WordPress post with comprehensive validation and detailed success feedback including management links.\n\n" +
          "**Usage Examples:**\n" +
          '• Simple post: `wp_create_post --title="My New Post" --content="<p>Hello World!</p>"`\n' +
          '• Draft post: `wp_create_post --title="Draft Post" --status="draft"`\n' +
          '• Categorized post: `wp_create_post --title="Tech News" --categories=[1,5] --tags=[10,20]`\n' +
          '• Post with featured image: `wp_create_post --title="My Post" --content="<p>Content</p>" --featured_media=42`\n' +
          '• Remove featured image: `wp_create_post --title="My Post" --featured_media=0`\n' +
          '• Scheduled post: `wp_create_post --title="Future Post" --status="future" --date="2024-12-25T10:00:00"`\n' +
          '• Complete post: `wp_create_post --title="Complete Post" --content="<p>Content</p>" --excerpt="Summary" --status="publish"`',
        parameters: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "The title for the post.",
          },
          {
            name: "content",
            type: "string",
            description: "The content for the post, in HTML format.",
          },
          {
            name: "status",
            type: "string",
            description: "The publishing status for the post.",
            enum: ["publish", "draft", "pending", "private"],
          },
          {
            name: "excerpt",
            type: "string",
            description: "The excerpt for the post.",
          },
          {
            name: "categories",
            type: "array",
            items: { type: "number" },
            description: "An array of category IDs to assign to the post.",
          },
          {
            name: "tags",
            type: "array",
            items: { type: "number" },
            description: "An array of tag IDs to assign to the post.",
          },
          {
            name: "featured_media",
            type: "number",
            description:
              "The ID of the featured media (image) for the post. Use wp_upload_media first to get a media ID. Set to 0 or null to remove the featured image.",
          },
        ],
        handler: this.handleCreatePost.bind(this),
      },
      {
        name: "wp_update_post",
        description: "Updates an existing WordPress post with validation and detailed confirmation.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the post to update.",
          },
          {
            name: "title",
            type: "string",
            description: "The new title for the post.",
          },
          {
            name: "content",
            type: "string",
            description: "The new content for the post, in HTML format.",
          },
          {
            name: "status",
            type: "string",
            description: "The new status for the post.",
            enum: ["publish", "draft", "pending", "private"],
          },
        ],
        handler: this.handleUpdatePost.bind(this),
      },
      {
        name: "wp_delete_post",
        description: "Deletes a WordPress post with option for permanent deletion or moving to trash.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the post to delete.",
          },
          {
            name: "force",
            type: "boolean",
            description: "If true, permanently delete. If false, move to trash. Defaults to false.",
          },
        ],
        handler: this.handleDeletePost.bind(this),
      },
      {
        name: "wp_get_post_revisions",
        description: "Retrieves the revision history for a specific post showing author and modification dates.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the post to get revisions for.",
          },
        ],
        handler: this.handleGetPostRevisions.bind(this),
      },
    ];
  }

  /**
   * Handles listing posts from a WordPress site with comprehensive filtering options.
   *
   * This method provides advanced search capabilities, status filtering, pagination,
   * and category/tag filtering. Results include enhanced metadata and author information.
   * For large result sets (>50 posts), it automatically uses streaming for better performance.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {PostQueryParams} params - Query parameters for filtering and pagination
   * @param {number} [params.per_page=10] - Number of posts to return per page (max 100)
   * @param {string} [params.search] - Search term to filter posts by title/content
   * @param {string|string[]} [params.status] - Post status filter (publish, draft, etc.)
   * @param {number[]} [params.categories] - Array of category IDs to filter by
   * @param {number[]} [params.tags] - Array of tag IDs to filter by
   * @param {number} [params.page=1] - Page number for pagination
   *
   * @returns {Promise<string>} Formatted list of posts with metadata and context
   *
   * @throws {EnhancedError} When validation fails or API request encounters an error
   *
   * @example
   * ```typescript
   * // Basic listing
   * const result = await handleListPosts(client, {});
   *
   * // Advanced filtering
   * const filtered = await handleListPosts(client, {
   *   search: "WordPress tips",
   *   status: "publish",
   *   categories: [1, 2],
   *   per_page: 20
   * });
   * ```
   *
   * @since 1.0.0
   */
  public async handleListPosts(client: WordPressClient, params: PostQueryParams): Promise<any> {
    try {
      // Enhanced input validation and sanitization
      const paginationValidated = validatePaginationParams({
        page: params.page,
        per_page: params.per_page,
        offset: params.offset,
      });

      const sanitizedParams = {
        ...params,
        ...paginationValidated,
      };

      // Validate and sanitize search term
      if (sanitizedParams.search) {
        sanitizedParams.search = sanitizedParams.search.trim();
        if (sanitizedParams.search.length === 0) {
          delete sanitizedParams.search;
        }
      }

      // Validate category and tag IDs if provided
      if (sanitizedParams.categories) {
        sanitizedParams.categories = sanitizedParams.categories.map((id) => validateId(id, "category ID"));
      }

      if (sanitizedParams.tags) {
        sanitizedParams.tags = sanitizedParams.tags.map((id) => validateId(id, "tag ID"));
      }

      // Validate status parameter
      if (sanitizedParams.status) {
        const validStatuses = ["publish", "future", "draft", "pending", "private"];
        const statusesToCheck = Array.isArray(sanitizedParams.status)
          ? sanitizedParams.status
          : [sanitizedParams.status];

        for (const statusToCheck of statusesToCheck) {
          if (!validStatuses.includes(statusToCheck)) {
            throw ErrorHandlers.validationError("status", statusToCheck, "one of: " + validStatuses.join(", "));
          }
        }
      }

      // Performance optimization: set reasonable defaults
      if (!sanitizedParams.per_page) {
        sanitizedParams.per_page = 10; // Default to 10 posts for better performance
      }

      const posts = await client.getPosts(sanitizedParams);
      if (posts.length === 0) {
        const searchInfo = sanitizedParams.search ? ` matching "${sanitizedParams.search}"` : "";
        const statusInfo = sanitizedParams.status ? ` with status "${sanitizedParams.status}"` : "";
        return `No posts found${searchInfo}${statusInfo}. Try adjusting your search criteria or check if posts exist.`;
      }

      // Use streaming for large result sets (>50 posts)
      if (posts.length > 50) {
        const streamResults: StreamingResult<any>[] = [];

        for await (const result of WordPressDataStreamer.streamPosts(posts, {
          includeAuthor: true,
          includeCategories: true,
          includeTags: true,
          batchSize: 20,
        })) {
          streamResults.push(result);
        }

        return StreamingUtils.formatStreamingResponse(streamResults, "posts");
      }

      // Add comprehensive site context information
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";
      const totalPosts = posts.length;
      const statusCounts = posts.reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Enhanced metadata
      const metadata = [
        `📊 **Posts Summary**: ${totalPosts} total`,
        `📝 **Status Breakdown**: ${Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(", ")}`,
        `🌐 **Source**: ${siteUrl}`,
        `📅 **Retrieved**: ${new Date().toLocaleString()}`,
        ...(params.search ? [`🔍 **Search Term**: "${params.search}"`] : []),
        ...(params.categories ? [`📁 **Categories**: ${params.categories.join(", ")}`] : []),
        ...(params.tags ? [`🏷️ **Tags**: ${params.tags.join(", ")}`] : []),
      ];

      // Fetch additional metadata for enhanced responses
      const authorIds = [...new Set(posts.map((p) => p.author).filter(Boolean))];
      const categoryIds = [...new Set(posts.flatMap((p) => p.categories || []))];
      const tagIds = [...new Set(posts.flatMap((p) => p.tags || []))];

      // Fetch authors, categories, and tags in parallel for better performance
      const [authors, categories, tags] = await Promise.all([
        authorIds.length > 0
          ? Promise.all(
              authorIds.map(async (id) => {
                try {
                  const user = await client.getUser(id);
                  return { id, name: user.name || user.username || `User ${id}` };
                } catch {
                  return { id, name: `User ${id}` };
                }
              }),
            )
          : [],
        categoryIds.length > 0
          ? Promise.all(
              categoryIds.map(async (id) => {
                try {
                  const category = await client.getCategory(id);
                  return { id, name: category.name || `Category ${id}` };
                } catch {
                  return { id, name: `Category ${id}` };
                }
              }),
            )
          : [],
        tagIds.length > 0
          ? Promise.all(
              tagIds.map(async (id) => {
                try {
                  const tag = await client.getTag(id);
                  return { id, name: tag.name || `Tag ${id}` };
                } catch {
                  return { id, name: `Tag ${id}` };
                }
              }),
            )
          : [],
      ]);

      // Create lookup maps for performance
      const authorMap = new Map(authors.map((a) => [a.id, a.name]));
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
      const tagMap = new Map(tags.map((t) => [t.id, t.name]));

      const content =
        metadata.join("\n") +
        "\n\n" +
        posts
          .map((p) => {
            const date = new Date(p.date);
            const formattedDate = date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const excerpt = p.excerpt?.rendered
              ? p.excerpt.rendered.replace(/<[^>]*>/g, "").substring(0, 80) + "..."
              : "";

            // Enhanced metadata
            const authorName = authorMap.get(p.author) || `User ${p.author}`;
            const postCategories = (p.categories || []).map((id) => categoryMap.get(id) || `Category ${id}`);
            const postTags = (p.tags || []).map((id) => tagMap.get(id) || `Tag ${id}`);

            let postInfo = `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n`;
            postInfo += `  👤 Author: ${authorName}\n`;
            postInfo += `  📅 Published: ${formattedDate}\n`;
            if (postCategories.length > 0) {
              postInfo += `  📁 Categories: ${postCategories.join(", ")}\n`;
            }
            if (postTags.length > 0) {
              postInfo += `  🏷️ Tags: ${postTags.join(", ")}\n`;
            }
            if (excerpt) {
              postInfo += `  📝 Excerpt: ${excerpt}\n`;
            }
            postInfo += `  🔗 Link: ${p.link}`;

            return postInfo;
          })
          .join("\n\n");

      // Add pagination guidance for large result sets
      let finalContent = content;
      if (posts.length >= (sanitizedParams.per_page || 10)) {
        finalContent += `\n\n📄 **Pagination Tip**: Use \`per_page\` parameter to control results (max 100). Current: ${sanitizedParams.per_page || 10}`;
      }

      return finalContent;
    } catch (error) {
      throw new Error(`Failed to list posts: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retrieves a single WordPress post by ID with complete details and metadata.
   *
   * This method fetches a specific post and returns comprehensive information including
   * content, metadata, author details, categories, tags, and publication status.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {Object} params - Parameters for post retrieval
   * @param {number} params.id - The unique ID of the post to retrieve
   *
   * @returns {Promise<string>} Detailed post information formatted for display
   *
   * @throws {EnhancedError} When post ID is invalid or post is not found
   *
   * @example
   * ```typescript
   * // Get a specific post
   * const post = await handleGetPost(client, { id: 123 });
   * ```
   *
   * @since 1.0.0
   */
  public async handleGetPost(client: WordPressClient, params: { id: number }): Promise<any> {
    try {
      // Input validation
      if (!params.id || typeof params.id !== "number" || params.id <= 0) {
        throw ErrorHandlers.validationError("id", params.id, "positive integer");
      }

      const post = await client.getPost(params.id);

      // Fetch additional metadata for enhanced response
      const [author, categories, tags] = await Promise.all([
        post.author
          ? (async () => {
              try {
                const user = await client.getUser(post.author);
                return user.name || user.username || `User ${post.author}`;
              } catch {
                return `User ${post.author}`;
              }
            })()
          : "Unknown",
        post.categories && post.categories.length > 0
          ? Promise.all(
              post.categories.map(async (id) => {
                try {
                  const category = await client.getCategory(id);
                  return category.name || `Category ${id}`;
                } catch {
                  return `Category ${id}`;
                }
              }),
            )
          : [],
        post.tags && post.tags.length > 0
          ? Promise.all(
              post.tags.map(async (id) => {
                try {
                  const tag = await client.getTag(id);
                  return tag.name || `Tag ${id}`;
                } catch {
                  return `Tag ${id}`;
                }
              }),
            )
          : [],
      ]);

      // Enhanced post details with comprehensive metadata
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";
      const publishedDate = new Date(post.date);
      const modifiedDate = new Date(post.modified);
      const excerpt = post.excerpt?.rendered
        ? post.excerpt.rendered.replace(/<[^>]*>/g, "").substring(0, 150) + "..."
        : "No excerpt available";
      const wordCount = post.content?.rendered ? post.content.rendered.replace(/<[^>]*>/g, "").split(/\s+/).length : 0;

      let content = `**📄 Post Details (ID: ${post.id})**\n\n`;
      content += `**📋 Basic Information:**\n`;
      content += `- **Title:** ${post.title.rendered}\n`;
      content += `- **Status:** ${post.status}\n`;
      content += `- **Type:** ${post.type}\n`;
      content += `- **Author:** ${author}\n`;
      content += `- **Slug:** ${post.slug}\n\n`;

      content += `**📅 Dates:**\n`;
      content += `- **Published:** ${publishedDate.toLocaleString()}\n`;
      content += `- **Modified:** ${modifiedDate.toLocaleString()}\n\n`;

      content += `**📊 Content:**\n`;
      content += `- **Word Count:** ~${wordCount} words\n`;
      content += `- **Excerpt:** ${excerpt}\n\n`;

      if (categories.length > 0) {
        content += `**📁 Categories:** ${categories.join(", ")}\n`;
      }
      if (tags.length > 0) {
        content += `**🏷️ Tags:** ${tags.join(", ")}\n`;
      }
      if (categories.length > 0 || tags.length > 0) {
        content += `\n`;
      }

      content += `**🔗 Links:**\n`;
      content += `- **Permalink:** ${post.link}\n`;
      content += `- **Edit Link:** ${post.link.replace(/\/$/, "")}/wp-admin/post.php?post=${post.id}&action=edit\n\n`;
      content += `**🌐 Source:** ${siteUrl}\n`;
      content += `**📅 Retrieved:** ${new Date().toLocaleString()}`;

      return content;
    } catch (error) {
      // Handle specific error cases
      const errorMessage = getErrorMessage(error);

      if (errorMessage.includes("Invalid post ID") || errorMessage.includes("not found")) {
        throw ErrorHandlers.postNotFound(params.id, error);
      }

      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        throw ErrorHandlers.authenticationFailed(error);
      }

      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        throw ErrorHandlers.permissionDenied("get post", error);
      }

      if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
        throw ErrorHandlers.connectionError(error);
      }

      // Generic error with suggestions
      throw ErrorHandlers.generic("get post", error);
    }
  }

  /**
   * Creates a new WordPress post with comprehensive validation and metadata support.
   *
   * This method handles the creation of new posts with full support for content,
   * metadata, categories, tags, and publishing options. Includes automatic validation
   * and sanitization of all input parameters.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {CreatePostRequest} params - Post creation parameters
   * @param {string} params.title - The post title
   * @param {string} params.content - The post content in HTML format
   * @param {string} [params.status="draft"] - Post status (publish, draft, pending, private)
   * @param {string} [params.excerpt] - Post excerpt/summary
   * @param {number[]} [params.categories] - Array of category IDs to assign
   * @param {number[]} [params.tags] - Array of tag IDs to assign
   *
   * @returns {Promise<string>} Success message with the new post ID and details
   *
   * @throws {EnhancedError} When validation fails or post creation encounters an error
   *
   * @example
   * ```typescript
   * // Create a basic post
   * const result = await handleCreatePost(client, {
   *   title: "My New Post",
   *   content: "<p>This is the post content.</p>",
   *   status: "publish"
   * });
   *
   * // Create post with categories and tags
   * const detailed = await handleCreatePost(client, {
   *   title: "WordPress Tips",
   *   content: "<p>Detailed WordPress tips...</p>",
   *   categories: [1, 2],
   *   tags: [5, 6],
   *   excerpt: "Learn essential WordPress tips"
   * });
   * ```
   *
   * @since 1.0.0
   */
  public async handleCreatePost(client: WordPressClient, params: CreatePostRequest): Promise<any> {
    try {
      // Enhanced input validation using new validation utilities
      const validatedParams = validatePostParams(params);

      const post = await client.createPost(validatedParams);
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";

      return (
        `✅ **Post Created Successfully!**\n\n` +
        `**📄 Post Details:**\n` +
        `- **ID:** ${post.id}\n` +
        `- **Title:** ${post.title.rendered}\n` +
        `- **Status:** ${post.status}\n` +
        `- **Link:** ${post.link}\n` +
        `- **Edit Link:** ${post.link.replace(/\/$/, "")}/wp-admin/post.php?post=${post.id}&action=edit\n\n` +
        `**🌐 Site:** ${siteUrl}\n` +
        `**📅 Created:** ${new Date().toLocaleString()}`
      );
    } catch (error) {
      if (error instanceof EnhancedError) {
        throw error;
      }
      throw new Error(`Failed to create post: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Updates an existing WordPress post with validation and detailed confirmation.
   *
   * This method allows updating any aspect of a post including title, content, status,
   * categories, and tags. Only provided fields are updated, leaving others unchanged.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {UpdatePostRequest & {id: number}} params - Update parameters
   * @param {number} params.id - The ID of the post to update
   * @param {string} [params.title] - New post title
   * @param {string} [params.content] - New post content in HTML format
   * @param {string} [params.status] - New post status (publish, draft, pending, private)
   * @param {string} [params.excerpt] - New post excerpt
   * @param {number[]} [params.categories] - New category IDs to assign
   * @param {number[]} [params.tags] - New tag IDs to assign
   *
   * @returns {Promise<string>} Success message confirming the update
   *
   * @throws {EnhancedError} When post ID is invalid or update fails
   *
   * @example
   * ```typescript
   * // Update post title and status
   * const result = await handleUpdatePost(client, {
   *   id: 123,
   *   title: "Updated Post Title",
   *   status: "publish"
   * });
   *
   * // Update content and categories
   * const updated = await handleUpdatePost(client, {
   *   id: 123,
   *   content: "<p>New content here...</p>",
   *   categories: [1, 3, 5]
   * });
   * ```
   *
   * @since 1.0.0
   */
  public async handleUpdatePost(client: WordPressClient, params: UpdatePostRequest & { id: number }): Promise<any> {
    try {
      const post = await client.updatePost(params);
      return `✅ Post ${post.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update post: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Deletes a WordPress post with options for trash or permanent deletion.
   *
   * This method provides safe deletion with trash option (default) or permanent
   * deletion when force is specified. Includes confirmation of the deletion action.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {Object} params - Deletion parameters
   * @param {number} params.id - The ID of the post to delete
   * @param {boolean} [params.force=false] - Whether to permanently delete (true) or move to trash (false)
   *
   * @returns {Promise<string>} Confirmation message of the deletion action
   *
   * @throws {EnhancedError} When post ID is invalid or deletion fails
   *
   * @example
   * ```typescript
   * // Move post to trash (safe deletion)
   * const result = await handleDeletePost(client, { id: 123 });
   *
   * // Permanently delete post (cannot be undone)
   * const permanent = await handleDeletePost(client, {
   *   id: 123,
   *   force: true
   * });
   * ```
   *
   * @since 1.0.0
   */
  public async handleDeletePost(client: WordPressClient, params: { id: number; force?: boolean }): Promise<any> {
    try {
      await client.deletePost(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return `✅ Post ${params.id} has been ${action}.`;
    } catch (error) {
      throw new Error(`Failed to delete post: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Retrieves revision history for a specific WordPress post.
   *
   * This method fetches all available revisions for a post, providing a complete
   * history of changes including dates, authors, and modification details.
   *
   * @param {WordPressClient} client - The WordPress client instance for API communication
   * @param {Object} params - Parameters for revision retrieval
   * @param {number} params.id - The ID of the post to get revisions for
   *
   * @returns {Promise<string>} Formatted list of post revisions with details
   *
   * @throws {EnhancedError} When post ID is invalid or revisions cannot be retrieved
   *
   * @example
   * ```typescript
   * // Get all revisions for a post
   * const revisions = await handleGetPostRevisions(client, { id: 123 });
   * ```
   *
   * @since 1.0.0
   */
  public async handleGetPostRevisions(client: WordPressClient, params: { id: number }): Promise<any> {
    try {
      const revisions = await client.getPostRevisions(params.id);
      if (revisions.length === 0) {
        return `No revisions found for post ${params.id}.`;
      }
      const content =
        `Found ${revisions.length} revisions for post ${params.id}:\n\n` +
        revisions
          .map((r) => `- Revision by user ID ${r.author} at ${new Date(r.modified).toLocaleString()}`)
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to get post revisions: ${getErrorMessage(error)}`);
    }
  }
}

export default PostTools;
