/**
 * Pages Operations Module
 * Handles all page-related WordPress REST API operations
 */

import type { WordPressPage, PostQueryParams, CreatePageRequest, UpdatePageRequest } from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by pages operations
 */
export interface PagesClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Pages operations mixin
 * Provides CRUD operations for WordPress pages
 */
export class PagesOperations {
  constructor(private client: PagesClientBase) {}

  /**
   * Get a list of pages with optional filtering
   */
  async getPages(params?: PostQueryParams): Promise<WordPressPage[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressPage[]>(`pages${queryString}`);
  }

  /**
   * Get a single page by ID
   */
  async getPage(id: number, context: "view" | "embed" | "edit" = "view"): Promise<WordPressPage> {
    return this.client.get<WordPressPage>(`pages/${id}?context=${context}`);
  }

  /**
   * Create a new page
   */
  async createPage(data: CreatePageRequest): Promise<WordPressPage> {
    return this.client.post<WordPressPage>("pages", data);
  }

  /**
   * Update an existing page
   */
  async updatePage(data: UpdatePageRequest): Promise<WordPressPage> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressPage>(`pages/${id}`, updateData);
  }

  /**
   * Delete a page
   */
  async deletePage(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPage }> {
    return this.client.delete(`pages/${id}?force=${force}`);
  }

  /**
   * Get page revisions
   */
  async getPageRevisions(id: number): Promise<WordPressPage[]> {
    return this.client.get<WordPressPage[]>(`pages/${id}/revisions`);
  }
}
