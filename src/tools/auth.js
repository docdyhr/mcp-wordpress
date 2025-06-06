import { debug } from '../utils/debug.js';

/**
 * Test WordPress authentication and connection
 */
export const testAuth = {
  name: 'wp_test_auth',
  description: 'Test WordPress authentication and verify connection to the WordPress site',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Get authentication status and user information
 */
export const getAuthStatus = {
  name: 'wp_get_auth_status',
  description: 'Get current authentication status and authenticated user information',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Start OAuth authentication flow
 */
export const startOAuthFlow = {
  name: 'wp_start_oauth_flow',
  description: 'Start OAuth authentication flow for WordPress (opens browser for authorization)',
  inputSchema: {
    type: 'object',
    properties: {
      client_id: {
        type: 'string',
        description: 'OAuth client ID (if not set in environment)'
      },
      redirect_uri: {
        type: 'string',
        description: 'OAuth redirect URI (if not set in environment)'
      },
      scope: {
        type: 'string',
        description: 'OAuth scope (default: read write)',
        default: 'read write'
      }
    }
  }
};

/**
 * Complete OAuth authentication with authorization code
 */
export const completeOAuthFlow = {
  name: 'wp_complete_oauth_flow',
  description: 'Complete OAuth authentication flow with authorization code received from WordPress',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Authorization code received from WordPress OAuth flow'
      },
      state: {
        type: 'string',
        description: 'State parameter from OAuth flow (for security verification)'
      }
    },
    required: ['code']
  }
};

/**
 * Refresh OAuth access token
 */
export const refreshOAuthToken = {
  name: 'wp_refresh_oauth_token',
  description: 'Refresh OAuth access token using refresh token',
  inputSchema: {
    type: 'object',
    properties: {
      refresh_token: {
        type: 'string',
        description: 'Refresh token (if not available from stored credentials)'
      }
    }
  }
};

/**
 * Switch authentication method
 */
export const switchAuthMethod = {
  name: 'wp_switch_auth_method',
  description: 'Switch to a different authentication method',
  inputSchema: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['application_password', 'jwt', 'oauth', 'cookie'],
        description: 'Authentication method to switch to'
      },
      credentials: {
        type: 'object',
        description: 'Credentials for the new authentication method',
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          application_password: { type: 'string' },
          jwt_token: { type: 'string' },
          oauth_token: { type: 'string' },
          client_id: { type: 'string' },
          client_secret: { type: 'string' }
        }
      }
    },
    required: ['method']
  }
};

/**
 * Implementation functions for authentication tools
 */

export async function handleTestAuth(apiClient, args) {
  try {
    debug('Testing WordPress authentication');
    
    // Try to get current user to test authentication
    const user = await apiClient.getCurrentUser();
    const settings = await apiClient.getSiteSettings();
    
    return {
      content: [{
        type: 'text',
        text: `✅ **Authentication Successful!**\n\n` +
              `**Connected to:** ${settings.title}\n` +
              `**Site URL:** ${settings.url}\n` +
              `**Authenticated as:** ${user.name} (@${user.username})\n` +
              `**User Email:** ${user.email}\n` +
              `**User Roles:** ${user.roles.join(', ')}\n` +
              `**User ID:** ${user.id}\n\n` +
              `**Authentication Method:** ${apiClient.auth.getCurrentMethod()}\n` +
              `**Connection Status:** Active and working\n\n` +
              `You can now use all WordPress MCP tools to manage your site.`
      }]
    };
  } catch (error) {
    debug('Authentication test failed:', error);
    
    let errorMessage = 'Authentication failed. ';
    let suggestions = '';
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage += 'Invalid credentials or authentication method.';
      suggestions = `\n\n**Troubleshooting:**\n` +
                   `1. Check your WordPress URL in WP_URL environment variable\n` +
                   `2. Verify your credentials (username/password or application password)\n` +
                   `3. Ensure your WordPress site has the REST API enabled\n` +
                   `4. For Application Passwords: make sure they're enabled in WordPress\n` +
                   `5. For JWT: verify the JWT plugin is installed and configured\n` +
                   `6. For OAuth: check your client credentials and redirect URI`;
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage += 'Access forbidden. Your account may not have sufficient permissions.';
      suggestions = `\n\n**Troubleshooting:**\n` +
                   `1. Check if your user account has adequate permissions\n` +
                   `2. Verify the REST API is not disabled for your user role\n` +
                   `3. Contact your WordPress administrator if needed`;
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage += 'WordPress site or REST API endpoint not found.';
      suggestions = `\n\n**Troubleshooting:**\n` +
                   `1. Verify the WordPress URL in WP_URL environment variable\n` +
                   `2. Ensure the site is accessible and the REST API is enabled\n` +
                   `3. Check if the site has custom REST API endpoints or modifications`;
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      errorMessage += 'Cannot connect to WordPress site. Network or DNS issue.';
      suggestions = `\n\n**Troubleshooting:**\n` +
                   `1. Check your internet connection\n` +
                   `2. Verify the WordPress URL is correct and accessible\n` +
                   `3. Check if the site is behind a firewall or VPN`;
    }
    
    return {
      content: [{
        type: 'text',
        text: `❌ **${errorMessage}**\n\n` +
              `**Error Details:** ${error.message}${suggestions}`
      }]
    };
  }
}

