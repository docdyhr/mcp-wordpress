/**
 * Enhanced Tool Types for MCP WordPress
 *
 * This file provides strongly-typed interfaces for all WordPress MCP tools,
 * replacing loose typing with precise, validated type definitions.
 */

import type {
  WordPressId,
  PostId,
  UserId,
  MediaId,
  CommentId,
  CategoryId,
  TagId,
  DeepReadonly,
  Result,
  ToolResult,
} from "./enhanced.js";

import type {
  WordPressPost,
  WordPressPage,
  WordPressUser,
  WordPressMedia,
  WordPressComment,
  WordPressCategory,
  WordPressTag,
  WordPressSiteSettings,
  PostStatus,
  PostFormat,
  CommentStatus,
  PingStatus,
  UserRole,
  MediaType,
} from "./wordpress.js";

// Base Tool Parameter Interface
export interface BaseToolParams {
  readonly site?: string;
  readonly [key: string]: unknown;
}

// Post Tool Parameters
export interface CreatePostParams extends BaseToolParams {
  readonly title: string;
  readonly content?: string;
  readonly excerpt?: string;
  readonly status?: PostStatus;
  readonly author?: UserId;
  readonly featured_media?: MediaId;
  readonly comment_status?: CommentStatus;
  readonly ping_status?: PingStatus;
  readonly format?: PostFormat;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
  readonly sticky?: boolean;
  readonly template?: string;
  readonly categories?: readonly CategoryId[];
  readonly tags?: readonly TagId[];
  readonly date?: string;
  readonly date_gmt?: string;
  readonly slug?: string;
  readonly password?: string;
}

export interface UpdatePostParams extends BaseToolParams {
  readonly id: PostId;
  readonly title?: string;
  readonly content?: string;
  readonly excerpt?: string;
  readonly status?: PostStatus;
  readonly author?: UserId;
  readonly featured_media?: MediaId;
  readonly comment_status?: CommentStatus;
  readonly ping_status?: PingStatus;
  readonly format?: PostFormat;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
  readonly sticky?: boolean;
  readonly template?: string;
  readonly categories?: readonly CategoryId[];
  readonly tags?: readonly TagId[];
  readonly date?: string;
  readonly date_gmt?: string;
  readonly slug?: string;
  readonly password?: string;
}

export interface GetPostParams extends BaseToolParams {
  readonly id: PostId;
  readonly context?: "view" | "embed" | "edit";
  readonly password?: string;
}

export interface ListPostsParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?:
    | "author"
    | "date"
    | "id"
    | "include"
    | "modified"
    | "parent"
    | "relevance"
    | "slug"
    | "include_slugs"
    | "title";
  readonly author?: UserId;
  readonly author_exclude?: readonly UserId[];
  readonly before?: string;
  readonly after?: string;
  readonly exclude?: readonly PostId[];
  readonly include?: readonly PostId[];
  readonly offset?: number;
  readonly slug?: readonly string[];
  readonly status?: readonly PostStatus[];
  readonly categories?: readonly CategoryId[];
  readonly categories_exclude?: readonly CategoryId[];
  readonly tags?: readonly TagId[];
  readonly tags_exclude?: readonly TagId[];
  readonly sticky?: boolean;
}

export interface DeletePostParams extends BaseToolParams {
  readonly id: PostId;
  readonly force?: boolean;
}

// Page Tool Parameters
export interface CreatePageParams extends BaseToolParams {
  readonly title: string;
  readonly content?: string;
  readonly author?: UserId;
  readonly excerpt?: string;
  readonly featured_media?: MediaId;
  readonly comment_status?: CommentStatus;
  readonly ping_status?: PingStatus;
  readonly menu_order?: number;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
  readonly parent?: PostId;
  readonly template?: string;
  readonly date?: string;
  readonly date_gmt?: string;
  readonly slug?: string;
  readonly status?: PostStatus;
  readonly password?: string;
}

export interface UpdatePageParams extends Partial<CreatePageParams> {
  readonly id: PostId;
}

export interface GetPageParams extends BaseToolParams {
  readonly id: PostId;
  readonly context?: "view" | "embed" | "edit";
  readonly password?: string;
}

