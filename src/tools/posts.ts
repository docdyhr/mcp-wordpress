/**
 * WordPress Posts Tools
 * 
 * MCP tools for managing WordPress posts using typed interfaces
 */

import type {
  MCPTool,
  MCPToolHandlerWithClient,
  MCPToolResponse,
  MCPSuccessResponse,
  MCPErrorResponse
} from '../types/mcp.js';
import type {
  IWordPressClient,
  WordPressPost,
  PostQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
  PostStatus
} from '../types/index.js';
import { debug, logError, startTimer } from '../utils/debug.js';

// Tool Input Types
interface ListPostsArgs extends PostQueryParams {}

interface GetPostArgs {
  id: number;
  context?: 'view' | 'embed' | 'edit';
}

interface CreatePostArgs extends CreatePostRequest {}

interface UpdatePostArgs extends UpdatePostRequest {}

interface DeletePostArgs {
  id: number;
  force?: boolean;
}

interface GetPostRevisionsArgs {
  id: number;
}

// Helper function to create success response
const createSuccessResponse = (text: string): MCPSuccessResponse => ({
  content: [{ type: 'text', text }],
  isError: false
});

// Helper function to create error response
const createErrorResponse = (error: string | Error): MCPErrorResponse => ({
  content: [{ 
    type: 'text', 
    text: typeof error === 'string' ? error : error.message 
  }],
  isError: true
});

// Helper function to format post info
const formatPostInfo = (post: WordPressPost): string => {
  const date = new Date(post.date).toLocaleDateString();
  const categories = post.categories?.length ? ` | Categories: ${post.categories.join(', ')}` : '';
  const tags = post.tags?.length ? ` | Tags: ${post.tags.join(', ')}` : '';
  
  return `**${post.title.rendered}** (ID: ${post.id})\n` +
         `Status: ${post.status} | Author: ${post.author} | Date: ${date}${categories}${tags}\n` +
         `Slug: ${post.slug}\n` +
         `Link: ${post.link}\n` +
         (post.excerpt.rendered ? `**Excerpt:** ${post.excerpt.rendered.replace(/<[^>]*>/g, '').trim()}\n` : '') +
         '---';
};

/**
 * List WordPress posts with optional filtering
 */
export const listPosts: MCPTool = {
  name: 'wp_list_posts',
  description: 'List WordPress posts with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number for pagination (default: 1)',
        minimum: 1
      },
      per_page: {
        type: 'number',
        description: 'Number of posts per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter posts'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private', 'trash'],
        description: 'Filter posts by status'
      },
      author: {
        type: 'number',
        description: 'Filter posts by author ID'
      },
      categories: {
        type: 'array',
        items: { type: 'number' },
        description: 'Filter posts by category IDs'
      },
      tags: {
        type: 'array',
        items: { type: 'number' },
        description: 'Filter posts by tag IDs'
      },
      orderby: {
        type: 'string',
        enum: ['date', 'id', 'include', 'title', 'slug', 'modified', 'menu_order'],
        description: 'Sort posts by field (default: date)'
      },
      order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order (default: desc)'
      }
    }
  }
};

/**
 * Get a specific WordPress post by ID
 */
export const getPost: MCPTool = {
  name: 'wp_get_post',
  description: 'Get a specific WordPress post by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Post ID',
        minimum: 1
      },
      context: {
        type: 'string',
        enum: ['view', 'embed', 'edit'],
        description: 'Scope of the request (default: view)'
      }
    },
    required: ['id']
  }
};

/**
 * Create a new WordPress post
 */
export const createPost: MCPTool = {
  name: 'wp_create_post',
  description: 'Create a new WordPress post',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Post title'
      },
      content: {
        type: 'string',
        description: 'Post content (HTML)'
      },
      excerpt: {
        type: 'string',
        description: 'Post excerpt'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Post status (default: draft)'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      },
      featured_media: {
        type: 'number',
        description: 'Featured media ID'
      },
      categories: {
        type: 'array',
        items: { type: 'number' },
        description: 'Category IDs'
      },
      tags: {
        type: 'array',
        items: { type: 'number' },
        description: 'Tag IDs'
      },
      meta: {
        type: 'object',
        description: 'Post meta fields'
      },
      sticky: {
        type: 'boolean',
        description: 'Whether post is sticky'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date (ISO 8601)'
      },
      slug: {
        type: 'string',
        description: 'Post slug'
      }
    }
  }
};

