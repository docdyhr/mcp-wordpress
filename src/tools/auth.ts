/**
 * WordPress Authentication Tools
 */

import type { MCPTool, MCPToolHandlerWithClient } from '../types/mcp.js';
import type { IWordPressClient, AuthConfig, AuthMethod } from '../types/index.js';
import { WordPressAuth } from '../client/auth.js';
import { startTimer } from '../utils/debug.js';

const createSuccessResponse = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: false as const });
const createErrorResponse = (error: string | Error) => ({ content: [{ type: 'text' as const, text: typeof error === 'string' ? error : error.message }], isError: true as const });

export const testAuth: MCPTool = {
  name: 'wp_test_auth',
  description: 'Test WordPress authentication and connectivity',
  inputSchema: { type: 'object', properties: {} }
};

export const getAuthStatus: MCPTool = {
  name: 'wp_get_auth_status',
  description: 'Get current WordPress authentication status',
  inputSchema: { type: 'object', properties: {} }
};

export const startOAuthFlow: MCPTool = {
  name: 'wp_start_oauth_flow',
  description: 'Start OAuth 2.0 authentication flow',
  inputSchema: { type: 'object', properties: {} }
};

export const completeOAuthFlow: MCPTool = {
  name: 'wp_complete_oauth_flow',
  description: 'Complete OAuth 2.0 authentication flow',
  inputSchema: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'OAuth authorization code' },
      state: { type: 'string', description: 'OAuth state parameter' }
    },
    required: ['code', 'state']
  }
};

export const refreshOAuthToken: MCPTool = {
  name: 'wp_refresh_oauth_token',
  description: 'Refresh OAuth access token',
  inputSchema: { type: 'object', properties: {} }
};

export const switchAuthMethod: MCPTool = {
  name: 'wp_switch_auth_method',
  description: 'Switch to a different authentication method',
  inputSchema: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['app-password', 'jwt', 'basic', 'api-key', 'cookie'], description: 'Authentication method' },
      username: { type: 'string', description: 'Username (for basic/app-password)' },
      password: { type: 'string', description: 'Password or app password' },
      api_key: { type: 'string', description: 'API key (for api-key method)' },
      secret: { type: 'string', description: 'JWT secret (for jwt method)' },
      nonce: { type: 'string', description: 'Nonce (for cookie method)' }
    },
    required: ['method']
  }
};

export const handleTestAuth: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Test Auth');
  try {
    const auth = new WordPressAuth(client);
    const isValid = await auth.validateAuth();
    
    if (isValid) {
      const user = await client.getCurrentUser();
      const result = `✅ **Authentication successful!**\n\n` +
                     `**Method:** ${client.config.auth.method}\n` +
                     `**User:** ${user.name} (@${user.username})\n` +
                     `**Roles:** ${user.roles ? user.roles.join(', ') : 'Unknown'}\n` +
                     `**Site:** ${client.config.baseUrl}\n\n` +
                     `Your WordPress connection is working properly.`;
      timer.endWithLog();
      return createSuccessResponse(result);
    } else {
      timer.end();
      return createErrorResponse('Authentication failed. Please check your credentials.');
    }
  } catch (error) {
    timer.end();
    return createErrorResponse(`Authentication test failed: ${(error as Error).message}`);
  }
};

export const handleGetAuthStatus: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Get Auth Status');
  try {
    const auth = new WordPressAuth(client);
    const status = await auth.getAuthStatus();
    
    const result = `**Authentication Status**\n\n` +
                   `**Authenticated:** ${status.authenticated ? '✅ Yes' : '❌ No'}\n` +
                   `**Method:** ${status.method}\n` +
                   `**Site:** ${client.config.baseUrl}\n` +
                   (status.user ? `**User:** ${status.user.name} (@${status.user.username})\n**Roles:** ${status.user.roles ? status.user.roles.join(', ') : 'Unknown'}\n` : '') +
                   (status.error ? `**Error:** ${status.error}\n` : '') +
                   `\n**Setup Required:** ${auth.requiresSetup() ? 'Yes' : 'No'}`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to get auth status: ${(error as Error).message}`);
  }
};

export const handleStartOAuthFlow: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Start OAuth Flow');
  try {
    const auth = new WordPressAuth(client);
    const flow = await auth.startOAuthFlow();
    
    const result = `**OAuth 2.0 Authentication Flow Started**\n\n` +
                   `**Authorization URL:** ${flow.authUrl}\n` +
                   `**State:** ${flow.state}\n\n` +
                   `1. Visit the authorization URL above\n` +
                   `2. Grant permissions to the application\n` +
                   `3. You will be redirected with an authorization code\n` +
                   `4. Use the \`wp_complete_oauth_flow\` tool with the code and state`;
    
    timer.endWithLog();
    return createSuccessResponse(result);
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to start OAuth flow: ${(error as Error).message}`);
  }
};

export const handleCompleteOAuthFlow: MCPToolHandlerWithClient<IWordPressClient, {code: string, state: string}> = async (client, args) => {
  const timer = startTimer('Complete OAuth Flow');
  try {
    const auth = new WordPressAuth(client);
    const success = await auth.completeOAuthFlow(args.code, args.state);
    
    if (success) {
      const result = `✅ **OAuth authentication completed successfully!**\n\nYou are now authenticated and can use all WordPress tools.`;
      timer.endWithLog();
      return createSuccessResponse(result);
    } else {
      timer.end();
      return createErrorResponse('OAuth flow completion failed');
    }
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to complete OAuth flow: ${(error as Error).message}`);
  }
};

export const handleRefreshOAuthToken: MCPToolHandlerWithClient<IWordPressClient, {}> = async (client) => {
  const timer = startTimer('Refresh OAuth Token');
  try {
    const auth = new WordPressAuth(client);
    const success = await auth.refreshAuth();
    
    if (success) {
      const result = `✅ **OAuth token refreshed successfully!**\n\nYour authentication has been renewed.`;
      timer.endWithLog();
      return createSuccessResponse(result);
    } else {
      timer.end();
      return createErrorResponse('Token refresh failed');
    }
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to refresh OAuth token: ${(error as Error).message}`);
  }
};

export const handleSwitchAuthMethod: MCPToolHandlerWithClient<IWordPressClient, {method: AuthMethod, username?: string, password?: string, api_key?: string, secret?: string, nonce?: string}> = async (client, args) => {
  const timer = startTimer('Switch Auth Method');
  try {
    const newConfig: AuthConfig = {
      method: args.method,
      ...(args.username && { username: args.username }),
      ...(args.password && { password: args.password }),
      ...(args.api_key && { apiKey: args.api_key }),
      ...(args.secret && { secret: args.secret }),
      ...(args.nonce && { nonce: args.nonce })
    };
    
    const auth = new WordPressAuth(client);
    const success = await auth.switchAuthMethod(newConfig);
    
    if (success) {
      const result = `✅ **Authentication method switched successfully!**\n\n` +
                     `**New Method:** ${args.method}\n` +
                     `**Status:** Authenticated\n\n` +
                     `You can now use all WordPress tools with the new authentication method.`;
      timer.endWithLog();
      return createSuccessResponse(result);
    } else {
      timer.end();
      return createErrorResponse('Failed to switch authentication method');
    }
  } catch (error) {
    timer.end();
    return createErrorResponse(`Failed to switch auth method: ${(error as Error).message}`);
  }
};