export async function handleGetAuthStatus(apiClient, args) {
  try {
    debug('Getting authentication status');
    
    const currentMethod = apiClient.auth.getCurrentMethod();
    const isAuthenticated = await apiClient.auth.isAuthenticated();
    
    let statusText = `**WordPress Authentication Status**\n\n`;
    statusText += `**Current Method:** ${currentMethod}\n`;
    statusText += `**Status:** ${isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}\n\n`;
    
    if (isAuthenticated) {
      try {
        const user = await apiClient.getCurrentUser();
        statusText += `**Authenticated User:**\n`;
        statusText += `- Name: ${user.name}\n`;
        statusText += `- Username: ${user.username}\n`;
        statusText += `- Email: ${user.email}\n`;
        statusText += `- Roles: ${user.roles.join(', ')}\n`;
        statusText += `- ID: ${user.id}\n\n`;
      } catch (error) {
        statusText += `**Note:** Could not retrieve user details (${error.message})\n\n`;
      }
    }
    
    // Add method-specific information
    switch (currentMethod) {
      case 'application_password':
        statusText += `**Application Password Authentication**\n`;
        statusText += `- Most secure and recommended method\n`;
        statusText += `- Uses WordPress Application Passwords feature\n`;
        statusText += `- Tokens can be managed in WordPress admin\n`;
        break;
        
      case 'jwt':
        statusText += `**JWT Authentication**\n`;
        statusText += `- Requires JWT Authentication plugin\n`;
        statusText += `- Token-based authentication\n`;
        statusText += `- Tokens expire and need renewal\n`;
        break;
        
      case 'oauth':
        statusText += `**OAuth Authentication**\n`;
        statusText += `- Industry standard OAuth 2.0\n`;
        statusText += `- Requires OAuth application setup\n`;
        statusText += `- Supports token refresh\n`;
        break;
        
      case 'cookie':
        statusText += `**Cookie Authentication**\n`;
        statusText += `- Uses WordPress session cookies\n`;
        statusText += `- Less secure for API access\n`;
        statusText += `- May require nonce handling\n`;
        break;
        
      default:
        statusText += `**Unknown Authentication Method**\n`;
        break;
    }
    
    return {
      content: [{
        type: 'text',
        text: statusText
      }]
    };
  } catch (error) {
    debug('Error getting auth status:', error);
    throw new Error(`Failed to get authentication status: ${error.message}`);
  }
}

export async function handleStartOAuthFlow(apiClient, args) {
  try {
    debug('Starting OAuth flow');
    
    const oauthUrl = await apiClient.auth.startOAuthFlow(args.client_id, args.redirect_uri, args.scope);
    
    return {
      content: [{
        type: 'text',
        text: `**OAuth Authentication Flow Started**\n\n` +
              `Please visit the following URL to authorize access to your WordPress site:\n\n` +
              `${oauthUrl}\n\n` +
              `**Instructions:**\n` +
              `1. Click the URL above or copy it to your browser\n` +
              `2. Log in to your WordPress site if required\n` +
              `3. Review and approve the access permissions\n` +
              `4. You will be redirected with an authorization code\n` +
              `5. Use the wp_complete_oauth_flow tool with the received code\n\n` +
              `**Note:** The authorization code will be in the URL parameter 'code' after redirect.`
      }]
    };
  } catch (error) {
    debug('Error starting OAuth flow:', error);
    throw new Error(`Failed to start OAuth flow: ${error.message}`);
  }
}

