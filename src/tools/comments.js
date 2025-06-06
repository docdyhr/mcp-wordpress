import { debug } from '../utils/debug.js';

/**
 * List WordPress comments with optional filtering
 */
export const listComments = {
  name: 'wp_list_comments',
  description: 'List WordPress comments with optional filtering and pagination',
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
        description: 'Number of comments per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter comments'
      },
      after: {
        type: 'string',
        format: 'date-time',
        description: 'Limit response to comments published after a given ISO 8601 date'
      },
      before: {
        type: 'string',
        format: 'date-time',
        description: 'Limit response to comments published before a given ISO 8601 date'
      },
      exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude specific comment IDs'
      },
      include: {
        type: 'array',
        items: { type: 'number' },
        description: 'Include only specific comment IDs'
      },
      post: {
        type: 'array',
        items: { type: 'number' },
        description: 'Limit result set to comments assigned to specific post IDs'
      },
      parent: {
        type: 'array',
        items: { type: 'number' },
        description: 'Limit result set to comments assigned to specific parent comment IDs'
      },
      parent_exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude comments with specific parent comment IDs'
      },
      author: {
        type: 'array',
        items: { type: 'number' },
        description: 'Limit result set to comments assigned to specific user IDs'
      },
      author_exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude comments assigned to specific user IDs'
      },
      author_email: {
        type: 'string',
        format: 'email',
        description: 'Limit result set to that from a specific author email'
      },
      type: {
        type: 'string',
        description: 'Limit result set to comments of a specific type'
      },
      status: {
        type: 'string',
        enum: ['hold', 'approve', 'spam', 'trash'],
        description: 'Limit result set to comments assigned a specific status'
      },
      orderby: {
        type: 'string',
        enum: ['date', 'date_gmt', 'id', 'include', 'post', 'parent', 'type'],
        description: 'Sort comments by field (default: date_gmt)'
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
 * Get a specific WordPress comment by ID
 */
export const getComment = {
  name: 'wp_get_comment',
  description: 'Get a specific WordPress comment by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Comment ID',
        minimum: 1
      },
      context: {
        type: 'string',
        enum: ['view', 'embed', 'edit'],
        description: 'Scope of the request (default: view)'
      },
      password: {
        type: 'string',
        description: 'Password for the parent post if it is password protected'
      }
    },
    required: ['id']
  }
};

/**
 * Create a new WordPress comment
 */
export const createComment = {
  name: 'wp_create_comment',
  description: 'Create a new WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      post: {
        type: 'number',
        description: 'The ID of the associated post object',
        minimum: 1
      },
      parent: {
        type: 'number',
        description: 'The ID of the parent comment (for nested comments)',
        minimum: 0
      },
      content: {
        type: 'string',
        description: 'The content for the comment (HTML allowed)'
      },
      author: {
        type: 'number',
        description: 'The ID of the user object if author was a user'
      },
      author_email: {
        type: 'string',
        format: 'email',
        description: 'Email address for the comment author'
      },
      author_name: {
        type: 'string',
        description: 'Display name for the comment author'
      },
      author_url: {
        type: 'string',
        format: 'uri',
        description: 'URL for the comment author'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'The date the comment was published, in the site\'s timezone'
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'The date the comment was published, as GMT'
      },
      status: {
        type: 'string',
        enum: ['hold', 'approve', 'spam', 'trash'],
        description: 'State of the comment (default: hold for unauthenticated, approve for authenticated)'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['post', 'content']
  }
};

/**
 * Update an existing WordPress comment
 */
