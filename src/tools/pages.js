import { debug } from '../utils/debug.js';

/**
 * List WordPress pages with optional filtering
 */
export const listPages = {
  name: 'wp_list_pages',
  description: 'List WordPress pages with optional filtering and pagination',
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
        description: 'Number of pages per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter pages'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private', 'trash'],
        description: 'Filter pages by status'
      },
      author: {
        type: 'number',
        description: 'Filter pages by author ID'
      },
      parent: {
        type: 'number',
        description: 'Filter pages by parent page ID'
      },
      orderby: {
        type: 'string',
        enum: ['date', 'id', 'include', 'title', 'slug', 'modified', 'menu_order'],
        description: 'Sort pages by field (default: date)'
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
 * Get a specific WordPress page by ID
 */
export const getPage = {
  name: 'wp_get_page',
  description: 'Get a specific WordPress page by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Page ID',
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
 * Create a new WordPress page
 */
export const createPage = {
  name: 'wp_create_page',
  description: 'Create a new WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Page title'
      },
      content: {
        type: 'string',
        description: 'Page content (HTML)'
      },
      excerpt: {
        type: 'string',
        description: 'Page excerpt'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Page status (default: draft)'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      },
      featured_media: {
        type: 'number',
        description: 'Featured image media ID'
      },
      parent: {
        type: 'number',
        description: 'Parent page ID for hierarchical pages'
      },
      menu_order: {
        type: 'number',
        description: 'Order of the page in menus'
      },
      slug: {
        type: 'string',
        description: 'Page slug (URL-friendly name)'
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
        description: 'Password to protect the page'
      },
      template: {
        type: 'string',
        description: 'Page template filename'
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
 * Update an existing WordPress page
 */
export const updatePage = {
  name: 'wp_update_page',
  description: 'Update an existing WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Page ID',
        minimum: 1
      },
      title: {
        type: 'string',
        description: 'Page title'
      },
      content: {
        type: 'string',
        description: 'Page content (HTML)'
      },
      excerpt: {
        type: 'string',
        description: 'Page excerpt'
      },
      status: {
        type: 'string',
        enum: ['publish', 'future', 'draft', 'pending', 'private'],
        description: 'Page status'
      },
      author: {
        type: 'number',
        description: 'Author user ID'
      },
      featured_media: {
        type: 'number',
        description: 'Featured image media ID'
      },
      parent: {
        type: 'number',
        description: 'Parent page ID for hierarchical pages'
      },
      menu_order: {
        type: 'number',
        description: 'Order of the page in menus'
      },
      slug: {
        type: 'string',
        description: 'Page slug (URL-friendly name)'
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
        description: 'Password to protect the page'
      },
      template: {
        type: 'string',
        description: 'Page template filename'
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
 * Delete a WordPress page
 */
export const deletePage = {
  name: 'wp_delete_page',
  description: 'Delete a WordPress page (move to trash or force delete)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Page ID',
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
 * Get page revisions
 */
export const getPageRevisions = {
  name: 'wp_get_page_revisions',
  description: 'Get revisions for a specific page',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Page ID',
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
 * Implementation functions for page tools
 */

export async function handleListPages(apiClient, args) {
  try {
    debug('Listing pages with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.status) params.append('status', args.status);
    if (args.author) params.append('author', args.author.toString());
    if (args.parent !== undefined) params.append('parent', args.parent.toString());
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    const pages = await apiClient.listPages(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${pages.length} pages:\n\n` + 
              pages.map(page => 
                `**${page.title.rendered}** (ID: ${page.id})\n` +
                `Status: ${page.status} | Date: ${new Date(page.date).toLocaleDateString()}\n` +
                `URL: ${page.link}\n` +
                (page.parent ? `Parent: ${page.parent}\n` : '') +
                (page.menu_order ? `Menu Order: ${page.menu_order}\n` : '') +
                (page.excerpt.rendered ? `Excerpt: ${page.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 100)}...\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing pages:', error);
    throw new Error(`Failed to list pages: ${error.message}`);
  }
}

export async function handleGetPage(apiClient, args) {
  try {
    debug('Getting page with ID:', args.id);
    
    const page = await apiClient.getPage(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${page.title.rendered}** (ID: ${page.id})\n\n` +
              `Status: ${page.status}\n` +
              `Author: ${page.author}\n` +
              `Date: ${new Date(page.date).toLocaleString()}\n` +
              `Modified: ${new Date(page.modified).toLocaleString()}\n` +
              `URL: ${page.link}\n` +
              `Slug: ${page.slug}\n` +
              (page.parent ? `Parent: ${page.parent}\n` : '') +
              (page.menu_order ? `Menu Order: ${page.menu_order}\n` : '') +
              (page.template ? `Template: ${page.template}\n` : '') +
              '\n' +
              (page.excerpt.rendered ? `**Excerpt:**\n${page.excerpt.rendered}\n\n` : '') +
              `**Content:**\n${page.content.rendered}`
      }]
    };
  } catch (error) {
    debug('Error getting page:', error);
    throw new Error(`Failed to get page: ${error.message}`);
  }
}

export async function handleCreatePage(apiClient, args) {
  try {
    debug('Creating page with args:', args);
    
    const pageData = {
      title: args.title,
      content: args.content || '',
      excerpt: args.excerpt || '',
      status: args.status || 'draft'
    };
    
    // Add optional fields if provided
    if (args.author) pageData.author = args.author;
    if (args.featured_media) pageData.featured_media = args.featured_media;
    if (args.parent) pageData.parent = args.parent;
    if (args.menu_order) pageData.menu_order = args.menu_order;
    if (args.slug) pageData.slug = args.slug;
    if (args.date) pageData.date = args.date;
    if (args.date_gmt) pageData.date_gmt = args.date_gmt;
    if (args.password) pageData.password = args.password;
    if (args.template) pageData.template = args.template;
    if (args.meta) pageData.meta = args.meta;
    
    const page = await apiClient.createPage(pageData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Page created successfully!\n\n` +
              `**${page.title.rendered}** (ID: ${page.id})\n` +
              `Status: ${page.status}\n` +
              `Date: ${new Date(page.date).toLocaleString()}\n` +
              `URL: ${page.link}\n` +
              `Edit URL: ${page.link.replace(/\/$/, '')}/wp-admin/post.php?post=${page.id}&action=edit`
      }]
    };
  } catch (error) {
    debug('Error creating page:', error);
    throw new Error(`Failed to create page: ${error.message}`);
  }
}

export async function handleUpdatePage(apiClient, args) {
  try {
    debug('Updating page with ID:', args.id);
    
    const { id, ...updateData } = args;
    const page = await apiClient.updatePage(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Page updated successfully!\n\n` +
              `**${page.title.rendered}** (ID: ${page.id})\n` +
              `Status: ${page.status}\n` +
              `Modified: ${new Date(page.modified).toLocaleString()}\n` +
              `URL: ${page.link}`
      }]
    };
  } catch (error) {
    debug('Error updating page:', error);
    throw new Error(`Failed to update page: ${error.message}`);
  }
}

export async function handleDeletePage(apiClient, args) {
  try {
    debug('Deleting page with ID:', args.id);
    
    const result = await apiClient.deletePage(args.id, args.force);
    
    return {
      content: [{
        type: 'text',
        text: args.force 
          ? `✅ Page permanently deleted (ID: ${args.id})`
          : `✅ Page moved to trash (ID: ${args.id})\n\nThe page can still be restored from the WordPress admin trash.`
      }]
    };
  } catch (error) {
    debug('Error deleting page:', error);
    throw new Error(`Failed to delete page: ${error.message}`);
  }
}

export async function handleGetPageRevisions(apiClient, args) {
  try {
    debug('Getting page revisions for ID:', args.id);
    
    const revisions = await apiClient.getPageRevisions(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${revisions.length} revisions for page ${args.id}:\n\n` +
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
    debug('Error getting page revisions:', error);
    throw new Error(`Failed to get page revisions: ${error.message}`);
  }
}