export interface ListPagesParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?:
    | "author"
    | "date"
    | "id"
    | "include"
    | "modified"
    | "parent"
    | "relevance"
    | "slug"
    | "include_slugs"
    | "title"
    | "menu_order";
  readonly author?: UserId;
  readonly author_exclude?: readonly UserId[];
  readonly before?: string;
  readonly after?: string;
  readonly exclude?: readonly PostId[];
  readonly include?: readonly PostId[];
  readonly offset?: number;
  readonly slug?: readonly string[];
  readonly status?: readonly PostStatus[];
  readonly parent?: PostId;
  readonly parent_exclude?: readonly PostId[];
  readonly menu_order?: number;
}

export interface DeletePageParams extends BaseToolParams {
  readonly id: PostId;
  readonly force?: boolean;
}

// User Tool Parameters
export interface CreateUserParams extends BaseToolParams {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly name?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly nickname?: string;
  readonly slug?: string;
  readonly description?: string;
  readonly url?: string;
  readonly locale?: string;
  readonly roles?: readonly UserRole[];
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface UpdateUserParams extends BaseToolParams {
  readonly id: UserId;
  readonly email?: string;
  readonly password?: string;
  readonly name?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly nickname?: string;
  readonly slug?: string;
  readonly description?: string;
  readonly url?: string;
  readonly locale?: string;
  readonly roles?: readonly UserRole[];
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface GetUserParams extends BaseToolParams {
  readonly id: UserId | "me";
  readonly context?: "view" | "embed" | "edit";
}

export interface ListUsersParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?: "id" | "include" | "name" | "registered_date" | "slug" | "include_slugs" | "email" | "url";
  readonly exclude?: readonly UserId[];
  readonly include?: readonly UserId[];
  readonly offset?: number;
  readonly slug?: readonly string[];
  readonly roles?: readonly UserRole[];
  readonly capabilities?: readonly string[];
  readonly who?: "authors";
  readonly has_published_posts?: readonly string[];
}

export interface DeleteUserParams extends BaseToolParams {
  readonly id: UserId;
  readonly force?: boolean;
  readonly reassign?: UserId;
}

// Media Tool Parameters
export interface UploadMediaParams extends BaseToolParams {
  readonly file_path: string;
  readonly title?: string;
  readonly alt_text?: string;
  readonly caption?: string;
  readonly description?: string;
  readonly post?: PostId;
  readonly status?: PostStatus;
  readonly author?: UserId;
  readonly date?: string;
  readonly date_gmt?: string;
}

export interface UpdateMediaParams extends BaseToolParams {
  readonly id: MediaId;
  readonly title?: string;
  readonly alt_text?: string;
  readonly caption?: string;
  readonly description?: string;
  readonly post?: PostId;
  readonly status?: PostStatus;
  readonly author?: UserId;
}

export interface GetMediaParams extends BaseToolParams {
  readonly id: MediaId;
  readonly context?: "view" | "embed" | "edit";
}

export interface ListMediaParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?:
    | "author"
    | "date"
    | "id"
    | "include"
    | "modified"
    | "parent"
    | "relevance"
    | "slug"
    | "include_slugs"
    | "title";
  readonly author?: UserId;
  readonly author_exclude?: readonly UserId[];
  readonly before?: string;
  readonly after?: string;
  readonly exclude?: readonly MediaId[];
  readonly include?: readonly MediaId[];
  readonly offset?: number;
  readonly parent?: PostId;
  readonly parent_exclude?: readonly PostId[];
  readonly slug?: readonly string[];
  readonly status?: readonly PostStatus[];
  readonly media_type?: MediaType;
  readonly mime_type?: string;
}

export interface DeleteMediaParams extends BaseToolParams {
  readonly id: MediaId;
  readonly force?: boolean;
}

