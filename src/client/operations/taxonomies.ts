/**
 * Taxonomies Operations Module
 * Handles all taxonomy-related WordPress REST API operations (categories, tags)
 */

import type {
  WordPressCategory,
  WordPressTag,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagRequest,
  UpdateTagRequest,
} from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by taxonomies operations
 */
export interface TaxonomiesClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Taxonomies operations mixin
 * Provides CRUD operations for WordPress categories and tags
 */
export class TaxonomiesOperations {
  constructor(private client: TaxonomiesClientBase) {}

  // Categories

  /**
   * Get a list of categories with optional filtering
   */
  async getCategories(params?: Record<string, string | number | boolean>): Promise<WordPressCategory[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressCategory[]>(`categories${queryString}`);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<WordPressCategory> {
    return this.client.get<WordPressCategory>(`categories/${id}`);
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryRequest): Promise<WordPressCategory> {
    return this.client.post<WordPressCategory>("categories", data);
  }

  /**
   * Update an existing category
   */
  async updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressCategory>(`categories/${id}`, updateData);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressCategory }> {
    return this.client.delete(`categories/${id}?force=${force}`);
  }

  // Tags

  /**
   * Get a list of tags with optional filtering
   */
  async getTags(params?: Record<string, string | number | boolean>): Promise<WordPressTag[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressTag[]>(`tags${queryString}`);
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: number): Promise<WordPressTag> {
    return this.client.get<WordPressTag>(`tags/${id}`);
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagRequest): Promise<WordPressTag> {
    return this.client.post<WordPressTag>("tags", data);
  }

  /**
   * Update an existing tag
   */
  async updateTag(data: UpdateTagRequest): Promise<WordPressTag> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressTag>(`tags/${id}`, updateData);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressTag }> {
    return this.client.delete(`tags/${id}?force=${force}`);
  }
}
