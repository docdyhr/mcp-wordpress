/**
 * WordPress Site Management Tools
 */

import type { MCPTool, MCPToolHandlerWithClient } from '../types/mcp.js';
import type { IWordPressClient, WordPressSiteSettings, WordPressApplicationPassword } from '../types/index.js';
import { startTimer } from '../utils/debug.js';

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

export const getSiteSettings: MCPTool = {
  name: 'wp_get_site_settings',
  description: 'Get WordPress site settings and configuration',
  inputSchema: { type: 'object', properties: {} }
};

export const updateSiteSettings: MCPTool = {
  name: 'wp_update_site_settings',
  description: 'Update WordPress site settings',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Site title' },
      description: { type: 'string', description: 'Site tagline' },
      timezone: { type: 'string', description: 'Site timezone' },
      date_format: { type: 'string', description: 'Date format' },
      time_format: { type: 'string', description: 'Time format' },
      start_of_week: { type: 'number', minimum: 0, maximum: 6, description: 'Start of week (0=Sunday)' }
    }
  }
};

export const getSiteStats: MCPTool = {
  name: 'wp_get_site_stats',
  description: 'Get WordPress site statistics and information',
  inputSchema: { type: 'object', properties: {} }
};

export const searchSite: MCPTool = {
  name: 'wp_search_site',
  description: 'Search content across the WordPress site',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      type: { type: 'array' as any, items: { type: 'string' }, description: 'Content types to search' },
      subtype: { type: 'string', description: 'Content subtype' }
    },
    required: ['query']
  }
};

export const getApplicationPasswords: MCPTool = {
  name: 'wp_get_application_passwords',
  description: 'Get application passwords for current user',
  inputSchema: {
    type: 'object',
    properties: {
      user_id: { type: ['number', 'string'] as any, description: 'User ID or "me" for current user' }
    }
  }
};

export const createApplicationPassword: MCPTool = {
  name: 'wp_create_application_password',
  description: 'Create a new application password',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Application name' },
      app_id: { type: 'string', description: 'Application ID (optional)' },
      user_id: { type: ['number', 'string'] as any, description: 'User ID or "me" for current user' }
    },
    required: ['name']
  }
};

export const deleteApplicationPassword: MCPTool = {
  name: 'wp_delete_application_password',
  description: 'Delete an application password',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: { type: 'string', description: 'Application password UUID' },
      user_id: { type: ['number', 'string'] as any, description: 'User ID or "me" for current user' }
    },
    required: ['uuid']
  }
};

// Handlers
export const handleGetSiteSettings: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Get Site Settings');
  try {
    const settings = await client.getSiteSettings();
    const result = `**WordPress Site Settings**\n\n` +
                   `**Title:** ${settings.title}\n` +
                   `**Description:** ${settings.description}\n` +
                   `**URL:** ${settings.url}\n` +
                   `**Email:** ${settings.email}\n` +
                   `**Timezone:** ${settings.timezone}\n` +
                   `**Date Format:** ${settings.date_format}\n` +
                   `**Time Format:** ${settings.time_format}\n` +
                   `**Start of Week:** ${settings.start_of_week}\n` +
                   `**Language:** ${settings.language}\n` +
                   `**Posts per Page:** ${settings.posts_per_page}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get site settings: ${(error as Error).message}`);
  }
};

export const handleUpdateSiteSettings: MCPToolHandlerWithClient<IWordPressClient, Partial<WordPressSiteSettings>> = async (client, args) => {
  const timer = startTimer('Update Site Settings');
  try {
    const settings = await client.updateSiteSettings(args);
    const result = `✅ Site settings updated successfully!\n\nUpdated settings:\n${Object.entries(args).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update site settings: ${(error as Error).message}`);
  }
};

export const handleGetSiteStats: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Get Site Stats');
  try {
    const [siteInfo, posts, pages, users] = await Promise.all([
      client.getSiteInfo(),
      client.getPosts({ per_page: 1 }),
      client.getPages({ per_page: 1 }),
      client.getUsers({ per_page: 1 })
    ]);
    
    const result = `**WordPress Site Statistics**\n\n` +
                   `**Site Name:** ${siteInfo.name || 'Unknown'}\n` +
                   `**Description:** ${siteInfo.description || 'None'}\n` +
                   `**Posts:** ${posts.length > 0 ? 'Available' : '0'}\n` +
                   `**Pages:** ${pages.length > 0 ? 'Available' : '0'}\n` +
                   `**Users:** ${users.length > 0 ? 'Available' : '0'}\n` +
                   `**WordPress REST API:** Available\n` +
                   `**Namespaces:** ${siteInfo.namespaces ? siteInfo.namespaces.join(', ') : 'Unknown'}`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get site stats: ${(error as Error).message}`);
  }
};

export const handleSearchSite: MCPToolHandlerWithClient<IWordPressClient, {query: string, type?: string[], subtype?: string}> = async (client, args) => {
  const timer = startTimer('Search Site');
  try {
    const results = await client.search(args.query, args.type, args.subtype);
    
    if (results.length === 0) {
      return createSuccessResponse(`No results found for "${args.query}"`);
    }
    
    const resultsList = results.map(result => 
      `**${result.title}** (${result.type})\nURL: ${result.url}`
    ).join('\n\n');
    
    const summary = `Found ${results.length} results for "${args.query}":\n\n${resultsList}`;
    timer.endWithLog();
    return createSuccessResponse(summary);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to search site: ${(error as Error).message}`);
  }
};

export const handleGetApplicationPasswords: MCPToolHandlerWithClient<IWordPressClient, {user_id?: number | 'me'}> = async (client, args) => {
  const timer = startTimer('Get Application Passwords');
  try {
    const passwords = await client.getApplicationPasswords(args.user_id || 'me');
    
    if (passwords.length === 0) {
      return createSuccessResponse('No application passwords found');
    }
    
    const passwordList = passwords.map(pwd => 
      `**${pwd.name}** (${pwd.uuid})\nCreated: ${new Date(pwd.created).toLocaleDateString()}\nLast Used: ${pwd.last_used ? new Date(pwd.last_used).toLocaleDateString() : 'Never'}`
    ).join('\n\n');
    
    timer.endWithLog();
    return createSuccessResponse(`Found ${passwords.length} application passwords:\n\n${passwordList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get application passwords: ${(error as Error).message}`);
  }
};

export const handleCreateApplicationPassword: MCPToolHandlerWithClient<IWordPressClient, {name: string, app_id?: string, user_id?: number | 'me'}> = async (client, args) => {
  const timer = startTimer('Create Application Password');
  try {
    const password = await client.createApplicationPassword(args.user_id || 'me', args.name, args.app_id);
    const result = `✅ Application password created successfully!\n\n` +
                   `**Name:** ${password.name}\n` +
                   `**UUID:** ${password.uuid}\n` +
                   `**Password:** ${password.password || 'Hidden'}\n\n` +
                   `⚠️ **Important:** Save this password now! You won't be able to see it again.`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create application password: ${(error as Error).message}`);
  }
};

export const handleDeleteApplicationPassword: MCPToolHandlerWithClient<IWordPressClient, {uuid: string, user_id?: number | 'me'}> = async (client, args) => {
  const timer = startTimer('Delete Application Password');
  try {
    await client.deleteApplicationPassword(args.user_id || 'me', args.uuid);
    const result = `✅ Application password deleted successfully!\nUUID: ${args.uuid}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete application password: ${(error as Error).message}`);
  }
};