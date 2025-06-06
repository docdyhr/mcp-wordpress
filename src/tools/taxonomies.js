import { debug } from '../utils/debug.js';

/**
 * List WordPress categories with optional filtering
 */
export const listCategories = {
  name: 'wp_list_categories',
  description: 'List WordPress categories with optional filtering and pagination',
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
        description: 'Number of categories per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter categories'
      },
      exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude specific category IDs'
      },
      include: {
        type: 'array',
        items: { type: 'number' },
        description: 'Include only specific category IDs'
      },
      parent: {
        type: 'number',
        description: 'Filter categories by parent category ID'
      },
      hide_empty: {
        type: 'boolean',
        description: 'Hide categories not assigned to any posts (default: false)'
      },
      orderby: {
        type: 'string',
        enum: ['id', 'include', 'name', 'slug', 'include_slugs', 'term_group', 'description', 'count'],
        description: 'Sort categories by field (default: name)'
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
 * Get a specific WordPress category by ID
 */
export const getCategory = {
  name: 'wp_get_category',
  description: 'Get a specific WordPress category by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Category ID',
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
 * Create a new WordPress category
 */
export const createCategory = {
  name: 'wp_create_category',
  description: 'Create a new WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the category'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the category'
      },
      parent: {
        type: 'number',
        description: 'Parent category ID'
      },
      description: {
        type: 'string',
        description: 'Description for the category'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['name']
  }
};

/**
 * Update an existing WordPress category
 */
export const updateCategory = {
  name: 'wp_update_category',
  description: 'Update an existing WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Category ID',
        minimum: 1
      },
      name: {
        type: 'string',
        description: 'Name for the category'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the category'
      },
      parent: {
        type: 'number',
        description: 'Parent category ID'
      },
      description: {
        type: 'string',
        description: 'Description for the category'
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
 * Delete a WordPress category
 */
export const deleteCategory = {
  name: 'wp_delete_category',
  description: 'Delete a WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Category ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Required to be true, as categories do not support trashing'
      }
    },
    required: ['id', 'force']
  }
};

/**
 * List WordPress tags with optional filtering
 */
export const listTags = {
  name: 'wp_list_tags',
  description: 'List WordPress tags with optional filtering and pagination',
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
        description: 'Number of tags per page (default: 10, max: 100)',
        minimum: 1,
        maximum: 100
      },
      search: {
        type: 'string',
        description: 'Search term to filter tags'
      },
      exclude: {
        type: 'array',
        items: { type: 'number' },
        description: 'Exclude specific tag IDs'
      },
      include: {
        type: 'array',
        items: { type: 'number' },
        description: 'Include only specific tag IDs'
      },
      hide_empty: {
        type: 'boolean',
        description: 'Hide tags not assigned to any posts (default: false)'
      },
      orderby: {
        type: 'string',
        enum: ['id', 'include', 'name', 'slug', 'include_slugs', 'term_group', 'description', 'count'],
        description: 'Sort tags by field (default: name)'
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
 * Get a specific WordPress tag by ID
 */
export const getTag = {
  name: 'wp_get_tag',
  description: 'Get a specific WordPress tag by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Tag ID',
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
 * Create a new WordPress tag
 */
export const createTag = {
  name: 'wp_create_tag',
  description: 'Create a new WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the tag'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the tag'
      },
      description: {
        type: 'string',
        description: 'Description for the tag'
      },
      meta: {
        type: 'object',
        description: 'Meta fields object'
      }
    },
    required: ['name']
  }
};

/**
 * Update an existing WordPress tag
 */
export const updateTag = {
  name: 'wp_update_tag',
  description: 'Update an existing WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Tag ID',
        minimum: 1
      },
      name: {
        type: 'string',
        description: 'Name for the tag'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the tag'
      },
      description: {
        type: 'string',
        description: 'Description for the tag'
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
 * Delete a WordPress tag
 */
export const deleteTag = {
  name: 'wp_delete_tag',
  description: 'Delete a WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Tag ID',
        minimum: 1
      },
      force: {
        type: 'boolean',
        description: 'Required to be true, as tags do not support trashing'
      }
    },
    required: ['id', 'force']
  }
};

