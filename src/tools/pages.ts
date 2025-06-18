/**
 * WordPress Pages Tools
 */

import type {
  MCPTool,
  MCPToolHandlerWithClient,
  MCPToolResponse
} from '../types/mcp.js';
import type {
  IWordPressClient,
  WordPressPage,
  PostQueryParams,
  CreatePageRequest,
  UpdatePageRequest
} from '../types/index.js';
import { debug, logError, startTimer } from '../utils/debug.js';

interface ListPagesArgs extends PostQueryParams {}
interface GetPageArgs { id: number; context?: 'view' | 'embed' | 'edit'; }
interface CreatePageArgs extends CreatePageRequest {}
interface UpdatePageArgs extends UpdatePageRequest {}
interface DeletePageArgs { id: number; force?: boolean; }
interface GetPageRevisionsArgs { id: number; }

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

export const listPages: MCPTool = {
  name: 'wp_list_pages',
  description: 'List WordPress pages with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search pages' },
      status: { type: 'string', enum: ['publish', 'draft', 'private'], description: 'Page status' },
      parent: { type: 'number', description: 'Parent page ID' },
      orderby: { type: 'string', enum: ['date', 'title', 'menu_order'], description: 'Sort field' },
      order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' }
    }
  }
};

export const getPage: MCPTool = {
  name: 'wp_get_page',
  description: 'Get a specific WordPress page by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Page ID', minimum: 1 },
      context: { type: 'string', enum: ['view', 'embed', 'edit'], description: 'Request context' }
    },
    required: ['id']
  }
};

export const createPage: MCPTool = {
  name: 'wp_create_page',
  description: 'Create a new WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Page title' },
      content: { type: 'string', description: 'Page content in HTML format (WordPress-compatible HTML markup is required, not Markdown)' },
      status: { type: 'string', enum: ['publish', 'draft', 'private'], description: 'Page status' },
      parent: { type: 'number', description: 'Parent page ID' },
      menu_order: { type: 'number', description: 'Menu order' },
      slug: { type: 'string', description: 'Page slug' }
    }
  }
};

export const updatePage: MCPTool = {
  name: 'wp_update_page',
  description: 'Update an existing WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Page ID', minimum: 1 },
      title: { type: 'string', description: 'Page title' },
      content: { type: 'string', description: 'Page content in HTML format (WordPress-compatible HTML markup is required, not Markdown)' },
      status: { type: 'string', enum: ['publish', 'draft', 'private'], description: 'Page status' },
      parent: { type: 'number', description: 'Parent page ID' },
      menu_order: { type: 'number', description: 'Menu order' }
    },
    required: ['id']
  }
};

export const deletePage: MCPTool = {
  name: 'wp_delete_page',
  description: 'Delete a WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Page ID', minimum: 1 },
      force: { type: 'boolean', description: 'Force permanent deletion' }
    },
    required: ['id']
  }
};

export const getPageRevisions: MCPTool = {
  name: 'wp_get_page_revisions',
  description: 'Get revision history for a WordPress page',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Page ID', minimum: 1 }
    },
    required: ['id']
  }
};

export const handleListPages: MCPToolHandlerWithClient<IWordPressClient, ListPagesArgs> = async (client, args) => {
  const timer = startTimer('List Pages');
  try {
    const pages = await client.getPages(args);
    const pagesList = pages.map(page => 
      `**${page.title.rendered}** (ID: ${page.id})\nStatus: ${page.status} | Parent: ${page.parent || 'None'}\nSlug: ${page.slug}`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${pages.length} pages:\n\n${pagesList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to list pages: ${(error as Error).message}`);
  }
};

export const handleGetPage: MCPToolHandlerWithClient<IWordPressClient, GetPageArgs> = async (client, args) => {
  const timer = startTimer('Get Page');
  try {
    const page = await client.getPage(args.id, args.context);
    const result = `**${page.title.rendered}** (ID: ${page.id})\n` +
                   `Status: ${page.status}\nSlug: ${page.slug}\nParent: ${page.parent || 'None'}\n` +
                   `Menu Order: ${page.menu_order}\nLink: ${page.link}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get page: ${(error as Error).message}`);
  }
};

export const handleCreatePage: MCPToolHandlerWithClient<IWordPressClient, CreatePageArgs> = async (client, args) => {
  const timer = startTimer('Create Page');
  try {
    const page = await client.createPage(args);
    const result = `✅ Page created successfully!\n\nTitle: ${page.title.rendered}\nID: ${page.id}\nSlug: ${page.slug}\nLink: ${page.link}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create page: ${(error as Error).message}`);
  }
};

export const handleUpdatePage: MCPToolHandlerWithClient<IWordPressClient, UpdatePageArgs> = async (client, args) => {
  const timer = startTimer('Update Page');
  try {
    const page = await client.updatePage(args);
    const result = `✅ Page updated successfully!\n\nTitle: ${page.title.rendered}\nID: ${page.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update page: ${(error as Error).message}`);
  }
};

export const handleDeletePage: MCPToolHandlerWithClient<IWordPressClient, DeletePageArgs> = async (client, args) => {
  const timer = startTimer('Delete Page');
  try {
    await client.deletePage(args.id, args.force);
    const action = args.force ? 'permanently deleted' : 'moved to trash';
    const result = `✅ Page ${action} successfully!\nPage ID: ${args.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete page: ${(error as Error).message}`);
  }
};

export const handleGetPageRevisions: MCPToolHandlerWithClient<IWordPressClient, GetPageRevisionsArgs> = async (client, args) => {
  const timer = startTimer('Get Page Revisions');
  try {
    const revisions = await client.getPageRevisions(args.id);
    const revisionsList = revisions.map((rev, i) => 
      `Revision ${i + 1} (ID: ${rev.id})\nDate: ${new Date(rev.modified).toLocaleString()}`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${revisions.length} revisions:\n\n${revisionsList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get page revisions: ${(error as Error).message}`);
  }
};