// Comment Tool Parameters
export interface CreateCommentParams extends BaseToolParams {
  readonly post: PostId;
  readonly parent?: CommentId;
  readonly content: string;
  readonly author?: UserId;
  readonly author_name?: string;
  readonly author_email?: string;
  readonly author_url?: string;
  readonly date?: string;
  readonly date_gmt?: string;
  readonly status?: "approved" | "unapproved";
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface UpdateCommentParams extends BaseToolParams {
  readonly id: CommentId;
  readonly post?: PostId;
  readonly parent?: CommentId;
  readonly content?: string;
  readonly author?: UserId;
  readonly author_name?: string;
  readonly author_email?: string;
  readonly author_url?: string;
  readonly date?: string;
  readonly date_gmt?: string;
  readonly status?: "approved" | "unapproved" | "spam" | "trash";
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface GetCommentParams extends BaseToolParams {
  readonly id: CommentId;
  readonly context?: "view" | "embed" | "edit";
  readonly password?: string;
}

export interface ListCommentsParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?: "date" | "date_gmt" | "id" | "include" | "post" | "parent" | "type";
  readonly after?: string;
  readonly author?: readonly UserId[];
  readonly author_exclude?: readonly UserId[];
  readonly author_email?: string;
  readonly before?: string;
  readonly exclude?: readonly CommentId[];
  readonly include?: readonly CommentId[];
  readonly offset?: number;
  readonly parent?: readonly CommentId[];
  readonly parent_exclude?: readonly CommentId[];
  readonly post?: readonly PostId[];
  readonly status?: "approved" | "unapproved" | "spam" | "trash" | "hold" | "all";
  readonly type?: "comment" | "trackback" | "pingback";
  readonly password?: string;
}

export interface DeleteCommentParams extends BaseToolParams {
  readonly id: CommentId;
  readonly force?: boolean;
}

export interface ModerateCommentParams extends BaseToolParams {
  readonly id: CommentId;
  readonly status: "approved" | "unapproved" | "spam" | "trash";
}

// Taxonomy Tool Parameters
export interface CreateCategoryParams extends BaseToolParams {
  readonly name: string;
  readonly description?: string;
  readonly slug?: string;
  readonly parent?: CategoryId;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface UpdateCategoryParams extends BaseToolParams {
  readonly id: CategoryId;
  readonly name?: string;
  readonly description?: string;
  readonly slug?: string;
  readonly parent?: CategoryId;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface GetCategoryParams extends BaseToolParams {
  readonly id: CategoryId;
  readonly context?: "view" | "embed" | "edit";
}

export interface ListCategoriesParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?: "id" | "include" | "name" | "slug" | "include_slugs" | "term_group" | "description" | "count";
  readonly exclude?: readonly CategoryId[];
  readonly include?: readonly CategoryId[];
  readonly hide_empty?: boolean;
  readonly parent?: CategoryId;
  readonly post?: PostId;
  readonly slug?: readonly string[];
}

export interface DeleteCategoryParams extends BaseToolParams {
  readonly id: CategoryId;
  readonly force?: boolean;
}

export interface CreateTagParams extends BaseToolParams {
  readonly name: string;
  readonly description?: string;
  readonly slug?: string;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface UpdateTagParams extends BaseToolParams {
  readonly id: TagId;
  readonly name?: string;
  readonly description?: string;
  readonly slug?: string;
  readonly meta?: DeepReadonly<Record<string, unknown>>;
}

export interface GetTagParams extends BaseToolParams {
  readonly id: TagId;
  readonly context?: "view" | "embed" | "edit";
}

export interface ListTagsParams extends BaseToolParams {
  readonly context?: "view" | "embed" | "edit";
  readonly page?: number;
  readonly per_page?: number;
  readonly search?: string;
  readonly order?: "asc" | "desc";
  readonly orderby?: "id" | "include" | "name" | "slug" | "include_slugs" | "term_group" | "description" | "count";
  readonly exclude?: readonly TagId[];
  readonly include?: readonly TagId[];
  readonly hide_empty?: boolean;
  readonly post?: PostId;
  readonly slug?: readonly string[];
}

export interface DeleteTagParams extends BaseToolParams {
  readonly id: TagId;
  readonly force?: boolean;
}

// Site Management Tool Parameters
export interface GetSiteSettingsParams extends BaseToolParams {}

export interface UpdateSiteSettingsParams extends BaseToolParams {
  readonly title?: string;
  readonly description?: string;
  readonly url?: string;
  readonly email?: string;
  readonly timezone?: string;
  readonly date_format?: string;
  readonly time_format?: string;
  readonly start_of_week?: number;
  readonly language?: string;
  readonly use_smilies?: boolean;
  readonly default_category?: CategoryId;
  readonly default_post_format?: string;
  readonly posts_per_page?: number;
  readonly default_ping_status?: PingStatus;
  readonly default_comment_status?: CommentStatus;
}

export interface GetSiteInfoParams extends BaseToolParams {}

// Search Tool Parameters
export interface SearchParams extends BaseToolParams {
  readonly query: string;
  readonly type?: readonly ("post" | "page" | "attachment" | "user" | "comment")[];
  readonly subtype?: readonly string[];
  readonly include?: readonly WordPressId[];
  readonly exclude?: readonly WordPressId[];
  readonly per_page?: number;
  readonly page?: number;
}

// Authentication Tool Parameters
export interface TestAuthParams extends BaseToolParams {}

export interface GetCurrentUserParams extends BaseToolParams {}

export interface CreateAppPasswordParams extends BaseToolParams {
  readonly user_id: UserId | "me";
  readonly name: string;
  readonly app_id?: string;
}

export interface DeleteAppPasswordParams extends BaseToolParams {
  readonly user_id: UserId | "me";
  readonly uuid: string;
}

// Cache Tool Parameters
export interface GetCacheStatsParams extends BaseToolParams {}

export interface ClearCacheParams extends BaseToolParams {
  readonly pattern?: string;
  readonly namespace?: string;
}

export interface WarmCacheParams extends BaseToolParams {
  readonly endpoints?: readonly string[];
}

export interface GetCacheInfoParams extends BaseToolParams {}

// Performance Tool Parameters
export interface GetPerformanceMetricsParams extends BaseToolParams {
  readonly timeframe?: "1h" | "24h" | "7d" | "30d";
  readonly metrics?: readonly ("response_time" | "error_rate" | "cache_hit_rate" | "throughput")[];
}

export interface GetPerformanceReportParams extends BaseToolParams {
  readonly format?: "json" | "csv" | "html";
  readonly include_recommendations?: boolean;
}

// Tool Result Types
export interface PostToolResult extends ToolResult<WordPressPost> {}
export interface PageToolResult extends ToolResult<WordPressPage> {}
export interface UserToolResult extends ToolResult<WordPressUser> {}
export interface MediaToolResult extends ToolResult<WordPressMedia> {}
export interface CommentToolResult extends ToolResult<WordPressComment> {}
export interface CategoryToolResult extends ToolResult<WordPressCategory> {}
export interface TagToolResult extends ToolResult<WordPressTag> {}
export interface SiteSettingsToolResult extends ToolResult<WordPressSiteSettings> {}

export interface ListToolResult<T> extends ToolResult<readonly T[]> {
  readonly pagination?: {
    readonly page: number;
    readonly per_page: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

export interface DeleteToolResult
  extends ToolResult<{
    readonly deleted: boolean;
    readonly previous?: unknown;
  }> {}

export interface SearchToolResult
  extends ToolResult<
    readonly {
      readonly id: number;
      readonly title: string;
      readonly url: string;
      readonly type: string;
      readonly subtype: string;
    }[]
  > {}

// Tool Handler Type Definitions
export type PostToolHandler<TParams extends BaseToolParams, TResult = PostToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type PageToolHandler<TParams extends BaseToolParams, TResult = PageToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type UserToolHandler<TParams extends BaseToolParams, TResult = UserToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type MediaToolHandler<TParams extends BaseToolParams, TResult = MediaToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type CommentToolHandler<TParams extends BaseToolParams, TResult = CommentToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type CategoryToolHandler<TParams extends BaseToolParams, TResult = CategoryToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type TagToolHandler<TParams extends BaseToolParams, TResult = TagToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

export type SiteToolHandler<TParams extends BaseToolParams, TResult = SiteSettingsToolResult> = (
  params: DeepReadonly<TParams>,
) => Promise<TResult>;

// Tool Registry Types
export interface ToolDefinition<TParams extends BaseToolParams = BaseToolParams, TResult = ToolResult> {
  readonly name: string;
  readonly description: string;
  readonly category:
    | "posts"
    | "pages"
    | "users"
    | "media"
    | "comments"
    | "taxonomies"
    | "site"
    | "auth"
    | "cache"
    | "performance";
  readonly handler: (params: DeepReadonly<TParams>) => Promise<TResult>;
  readonly schema: {
    readonly type: "object";
    readonly properties: DeepReadonly<Record<string, unknown>>;
    readonly required: readonly string[];
    readonly additionalProperties: false;
  };
}

export interface ToolRegistry {
  readonly [toolName: string]: ToolDefinition;
}

// Tool Validation Types
export interface ToolValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly sanitized?: unknown;
}

export interface ToolValidator<TParams extends BaseToolParams> {
  readonly validate: (params: unknown) => Result<TParams, Error>;
  readonly schema: ToolDefinition["schema"];
}