/**
 * Implementation functions for taxonomy tools
 */

export async function handleListCategories(apiClient, args) {
  try {
    debug('Listing categories with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.parent !== undefined) params.append('parent', args.parent.toString());
    if (args.hide_empty !== undefined) params.append('hide_empty', args.hide_empty.toString());
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    // Handle array parameters
    if (args.exclude && args.exclude.length > 0) {
      params.append('exclude', args.exclude.join(','));
    }
    if (args.include && args.include.length > 0) {
      params.append('include', args.include.join(','));
    }
    
    const categories = await apiClient.listCategories(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${categories.length} categories:\n\n` + 
              categories.map(category => 
                `**${category.name}** (ID: ${category.id})\n` +
                `Slug: ${category.slug}\n` +
                `Count: ${category.count} posts\n` +
                `Parent: ${category.parent || 'None'}\n` +
                `Link: ${category.link}\n` +
                (category.description ? `Description: ${category.description}\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing categories:', error);
    throw new Error(`Failed to list categories: ${error.message}`);
  }
}

export async function handleGetCategory(apiClient, args) {
  try {
    debug('Getting category with ID:', args.id);
    
    const category = await apiClient.getCategory(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${category.name}** (ID: ${category.id})\n\n` +
              `Slug: ${category.slug}\n` +
              `Count: ${category.count} posts\n` +
              `Parent: ${category.parent || 'None'}\n` +
              `Link: ${category.link}\n` +
              `Taxonomy: ${category.taxonomy}\n` +
              '\n' +
              (category.description ? `**Description:**\n${category.description}` : 'No description available.')
      }]
    };
  } catch (error) {
    debug('Error getting category:', error);
    throw new Error(`Failed to get category: ${error.message}`);
  }
}

export async function handleCreateCategory(apiClient, args) {
  try {
    debug('Creating category with name:', args.name);
    
    const categoryData = {
      name: args.name
    };
    
    // Add optional fields if provided
    if (args.slug) categoryData.slug = args.slug;
    if (args.parent) categoryData.parent = args.parent;
    if (args.description) categoryData.description = args.description;
    if (args.meta) categoryData.meta = args.meta;
    
    const category = await apiClient.createCategory(categoryData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Category created successfully!\n\n` +
              `**${category.name}** (ID: ${category.id})\n` +
              `Slug: ${category.slug}\n` +
              `Parent: ${category.parent || 'None'}\n` +
              `Link: ${category.link}\n` +
              `Edit URL: ${category.link.replace(/\/$/, '')}/wp-admin/term.php?taxonomy=category&tag_ID=${category.id}`
      }]
    };
  } catch (error) {
    debug('Error creating category:', error);
    throw new Error(`Failed to create category: ${error.message}`);
  }
}