export const updateComment = {
  name: 'wp_update_comment',
  description: 'Update an existing WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Comment ID',
        minimum: 1
      },
      post: {
        type: 'number',
        description: 'The ID of the associated post object'
      },
      parent: {
        type: 'number',
        description: 'The ID of the parent comment (for nested comments)'
      },
      content: {
        type: 'string',
        description: 'The content for the comment (HTML allowed)'
      },
      author: {
        type: 'number',
        description: 'The ID of the user object if author was a user'
      },
      author_email: {
        type: 'string',
        format: 'email',
        description: 'Email address for the comment author'
      },
      author_name: {
        type: 'string',
        description: 'Display name for the comment author'
      },
      author_url: {
        type: 'string',
        format: 'uri',
        description: 'URL for the comment author'
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'The date the comment was published, in the site\'s timezone'
      },
      date_gmt: {
        type: 'string',
        format: 'date-time',
        description: 'The date the comment was published, as GMT'
      },
      status: {
        type: 'string',
        enum: ['hold', 'approve', 'spam', 'trash'],
        description: 'State of the comment'
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
 * Delete a WordPress comment
 */
export const deleteComment = {
  name: 'wp_delete_comment',
  description: 'Delete a WordPress comment',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Comment ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Whether to bypass trash and force deletion (default: false)'
      },
      password: {
        type: 'string',
        description: 'Password for the parent post if it is password protected'
      }
    },
    required: ['id']
  }
};

/**
 * Approve a WordPress comment
 */
export const approveComment = {
  name: 'wp_approve_comment',
  description: 'Approve a WordPress comment (shortcut for updating status to approve)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Comment ID',
        minimum: 1
      }
    },
    required: ['id']
  }
};

/**
 * Mark a WordPress comment as spam
 */
export const spamComment = {
  name: 'wp_spam_comment',
  description: 'Mark a WordPress comment as spam',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Comment ID',
        minimum: 1
      }
    },
    required: ['id']
  }
};

/**
 * Implementation functions for comment tools
 */

export async function handleListComments(apiClient, args) {
  try {
    debug('Listing comments with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.after) params.append('after', args.after);
    if (args.before) params.append('before', args.before);
    if (args.author_email) params.append('author_email', args.author_email);
    if (args.type) params.append('type', args.type);
    if (args.status) params.append('status', args.status);
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    // Handle array parameters
    if (args.exclude && args.exclude.length > 0) {
      params.append('exclude', args.exclude.join(','));
    }
    if (args.include && args.include.length > 0) {
      params.append('include', args.include.join(','));
    }
    if (args.post && args.post.length > 0) {
      params.append('post', args.post.join(','));
    }
    if (args.parent && args.parent.length > 0) {
      params.append('parent', args.parent.join(','));
    }
    if (args.parent_exclude && args.parent_exclude.length > 0) {
      params.append('parent_exclude', args.parent_exclude.join(','));
    }
    if (args.author && args.author.length > 0) {
      params.append('author', args.author.join(','));
    }
    if (args.author_exclude && args.author_exclude.length > 0) {
      params.append('author_exclude', args.author_exclude.join(','));
    }
    
    const comments = await apiClient.listComments(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${comments.length} comments:\n\n` + 
              comments.map(comment => 
                `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n` +
                `Status: ${comment.status} | Date: ${new Date(comment.date).toLocaleDateString()}\n` +
                `Post: ${comment.post} | Parent: ${comment.parent || 'None'}\n` +
                `Email: ${comment.author_email || 'None'}\n` +
                `Content: ${comment.content.rendered.replace(/<[^>]*>/g, '').substring(0, 100)}${comment.content.rendered.length > 100 ? '...' : ''}\n` +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing comments:', error);
    throw new Error(`Failed to list comments: ${error.message}`);
  }
}

export async function handleGetComment(apiClient, args) {
  try {
    debug('Getting comment with ID:', args.id);
    
    const comment = await apiClient.getComment(args.id, args.context, args.password);
    
    return {
      content: [{
        type: 'text',
        text: `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n\n` +
              `Status: ${comment.status}\n` +
              `Date: ${new Date(comment.date).toLocaleString()}\n` +
              `Date GMT: ${new Date(comment.date_gmt).toLocaleString()}\n` +
              `Post ID: ${comment.post}\n` +
              `Parent Comment: ${comment.parent || 'None'}\n` +
              `Author: ${comment.author || 'Guest'}\n` +
              `Author Name: ${comment.author_name || 'Anonymous'}\n` +
              `Author Email: ${comment.author_email || 'None'}\n` +
              `Author URL: ${comment.author_url || 'None'}\n` +
              `Type: ${comment.type}\n` +
              `Link: ${comment.link}\n\n` +
              `**Content:**\n${comment.content.rendered}`
      }]
    };
  } catch (error) {
    debug('Error getting comment:', error);
    throw new Error(`Failed to get comment: ${error.message}`);
  }
}

export async function handleCreateComment(apiClient, args) {
  try {
    debug('Creating comment for post:', args.post);
    
    const commentData = {
      post: args.post,
      content: args.content
    };
    
    // Add optional fields if provided
    if (args.parent) commentData.parent = args.parent;
    if (args.author) commentData.author = args.author;
    if (args.author_email) commentData.author_email = args.author_email;
    if (args.author_name) commentData.author_name = args.author_name;
    if (args.author_url) commentData.author_url = args.author_url;
    if (args.date) commentData.date = args.date;
    if (args.date_gmt) commentData.date_gmt = args.date_gmt;
    if (args.status) commentData.status = args.status;
    if (args.meta) commentData.meta = args.meta;
    
    const comment = await apiClient.createComment(commentData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Comment created successfully!\n\n` +
              `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n` +
              `Status: ${comment.status}\n` +
              `Date: ${new Date(comment.date).toLocaleString()}\n` +
              `Post ID: ${comment.post}\n` +
              `Parent: ${comment.parent || 'None'}\n` +
              `Link: ${comment.link}`
      }]
    };
  } catch (error) {
    debug('Error creating comment:', error);
    throw new Error(`Failed to create comment: ${error.message}`);
  }
}

