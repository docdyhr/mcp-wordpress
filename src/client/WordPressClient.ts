/**
 * Refactored WordPress API Client
 * Uses composition pattern with specialized managers
 */

import type {
  IWordPressClient,
  WordPressClientConfig,
  ClientStats,
} from "../types/client.js";
import { AuthenticationManager } from "./managers/AuthenticationManager.js";
import { RequestManager } from "./managers/RequestManager.js";
import { debug } from "../utils/debug.js";

// Import all WordPress types
import type {
  WordPressPost,
  WordPressPage,
  WordPressMedia,
  WordPressUser,
  WordPressComment,
  WordPressCategory,
  WordPressTag,
  WordPressSiteSettings,
  WordPressApplicationPassword,
  PostQueryParams,
  MediaQueryParams,
  UserQueryParams,
  CommentQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTagRequest,
  UpdateTagRequest,
  UploadMediaRequest,
  UpdateMediaRequest,
} from "../types/wordpress.js";

export class WordPressClient implements IWordPressClient {
  private authManager: AuthenticationManager;
  private requestManager: RequestManager;
  private clientConfig: WordPressClientConfig;

  constructor(options: Partial<WordPressClientConfig> = {}) {
    // Build configuration
    this.clientConfig = this.buildConfig(options);
    
    // Initialize managers
    this.authManager = new AuthenticationManager(this.clientConfig);
    this.requestManager = new RequestManager(this.clientConfig);
    
    // Validate configuration
    this.validateConfig();
    
    debug.log("WordPress API Client initialized for:", this.clientConfig.baseUrl);
  }

  // Configuration Management
  get config(): WordPressClientConfig {
    return { ...this.clientConfig };
  }

  get isAuthenticated(): boolean {
    return this.authManager.isAuthenticated();
  }

  get stats(): ClientStats {
    return this.requestManager.getStats();
  }

  // Core Methods required by interface
  async initialize(): Promise<void> {
    // Initialization logic if needed
    debug.log("WordPress client initialized");
  }

  async authenticate(): Promise<boolean> {
    return this.authManager.authenticate();
  }

  async disconnect(): Promise<void> {
    debug.log("WordPress client disconnected");
  }

  // Generic HTTP Methods
  async request<T = any>(method: any, endpoint: string, data?: any, options: any = {}): Promise<T> {
    return this.requestManager.request<T>(method, endpoint, data, options);
  }

  async get<T = any>(endpoint: string, options: any = {}): Promise<T> {
    return this.requestManager.request<T>('GET', endpoint, undefined, options);
  }

  async post<T = any>(endpoint: string, data?: any, options: any = {}): Promise<T> {
    return this.requestManager.request<T>('POST', endpoint, data, options);
  }

  async put<T = any>(endpoint: string, data?: any, options: any = {}): Promise<T> {
    return this.requestManager.request<T>('PUT', endpoint, data, options);
  }

  async patch<T = any>(endpoint: string, data?: any, options: any = {}): Promise<T> {
    return this.requestManager.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T = any>(endpoint: string, options: any = {}): Promise<T> {
    return this.requestManager.request<T>('DELETE', endpoint, undefined, options);
  }

  // Authentication Methods
  async testAuthentication(): Promise<{ success: boolean; user?: WordPressUser }> {
    try {
      const user = await this.getCurrentUser();
      return { success: true, user };
    } catch (error) {
      return { success: false };
    }
  }

  // Generic HTTP Methods with Authentication
  private async authenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const authHeaders = await this.authManager.getAuthHeaders();
    
    return this.requestManager.request<T>(method, endpoint, data, {
      headers: authHeaders
    });
  }

  // Posts API
  async getPosts(params?: PostQueryParams): Promise<WordPressPost[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.authenticatedRequest<WordPressPost[]>('GET', `posts${queryString}`);
  }

