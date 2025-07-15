import { WordPressClient } from "../client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";
import { ErrorHandlers, EnhancedError } from "../utils/enhancedError.js";

/**
 * Provides tools for managing posts on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class PostTools {
  /**
   * Retrieves the list of post management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): any[] {
    return [
      {
        name: "wp_list_posts",
        description:
          "Lists posts from a WordPress site with comprehensive filtering options. Supports search, status filtering, and category/tag filtering with enhanced metadata display.",
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
          "Creates a new WordPress post with comprehensive validation and detailed success feedback including management links.",
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

  public async handleListPosts(client: WordPressClient, params: PostQueryParams): Promise<any> {
    try {
      // Input validation and sanitization
      const sanitizedParams = { ...params };

      // Validate per_page parameter
      if (sanitizedParams.per_page) {
        if (sanitizedParams.per_page < 1) {
          sanitizedParams.per_page = 1;
        } else if (sanitizedParams.per_page > 100) {
          sanitizedParams.per_page = 100;
        }
      }

      // Validate and sanitize search term
      if (sanitizedParams.search) {
        sanitizedParams.search = sanitizedParams.search.trim();
        if (sanitizedParams.search.length === 0) {
          delete sanitizedParams.search;
        }
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
            return `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n  📅 Published: ${formattedDate}\n  🔗 Link: ${p.link}${excerpt ? `\n  📝 Excerpt: ${excerpt}` : ""}`;
          })
          .join("\n");

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

  public async handleGetPost(client: WordPressClient, params: { id: number }): Promise<any> {
    try {
      // Input validation
      if (!params.id || typeof params.id !== "number" || params.id <= 0) {
        throw ErrorHandlers.validationError("id", params.id, "positive integer");
      }

      const post = await client.getPost(params.id);
      // Enhanced post details with comprehensive metadata
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";
      const publishedDate = new Date(post.date);
      const modifiedDate = new Date(post.modified);
      const excerpt = post.excerpt?.rendered
        ? post.excerpt.rendered.replace(/<[^>]*>/g, "").substring(0, 150) + "..."
        : "No excerpt available";
      const wordCount = post.content?.rendered ? post.content.rendered.replace(/<[^>]*>/g, "").split(/\s+/).length : 0;

      const content =
        `**📄 Post Details (ID: ${post.id})**\n\n` +
        `**📋 Basic Information:**\n` +
        `- **Title:** ${post.title.rendered}\n` +
        `- **Status:** ${post.status}\n` +
        `- **Type:** ${post.type}\n` +
        `- **Author ID:** ${post.author}\n` +
        `- **Slug:** ${post.slug}\n\n` +
        `**📅 Dates:**\n` +
        `- **Published:** ${publishedDate.toLocaleString()}\n` +
        `- **Modified:** ${modifiedDate.toLocaleString()}\n\n` +
        `**📊 Content:**\n` +
        `- **Word Count:** ~${wordCount} words\n` +
        `- **Excerpt:** ${excerpt}\n\n` +
        `**🔗 Links:**\n` +
        `- **Permalink:** ${post.link}\n` +
        `- **Edit Link:** ${post.link.replace(/\/$/, "")}/wp-admin/post.php?post=${post.id}&action=edit\n\n` +
        `**🌐 Source:** ${siteUrl}\n` +
        `**📅 Retrieved:** ${new Date().toLocaleString()}`;
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

  public async handleCreatePost(client: WordPressClient, params: CreatePostRequest): Promise<any> {
    try {
      // Input validation
      if (!params.title || typeof params.title !== "string" || params.title.trim().length === 0) {
        throw ErrorHandlers.validationError("title", params.title, "non-empty string");
      }

      // Sanitize title
      const sanitizedParams = { ...params };
      if (sanitizedParams.title) {
        sanitizedParams.title = sanitizedParams.title.trim();
      }

      // Validate status if provided
      if (sanitizedParams.status) {
        const validStatuses = ["publish", "draft", "pending", "private"];
        if (!validStatuses.includes(sanitizedParams.status)) {
          throw ErrorHandlers.validationError("status", sanitizedParams.status, "one of: " + validStatuses.join(", "));
        }
      }

      const post = await client.createPost(sanitizedParams);
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

  public async handleUpdatePost(client: WordPressClient, params: UpdatePostRequest & { id: number }): Promise<any> {
    try {
      const post = await client.updatePost(params);
      return `✅ Post ${post.id} updated successfully.`;
    } catch (error) {
      throw new Error(`Failed to update post: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeletePost(client: WordPressClient, params: { id: number; force?: boolean }): Promise<any> {
    try {
      await client.deletePost(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return `✅ Post ${params.id} has been ${action}.`;
    } catch (error) {
      throw new Error(`Failed to delete post: ${getErrorMessage(error)}`);
    }
  }

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
