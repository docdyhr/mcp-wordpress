import { debug } from '../utils/debug.js';

/**
 * List WordPress users with optional filtering
 */
export const listUsers = {
  name: 'wp_list_users',
  description: 'List WordPress users with optional filtering and pagination',
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
        description: 'Number of users per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter users'
      },
      exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude specific user IDs'
      },
      include: {
        type: 'array',
        items: { type: 'number' },
        description: 'Include only specific user IDs'
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter users by roles'
      },
      capabilities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter users by capabilities'
      },
      orderby: {
        type: 'string',
        enum: ['id', 'include', 'name', 'registered_date', 'slug', 'include_slugs', 'email', 'url'],
        description: 'Sort users by field (default: name)'
      },
      order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order (default: asc)'
      }
    }
  }
};

/**
 * Get a specific WordPress user by ID
 */
export const getUser = {
  name: 'wp_get_user',
  description: 'Get a specific WordPress user by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'User ID',
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
 * Get current user information
 */
export const getCurrentUser = {
  name: 'wp_get_current_user',
  description: 'Get information about the currently authenticated user',
  inputSchema: {
    type: 'object',
    properties: {
      context: {
        type: 'string',
        enum: ['view', 'embed', 'edit'],
        description: 'Scope of the request (default: view)'
      }
    }
  }
};

/**
 * Create a new WordPress user
 */
export const createUser = {
  name: 'wp_create_user',
  description: 'Create a new WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: 'Login name for the user'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address for the user'
      },
      password: {
        type: 'string',
        description: 'Password for the user (will be hashed automatically)'
      },
      name: {
        type: 'string',
        description: 'Display name for the user'
      },
      first_name: {
        type: 'string',
        description: 'First name for the user'
      },
      last_name: {
        type: 'string',
        description: 'Last name for the user'
      },
      url: {
        type: 'string',
        format: 'uri',
        description: 'URL of the user'
      },
      description: {
        type: 'string',
        description: 'Description/bio of the user'
      },
      locale: {
        type: 'string',
        description: 'Locale for the user'
      },
      nickname: {
        type: 'string',
        description: 'Nickname for the user'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the user'
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Roles assigned to the user'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['username', 'email', 'password']
  }
};

/**
 * Update an existing WordPress user
 */
export const updateUser = {
  name: 'wp_update_user',
  description: 'Update an existing WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'User ID',
        minimum: 1
      },
      username: {
        type: 'string',
        description: 'Login name for the user'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address for the user'
      },
      password: {
        type: 'string',
        description: 'Password for the user (will be hashed automatically)'
      },
      name: {
        type: 'string',
        description: 'Display name for the user'
      },
      first_name: {
        type: 'string',
        description: 'First name for the user'
      },
      last_name: {
        type: 'string',
        description: 'Last name for the user'
      },
      url: {
        type: 'string',
        format: 'uri',
        description: 'URL of the user'
      },
      description: {
        type: 'string',
        description: 'Description/bio of the user'
      },
      locale: {
        type: 'string',
        description: 'Locale for the user'
      },
      nickname: {
        type: 'string',
        description: 'Nickname for the user'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the user'
      },
      roles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Roles assigned to the user'
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
 * Delete a WordPress user
 */
export const deleteUser = {
  name: 'wp_delete_user',
  description: 'Delete a WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'User ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Required to be true, as users do not support trashing'
      },
      reassign: {
        type: 'number',
        description: 'Reassign the deleted user\'s posts and links to this user ID'
      }
    },
    required: ['id', 'force']
  }
};

/**
 * Implementation functions for user tools
 */

