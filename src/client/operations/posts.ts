/**
 * Posts Operations Module
 * Handles all post-related WordPress REST API operations
 */

import type { WordPressPost, PostQueryParams, CreatePostRequest, UpdatePostRequest } from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by posts operations
 */
export interface PostsClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Posts operations mixin
 * Provides CRUD operations for WordPress posts
 */
export class PostsOperations {
  constructor(private client: PostsClientBase) {}

  /**
   * Get a list of posts with optional filtering
   */
  async getPosts(params?: PostQueryParams): Promise<WordPressPost[]> {
    const queryString = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return this.client.get<WordPressPost[]>(`posts${queryString}`);
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPost> {
    return this.client.get<WordPressPost>(`posts/${id}?context=${context}`);
  }

  /**
   * Create a new post
   */
  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    return this.client.post<WordPressPost>("posts", data);
  }

  /**
   * Update an existing post
   */
  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressPost>(`posts/${id}`, updateData);
  }

  /**
   * Delete a post
   */
  async deletePost(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    return this.client.delete(`posts/${id}?force=${force}`);
  }

  /**
   * Get post revisions
   */
  async getPostRevisions(id: number): Promise<WordPressPost[]> {
    return this.client.get<WordPressPost[]>(`posts/${id}/revisions`);
  }
}
