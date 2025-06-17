/**
 * WordPress Taxonomies Tools (Categories & Tags)
 */

import type { MCPTool, MCPToolHandlerWithClient } from '../types/mcp.js';
import type { IWordPressClient, WordPressCategory, WordPressTag, CreateCategoryRequest, CreateTagRequest, UpdateCategoryRequest, UpdateTagRequest } from '../types/index.js';
import { startTimer } from '../utils/debug.js';

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

// Categories
export const listCategories: MCPTool = {
  name: 'wp_list_categories',
  description: 'List WordPress categories',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search categories' },
      parent: { type: 'number', description: 'Parent category ID' },
      hide_empty: { type: 'boolean', description: 'Hide empty categories' }
    }
  }
};

export const getCategory: MCPTool = {
  name: 'wp_get_category',
  description: 'Get a specific WordPress category by ID',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'number', description: 'Category ID', minimum: 1 } },
    required: ['id']
  }
};

export const createCategory: MCPTool = {
  name: 'wp_create_category',
  description: 'Create a new WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Category name' },
      description: { type: 'string', description: 'Category description' },
      slug: { type: 'string', description: 'Category slug' },
      parent: { type: 'number', description: 'Parent category ID' }
    },
    required: ['name']
  }
};

export const updateCategory: MCPTool = {
  name: 'wp_update_category',
  description: 'Update an existing WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Category ID', minimum: 1 },
      name: { type: 'string', description: 'Category name' },
      description: { type: 'string', description: 'Category description' },
      slug: { type: 'string', description: 'Category slug' },
      parent: { type: 'number', description: 'Parent category ID' }
    },
    required: ['id']
  }
};

export const deleteCategory: MCPTool = {
  name: 'wp_delete_category',
  description: 'Delete a WordPress category',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Category ID', minimum: 1 },
      force: { type: 'boolean', description: 'Force permanent deletion' }
    },
    required: ['id']
  }
};

// Tags
export const listTags: MCPTool = {
  name: 'wp_list_tags',
  description: 'List WordPress tags',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search tags' },
      hide_empty: { type: 'boolean', description: 'Hide empty tags' }
    }
  }
};

export const getTag: MCPTool = {
  name: 'wp_get_tag',
  description: 'Get a specific WordPress tag by ID',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'number', description: 'Tag ID', minimum: 1 } },
    required: ['id']
  }
};

export const createTag: MCPTool = {
  name: 'wp_create_tag',
  description: 'Create a new WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Tag name' },
      description: { type: 'string', description: 'Tag description' },
      slug: { type: 'string', description: 'Tag slug' }
    },
    required: ['name']
  }
};

export const updateTag: MCPTool = {
  name: 'wp_update_tag',
  description: 'Update an existing WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Tag ID', minimum: 1 },
      name: { type: 'string', description: 'Tag name' },
      description: { type: 'string', description: 'Tag description' },
      slug: { type: 'string', description: 'Tag slug' }
    },
    required: ['id']
  }
};

export const deleteTag: MCPTool = {
  name: 'wp_delete_tag',
  description: 'Delete a WordPress tag',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Tag ID', minimum: 1 },
      force: { type: 'boolean', description: 'Force permanent deletion' }
    },
    required: ['id']
  }
};

// Category Handlers
export const handleListCategories: MCPToolHandlerWithClient<IWordPressClient, any> = async (client, args) => {
  const timer = startTimer('List Categories');
  try {
    const categories = await client.getCategories(args);
    const categoryList = categories.map(cat => 
      `**${cat.name}** (ID: ${cat.id})\nSlug: ${cat.slug}\nCount: ${cat.count}\nParent: ${cat.parent || 'None'}`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${categories.length} categories:\n\n${categoryList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to list categories: ${(error as Error).message}`);
  }
};

export const handleGetCategory: MCPToolHandlerWithClient<IWordPressClient, {id: number}> = async (client, args) => {
  const timer = startTimer('Get Category');
  try {
    const category = await client.getCategory(args.id);
    const result = `**${category.name}** (ID: ${category.id})\nSlug: ${category.slug}\nDescription: ${category.description || 'None'}\nCount: ${category.count}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get category: ${(error as Error).message}`);
  }
};

export const handleCreateCategory: MCPToolHandlerWithClient<IWordPressClient, CreateCategoryRequest> = async (client, args) => {
  const timer = startTimer('Create Category');
  try {
    const category = await client.createCategory(args);
    const result = `✅ Category created successfully!\nName: ${category.name}\nID: ${category.id}\nSlug: ${category.slug}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create category: ${(error as Error).message}`);
  }
};

export const handleUpdateCategory: MCPToolHandlerWithClient<IWordPressClient, UpdateCategoryRequest> = async (client, args) => {
  const timer = startTimer('Update Category');
  try {
    const category = await client.updateCategory(args);
    const result = `✅ Category updated successfully!\nName: ${category.name}\nID: ${category.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update category: ${(error as Error).message}`);
  }
};

export const handleDeleteCategory: MCPToolHandlerWithClient<IWordPressClient, {id: number, force?: boolean}> = async (client, args) => {
  const timer = startTimer('Delete Category');
  try {
    await client.deleteCategory(args.id, args.force);
    const result = `✅ Category deleted successfully!\nCategory ID: ${args.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete category: ${(error as Error).message}`);
  }
};

// Tag Handlers
export const handleListTags: MCPToolHandlerWithClient<IWordPressClient, any> = async (client, args) => {
  const timer = startTimer('List Tags');
  try {
    const tags = await client.getTags(args);
    const tagList = tags.map(tag => 
      `**${tag.name}** (ID: ${tag.id})\nSlug: ${tag.slug}\nCount: ${tag.count}`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${tags.length} tags:\n\n${tagList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to list tags: ${(error as Error).message}`);
  }
};

export const handleGetTag: MCPToolHandlerWithClient<IWordPressClient, {id: number}> = async (client, args) => {
  const timer = startTimer('Get Tag');
  try {
    const tag = await client.getTag(args.id);
    const result = `**${tag.name}** (ID: ${tag.id})\nSlug: ${tag.slug}\nDescription: ${tag.description || 'None'}\nCount: ${tag.count}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get tag: ${(error as Error).message}`);
  }
};

export const handleCreateTag: MCPToolHandlerWithClient<IWordPressClient, CreateTagRequest> = async (client, args) => {
  const timer = startTimer('Create Tag');
  try {
    const tag = await client.createTag(args);
    const result = `✅ Tag created successfully!\nName: ${tag.name}\nID: ${tag.id}\nSlug: ${tag.slug}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create tag: ${(error as Error).message}`);
  }
};

export const handleUpdateTag: MCPToolHandlerWithClient<IWordPressClient, UpdateTagRequest> = async (client, args) => {
  const timer = startTimer('Update Tag');
  try {
    const tag = await client.updateTag(args);
    const result = `✅ Tag updated successfully!\nName: ${tag.name}\nID: ${tag.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update tag: ${(error as Error).message}`);
  }
};

export const handleDeleteTag: MCPToolHandlerWithClient<IWordPressClient, {id: number, force?: boolean}> = async (client, args) => {
  const timer = startTimer('Delete Tag');
  try {
    await client.deleteTag(args.id, args.force);
    const result = `✅ Tag deleted successfully!\nTag ID: ${args.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete tag: ${(error as Error).message}`);
  }
};