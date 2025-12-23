/**
 * Operations Module Index
 * Re-exports all domain-specific operations for the WordPress API client
 */

export { PostsOperations, type PostsClientBase } from "./posts.js";
export { PagesOperations, type PagesClientBase } from "./pages.js";
export { MediaOperations, type MediaClientBase } from "./media.js";
export { UsersOperations, type UsersClientBase } from "./users.js";
export { CommentsOperations, type CommentsClientBase } from "./comments.js";
export { TaxonomiesOperations, type TaxonomiesClientBase } from "./taxonomies.js";
export { SiteOperations, type SiteClientBase } from "./site.js";
