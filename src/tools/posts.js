import { debug } from '../utils/debug.js';

/**
 * List WordPress posts with optional filtering
 */
export const listPosts = {
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
export const getPost = {
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
export const createPost = {
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
        description: 'Featured image media ID'
      },
      categories: {
        type: 'array',
        items: { type: 'number' },
        description: 'Array of category IDs'
      },
      tags: {
        type: 'array',
        items: { type: 'number' },
        description: 'Array of tag IDs'
      },
      slug: {
        type: 'string',
        description: 'Post slug (URL-friendly name)'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date in ISO 8601 format'
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date in UTC'
      },
      password: {
        type: 'string',
        description: 'Password to protect the post'
      },
      sticky: {
        type: 'boolean',
        description: 'Whether the post is sticky'
      },
      format: {
        type: 'string',
        enum: ['standard', 'aside', 'chat', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio'],
        description: 'Post format'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['title']
  }
};

/**
 * Update an existing WordPress post
 */
export const updatePost = {
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
        description: 'Featured image media ID'
      },
      categories: {
        type: 'array',
        items: { type: 'number' },
        description: 'Array of category IDs'
      },
      tags: {
        type: 'array',
        items: { type: 'number' },
        description: 'Array of tag IDs'
      },
      slug: {
        type: 'string',
        description: 'Post slug (URL-friendly name)'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date in ISO 8601 format'
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'Publication date in UTC'
      },
      password: {
        type: 'string',
        description: 'Password to protect the post'
      },
      sticky: {
        type: 'boolean',
        description: 'Whether the post is sticky'
      },
      format: {
        type: 'string',
        enum: ['standard', 'aside', 'chat', 'gallery', 'link', 'image', 'quote', 'status', 'video', 'audio'],
        description: 'Post format'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['id']
  }
};

/**
 * Delete a WordPress post
 */
export const deletePost = {
  name: 'wp_delete_post',
  description: 'Delete a WordPress post (move to trash or force delete)',
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
        description: 'Whether to bypass trash and force deletion (default: false)'
      }
    },
    required: ['id']
  }
};

/**
 * Get post revisions
 */
export const getPostRevisions = {
  name: 'wp_get_post_revisions',
  description: 'Get revisions for a specific post',
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
 * Implementation functions for post tools
 */

export async function handleListPosts(apiClient, args) {
  try {
    debug('Listing posts with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.status) params.append('status', args.status);
    if (args.author) params.append('author', args.author.toString());
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    // Handle array parameters
    if (args.categories && args.categories.length > 0) {
      params.append('categories', args.categories.join(','));
    }
    if (args.tags && args.tags.length > 0) {
      params.append('tags', args.tags.join(','));
    }
    
    const posts = await apiClient.listPosts(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${posts.length} posts:\n\n` + 
              posts.map(post => 
                `**${post.title.rendered}** (ID: ${post.id})\n` +
                `Status: ${post.status} | Date: ${new Date(post.date).toLocaleDateString()}\n` +
                `URL: ${post.link}\n` +
                (post.excerpt.rendered ? `Excerpt: ${post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 100)}...\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing posts:', error);
    throw new Error(`Failed to list posts: ${error.message}`);
  }
}

export async function handleGetPost(apiClient, args) {
  try {
    debug('Getting post with ID:', args.id);
    
    const post = await apiClient.getPost(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${post.title.rendered}** (ID: ${post.id})\n\n` +
              `Status: ${post.status}\n` +
              `Author: ${post.author}\n` +
              `Date: ${new Date(post.date).toLocaleString()}\n` +
              `Modified: ${new Date(post.modified).toLocaleString()}\n` +
              `URL: ${post.link}\n` +
              `Slug: ${post.slug}\n\n` +
              (post.excerpt.rendered ? `**Excerpt:**\n${post.excerpt.rendered}\n\n` : '') +
              `**Content:**\n${post.content.rendered}`
      }]
    };
  } catch (error) {
    debug('Error getting post:', error);
    throw new Error(`Failed to get post: ${error.message}`);
  }
}

export async function handleCreatePost(apiClient, args) {
  try {
    debug('Creating post with args:', args);
    
    const postData = {
      title: args.title,
      content: args.content || '',
      excerpt: args.excerpt || '',
      status: args.status || 'draft'
    };
    
    // Add optional fields if provided
    if (args.author) postData.author = args.author;
    if (args.featured_media) postData.featured_media = args.featured_media;
    if (args.categories) postData.categories = args.categories;
    if (args.tags) postData.tags = args.tags;
    if (args.slug) postData.slug = args.slug;
    if (args.date) postData.date = args.date;
    if (args.date_gmt) postData.date_gmt = args.date_gmt;
    if (args.password) postData.password = args.password;
    if (args.sticky !== undefined) postData.sticky = args.sticky;
    if (args.format) postData.format = args.format;
    if (args.meta) postData.meta = args.meta;
    
    const post = await apiClient.createPost(postData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Post created successfully!\n\n` +
              `**${post.title.rendered}** (ID: ${post.id})\n` +
              `Status: ${post.status}\n` +
              `Date: ${new Date(post.date).toLocaleString()}\n` +
              `URL: ${post.link}\n` +
              `Edit URL: ${post.link.replace(/\/$/, '')}/wp-admin/post.php?post=${post.id}&action=edit`
      }]
    };
  } catch (error) {
    debug('Error creating post:', error);
    throw new Error(`Failed to create post: ${error.message}`);
  }
}

export async function handleUpdatePost(apiClient, args) {
  try {
    debug('Updating post with ID:', args.id);
    
    const { id, ...updateData } = args;
    const post = await apiClient.updatePost(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Post updated successfully!\n\n` +
              `**${post.title.rendered}** (ID: ${post.id})\n` +
              `Status: ${post.status}\n` +
              `Modified: ${new Date(post.modified).toLocaleString()}\n` +
              `URL: ${post.link}`
      }]
    };
  } catch (error) {
    debug('Error updating post:', error);
    throw new Error(`Failed to update post: ${error.message}`);
  }
}

export async function handleDeletePost(apiClient, args) {
  try {
    debug('Deleting post with ID:', args.id);
    
    const result = await apiClient.deletePost(args.id, args.force);
    
    return {
      content: [{
        type: 'text',
        text: args.force 
          ? `✅ Post permanently deleted (ID: ${args.id})`
          : `✅ Post moved to trash (ID: ${args.id})\n\nThe post can still be restored from the WordPress admin trash.`
      }]
    };
  } catch (error) {
    debug('Error deleting post:', error);
    throw new Error(`Failed to delete post: ${error.message}`);
  }
}

export async function handleGetPostRevisions(apiClient, args) {
  try {
    debug('Getting post revisions for ID:', args.id);
    
    const revisions = await apiClient.getPostRevisions(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${revisions.length} revisions for post ${args.id}:\n\n` +
              revisions.map(revision => 
                `**Revision ${revision.id}**\n` +
                `Date: ${new Date(revision.date).toLocaleString()}\n` +
                `Author: ${revision.author}\n` +
                `Title: ${revision.title.rendered}\n` +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error getting post revisions:', error);
    throw new Error(`Failed to get post revisions: ${error.message}`);
  }
}
