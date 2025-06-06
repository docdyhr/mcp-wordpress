import { debug } from '../utils/debug.js';

/**
 * Get WordPress site settings
 */
export const getSiteSettings = {
  name: 'wp_get_site_settings',
  description: 'Get WordPress site settings and configuration',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Update specific WordPress site settings
 */
export const updateSiteSettings = {
  name: 'wp_update_site_settings',
  description: 'Update specific WordPress site settings',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Site title'
      },
      description: {
        type: 'string',
        description: 'Site tagline/description'
      },
      url: {
        type: 'string',
        format: 'uri',
        description: 'Site URL'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Admin email address'
      },
      timezone: {
        type: 'string',
        description: 'Site timezone'
      },
      date_format: {
        type: 'string',
        description: 'Date format string'
      },
      time_format: {
        type: 'string',
        description: 'Time format string'
      },
      start_of_week: {
        type: 'number',
        minimum: 0,
        maximum: 6,
        description: 'Start of week (0=Sunday, 1=Monday, etc.)'
      },
      language: {
        type: 'string',
        description: 'Site language code'
      },
      use_smilies: {
        type: 'boolean',
        description: 'Convert emoticons to graphics on display'
      },
      default_ping_status: {
        type: 'string',
        enum: ['open', 'closed'],
        description: 'Allow link notifications from other blogs (pingbacks and trackbacks) on new articles'
      },
      default_comment_status: {
        type: 'string',
        enum: ['open', 'closed'],
        description: 'Allow people to submit comments on new articles'
      }
    }
  }
};

/**
 * Get site statistics and information
 */
export const getSiteStats = {
  name: 'wp_get_site_stats',
  description: 'Get WordPress site statistics including post counts, user counts, and other metrics',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Search WordPress content
 */
export const searchSite = {
  name: 'wp_search_site',
  description: 'Search across WordPress site content (posts, pages, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term'
      },
      type: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['post', 'page', 'attachment']
        },
        description: 'Content types to search (default: post, page)'
      },
      subtype: {
        type: 'string',
        enum: ['post', 'page', 'any'],
        description: 'Content subtype (default: any)'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (default: 1)',
        minimum: 1
      },
      per_page: {
        type: 'number',
        description: 'Number of results per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      }
    },
    required: ['search']
  }
};

/**
 * Get WordPress application passwords for current user
 */
export const getApplicationPasswords = {
  name: 'wp_get_application_passwords',
  description: 'Get application passwords for the current user',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Create a new application password
 */
export const createApplicationPassword = {
  name: 'wp_create_application_password',
  description: 'Create a new application password for the current user',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the application password'
      },
      app_id: {
        type: 'string',
        description: 'Application ID (optional)'
      }
    },
    required: ['name']
  }
};

/**
 * Delete an application password
 */
export const deleteApplicationPassword = {
  name: 'wp_delete_application_password',
  description: 'Delete an application password for the current user',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID of the application password to delete'
      }
    },
    required: ['uuid']
  }
};

/**
 * Implementation functions for site tools
 */

export async function handleGetSiteSettings(apiClient, args) {
  try {
    debug('Getting site settings');
    
    const settings = await apiClient.getSiteSettings();
    
    return {
      content: [{
        type: 'text',
        text: `**WordPress Site Settings**\n\n` +
              `**Basic Information:**\n` +
              `Title: ${settings.title}\n` +
              `Tagline: ${settings.description}\n` +
              `URL: ${settings.url}\n` +
              `Admin Email: ${settings.email}\n` +
              `Language: ${settings.language}\n` +
              `Timezone: ${settings.timezone}\n\n` +
              `**Date & Time:**\n` +
              `Date Format: ${settings.date_format}\n` +
              `Time Format: ${settings.time_format}\n` +
              `Week Starts On: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.start_of_week]}\n\n` +
              `**Discussion:**\n` +
              `Default Comment Status: ${settings.default_comment_status}\n` +
              `Default Ping Status: ${settings.default_ping_status}\n` +
              `Use Smilies: ${settings.use_smilies ? 'Yes' : 'No'}\n\n` +
              `**Posts:**\n` +
              `Posts Per Page: ${settings.posts_per_page}\n` +
              (settings.default_category ? `Default Category: ${settings.default_category}\n` : '') +
              (settings.default_post_format ? `Default Post Format: ${settings.default_post_format}\n` : '')
      }]
    };
  } catch (error) {
    debug('Error getting site settings:', error);
    throw new Error(`Failed to get site settings: ${error.message}`);
  }
}