export async function handleUpdateComment(apiClient, args) {
  try {
    debug('Updating comment with ID:', args.id);
    
    const { id, ...updateData } = args;
    const comment = await apiClient.updateComment(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Comment updated successfully!\n\n` +
              `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n` +
              `Status: ${comment.status}\n` +
              `Date: ${new Date(comment.date).toLocaleString()}\n` +
              `Link: ${comment.link}`
      }]
    };
  } catch (error) {
    debug('Error updating comment:', error);
    throw new Error(`Failed to update comment: ${error.message}`);
  }
}

export async function handleDeleteComment(apiClient, args) {
  try {
    debug('Deleting comment with ID:', args.id);
    
    const result = await apiClient.deleteComment(args.id, args.force, args.password);
    
    return {
      content: [{
        type: 'text',
        text: args.force 
          ? `✅ Comment permanently deleted (ID: ${args.id})`
          : `✅ Comment moved to trash (ID: ${args.id})\n\nThe comment can still be restored from the WordPress admin trash.`
      }]
    };
  } catch (error) {
    debug('Error deleting comment:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

export async function handleApproveComment(apiClient, args) {
  try {
    debug('Approving comment with ID:', args.id);
    
    const comment = await apiClient.updateComment(args.id, { status: 'approve' });
    
    return {
      content: [{
        type: 'text',
        text: `✅ Comment approved successfully!\n\n` +
              `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n` +
              `Status: ${comment.status}\n` +
              `Link: ${comment.link}`
      }]
    };
  } catch (error) {
    debug('Error approving comment:', error);
    throw new Error(`Failed to approve comment: ${error.message}`);
  }
}

export async function handleSpamComment(apiClient, args) {
  try {
    debug('Marking comment as spam with ID:', args.id);
    
    const comment = await apiClient.updateComment(args.id, { status: 'spam' });
    
    return {
      content: [{
        type: 'text',
        text: `✅ Comment marked as spam!\n\n` +
              `**Comment ${comment.id}** by ${comment.author_name || 'Anonymous'}\n` +
              `Status: ${comment.status}`
      }]
    };
  } catch (error) {
    debug('Error marking comment as spam:', error);
    throw new Error(`Failed to mark comment as spam: ${error.message}`);
  }
}
