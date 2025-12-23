/**
 * Users Operations Module
 * Handles all user-related WordPress REST API operations
 */

import type { WordPressUser, UserQueryParams, CreateUserRequest, UpdateUserRequest } from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by users operations
 */
export interface UsersClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Users operations mixin
 * Provides CRUD operations for WordPress users
 */
export class UsersOperations {
  constructor(private client: UsersClientBase) {}

  /**
   * Get a list of users with optional filtering
   */
  async getUsers(params?: UserQueryParams): Promise<WordPressUser[]> {
    const normalizedParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      : undefined;
    const queryString = normalizedParams ? "?" + new URLSearchParams(normalizedParams).toString() : "";
    return this.client.get<WordPressUser[]>(`users${queryString}`);
  }

  /**
   * Get a single user by ID or "me" for current user
   */
  async getUser(id: number | "me", context: "view" | "embed" | "edit" = "view"): Promise<WordPressUser> {
    return this.client.get<WordPressUser>(`users/${id}?context=${context}`);
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<WordPressUser> {
    return this.client.post<WordPressUser>("users", data);
  }

  /**
   * Update an existing user
   */
  async updateUser(data: UpdateUserRequest): Promise<WordPressUser> {
    const { id, ...updateData } = data;
    return this.client.put<WordPressUser>(`users/${id}`, updateData);
  }

  /**
   * Delete a user
   */
  async deleteUser(id: number, reassign?: number): Promise<{ deleted: boolean; previous?: WordPressUser }> {
    const params = reassign ? `?reassign=${reassign}&force=true` : "?force=true";
    return this.client.delete(`users/${id}${params}`);
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<WordPressUser> {
    return this.getUser("me", "edit");
  }
}