export async function handleCompleteOAuthFlow(apiClient, args) {
  try {
    debug('Completing OAuth flow with code');
    
    const tokens = await apiClient.auth.completeOAuthFlow(args.code, args.state);
    
    return {
      content: [{
        type: 'text',
        text: `✅ **OAuth Authentication Completed Successfully!**\n\n` +
              `**Access Token:** Received and stored\n` +
              `**Refresh Token:** ${tokens.refresh_token ? 'Available for token refresh' : 'Not provided'}\n` +
              `**Token Type:** ${tokens.token_type || 'Bearer'}\n` +
              `**Expires In:** ${tokens.expires_in ? `${tokens.expires_in} seconds` : 'No expiration set'}\n` +
              `**Scope:** ${tokens.scope || 'Default scope'}\n\n` +
              `You are now authenticated and can use all WordPress MCP tools.\n` +
              `The access token will be used automatically for subsequent API calls.`
      }]
    };
  } catch (error) {
    debug('Error completing OAuth flow:', error);
    throw new Error(`Failed to complete OAuth flow: ${error.message}`);
  }
}

export async function handleRefreshOAuthToken(apiClient, args) {
  try {
    debug('Refreshing OAuth token');
    
    const tokens = await apiClient.auth.refreshToken(args.refresh_token);
    
    return {
      content: [{
        type: 'text',
        text: `✅ **OAuth Token Refreshed Successfully!**\n\n` +
              `**New Access Token:** Received and stored\n` +
              `**New Refresh Token:** ${tokens.refresh_token ? 'Updated' : 'Same as before'}\n` +
              `**Token Type:** ${tokens.token_type || 'Bearer'}\n` +
              `**Expires In:** ${tokens.expires_in ? `${tokens.expires_in} seconds` : 'No expiration set'}\n\n` +
              `Your authentication session has been extended.\n` +
              `Continue using WordPress MCP tools normally.`
      }]
    };
  } catch (error) {
    debug('Error refreshing OAuth token:', error);
    throw new Error(`Failed to refresh OAuth token: ${error.message}`);
  }
}

export async function handleSwitchAuthMethod(apiClient, args) {
  try {
    debug('Switching authentication method to:', args.method);
    
    await apiClient.auth.switchMethod(args.method, args.credentials);
    
    // Test the new authentication method
    let testResult = '';
    try {
      const user = await apiClient.getCurrentUser();
      testResult = `\n\n✅ **New authentication method tested successfully!**\n` +
                  `Authenticated as: ${user.name} (@${user.username})`;
    } catch (error) {
      testResult = `\n\n⚠️  **Warning:** New authentication method may not be working properly.\n` +
                  `Error: ${error.message}`;
    }
    
    return {
      content: [{
        type: 'text',
        text: `**Authentication Method Switched**\n\n` +
              `**Previous Method:** ${apiClient.auth.getPreviousMethod() || 'Unknown'}\n` +
              `**Current Method:** ${args.method}\n\n` +
              `**Method Description:**\n` +
              getAuthMethodDescription(args.method) +
              testResult
      }]
    };
  } catch (error) {
    debug('Error switching auth method:', error);
    throw new Error(`Failed to switch authentication method: ${error.message}`);
  }
}

function getAuthMethodDescription(method) {
  switch (method) {
    case 'application_password':
      return `- **Application Password:** Most secure method using WordPress Application Passwords\n` +
             `- Recommended for production use\n` +
             `- Tokens can be managed in WordPress admin`;
             
    case 'jwt':
      return `- **JWT Token:** Uses JSON Web Tokens for authentication\n` +
             `- Requires JWT Authentication plugin\n` +
             `- Token-based with expiration`;
             
    case 'oauth':
      return `- **OAuth 2.0:** Industry standard OAuth authentication\n` +
             `- Requires OAuth application registration\n` +
             `- Supports token refresh and fine-grained permissions`;
             
    case 'cookie':
      return `- **Cookie Authentication:** Uses WordPress session cookies\n` +
             `- Less secure for API access\n` +
             `- May require additional nonce handling`;
             
    default:
      return `- **Unknown method:** ${method}`;
  }
}