/**
 * Update an existing WordPress post
 */
export const updatePost: MCPTool = {
  name: 'wp_update_post',
  description: 'Update an existing WordPress post',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Post ID',
        minimum: 1
      },
      title: {
        type: 'string',
        description: 'Post title'
      },
      content: {
        type: 'string',
        description: 'Post content (HTML)'
      },
      excerpt: {
        type: 'string',
        description: 'Post excerpt'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Post status'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      },
      featured_media: {
        type: 'number',
        description: 'Featured media ID'
      },
      categories: {
        type: 'array',
        items: { type: 'number' },
        description: 'Category IDs'
      },
      tags: {
        type: 'array',
        items: { type: 'number' },
        description: 'Tag IDs'
      },
      meta: {
        type: 'object',
        description: 'Post meta fields'
      },
      sticky: {
        type: 'boolean',
        description: 'Whether post is sticky'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date (ISO 8601)'
      },
      slug: {
        type: 'string',
        description: 'Post slug'
      }
    },
    required: ['id']
  }
};

/**
 * Delete a WordPress post
 */
export const deletePost: MCPTool = {
  name: 'wp_delete_post',
  description: 'Delete a WordPress post',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Post ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Whether to permanently delete (true) or move to trash (false)',
        default: false
      }
    },
    required: ['id']
  }
};

/**
 * Get post revisions
 */
export const getPostRevisions: MCPTool = {
  name: 'wp_get_post_revisions',
  description: 'Get revision history for a WordPress post',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Post ID',
        minimum: 1
      }
    },
    required: ['id']
  }
};

// Tool Handlers

export const handleListPosts: MCPToolHandlerWithClient<IWordPressClient, ListPostsArgs> = async (
  client: IWordPressClient,
  args: ListPostsArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('List Posts');
  
  try {
    debug.log('Listing posts with args:', args);
    
    const posts = await client.getPosts(args);
    
    if (posts.length === 0) {
      return createSuccessResponse('No posts found matching the criteria.');
    }
    
    const postsList = posts.map(formatPostInfo).join('\n');
    const summary = `Found ${posts.length} post${posts.length === 1 ? '' : 's'}:\n\n${postsList}`;
    
    timer.endWithLog();
    return createSuccessResponse(summary);
    
  } catch (error) {
    logError(error as Error, { operation: 'list_posts', args });
    timer.end();
    return createErrorResponse(`Failed to list posts: ${(error as Error).message}`);
  }
};

export const handleGetPost: MCPToolHandlerWithClient<IWordPressClient, GetPostArgs> = async (
  client: IWordPressClient,
  args: GetPostArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Get Post');
  
  try {
    if (!args.id) {
      return createErrorResponse('Post ID is required');
    }
    
    debug.log('Getting post with ID:', args.id);
    
    const post = await client.getPost(args.id, args.context);
    
    const contentPreview = post.content.rendered.length > 200 
      ? post.content.rendered.substring(0, 200) + '...'
      : post.content.rendered;
    
    const result = `**${post.title.rendered}** (ID: ${post.id})\n\n` +
                   `**Status:** ${post.status}\n` +
                   `**Author:** ${post.author}\n` +
                   `**Date:** ${new Date(post.date).toLocaleString()}\n` +
                   `**Modified:** ${new Date(post.modified).toLocaleString()}\n` +
                   `**Slug:** ${post.slug}\n` +
                   `**Link:** ${post.link}\n` +
                   `**Categories:** ${post.categories.join(', ') || 'None'}\n` +
                   `**Tags:** ${post.tags.join(', ') || 'None'}\n` +
                   `**Featured Media:** ${post.featured_media || 'None'}\n` +
                   `**Comment Status:** ${post.comment_status}\n` +
                   `**Sticky:** ${post.sticky ? 'Yes' : 'No'}\n\n` +
                   (post.excerpt.rendered ? `**Excerpt:**\n${post.excerpt.rendered}\n\n` : '') +
                   `**Content Preview:**\n${contentPreview.replace(/<[^>]*>/g, '')}`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'get_post', args });
    timer.end();
    return createErrorResponse(`Failed to get post: ${(error as Error).message}`);
  }
};

