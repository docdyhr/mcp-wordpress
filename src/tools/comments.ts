import { WordPressClient } from "../client/api.js";
import {
  CommentQueryParams,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../types/wordpress.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides tools for managing comments on a WordPress site.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class CommentTools {
  /**
   * Retrieves the list of comment management tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): any[] {
    return [
      {
        name: "wp_list_comments",
        description: "Lists comments from a WordPress site, with filters.",
        parameters: [
          {
            name: "post",
            type: "number",
            description:
              "Limit results to comments assigned to a specific post ID.",
          },
          {
            name: "status",
            type: "string",
            description: "Filter by comment status.",
            enum: ["hold", "approve", "spam", "trash"],
          },
        ],
        handler: this.handleListComments.bind(this),
      },
      {
        name: "wp_get_comment",
        description: "Retrieves a single comment by its ID.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The unique identifier for the comment.",
          },
        ],
        handler: this.handleGetComment.bind(this),
      },
      {
        name: "wp_create_comment",
        description: "Creates a new comment on a post.",
        parameters: [
          {
            name: "post",
            type: "number",
            required: true,
            description: "The ID of the post to comment on.",
          },
          {
            name: "content",
            type: "string",
            required: true,
            description: "The content of the comment.",
          },
          {
            name: "author_name",
            type: "string",
            description: "The name of the comment author.",
          },
          {
            name: "author_email",
            type: "string",
            description: "The email of the comment author.",
          },
        ],
        handler: this.handleCreateComment.bind(this),
      },
      {
        name: "wp_update_comment",
        description: "Updates an existing comment.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the comment to update.",
          },
          {
            name: "content",
            type: "string",
            description: "The updated content for the comment.",
          },
          {
            name: "status",
            type: "string",
            description: "The new status for the comment.",
            enum: ["hold", "approve", "spam", "trash"],
          },
        ],
        handler: this.handleUpdateComment.bind(this),
      },
      {
        name: "wp_delete_comment",
        description: "Deletes a comment.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the comment to delete.",
          },
          {
            name: "force",
            type: "boolean",
            description:
              "If true, the comment will be permanently deleted. Defaults to false (moved to trash).",
          },
        ],
        handler: this.handleDeleteComment.bind(this),
      },
      {
        name: "wp_approve_comment",
        description: "Approves a pending comment.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the comment to approve.",
          },
        ],
        handler: this.handleApproveComment.bind(this),
      },
      {
        name: "wp_spam_comment",
        description: "Marks a comment as spam.",
        parameters: [
          {
            name: "id",
            type: "number",
            required: true,
            description: "The ID of the comment to mark as spam.",
          },
        ],
        handler: this.handleSpamComment.bind(this),
      },
    ];
  }

  public async handleListComments(
    client: WordPressClient,
    params: CommentQueryParams,
  ): Promise<any> {
    try {
      const comments = await client.getComments(params);
      if (comments.length === 0) {
        return "No comments found matching the criteria.";
      }
      const content =
        `Found ${comments.length} comments:\n\n` +
        comments
          .map(
            (c) =>
              `- ID ${c.id}: By **${c.author_name}** on Post ${c.post} (${c.status})\n  > ${c.content.rendered.substring(0, 100)}...`,
          )
          .join("\n");
      return content;
    } catch (error) {
      throw new Error(`Failed to list comments: ${getErrorMessage(error)}`);
    }
  }

  public async handleGetComment(
    client: WordPressClient,
    params: { id: number },
  ): Promise<any> {
    try {
      const comment = await client.getComment(params.id);
      const content =
        `**Comment Details (ID: ${comment.id})**\n\n` +
        `- **Author:** ${comment.author_name}\n` +
        `- **Post ID:** ${comment.post}\n` +
        `- **Date:** ${new Date(comment.date).toLocaleString()}\n` +
        `- **Status:** ${comment.status}\n` +
        `- **Content:** ${comment.content.rendered}`;
      return content;
    } catch (error) {
      throw new Error(`Failed to get comment: ${getErrorMessage(error)}`);
    }
  }

  public async handleCreateComment(
    client: WordPressClient,
    params: CreateCommentRequest,
  ): Promise<any> {
    try {
      const comment = await client.createComment(params);
      return `✅ Comment created successfully with ID: ${comment.id}`;
    } catch (error) {
      throw new Error(`Failed to create comment: ${getErrorMessage(error)}`);
    }
  }

  public async handleUpdateComment(
    client: WordPressClient,
    params: UpdateCommentRequest & { id: number },
  ): Promise<any> {
    try {
      const comment = await client.updateComment(params);
      return `✅ Comment ${comment.id} updated successfully. New status: ${comment.status}.`;
    } catch (error) {
      throw new Error(`Failed to update comment: ${getErrorMessage(error)}`);
    }
  }

  public async handleDeleteComment(
    client: WordPressClient,
    params: { id: number; force?: boolean },
  ): Promise<any> {
    try {
      await client.deleteComment(params.id, params.force);
      const action = params.force ? "permanently deleted" : "moved to trash";
      return `✅ Comment ${params.id} has been ${action}.`;
    } catch (error) {
      throw new Error(`Failed to delete comment: ${getErrorMessage(error)}`);
    }
  }

  public async handleApproveComment(
    client: WordPressClient,
    params: { id: number },
  ): Promise<any> {
    try {
      const comment = await client.updateComment({
        id: params.id,
        status: "approved",
      });
      return `✅ Comment ${comment.id} has been approved.`;
    } catch (error) {
      throw new Error(`Failed to approve comment: ${getErrorMessage(error)}`);
    }
  }

  public async handleSpamComment(
    client: WordPressClient,
    params: { id: number },
  ): Promise<any> {
    try {
      const comment = await client.updateComment({
        id: params.id,
        status: "spam",
      });
      return `✅ Comment ${comment.id} has been marked as spam.`;
    } catch (error) {
      throw new Error(
        `Failed to mark comment as spam: ${getErrorMessage(error)}`,
      );
    }
  }
}

export default CommentTools;