export async function handleUpdateCategory(apiClient, args) {
  try {
    debug('Updating category with ID:', args.id);
    
    const { id, ...updateData } = args;
    const category = await apiClient.updateCategory(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Category updated successfully!\n\n` +
              `**${category.name}** (ID: ${category.id})\n` +
              `Slug: ${category.slug}\n` +
              `Parent: ${category.parent || 'None'}\n` +
              `Link: ${category.link}`
      }]
    };
  } catch (error) {
    debug('Error updating category:', error);
    throw new Error(`Failed to update category: ${error.message}`);
  }
}

export async function handleDeleteCategory(apiClient, args) {
  try {
    debug('Deleting category with ID:', args.id);
    
    if (!args.force) {
      throw new Error('Categories cannot be trashed, force parameter must be true');
    }
    
    const result = await apiClient.deleteCategory(args.id, args.force);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Category permanently deleted (ID: ${args.id})\n\n` +
              'Posts previously assigned to this category will be moved to the "Uncategorized" category.'
      }]
    };
  } catch (error) {
    debug('Error deleting category:', error);
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

export async function handleListTags(apiClient, args) {
  try {
    debug('Listing tags with args:', args);
    
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (args.page) params.append('page', args.page.toString());
    if (args.per_page) params.append('per_page', args.per_page.toString());
    
    // Add filtering parameters
    if (args.search) params.append('search', args.search);
    if (args.hide_empty !== undefined) params.append('hide_empty', args.hide_empty.toString());
    if (args.orderby) params.append('orderby', args.orderby);
    if (args.order) params.append('order', args.order);
    
    // Handle array parameters
    if (args.exclude && args.exclude.length > 0) {
      params.append('exclude', args.exclude.join(','));
    }
    if (args.include && args.include.length > 0) {
      params.append('include', args.include.join(','));
    }
    
    const tags = await apiClient.listTags(params);
    
    return {
      content: [{
        type: 'text',
        text: `Found ${tags.length} tags:\n\n` + 
              tags.map(tag => 
                `**${tag.name}** (ID: ${tag.id})\n` +
                `Slug: ${tag.slug}\n` +
                `Count: ${tag.count} posts\n` +
                `Link: ${tag.link}\n` +
                (tag.description ? `Description: ${tag.description}\n` : '') +
                '---'
              ).join('\n')
      }]
    };
  } catch (error) {
    debug('Error listing tags:', error);
    throw new Error(`Failed to list tags: ${error.message}`);
  }
}

export async function handleGetTag(apiClient, args) {
  try {
    debug('Getting tag with ID:', args.id);
    
    const tag = await apiClient.getTag(args.id, args.context);
    
    return {
      content: [{
        type: 'text',
        text: `**${tag.name}** (ID: ${tag.id})\n\n` +
              `Slug: ${tag.slug}\n` +
              `Count: ${tag.count} posts\n` +
              `Link: ${tag.link}\n` +
              `Taxonomy: ${tag.taxonomy}\n` +
              '\n' +
              (tag.description ? `**Description:**\n${tag.description}` : 'No description available.')
      }]
    };
  } catch (error) {
    debug('Error getting tag:', error);
    throw new Error(`Failed to get tag: ${error.message}`);
  }
}

export async function handleCreateTag(apiClient, args) {
  try {
    debug('Creating tag with name:', args.name);
    
    const tagData = {
      name: args.name
    };
    
    // Add optional fields if provided
    if (args.slug) tagData.slug = args.slug;
    if (args.description) tagData.description = args.description;
    if (args.meta) tagData.meta = args.meta;
    
    const tag = await apiClient.createTag(tagData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Tag created successfully!\n\n` +
              `**${tag.name}** (ID: ${tag.id})\n` +
              `Slug: ${tag.slug}\n` +
              `Link: ${tag.link}\n` +
              `Edit URL: ${tag.link.replace(/\/$/, '')}/wp-admin/term.php?taxonomy=post_tag&tag_ID=${tag.id}`
      }]
    };
  } catch (error) {
    debug('Error creating tag:', error);
    throw new Error(`Failed to create tag: ${error.message}`);
  }
}

export async function handleUpdateTag(apiClient, args) {
  try {
    debug('Updating tag with ID:', args.id);
    
    const { id, ...updateData } = args;
    const tag = await apiClient.updateTag(id, updateData);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Tag updated successfully!\n\n` +
              `**${tag.name}** (ID: ${tag.id})\n` +
              `Slug: ${tag.slug}\n` +
              `Link: ${tag.link}`
      }]
    };
  } catch (error) {
    debug('Error updating tag:', error);
    throw new Error(`Failed to update tag: ${error.message}`);
  }
}

export async function handleDeleteTag(apiClient, args) {
  try {
    debug('Deleting tag with ID:', args.id);
    
    if (!args.force) {
      throw new Error('Tags cannot be trashed, force parameter must be true');
    }
    
    const result = await apiClient.deleteTag(args.id, args.force);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Tag permanently deleted (ID: ${args.id})\n\n` +
              'Posts previously tagged with this tag will no longer be associated with it.'
      }]
    };
  } catch (error) {
    debug('Error deleting tag:', error);
    throw new Error(`Failed to delete tag: ${error.message}`);
  }
}
