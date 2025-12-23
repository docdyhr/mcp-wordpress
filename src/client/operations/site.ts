/**
 * Site Operations Module
 * Handles site management, settings, and application passwords
 */

import type {
  WordPressSiteSettings,
  WordPressSiteInfo,
  WordPressApplicationPassword,
  WordPressSearchResult,
} from "@/types/wordpress.js";

/**
 * Interface for the base client methods needed by site operations
 */
export interface SiteClientBase {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

/**
 * Site operations mixin
 * Provides operations for WordPress site settings, info, and application passwords
 */
export class SiteOperations {
  constructor(private client: SiteClientBase) {}

  /**
   * Get site settings
   */
  async getSiteSettings(): Promise<WordPressSiteSettings> {
    return this.client.get<WordPressSiteSettings>("settings");
  }

  /**
   * Update site settings
   */
  async updateSiteSettings(settings: Partial<WordPressSiteSettings>): Promise<WordPressSiteSettings> {
    return this.client.post<WordPressSiteSettings>("settings", settings);
  }

  /**
   * Get site info (root endpoint)
   */
  async getSiteInfo(): Promise<WordPressSiteInfo> {
    return this.client.get("");
  }

  /**
   * Get application passwords for a user
   */
  async getApplicationPasswords(userId: number | "me" = "me"): Promise<WordPressApplicationPassword[]> {
    return this.client.get<WordPressApplicationPassword[]>(`users/${userId}/application-passwords`);
  }

  /**
   * Create an application password for a user
   */
  async createApplicationPassword(
    userId: number | "me",
    name: string,
    appId?: string,
  ): Promise<WordPressApplicationPassword> {
    const data: Record<string, unknown> = { name };
    if (appId) data.app_id = appId;
    return this.client.post<WordPressApplicationPassword>(`users/${userId}/application-passwords`, data);
  }

  /**
   * Delete an application password
   */
  async deleteApplicationPassword(userId: number | "me", uuid: string): Promise<{ deleted: boolean }> {
    return this.client.delete(`users/${userId}/application-passwords/${uuid}`);
  }

  /**
   * Search across WordPress content
   */
  async search(query: string, types?: string[], subtype?: string): Promise<WordPressSearchResult[]> {
    const params = new URLSearchParams({ search: query });
    if (types) params.append("type", types.join(","));
    if (subtype) params.append("subtype", subtype);

    return this.client.get<WordPressSearchResult[]>(`search?${params.toString()}`);
  }

  /**
   * Ping the site to check availability
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get("");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get server info
   */
  async getServerInfo(): Promise<Record<string, unknown>> {
    return this.client.get("");
  }
}
