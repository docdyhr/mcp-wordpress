#!/usr/bin/env node

/**
 * MCP WordPress Server
 * 
 * A Model Context Protocol server that provides comprehensive WordPress CMS management
 * through the WordPress REST API v2. Supports posts, pages, media, users, comments,
 * taxonomies, and site management.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import types
import type {
  MCPTool,
  MCPToolResponse,
  MCPHandlerRegistry,
  MCPServerConfig
} from './types/mcp.js';
import type {
  IWordPressClient,
  WordPressClientConfig
} from './types/client.js';

// Import WordPress client
import { WordPressClient } from './client/api.js';
import { logger, logError, startTimer, validateEnvVars } from './utils/debug.js';

// Import MCP tools and handlers
import { 
  listPosts, getPost, createPost, updatePost, deletePost, getPostRevisions,
  handleListPosts, handleGetPost, handleCreatePost, handleUpdatePost, handleDeletePost, handleGetPostRevisions
} from './tools/posts.js';
import { 
  listPages, getPage, createPage, updatePage, deletePage, getPageRevisions,
  handleListPages, handleGetPage, handleCreatePage, handleUpdatePage, handleDeletePage, handleGetPageRevisions
} from './tools/pages.js';
import { 
  listMedia, getMedia, uploadMedia, updateMedia, deleteMedia, getMediaSizes,
  handleListMedia, handleGetMedia, handleUploadMedia, handleUpdateMedia, handleDeleteMedia, handleGetMediaSizes
} from './tools/media.js';
import { 
  listUsers, getUser, createUser, updateUser, deleteUser, getCurrentUser,
  handleListUsers, handleGetUser, handleCreateUser, handleUpdateUser, handleDeleteUser, handleGetCurrentUser
} from './tools/users.js';
import { 
  listComments, getComment, createComment, updateComment, deleteComment, approveComment, spamComment,
  handleListComments, handleGetComment, handleCreateComment, handleUpdateComment, handleDeleteComment, handleApproveComment, handleSpamComment
} from './tools/comments.js';
import { 
  listCategories, getCategory, createCategory, updateCategory, deleteCategory,
  listTags, getTag, createTag, updateTag, deleteTag,
  handleListCategories, handleGetCategory, handleCreateCategory, handleUpdateCategory, handleDeleteCategory,
  handleListTags, handleGetTag, handleCreateTag, handleUpdateTag, handleDeleteTag
} from './tools/taxonomies.js';
import { 
  getSiteSettings, updateSiteSettings, getSiteStats, searchSite, 
  getApplicationPasswords, createApplicationPassword, deleteApplicationPassword,
  handleGetSiteSettings, handleUpdateSiteSettings, handleGetSiteStats, handleSearchSite,
  handleGetApplicationPasswords, handleCreateApplicationPassword, handleDeleteApplicationPassword
} from './tools/site.js';
import { 
  testAuth, getAuthStatus, startOAuthFlow, completeOAuthFlow, refreshOAuthToken, switchAuthMethod,
  handleTestAuth, handleGetAuthStatus, handleStartOAuthFlow, handleCompleteOAuthFlow, handleRefreshOAuthToken, handleSwitchAuthMethod
} from './tools/auth.js';

// Load environment variables from the correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');

config({ path: envPath });

// Server version
const SERVER_VERSION = '1.0.0';

// CLI argument handling
const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(SERVER_VERSION);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
MCP WordPress Server v${SERVER_VERSION}

USAGE:
  node src/index.js                    # Start MCP server
  npm run setup                        # Run setup wizard
  npm run status                       # Check status
  
ENVIRONMENT VARIABLES:
  WORDPRESS_SITE_URL         - WordPress site URL
  WORDPRESS_USERNAME         - WordPress username
  WORDPRESS_APP_PASSWORD     - WordPress application password
  WORDPRESS_AUTH_METHOD      - Authentication method (app-password, jwt, basic, api-key)
  
DOCUMENTATION:
  https://github.com/AiondaDotCom/mcp-wordpress
`);
  process.exit(0);
}

// Handle setup command
if (args.includes('setup')) {
  (async (): Promise<void> => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const setupPath = join(__dirname, '..', 'bin', 'setup.js');
      
      execSync(`node "${setupPath}"`, { stdio: 'inherit' });
      process.exit(0);
    } catch (error) {
      console.error('Setup failed:', (error as Error).message);
      process.exit(1);
    }
  })();
}

/**
 * WordPress MCP Server Class
 */
export class MCPWordPressServer {
  private server: Server;
  private wordpressClient: IWordPressClient | null = null;
  private tools: MCPTool[];
  private handlers: MCPHandlerRegistry<IWordPressClient>;
  private initialized = false;

