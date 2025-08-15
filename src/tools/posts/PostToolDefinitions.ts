/**
 * WordPress Posts Tool Definitions
 *
 * Defines all MCP tool schemas for WordPress post management.
 * This module separates tool definitions from their implementations
 * for better maintainability and testing.
 */

import type { MCPTool } from "../../types/mcp.js";

/**
 * Tool definition for listing WordPress posts
 */
export const listPostsTool: MCPTool = {
  name: "wp_list_posts",
  description:
    "Lists posts from a WordPress site with comprehensive filtering options. Supports search, status filtering, and category/tag filtering with enhanced metadata display.\n\n" +
    "**Usage Examples:**\n" +
    "• Basic listing: `wp_list_posts`\n" +
    '• Search posts: `wp_list_posts --search="AI trends"`\n' +
    '• Filter by status: `wp_list_posts --status="draft"`\n' +
    "• Category filtering: `wp_list_posts --categories=[1,2,3]`\n" +
    "• Paginated results: `wp_list_posts --per_page=20 --page=2`\n" +
    '• Combined filters: `wp_list_posts --search="WordPress" --status="publish" --per_page=10`',
  inputSchema: {
    type: "object",
    properties: {
      per_page: {
        type: "number",
        description: "Number of items to return per page (max 100).",
      },
      search: {
        type: "string",
        description: "Limit results to those matching a search term.",
      },
      status: {
        type: "string",
        description: "Filter by post status.",
        enum: ["publish", "future", "draft", "pending", "private"],
      },
      categories: {
        type: "array",
        items: { type: "number" },
        description: "Limit results to posts in specific category IDs.",
      },
      tags: {
        type: "array",
        items: { type: "number" },
        description: "Limit results to posts with specific tag IDs.",
      },
    },
  },
};

/**
 * Tool definition for retrieving a single WordPress post
 */
export const getPostTool: MCPTool = {
  name: "wp_get_post",
  description:
    "Retrieves detailed information about a single post including metadata, content statistics, and management links.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "The unique identifier for the post.",
      },
    },
    required: ["id"],
  },
};

/**
 * Tool definition for creating a new WordPress post
 */
export const createPostTool: MCPTool = {
  name: "wp_create_post",
  description:
    "Creates a new WordPress post with comprehensive validation and detailed success feedback including management links.\n\n" +
    "**Usage Examples:**\n" +
    '• Simple post: `wp_create_post --title="My New Post" --content="<p>Hello World!</p>"`\n' +
    '• Draft post: `wp_create_post --title="Draft Post" --status="draft"`\n' +
    '• Categorized post: `wp_create_post --title="Tech News" --categories=[1,5] --tags=[10,20]`\n' +
    '• Post with featured image: `wp_create_post --title="My Post" --content="<p>Content</p>" --featured_media=42`\n' +
    '• Remove featured image: `wp_create_post --title="My Post" --featured_media=0`\n' +
    '• Scheduled post: `wp_create_post --title="Future Post" --status="future" --date="2024-12-25T10:00:00"`\n' +
    '• Complete post: `wp_create_post --title="Complete Post" --content="<p>Content</p>" --excerpt="Summary" --status="publish"`',
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title for the post.",
      },
      content: {
        type: "string",
        description: "The content for the post, in HTML format.",
      },
      status: {
        type: "string",
        description: "The publishing status for the post.",
        enum: ["publish", "draft", "pending", "private"],
      },
      excerpt: {
        type: "string",
        description: "The excerpt for the post.",
      },
      categories: {
        type: "array",
        items: { type: "number" },
        description: "An array of category IDs to assign to the post.",
      },
      tags: {
        type: "array",
        items: { type: "number" },
        description: "An array of tag IDs to assign to the post.",
      },
      featured_media: {
        type: "number",
        description: "The ID of the featured media (image). Use 0 to remove featured media.",
      },
      date: {
        type: "string",
        description: "The date the post was published, in the site's timezone (ISO 8601 format).",
      },
    },
    required: ["title"],
  },
};

/**
 * Tool definition for updating an existing WordPress post
 */
export const updatePostTool: MCPTool = {
  name: "wp_update_post",
  description:
    "Updates an existing WordPress post with comprehensive validation and change tracking. All parameters except ID are optional - only provided fields will be updated.\n\n" +
    "**Usage Examples:**\n" +
    '• Update title: `wp_update_post --id=123 --title="New Title"`\n' +
    '• Update content: `wp_update_post --id=123 --content="<p>Updated content</p>"`\n' +
    '• Change status: `wp_update_post --id=123 --status="publish"`\n' +
    "• Update categories: `wp_update_post --id=123 --categories=[1,5,10]`\n" +
    "• Set featured image: `wp_update_post --id=123 --featured_media=42`\n" +
    "• Remove featured image: `wp_update_post --id=123 --featured_media=0`\n" +
    '• Multiple updates: `wp_update_post --id=123 --title="New Title" --status="publish" --categories=[1,2]`',
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "The ID of the post to update.",
      },
      title: {
        type: "string",
        description: "The new title for the post.",
      },
      content: {
        type: "string",
        description: "The new content for the post, in HTML format.",
      },
      status: {
        type: "string",
        description: "The new publishing status for the post.",
        enum: ["publish", "draft", "pending", "private"],
      },
      excerpt: {
        type: "string",
        description: "The new excerpt for the post.",
      },
      categories: {
        type: "array",
        items: { type: "number" },
        description: "An array of category IDs to assign to the post.",
      },
      tags: {
        type: "array",
        items: { type: "number" },
        description: "An array of tag IDs to assign to the post.",
      },
      featured_media: {
        type: "number",
        description: "The ID of the featured media (image). Use 0 to remove featured media.",
      },
      date: {
        type: "string",
        description: "The date the post was published, in the site's timezone (ISO 8601 format).",
      },
    },
    required: ["id"],
  },
};

/**
 * Tool definition for deleting a WordPress post
 */
export const deletePostTool: MCPTool = {
  name: "wp_delete_post",
  description:
    "Deletes a WordPress post with options for trash or permanent deletion. Includes safety confirmations and detailed feedback on the deletion action.\n\n" +
    "**Usage Examples:**\n" +
    "• Trash a post: `wp_delete_post --id=123` (moves to trash)\n" +
    "• Permanent deletion: `wp_delete_post --id=123 --force=true`\n" +
    "• Bulk operations: Use multiple calls with different IDs",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "The ID of the post to delete.",
      },
      force: {
        type: "boolean",
        description: "Whether to bypass trash and force deletion (default: false, moves to trash).",
      },
    },
    required: ["id"],
  },
};

/**
 * Tool definition for retrieving post revisions
 */
export const getPostRevisionsTool: MCPTool = {
  name: "wp_get_post_revisions",
  description:
    "Retrieves the revision history for a specific post, including details about changes, dates, and authors for content management and auditing purposes.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "The ID of the post to get revisions for.",
      },
    },
    required: ["id"],
  },
};

/**
 * Collection of all post tool definitions
 */
export const postToolDefinitions = [
  listPostsTool,
  getPostTool,
  createPostTool,
  updatePostTool,
  deletePostTool,
  getPostRevisionsTool,
];
