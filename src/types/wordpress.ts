/**
 * Core WordPress REST API Types
 *
 * Comprehensive TypeScript definitions for WordPress REST API v2 responses
 */

// WordPress metadata type - can contain various primitive values and nested objects  
export type WordPressMeta = Record<string, unknown>;

// Common WordPress API response patterns
export interface WordPressRendered {
  rendered: string;
  protected?: boolean;
}

export interface WordPressLink {
  href: string;
  embeddable?: boolean;
  templated?: boolean;
}

export interface WordPressLinks {
  self?: WordPressLink[];
  collection?: WordPressLink[];
  about?: WordPressLink[];
  author?: WordPressLink[];
  replies?: WordPressLink[];
  "version-history"?: WordPressLink[];
  "predecessor-version"?: WordPressLink[];
  "wp:attachment"?: WordPressLink[];
  "wp:term"?: WordPressLink[];
  "wp:featuredmedia"?: WordPressLink[];
  curies?: WordPressLink[];
}

// Post Types
export type PostStatus = "publish" | "future" | "draft" | "pending" | "private" | "trash" | "auto-draft" | "inherit";
export type PostFormat =
  | "standard"
  | "aside"
  | "chat"
  | "gallery"
  | "link"
  | "image"
  | "quote"
  | "status"
  | "video"
  | "audio";
export type CommentStatus = "open" | "closed";
export type PingStatus = "open" | "closed";

export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: WordPressRendered;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: PostStatus;
  type: string;
  link: string;
  title: WordPressRendered;
  content: WordPressRendered;
  excerpt: WordPressRendered;
  author: number;
  featured_media: number;
  comment_status: CommentStatus;
  ping_status: PingStatus;
  sticky: boolean;
  template: string;
  format: PostFormat;
  meta: WordPressMeta;
  categories: number[];
  tags: number[];
  _links?: WordPressLinks;
}

export interface WordPressPage {
  id: number;
  date: string;
  date_gmt: string;
  guid: WordPressRendered;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: PostStatus;
  type: string;
  link: string;
  title: WordPressRendered;
  content: WordPressRendered;
  author: number;
  excerpt: WordPressRendered;
  featured_media: number;
  comment_status: CommentStatus;
  ping_status: PingStatus;
  menu_order: number;
  meta: WordPressMeta;
  template: string;
  parent: number;
  _links?: WordPressLinks;
}

// Media Types
export type MediaType = "image" | "video" | "text" | "application" | "audio";

export interface MediaDetails {
  width?: number;
  height?: number;
  file?: string;
  filesize?: number;
  sizes?: Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }
  >;
  image_meta?: {
    aperture?: string;
    credit?: string;
    camera?: string;
    caption?: string;
    created_timestamp?: string;
    copyright?: string;
    focal_length?: string;
    iso?: string;
    shutter_speed?: string;
    title?: string;
    orientation?: string;
    keywords?: string[];
  };
}

export interface WordPressMedia {
  id: number;
  date: string;
  date_gmt: string;
  guid: WordPressRendered;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: PostStatus;
  type: string;
  link: string;
  title: WordPressRendered;
  author: number;
  comment_status: CommentStatus;
  ping_status: PingStatus;
  template: string;
  meta: WordPressMeta;
  description: WordPressRendered;
  caption: WordPressRendered;
  alt_text: string;
  media_type: MediaType;
  mime_type: string;
  media_details: MediaDetails;
  post: number | null;
  source_url: string;
  _links?: WordPressLinks;
}

// User Types
export type UserRole = "administrator" | "editor" | "author" | "contributor" | "subscriber";

export interface WordPressUser {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  url: string;
  description: string;
  link: string;
  locale: string;
  nickname: string;
  slug: string;
  roles: UserRole[];
  registered_date: string;
  capabilities: Record<string, boolean>;
  extra_capabilities: Record<string, boolean>;
  avatar_urls: Record<string, string>;
  meta: WordPressMeta;
  _links?: WordPressLinks;
}

// Comment Types
export type CommentType = "comment" | "trackback" | "pingback";

export interface WordPressComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_email: string;
  author_url: string;
  author_ip: string;
  author_user_agent: string;
  date: string;
  date_gmt: string;
  content: WordPressRendered;
  link: string;
  status: "approved" | "unapproved" | "spam" | "trash";
  type: CommentType;
  author_avatar_urls: Record<string, string>;
  meta: WordPressMeta;
  _links?: WordPressLinks;
}

// Taxonomy Types
export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: WordPressMeta;
  _links?: WordPressLinks;
}

export interface WordPressTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: WordPressMeta;
  _links?: WordPressLinks;
}

export interface WordPressTaxonomy {
  name: string;
  slug: string;
  description: string;
  types: string[];
  hierarchical: boolean;
  rest_base: string;
  rest_namespace: string;
  visibility: {
    public: boolean;
    publicly_queryable: boolean;
    show_ui: boolean;
    show_admin_column: boolean;
    show_in_nav_menus: boolean;
    show_cloud: boolean;
    show_in_quick_edit: boolean;
  };
  _links?: WordPressLinks;
}