export const handleCreatePost: MCPToolHandlerWithClient<IWordPressClient, CreatePostArgs> = async (
  client: IWordPressClient,
  args: CreatePostArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Create Post');
  
  try {
    debug.log('Creating post with data:', { title: args.title, status: args.status });
    
    const post = await client.createPost(args);
    
    const result = `✅ **Post created successfully!**\n\n` +
                   `**Title:** ${post.title.rendered}\n` +
                   `**ID:** ${post.id}\n` +
                   `**Status:** ${post.status}\n` +
                   `**Slug:** ${post.slug}\n` +
                   `**Link:** ${post.link}\n` +
                   `**Date:** ${new Date(post.date).toLocaleString()}\n\n` +
                   `The post has been created and is now available in your WordPress admin.`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'create_post', args });
    timer.end();
    return createErrorResponse(`Failed to create post: ${(error as Error).message}`);
  }
};

export const handleUpdatePost: MCPToolHandlerWithClient<IWordPressClient, UpdatePostArgs> = async (
  client: IWordPressClient,
  args: UpdatePostArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Update Post');
  
  try {
    if (!args.id) {
      return createErrorResponse('Post ID is required for update');
    }
    
    debug.log('Updating post with ID:', args.id);
    
    const post = await client.updatePost(args);
    
    const result = `✅ **Post updated successfully!**\n\n` +
                   `**Title:** ${post.title.rendered}\n` +
                   `**ID:** ${post.id}\n` +
                   `**Status:** ${post.status}\n` +
                   `**Slug:** ${post.slug}\n` +
                   `**Link:** ${post.link}\n` +
                   `**Modified:** ${new Date(post.modified).toLocaleString()}\n\n` +
                   `The post has been updated successfully.`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
    
  } catch (error) {
    logError(error as Error, { operation: 'update_post', args });
    timer.end();
    return createErrorResponse(`Failed to update post: ${(error as Error).message}`);
  }
};

export const handleDeletePost: MCPToolHandlerWithClient<IWordPressClient, DeletePostArgs> = async (
  client: IWordPressClient,
  args: DeletePostArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Delete Post');
  
  try {
    if (!args.id) {
      return createErrorResponse('Post ID is required for deletion');
    }
    
    debug.log('Deleting post with ID:', args.id, 'force:', args.force);
    
    const result = await client.deletePost(args.id, args.force);
    
    const actionText = args.force ? 'permanently deleted' : 'moved to trash';
    const responseText = `✅ **Post ${actionText} successfully!**\n\n` +
                        `**Post ID:** ${args.id}\n` +
                        (result.previous ? `**Title:** ${result.previous.title.rendered}\n` : '') +
                        `**Action:** ${actionText}\n\n` +
                        (args.force 
                          ? 'The post has been permanently deleted and cannot be recovered.'
                          : 'The post has been moved to trash and can be restored from the WordPress admin.');
    
    timer.endWithLog();
    return createSuccessResponse(responseText);
    
  } catch (error) {
    logError(error as Error, { operation: 'delete_post', args });
    timer.end();
    return createErrorResponse(`Failed to delete post: ${(error as Error).message}`);
  }
};

export const handleGetPostRevisions: MCPToolHandlerWithClient<IWordPressClient, GetPostRevisionsArgs> = async (
  client: IWordPressClient,
  args: GetPostRevisionsArgs
): Promise<MCPToolResponse> => {
  const timer = startTimer('Get Post Revisions');
  
  try {
    if (!args.id) {
      return createErrorResponse('Post ID is required');
    }
    
    debug.log('Getting revisions for post ID:', args.id);
    
    const revisions = await client.getPostRevisions(args.id);
    
    if (revisions.length === 0) {
      return createSuccessResponse('No revisions found for this post.');
    }
    
    const revisionsList = revisions.map((revision, index) => {
      const date = new Date(revision.modified).toLocaleString();
      return `**Revision ${index + 1}** (ID: ${revision.id})\n` +
             `Date: ${date}\n` +
             `Author: ${revision.author}\n` +
             `Title: ${revision.title.rendered}`;
    }).join('\n\n');
    
    const summary = `Found ${revisions.length} revision${revisions.length === 1 ? '' : 's'} for post ID ${args.id}:\n\n${revisionsList}`;
    
    timer.endWithLog();
    return createSuccessResponse(summary);
    
  } catch (error) {
    logError(error as Error, { operation: 'get_post_revisions', args });
    timer.end();
    return createErrorResponse(`Failed to get post revisions: ${(error as Error).message}`);
  }
};