export async function handleUpdateSiteSettings(apiClient, args) {
  try {
    debug('Updating site settings with:', args);
    
    const settings = await apiClient.updateSiteSettings(args);
    
    const updatedFields = Object.keys(args);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Site settings updated successfully!\n\n` +
              `**Updated Fields:**\n` +
              updatedFields.map(field => {
                const value = settings[field];
                return `${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}: ${value}`;
              }).join('\n') +
              '\n\n' +
              'Settings are now active on your WordPress site.'
      }]
    };
  } catch (error) {
    debug('Error updating site settings:', error);
    throw new Error(`Failed to update site settings: ${error.message}`);
  }
}

export async function handleGetSiteStats(apiClient, args) {
  try {
    debug('Getting site statistics');
    
    // Get various statistics by making multiple API calls
    const [posts, pages, media, users, comments, categories, tags] = await Promise.all([
      apiClient.listPosts(new URLSearchParams('per_page=1')),
      apiClient.listPages(new URLSearchParams('per_page=1')),
      apiClient.listMedia(new URLSearchParams('per_page=1')),
      apiClient.listUsers(new URLSearchParams('per_page=1')),
      apiClient.listComments(new URLSearchParams('per_page=1')),
      apiClient.listCategories(new URLSearchParams('per_page=1')),
      apiClient.listTags(new URLSearchParams('per_page=1'))
    ]);
    
    // Get headers to determine total counts
    const postCount = posts.headers?.get('X-WP-Total') || 'Unknown';
    const pageCount = pages.headers?.get('X-WP-Total') || 'Unknown';
    const mediaCount = media.headers?.get('X-WP-Total') || 'Unknown';
    const userCount = users.headers?.get('X-WP-Total') || 'Unknown';
    const commentCount = comments.headers?.get('X-WP-Total') || 'Unknown';
    const categoryCount = categories.headers?.get('X-WP-Total') || 'Unknown';
    const tagCount = tags.headers?.get('X-WP-Total') || 'Unknown';
    
    return {
      content: [{
        type: 'text',
        text: `**WordPress Site Statistics**\n\n` +
              `**Content:**\n` +
              `📝 Posts: ${postCount}\n` +
              `📄 Pages: ${pageCount}\n` +
              `📎 Media Items: ${mediaCount}\n` +
              `💬 Comments: ${commentCount}\n\n` +
              `**Organization:**\n` +
              `📁 Categories: ${categoryCount}\n` +
              `🏷️ Tags: ${tagCount}\n\n` +
              `**Users:**\n` +
              `👥 Total Users: ${userCount}\n\n` +
              `*Statistics collected: ${new Date().toLocaleString()}*`
      }]
    };
  } catch (error) {
    debug('Error getting site statistics:', error);
    throw new Error(`Failed to get site statistics: ${error.message}`);
  }
}

export async function handleSearchSite(apiClient, args) {
  try {
    debug('Searching site for:', args.search);
    
    const params = new URLSearchParams();
    params.append('search', args.search);
    
    if (args.type && args.type.length > 0) {
      params.append('type', args.type.join(','));
    }
    if (args.subtype) {
      params.append('subtype', args.subtype);
    }
    if (args.page) {
      params.append('page', args.page.toString());
    }
    if (args.per_page) {
      params.append('per_page', args.per_page.toString());
    }
    
    const results = await apiClient.searchSite(params);
    
    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for: "${args.search}"`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `**Search Results for: "${args.search}"**\n\n` +
              `Found ${results.length} results:\n\n` +
              results.map(result => 
                `**${result.title}** (${result.type}${result.subtype !== result.type ? ` - ${result.subtype}` : ''})\n` +
                `ID: ${result.id}\n` +
                `URL: ${result.url}\n` +
                (result.excerpt ? `Excerpt: ${result.excerpt.replace(/<[^>]*>/g, '').substring(0, 150)}...\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error searching site:', error);
    throw new Error(`Failed to search site: ${error.message}`);
  }
}

export async function handleGetApplicationPasswords(apiClient, args) {
  try {
    debug('Getting application passwords');
    
    const passwords = await apiClient.getApplicationPasswords();
    
    if (passwords.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No application passwords found for the current user.'
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `**Application Passwords**\n\n` +
              `Found ${passwords.length} application passwords:\n\n` +
              passwords.map(password => 
                `**${password.name}**\n` +
                `UUID: ${password.uuid}\n` +
                `App ID: ${password.app_id || 'None'}\n` +
                `Created: ${new Date(password.created).toLocaleString()}\n` +
                `Last Used: ${password.last_used ? new Date(password.last_used).toLocaleString() : 'Never'}\n` +
                `Last IP: ${password.last_ip || 'Unknown'}\n` +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error getting application passwords:', error);
    throw new Error(`Failed to get application passwords: ${error.message}`);
  }
}

export async function handleCreateApplicationPassword(apiClient, args) {
  try {
    debug('Creating application password with name:', args.name);
    
    const passwordData = {
      name: args.name
    };
    
    if (args.app_id) {
      passwordData.app_id = args.app_id;
    }
    
    const result = await apiClient.createApplicationPassword(passwordData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Application password created successfully!\n\n` +
              `**${result.name}**\n` +
              `UUID: ${result.uuid}\n` +
              `Password: ${result.password}\n\n` +
              `⚠️  **IMPORTANT:** Save this password now! ` +
              `You will not be able to see it again after you close this message.\n\n` +
              `You can use this password for API authentication by combining your username with this password.`
      }]
    };
  } catch (error) {
    debug('Error creating application password:', error);
    throw new Error(`Failed to create application password: ${error.message}`);
  }
}

export async function handleDeleteApplicationPassword(apiClient, args) {
  try {
    debug('Deleting application password with UUID:', args.uuid);
    
    const result = await apiClient.deleteApplicationPassword(args.uuid);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Application password deleted successfully!\n\n` +
              `UUID: ${args.uuid}\n\n` +
              'The application password has been permanently removed and can no longer be used for authentication.'
      }]
    };
  } catch (error) {
    debug('Error deleting application password:', error);
    throw new Error(`Failed to delete application password: ${error.message}`);
  }
}