export async function handleListUsers(apiClient, args) {
  try {
    debug('Listing users with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    // Handle array parameters
    if (args.exclude && args.exclude.length > 0) {
      params.append('exclude', args.exclude.join(','));
    }
    if (args.include && args.include.length > 0) {
      params.append('include', args.include.join(','));
    }
    if (args.roles && args.roles.length > 0) {
      params.append('roles', args.roles.join(','));
    }
    if (args.capabilities && args.capabilities.length > 0) {
      params.append('capabilities', args.capabilities.join(','));
    }
    
    const users = await apiClient.listUsers(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${users.length} users:\n\n` + 
              users.map(user => 
                `**${user.name}** (@${user.slug}) (ID: ${user.id})\n` +
                `Email: ${user.email}\n` +
                `Roles: ${user.roles.join(', ')}\n` +
                `Registered: ${new Date(user.registered_date).toLocaleDateString()}\n` +
                `URL: ${user.url || 'None'}\n` +
                (user.description ? `Bio: ${user.description.substring(0, 100)}${user.description.length > 100 ? '...' : ''}\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing users:', error);
    throw new Error(`Failed to list users: ${error.message}`);
  }
}

export async function handleGetUser(apiClient, args) {
  try {
    debug('Getting user with ID:', args.id);
    
    const user = await apiClient.getUser(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${user.name}** (@${user.slug}) (ID: ${user.id})\n\n` +
              `Username: ${user.username}\n` +
              `Email: ${user.email}\n` +
              `Roles: ${user.roles.join(', ')}\n` +
              `Registered: ${new Date(user.registered_date).toLocaleString()}\n` +
              `URL: ${user.url || 'None'}\n` +
              `Locale: ${user.locale}\n` +
              `Nickname: ${user.nickname}\n` +
              (user.first_name ? `First Name: ${user.first_name}\n` : '') +
              (user.last_name ? `Last Name: ${user.last_name}\n` : '') +
              '\n' +
              (user.description ? `**Bio:**\n${user.description}\n\n` : '') +
              (user.avatar_urls ? 
                `**Avatar URLs:**\n${Object.entries(user.avatar_urls).map(([size, url]) => 
                  `${size}px: ${url}`
                ).join('\n')}` : '')
      }]
    };
  } catch (error) {
    debug('Error getting user:', error);
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

export async function handleGetCurrentUser(apiClient, args) {
  try {
    debug('Getting current user info');
    
    const user = await apiClient.getCurrentUser(args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**Current User: ${user.name}** (@${user.slug}) (ID: ${user.id})\n\n` +
              `Username: ${user.username}\n` +
              `Email: ${user.email}\n` +
              `Roles: ${user.roles.join(', ')}\n` +
              `Registered: ${new Date(user.registered_date).toLocaleString()}\n` +
              `URL: ${user.url || 'None'}\n` +
              `Locale: ${user.locale}\n` +
              '\n' +
              `**Capabilities:**\n${Object.keys(user.capabilities || {}).join(', ')}`
      }]
    };
  } catch (error) {
    debug('Error getting current user:', error);
    throw new Error(`Failed to get current user: ${error.message}`);
  }
}

export async function handleCreateUser(apiClient, args) {
  try {
    debug('Creating user with username:', args.username);
    
    const userData = {
      username: args.username,
      email: args.email,
      password: args.password
    };
    
    // Add optional fields if provided
    if (args.name) userData.name = args.name;
    if (args.first_name) userData.first_name = args.first_name;
    if (args.last_name) userData.last_name = args.last_name;
    if (args.url) userData.url = args.url;
    if (args.description) userData.description = args.description;
    if (args.locale) userData.locale = args.locale;
    if (args.nickname) userData.nickname = args.nickname;
    if (args.slug) userData.slug = args.slug;
    if (args.roles) userData.roles = args.roles;
    if (args.meta) userData.meta = args.meta;
    
    const user = await apiClient.createUser(userData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ User created successfully!\n\n` +
              `**${user.name}** (@${user.slug}) (ID: ${user.id})\n` +
              `Username: ${user.username}\n` +
              `Email: ${user.email}\n` +
              `Roles: ${user.roles.join(', ')}\n` +
              `Registered: ${new Date(user.registered_date).toLocaleString()}\n` +
              `Edit URL: ${user.link.replace(/\/$/, '')}/wp-admin/user-edit.php?user_id=${user.id}`
      }]
    };
  } catch (error) {
    debug('Error creating user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

export async function handleUpdateUser(apiClient, args) {
  try {
    debug('Updating user with ID:', args.id);
    
    const { id, ...updateData } = args;
    const user = await apiClient.updateUser(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ User updated successfully!\n\n` +
              `**${user.name}** (@${user.slug}) (ID: ${user.id})\n` +
              `Username: ${user.username}\n` +
              `Email: ${user.email}\n` +
              `Roles: ${user.roles.join(', ')}`
      }]
    };
  } catch (error) {
    debug('Error updating user:', error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

export async function handleDeleteUser(apiClient, args) {
  try {
    debug('Deleting user with ID:', args.id);
    
    if (!args.force) {
      throw new Error('Users cannot be trashed, force parameter must be true');
    }
    
    const result = await apiClient.deleteUser(args.id, args.force, args.reassign);
    
    return {
      content: [{
        type: 'text',
        text: `✅ User permanently deleted (ID: ${args.id})\n\n` +
              (args.reassign ? 
                `Posts and content have been reassigned to user ID: ${args.reassign}` : 
                'User posts and content may still exist - consider reassigning them to another user.')
      }]
    };
  } catch (error) {
    debug('Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}