  constructor() {
    // Initialize MCP Server
    this.server = new Server(
      {
        name: 'mcp-wordpress',
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Define all available tools
    this.tools = [
      // Authentication tools
      testAuth,
      getAuthStatus,
      startOAuthFlow,
      completeOAuthFlow,
      refreshOAuthToken,
      switchAuthMethod,
      
      // Posts tools
      listPosts,
      getPost,
      createPost,
      updatePost,
      deletePost,
      getPostRevisions,
      
      // Pages tools
      listPages,
      getPage,
      createPage,
      updatePage,
      deletePage,
      getPageRevisions,
      
      // Media tools
      listMedia,
      getMedia,
      uploadMedia,
      updateMedia,
      deleteMedia,
      getMediaSizes,
      
      // Users tools
      listUsers,
      getUser,
      createUser,
      updateUser,
      deleteUser,
      getCurrentUser,
      
      // Comments tools
      listComments,
      getComment,
      createComment,
      updateComment,
      deleteComment,
      approveComment,
      spamComment,
      
      // Taxonomies tools
      listCategories,
      getCategory,
      createCategory,
      updateCategory,
      deleteCategory,
      listTags,
      getTag,
      createTag,
      updateTag,
      deleteTag,
      
      // Site management tools
      getSiteSettings,
      updateSiteSettings,
      getSiteStats,
      searchSite,
      getApplicationPasswords,
      createApplicationPassword,
      deleteApplicationPassword
    ];

    // Define tool handlers
    this.handlers = {
      // Authentication handlers
      'wp_test_auth': handleTestAuth,
      'wp_get_auth_status': handleGetAuthStatus,
      'wp_start_oauth_flow': handleStartOAuthFlow,
      'wp_complete_oauth_flow': handleCompleteOAuthFlow,
      'wp_refresh_oauth_token': handleRefreshOAuthToken,
      'wp_switch_auth_method': handleSwitchAuthMethod,

      // Posts handlers
      'wp_list_posts': handleListPosts,
      'wp_get_post': handleGetPost,
      'wp_create_post': handleCreatePost,
      'wp_update_post': handleUpdatePost,
      'wp_delete_post': handleDeletePost,
      'wp_get_post_revisions': handleGetPostRevisions,

      // Pages handlers
      'wp_list_pages': handleListPages,
      'wp_get_page': handleGetPage,
      'wp_create_page': handleCreatePage,
      'wp_update_page': handleUpdatePage,
      'wp_delete_page': handleDeletePage,
      'wp_get_page_revisions': handleGetPageRevisions,

      // Media handlers
      'wp_list_media': handleListMedia,
      'wp_get_media': handleGetMedia,
      'wp_upload_media': handleUploadMedia,
      'wp_update_media': handleUpdateMedia,
      'wp_delete_media': handleDeleteMedia,
      'wp_get_media_sizes': handleGetMediaSizes,

      // Users handlers
      'wp_list_users': handleListUsers,
      'wp_get_user': handleGetUser,
      'wp_create_user': handleCreateUser,
      'wp_update_user': handleUpdateUser,
      'wp_delete_user': handleDeleteUser,
      'wp_get_current_user': handleGetCurrentUser,

      // Comments handlers
      'wp_list_comments': handleListComments,
      'wp_get_comment': handleGetComment,
      'wp_create_comment': handleCreateComment,
      'wp_update_comment': handleUpdateComment,
      'wp_delete_comment': handleDeleteComment,
      'wp_approve_comment': handleApproveComment,
      'wp_spam_comment': handleSpamComment,

      // Taxonomies handlers
      'wp_list_categories': handleListCategories,
      'wp_get_category': handleGetCategory,
      'wp_create_category': handleCreateCategory,
      'wp_update_category': handleUpdateCategory,
      'wp_delete_category': handleDeleteCategory,
      'wp_list_tags': handleListTags,
      'wp_get_tag': handleGetTag,
      'wp_create_tag': handleCreateTag,
      'wp_update_tag': handleUpdateTag,
      'wp_delete_tag': handleDeleteTag,

      // Site management handlers
      'wp_get_site_settings': handleGetSiteSettings,
      'wp_update_site_settings': handleUpdateSiteSettings,
      'wp_get_site_stats': handleGetSiteStats,
      'wp_search_site': handleSearchSite,
      'wp_get_application_passwords': handleGetApplicationPasswords,
      'wp_create_application_password': handleCreateApplicationPassword,
      'wp_delete_application_password': handleDeleteApplicationPassword
    };

    this.setupServer();
  }

  /**
   * Get server configuration
   */
  get config(): MCPServerConfig {
    return {
      name: 'mcp-wordpress',
      version: SERVER_VERSION,
      tools: this.tools.reduce((acc, tool) => {
        acc[tool.name] = {
          ...tool,
          category: this.getToolCategory(tool.name)
        };
        return acc;
      }, {} as any),
      handlers: this.handlers
    };
  }

  /**
   * Get tool category from tool name
   */
  private getToolCategory(toolName: string): string {
    if (toolName.startsWith('wp_test_') || toolName.startsWith('wp_get_auth_') || toolName.includes('oauth') || toolName.includes('auth')) {
      return 'authentication';
    } else if (toolName.includes('post')) {
      return 'posts';
    } else if (toolName.includes('page')) {
      return 'pages';
    } else if (toolName.includes('media')) {
      return 'media';
    } else if (toolName.includes('user')) {
      return 'users';
    } else if (toolName.includes('comment')) {
      return 'comments';
    } else if (toolName.includes('categor') || toolName.includes('tag')) {
      return 'taxonomies';
    } else {
      return 'site';
    }
  }

  /**
   * Setup MCP server handlers
   */
  private setupServer(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const timer = startTimer(`Tool: ${name}`);

      try {
        // Initialize WordPress client if not already done
        if (!this.wordpressClient) {
          await this.initializeWordPressClient();
        }

        // Get handler for the tool
        const handler = this.handlers[name];
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        // Execute the tool handler
        const result = await handler(this.wordpressClient!, args || {});
        
        timer.endWithLog(`Tool ${name} executed successfully`);
        return {
          content: result.content,
          isError: result.isError || false
        };

      } catch (error) {
        timer.end();
        logError(error as Error, { tool: name, args });

        // Check if this is an authentication-related error
        const isAuthError = this.isAuthenticationError(error as Error);
        
        if (isAuthError) {
          return {
            content: [
              {
                type: "text",
                text: `🔐 **Authentication Required**\n\n` +
                      `${(error as Error).message}\n\n` +
                      `**Solution:** Use the \`wp_test_auth\` tool to authenticate with WordPress, or check your environment configuration.\n\n` +
                      `**Authentication Methods:**\n` +
                      `- Application Passwords (recommended)\n` +
                      `- JWT Authentication\n` +
                      `- Basic Authentication\n` +
                      `- API Key Authentication\n\n` +
                      `Simply call: \`wp_test_auth\` and I'll handle the rest!`
              }
            ],
            isError: true
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `❌ Error executing ${name}: ${(error as Error).message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Initialize WordPress client
   */
  private async initializeWordPressClient(): Promise<void> {
    try {
      // Validate required environment variables
      const requiredVars = ['WORDPRESS_SITE_URL'];
      validateEnvVars(requiredVars);

      this.wordpressClient = new WordPressClient();
      await this.wordpressClient.initialize();
      
      this.initialized = true;
      logger.log('WordPress client initialized successfully');
    } catch (error) {
      logError(error as Error, { operation: 'initialize_client' });
      throw new Error(`Failed to initialize WordPress client: ${(error as Error).message}`);
    }
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: Error): boolean {
    const authErrorPatterns = [
      'authentication',
      'unauthorized',
      'invalid credentials',
      'access denied',
      'forbidden',
      'jwt',
      'token',
      'login',
      'auth'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    
    return authErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorName.includes(pattern)
    ) || (error as any).status === 401 || (error as any).status === 403;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    initialized: boolean;
    toolsCount: number;
    handlersCount: number;
    clientConnected: boolean;
  } {
    return {
      initialized: this.initialized,
      toolsCount: this.tools.length,
      handlersCount: Object.keys(this.handlers).length,
      clientConnected: this.wordpressClient?.isAuthenticated || false
    };
  }

  /**
   * Run the MCP server
   */
  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.log(`MCP WordPress Server v${SERVER_VERSION} started and listening on stdio`);
      logger.log(`Available tools: ${this.tools.length}`);
      logger.log(`Tool handlers: ${Object.keys(this.handlers).length}`);
      
    } catch (error) {
      logError(error as Error, { operation: 'server_start' });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.wordpressClient) {
        await this.wordpressClient.disconnect();
      }
      logger.log('MCP WordPress Server shutdown complete');
    } catch (error) {
      logError(error as Error, { operation: 'server_shutdown' });
    }
  }
}

// Error handling
process.on('SIGINT', async () => {
  logger.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(new Error(`Unhandled Rejection: ${reason}`), { promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(error, { type: 'uncaught_exception' });
  process.exit(1);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPWordPressServer();
  
  server.run().catch(error => {
    logError(error, { operation: 'server_startup' });
    process.exit(1);
  });
}

// Export for use in other modules
export default MCPWordPressServer;