// Site Settings Types
export interface WordPressSiteSettings {
  title: string;
  description: string;
  url: string;
  email: string;
  timezone: string;
  date_format: string;
  time_format: string;
  start_of_week: number;
  language: string;
  use_smilies: boolean;
  default_category: number;
  default_post_format: string;
  posts_per_page: number;
  default_ping_status: PingStatus;
  default_comment_status: CommentStatus;
}

// Application Password Types
export interface WordPressApplicationPassword {
  uuid: string;
  app_id: string;
  name: string;
  password?: string; // Only returned when created
  created: string;
  last_used: string | null;
  last_ip: string | null;
}

// API Request/Response Types
export interface WordPressAPIErrorResponse {
  code: string;
  message: string;
  data?: {
    status: number;
    params?: Record<string, unknown>;
    details?: Record<string, unknown>;
  };
}

// Pagination and Query Parameters
export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  order?: "asc" | "desc";
  orderby?: string;
}

export interface PostQueryParams extends PaginationParams {
  author?: number;
  author_exclude?: number[];
  before?: string;
  after?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  slug?: string[];
  status?: PostStatus[];
  categories?: number[];
  categories_exclude?: number[];
  tags?: number[];
  tags_exclude?: number[];
  sticky?: boolean;
}

export interface MediaQueryParams extends PaginationParams {
  author?: number;
  author_exclude?: number[];
  before?: string;
  after?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  parent?: number;
  parent_exclude?: number[];
  slug?: string[];
  status?: PostStatus[];
  media_type?: MediaType;
  mime_type?: string;
}

export interface UserQueryParams extends PaginationParams {
  context?: "view" | "embed" | "edit";
  exclude?: number[];
  include?: number[];
  offset?: number;
  slug?: string[];
  roles?: UserRole[];
  capabilities?: string[];
  who?: "authors";
  has_published_posts?: string[];
}

export interface CommentQueryParams extends PaginationParams {
  context?: "view" | "embed" | "edit";
  after?: string;
  author?: number[];
  author_exclude?: number[];
  author_email?: string;
  before?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  parent?: number[];
  parent_exclude?: number[];
  post?: number[];
  status?: string;
  type?: CommentType;
  password?: string;
}

// Create/Update Request Types
export interface CreatePostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: PostStatus;
  author?: number;
  featured_media?: number;
  comment_status?: CommentStatus;
  ping_status?: PingStatus;
  format?: PostFormat;
  meta?: WordPressMeta;
  sticky?: boolean;
  template?: string;
  categories?: number[];
  tags?: number[];
  date?: string;
  date_gmt?: string;
  slug?: string;
  password?: string;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: number;
}

export interface CreatePageRequest {
  title?: string;
  content?: string;
  author?: number;
  excerpt?: string;
  featured_media?: number;
  comment_status?: CommentStatus;
  ping_status?: PingStatus;
  menu_order?: number;
  meta?: WordPressMeta;
  parent?: number;
  template?: string;
  date?: string;
  date_gmt?: string;
  slug?: string;
  status?: PostStatus;
  password?: string;
}

export interface UpdatePageRequest extends Partial<CreatePageRequest> {
  id: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  slug?: string;
  description?: string;
  url?: string;
  locale?: string;
  roles?: UserRole[];
  meta?: WordPressMeta;
}

export interface UpdateUserRequest extends Partial<Omit<CreateUserRequest, "username">> {
  id: number;
}

export interface CreateCommentRequest {
  post: number;
  parent?: number;
  content: string;
  author?: number;
  author_name?: string;
  author_email?: string;
  author_url?: string;
  date?: string;
  date_gmt?: string;
  status?: "approved" | "unapproved";
  meta?: WordPressMeta;
}

export interface UpdateCommentRequest extends Partial<Omit<CreateCommentRequest, "status">> {
  id: number;
  status?: "approved" | "unapproved" | "spam" | "trash";
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  slug?: string;
  parent?: number;
  meta?: WordPressMeta;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: number;
}

export interface CreateTagRequest {
  name: string;
  description?: string;
  slug?: string;
  meta?: WordPressMeta;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {
  id: number;
}

export interface UploadMediaRequest {
  file_path: string;
  title?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  post?: number;
  status?: PostStatus;
  author?: number;
  date?: string;
  date_gmt?: string;
}

export interface UpdateMediaRequest {
  id: number;
  title?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  post?: number;
  status?: PostStatus;
  author?: number;
}

// Site Information
export interface WordPressSiteInfo {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  namespaces: string[];
  authentication: Record<string, unknown>;
  routes: Record<string, unknown>;
}

// Search Results
export interface WordPressSearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
}
