/**
 * Comments Operations Module
 * Handles all comment-related WordPress REST API operations
 */

import type {
  WordPressComment,
  CommentQueryParams,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by comments operations
 */
export interface CommentsClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Comments operations mixin
 * Provides CRUD operations for WordPress comments
 */
export class CommentsOperations {
  constructor(private client: CommentsClientBase) {}

  /**
   * Get a list of comments with optional filtering
   */
  async getComments(params?: CommentQueryParams): Promise<WordPressComment[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressComment[]>(`comments${queryString}`);
  }

  /**
   * Get a single comment by ID
   */
  async getComment(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressComment> {
    return this.client.get<WordPressComment>(`comments/${id}?context=${context}`);
  }

  /**
   * Create a new comment
   */
  async createComment(data: CreateCommentRequest): Promise<WordPressComment> {
    return this.client.post<WordPressComment>("comments", data);
  }

  /**
   * Update an existing comment
   */
  async updateComment(data: UpdateCommentRequest): Promise<WordPressComment> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressComment>(`comments/${id}`, updateData);
  }

  /**
   * Delete a comment
   */
  async deleteComment(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressComment }> {
    return this.client.delete(`comments/${id}?force=${force}`);
  }

  /**
   * Approve a comment
   */
  async approveComment(id: number): Promise<WordPressComment> {
    return this.client.put<WordPressComment>(`comments/${id}`, {
      status: "approved",
    });
  }

  /**
   * Reject/unapprove a comment
   */
  async rejectComment(id: number): Promise<WordPressComment> {
    return this.client.put<WordPressComment>(`comments/${id}`, {
      status: "unapproved",
    });
  }

  /**
   * Mark a comment as spam
   */
  async spamComment(id: number): Promise<WordPressComment> {
    return this.client.put<WordPressComment>(`comments/${id}`, {
      status: "spam",
    });
  }
}
