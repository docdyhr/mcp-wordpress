/**
 * WordPress Users Tools
 */

import type {
  MCPTool,
  MCPToolHandlerWithClient,
  MCPToolResponse
} from '../types/mcp.js';
import type {
  IWordPressClient,
  WordPressUser,
  UserQueryParams,
  CreateUserRequest,
  UpdateUserRequest,
  UserRole
} from '../types/index.js';
import { debug, logError, startTimer } from '../utils/debug.js';

interface ListUsersArgs extends UserQueryParams {}
interface GetUserArgs { id: number | 'me'; context?: 'view' | 'embed' | 'edit'; }
interface CreateUserArgs extends CreateUserRequest {}
interface UpdateUserArgs extends UpdateUserRequest {}
interface DeleteUserArgs { id: number; reassign?: number; }

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

export const listUsers: MCPTool = {
  name: 'wp_list_users',
  description: 'List WordPress users with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search users by name or email' },
      roles: { type: 'array', items: { type: 'string' }, description: 'Filter by user roles' },
      orderby: { type: 'string', enum: ['id', 'name', 'email', 'registered'], description: 'Sort field' },
      order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' }
    }
  }
};

export const getUser: MCPTool = {
  name: 'wp_get_user',
  description: 'Get a specific WordPress user by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: ['number', 'string'] as any, description: 'User ID or "me" for current user' },
      context: { type: 'string', enum: ['view', 'embed', 'edit'], description: 'Request context' }
    },
    required: ['id']
  }
};

export const createUser: MCPTool = {
  name: 'wp_create_user',
  description: 'Create a new WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      username: { type: 'string', description: 'Username (required)' },
      email: { type: 'string', format: 'email', description: 'Email address (required)' },
      password: { type: 'string', description: 'Password (required)' },
      name: { type: 'string', description: 'Display name' },
      first_name: { type: 'string', description: 'First name' },
      last_name: { type: 'string', description: 'Last name' },
      roles: { type: 'array', items: { type: 'string' }, description: 'User roles' }
    },
    required: ['username', 'email', 'password']
  }
};

export const updateUser: MCPTool = {
  name: 'wp_update_user',
  description: 'Update an existing WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'User ID', minimum: 1 },
      email: { type: 'string', format: 'email', description: 'Email address' },
      name: { type: 'string', description: 'Display name' },
      first_name: { type: 'string', description: 'First name' },
      last_name: { type: 'string', description: 'Last name' },
      roles: { type: 'array', items: { type: 'string' }, description: 'User roles' }
    },
    required: ['id']
  }
};

export const deleteUser: MCPTool = {
  name: 'wp_delete_user',
  description: 'Delete a WordPress user',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'User ID', minimum: 1 },
      reassign: { type: 'number', description: 'Reassign content to this user ID' }
    },
    required: ['id']
  }
};

export const getCurrentUser: MCPTool = {
  name: 'wp_get_current_user',
  description: 'Get current authenticated user information',
  inputSchema: { type: 'object', properties: {} }
};

export const handleListUsers: MCPToolHandlerWithClient<IWordPressClient, ListUsersArgs> = async (client, args) => {
  const timer = startTimer('List Users');
  try {
    const users = await client.getUsers(args);
    const userList = users.map(user => 
      `**${user.name}** (@${user.username}) - ${user.email}\nRoles: ${user.roles ? user.roles.join(', ') : 'Unknown'}\nRegistered: ${new Date(user.registered_date).toLocaleDateString()}`
    ).join('\n\n');
    timer.endWithLog();
    return createSuccessResponse(`Found ${users.length} users:\n\n${userList}`);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to list users: ${(error as Error).message}`);
  }
};

export const handleGetUser: MCPToolHandlerWithClient<IWordPressClient, GetUserArgs> = async (client, args) => {
  const timer = startTimer('Get User');
  try {
    const user = await client.getUser(args.id, args.context);
    const result = `**${user.name}** (@${user.username})\n` +
                   `Email: ${user.email}\n` +
                   `Roles: ${user.roles ? user.roles.join(', ') : 'Unknown'}\n` +
                   `Registered: ${new Date(user.registered_date).toLocaleDateString()}\n` +
                   `URL: ${user.url || 'None'}\n` +
                   `Description: ${user.description || 'None'}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get user: ${(error as Error).message}`);
  }
};

export const handleCreateUser: MCPToolHandlerWithClient<IWordPressClient, CreateUserArgs> = async (client, args) => {
  const timer = startTimer('Create User');
  try {
    const user = await client.createUser(args);
    const result = `✅ User created successfully!\n\n` +
                   `Name: ${user.name}\nUsername: ${user.username}\nEmail: ${user.email}\nID: ${user.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to create user: ${(error as Error).message}`);
  }
};

export const handleUpdateUser: MCPToolHandlerWithClient<IWordPressClient, UpdateUserArgs> = async (client, args) => {
  const timer = startTimer('Update User');
  try {
    const user = await client.updateUser(args);
    const result = `✅ User updated successfully!\n\nName: ${user.name}\nEmail: ${user.email}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to update user: ${(error as Error).message}`);
  }
};

export const handleDeleteUser: MCPToolHandlerWithClient<IWordPressClient, DeleteUserArgs> = async (client, args) => {
  const timer = startTimer('Delete User');
  try {
    await client.deleteUser(args.id, args.reassign);
    const result = `✅ User deleted successfully!\nUser ID: ${args.id}` +
                   (args.reassign ? `\nContent reassigned to user: ${args.reassign}` : '');
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to delete user: ${(error as Error).message}`);
  }
};

export const handleGetCurrentUser: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Get Current User');
  try {
    const user = await client.getCurrentUser();
    const result = `**Current User: ${user.name}** (@${user.username})\n` +
                   `Email: ${user.email}\nRoles: ${user.roles.join(', ')}\nID: ${user.id}`;
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get current user: ${(error as Error).message}`);
  }
};