  async getPost(id: number): Promise<WordPressPost> {
    return this.authenticatedRequest<WordPressPost>('GET', `posts/${id}`);
  }

  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    return this.authenticatedRequest<WordPressPost>('POST', 'posts', data);
  }

  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressPost>('PUT', `posts/${id}`, updateData);
  }

  async deletePost(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    return this.authenticatedRequest('DELETE', `posts/${id}?force=${force}`);
  }

  async getPostRevisions(id: number): Promise<WordPressPost[]> {
    return this.authenticatedRequest<WordPressPost[]>('GET', `posts/${id}/revisions`);
  }

  // Pages API
  async getPages(params?: any): Promise<WordPressPage[]> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.authenticatedRequest<WordPressPage[]>('GET', `pages${queryString}`);
  }

  async getPage(id: number): Promise<WordPressPage> {
    return this.authenticatedRequest<WordPressPage>('GET', `pages/${id}`);
  }

  async createPage(data: CreatePageRequest): Promise<WordPressPage> {
    return this.authenticatedRequest<WordPressPage>('POST', 'pages', data);
  }

  async updatePage(data: UpdatePageRequest): Promise<WordPressPage> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressPage>('PUT', `pages/${id}`, updateData);
  }

  async deletePage(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPage }> {
    return this.authenticatedRequest('DELETE', `pages/${id}?force=${force}`);
  }

  async getPageRevisions(id: number): Promise<WordPressPage[]> {
    return this.authenticatedRequest<WordPressPage[]>('GET', `pages/${id}/revisions`);
  }

  // Media API
  async getMedia(params?: MediaQueryParams): Promise<WordPressMedia[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.authenticatedRequest<WordPressMedia[]>('GET', `media${queryString}`);
  }

  async getMediaItem(id: number, context: 'view' | 'embed' | 'edit' = 'view'): Promise<WordPressMedia> {
    return this.authenticatedRequest<WordPressMedia>('GET', `media/${id}?context=${context}`);
  }

  async uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia> {
    return this.authenticatedRequest<WordPressMedia>('POST', 'media', data);
  }

  async uploadFile(fileData: Buffer, filename: string, mimeType: string, meta: Partial<UploadMediaRequest> = {}, options: any = {}): Promise<WordPressMedia> {
    const data = { ...meta, file: fileData, filename, mime_type: mimeType };
    return this.authenticatedRequest<WordPressMedia>('POST', 'media', data);
  }

  async updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressMedia>('PUT', `media/${id}`, updateData);
  }

  async deleteMedia(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressMedia }> {
    return this.authenticatedRequest('DELETE', `media/${id}?force=${force}`);
  }

  // Users API
  async getUsers(params?: UserQueryParams): Promise<WordPressUser[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.authenticatedRequest<WordPressUser[]>('GET', `users${queryString}`);
  }

  async getUser(id: number | string): Promise<WordPressUser> {
    return this.authenticatedRequest<WordPressUser>('GET', `users/${id}`);
  }

  async getCurrentUser(): Promise<WordPressUser> {
    return this.authenticatedRequest<WordPressUser>('GET', 'users/me');
  }

  async createUser(data: CreateUserRequest): Promise<WordPressUser> {
    return this.authenticatedRequest<WordPressUser>('POST', 'users', data);
  }

  async updateUser(data: UpdateUserRequest): Promise<WordPressUser> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressUser>('PUT', `users/${id}`, updateData);
  }

  async deleteUser(id: number, reassign?: number): Promise<{ deleted: boolean; previous?: WordPressUser }> {
    const queryString = reassign ? `?reassign=${reassign}&force=true` : "?force=true";
    return this.authenticatedRequest('DELETE', `users/${id}${queryString}`);
  }

  // Comments API
  async getComments(params?: CommentQueryParams): Promise<WordPressComment[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.authenticatedRequest<WordPressComment[]>('GET', `comments${queryString}`);
  }

  async getComment(id: number, context: 'view' | 'embed' | 'edit' = 'view'): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('GET', `comments/${id}?context=${context}`);
  }

  async createComment(data: CreateCommentRequest): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('POST', 'comments', data);
  }

  async updateComment(data: UpdateCommentRequest): Promise<WordPressComment> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressComment>('PUT', `comments/${id}`, updateData);
  }

  async deleteComment(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressComment }> {
    return this.authenticatedRequest('DELETE', `comments/${id}?force=${force}`);
  }

  async approveComment(id: number): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('POST', `comments/${id}`, { status: 'approved' });
  }

  async rejectComment(id: number): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('POST', `comments/${id}`, { status: 'hold' });
  }

  async spamComment(id: number): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('POST', `comments/${id}`, { status: 'spam' });
  }

  // Taxonomies - Categories
  async getCategories(params: any = {}): Promise<WordPressCategory[]> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.authenticatedRequest<WordPressCategory[]>('GET', `categories${queryString}`);
  }

  async getCategory(id: number): Promise<WordPressCategory> {
    return this.authenticatedRequest<WordPressCategory>('GET', `categories/${id}`);
  }

  async createCategory(data: CreateCategoryRequest): Promise<WordPressCategory> {
    return this.authenticatedRequest<WordPressCategory>('POST', 'categories', data);
  }

  async updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressCategory>('PUT', `categories/${id}`, updateData);
  }

  async deleteCategory(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressCategory }> {
    return this.authenticatedRequest('DELETE', `categories/${id}?force=${force}`);
  }

  // Taxonomies - Tags
  async getTags(params: any = {}): Promise<WordPressTag[]> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.authenticatedRequest<WordPressTag[]>('GET', `tags${queryString}`);
  }

  async getTag(id: number): Promise<WordPressTag> {
    return this.authenticatedRequest<WordPressTag>('GET', `tags/${id}`);
  }

  async createTag(data: CreateTagRequest): Promise<WordPressTag> {
    return this.authenticatedRequest<WordPressTag>('POST', 'tags', data);
  }

  async updateTag(data: UpdateTagRequest): Promise<WordPressTag> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressTag>('PUT', `tags/${id}`, updateData);
  }

  async deleteTag(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressTag }> {
    return this.authenticatedRequest('DELETE', `tags/${id}?force=${force}`);
  }

  async updateMedia(data: UpdateMediaRequest): Promise<WordPressMedia> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressMedia>('PUT', `media/${id}`, updateData);
  }

  async deleteMedia(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressMedia }> {
    return this.authenticatedRequest('DELETE', `media/${id}?force=${force}`);
  }

  // Upload methods would need special handling for multipart/form-data
  async uploadMedia(data: UploadMediaRequest): Promise<WordPressMedia> {
    // This would need special implementation for file uploads
    throw new Error("Upload methods need special multipart handling - not implemented in refactored version yet");
  }

  // Comments API
  async getComments(params?: CommentQueryParams): Promise<WordPressComment[]> {
    const queryString = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return this.authenticatedRequest<WordPressComment[]>('GET', `comments${queryString}`);
  }

  async getComment(id: number): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('GET', `comments/${id}`);
  }

  async createComment(data: CreateCommentRequest): Promise<WordPressComment> {
    return this.authenticatedRequest<WordPressComment>('POST', 'comments', data);
  }

  async updateComment(data: UpdateCommentRequest): Promise<WordPressComment> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressComment>('PUT', `comments/${id}`, updateData);
  }

  async deleteComment(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressComment }> {
    return this.authenticatedRequest('DELETE', `comments/${id}?force=${force}`);
  }

  // Categories API
  async getCategories(params?: any): Promise<WordPressCategory[]> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.authenticatedRequest<WordPressCategory[]>('GET', `categories${queryString}`);
  }

  async getCategory(id: number): Promise<WordPressCategory> {
    return this.authenticatedRequest<WordPressCategory>('GET', `categories/${id}`);
  }

  async createCategory(data: CreateCategoryRequest): Promise<WordPressCategory> {
    return this.authenticatedRequest<WordPressCategory>('POST', 'categories', data);
  }

  async updateCategory(data: UpdateCategoryRequest): Promise<WordPressCategory> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressCategory>('PUT', `categories/${id}`, updateData);
  }

  async deleteCategory(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressCategory }> {
    return this.authenticatedRequest('DELETE', `categories/${id}?force=${force}`);
  }

  // Tags API
  async getTags(params?: any): Promise<WordPressTag[]> {
    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    return this.authenticatedRequest<WordPressTag[]>('GET', `tags${queryString}`);
  }

  async getTag(id: number): Promise<WordPressTag> {
    return this.authenticatedRequest<WordPressTag>('GET', `tags/${id}`);
  }

  async createTag(data: CreateTagRequest): Promise<WordPressTag> {
    return this.authenticatedRequest<WordPressTag>('POST', 'tags', data);
  }

  async updateTag(data: UpdateTagRequest): Promise<WordPressTag> {
    const { id, ...updateData } = data;
    return this.authenticatedRequest<WordPressTag>('PUT', `tags/${id}`, updateData);
  }

  async deleteTag(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressTag }> {
    return this.authenticatedRequest('DELETE', `tags/${id}?force=${force}`);
  }

  // Site Management
  async getSiteSettings(): Promise<WordPressSiteSettings> {
    return this.authenticatedRequest<WordPressSiteSettings>('GET', 'settings');
  }

  async updateSiteSettings(settings: Partial<WordPressSiteSettings>): Promise<WordPressSiteSettings> {
    return this.authenticatedRequest<WordPressSiteSettings>('POST', 'settings', settings);
  }

  async getSiteInfo(): Promise<any> {
    return this.requestManager.request('GET', '/');
  }

  // Application Passwords
  async getApplicationPasswords(userId: number): Promise<WordPressApplicationPassword[]> {
    return this.authenticatedRequest<WordPressApplicationPassword[]>('GET', `users/${userId}/application-passwords`);
  }

  async createApplicationPassword(userId: number | 'me', name: string, appId?: string): Promise<WordPressApplicationPassword> {
    const data = { name, ...(appId && { app_id: appId }) };
    return this.authenticatedRequest<WordPressApplicationPassword>('POST', `users/${userId}/application-passwords`, data);
  }

  async deleteApplicationPassword(userId: number, uuid: string): Promise<{ deleted: boolean }> {
    return this.authenticatedRequest('DELETE', `users/${userId}/application-passwords/${uuid}`);
  }

  // Search
  async search(query: string, types?: string[], subtype?: string): Promise<Array<{
    id: number;
    title: string;
    url: string;
    type: string;
    subtype: string;
  }>> {
    const params: any = { search: query };
    if (types) params.type = types.join(',');
    if (subtype) params.subtype = subtype;
    
    const queryString = "?" + new URLSearchParams(params).toString();
    return this.authenticatedRequest('GET', `search${queryString}`);
  }

  // Utility Methods
  async ping(): Promise<boolean> {
    try {
      await this.requestManager.request('GET', '/');
      return true;
    } catch {
      return false;
    }
  }

  // Private Methods
  private buildConfig(options: Partial<WordPressClientConfig>): WordPressClientConfig {
    return {
      baseUrl: options.baseUrl || process.env.WORDPRESS_SITE_URL || "",
      auth: options.auth || AuthenticationManager.getAuthFromEnv(),
      timeout: options.timeout || parseInt(process.env.WORDPRESS_TIMEOUT || "30000"),
      maxRetries: options.maxRetries || parseInt(process.env.WORDPRESS_MAX_RETRIES || "3"),
    };
  }

  private validateConfig(): void {
    if (!this.clientConfig.baseUrl) {
      throw new Error("WordPress site URL is required");
    }

    if (!this.clientConfig.baseUrl.startsWith("http")) {
      throw new Error("WordPress site URL must include protocol (http:// or https://)");
    }

    this.authManager.validateAuthConfig();
  }
}