import { WordPressClient } from "../client/api.js";
import { CreatePostRequest, PostQueryParams, UpdatePostRequest } from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

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
        description: "Lists posts from a WordPress site, with filters.",
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
        description: "Retrieves a single post by its ID.",
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
        description: "Creates a new post.",
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
        description: "Updates an existing post.",
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
        description: "Deletes a post.",
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
        description: "Retrieves revisions for a specific post.",
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
      const posts = await client.getPosts(params);
      if (posts.length === 0) {
        return "No posts found matching the criteria.";
      }

      // Add site context information
      const siteUrl = client.getSiteUrl ? client.getSiteUrl() : "Unknown site";

      const content =
        `Found ${posts.length} posts from ${siteUrl}:\n\n` +
        posts
          .map((p) => {
            const date = new Date(p.date);
            const formattedDate = date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return `- ID ${p.id}: **${p.title.rendered}** (${p.status})\n  Published: ${formattedDate}\n  Link: ${p.link}`;
          })
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list posts: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetPost(client: WordPressClient, params: { id: number }): Promise<any> {
    try {
      const post = await client.getPost(params.id);
      const content =
        `**Post Details (ID: ${post.id})**\n\n` +
        `- **Title:** ${post.title.rendered}\n` +
        `- **Status:** ${post.status}\n` +
        `- **Link:** ${post.link}\n` +
        `- **Date:** ${new Date(post.date).toLocaleString()}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get post: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreatePost(client: WordPressClient, params: CreatePostRequest): Promise<any> {
    try {
      const post = await client.createPost(params);
      return `✅ Post created successfully!\n- ID: ${post.id}\n- Title: ${post.title.rendered}\n- Link: ${post.link}`;
    } catch (error) {
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
