import { MCPTool, MCPToolResponse } from "@mcp/server";
import WordPressClient from "../client/api.js";
import { WordPressAuthMethod } from "../types/client.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Provides authentication-related tools for WordPress sites.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class AuthTools {
  /**
   * Retrieves the list of authentication tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): MCPTool[] {
    return [
      {
        name: "wp_test_auth",
        description:
          "Tests the authentication and connectivity for a configured WordPress site.",
        parameters: [], // The 'site' parameter is added dynamically by the server
        handler: this.handleTestAuth.bind(this),
      },
      {
        name: "wp_get_auth_status",
        description:
          "Gets the current authentication status for a configured WordPress site.",
        parameters: [],
        handler: this.handleGetAuthStatus.bind(this),
      },
      {
        name: "wp_switch_auth_method",
        description:
          "Switches the authentication method for a site for the current session.",
        parameters: [
          {
            name: "method",
            type: "string",
            required: true,
            description: "The new authentication method to use.",
            enum: Object.values(WordPressAuthMethod),
          },
          {
            name: "username",
            type: "string",
            description:
              "The username for 'app-password' or 'basic' authentication.",
          },
          {
            name: "password",
            type: "string",
            description:
              "The Application Password for 'app-password' or password for 'basic' auth.",
          },
          {
            name: "jwt_token",
            type: "string",
            description: "The token for 'jwt' authentication.",
          },
        ],
        handler: this.handleSwitchAuthMethod.bind(this),
      },
    ];
  }

  /**
   * Handles the 'wp_test_auth' tool request.
   * It tests the connection and fetches user details upon success.
   * @param client - The WordPressClient instance for the target site.
   * @param params - The parameters for the tool request.
   * @returns A promise that resolves to an MCPToolResponse.
   */
  public async handleTestAuth(
    client: WordPressClient,
    params: any,
  ): Promise<MCPToolResponse> {
    try {
      await client.testConnection();
      const user = await client.getCurrentUser();
      const siteConfig = client.getConfig();

      const content =
        `✅ **Authentication successful!**\n\n` +
        `**Site:** ${siteConfig.siteUrl}\n` +
        `**Method:** ${siteConfig.auth.method}\n` +
        `**User:** ${user.name} (@${user.slug})\n` +
        `**Roles:** ${user.roles.join(", ")}\n\n` +
        `Your WordPress connection is working properly.`;

      return { content };
    } catch (error) {
      return {
        error: {
          message: `Authentication test failed: ${getErrorMessage(error)}`,
          code: "AUTH_TEST_FAILED",
        },
      };
    }
  }

  /**
   * Handles the 'wp_get_auth_status' tool request.
   * Reports whether the client is currently authenticated.
   * @param client - The WordPressClient instance for the target site.
   * @param params - The parameters for the tool request.
   * @returns A promise that resolves to an MCPToolResponse.
   */
  public async handleGetAuthStatus(
    client: WordPressClient,
    params: any,
  ): Promise<MCPToolResponse> {
    try {
      const isAuthenticated = client.isAuthenticated();
      const config = client.getConfig();
      let content =
        `**Authentication Status for ${config.siteUrl}**\n\n` +
        `**Authenticated:** ${isAuthenticated ? "✅ Yes" : "❌ No"}\n` +
        `**Method:** ${config.auth.method}\n`;

      if (isAuthenticated) {
        const user = await client.getCurrentUser();
        content += `**User:** ${user.name} (@${user.slug})\n`;
      } else {
        content += `**Status:** Not connected. Use 'wp_test_auth' to connect and verify credentials.`;
      }

      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to get auth status: ${getErrorMessage(error)}`,
          code: "STATUS_CHECK_FAILED",
        },
      };
    }
  }

  /**
   * Handles the 'wp_switch_auth_method' tool request.
   * Updates the client's authentication configuration in memory for the session.
   * @param client - The WordPressClient instance for the target site.
   * @param params - The parameters for the tool request, including the new auth details.
   * @returns A promise that resolves to an MCPToolResponse.
   */
  public async handleSwitchAuthMethod(
    client: WordPressClient,
    params: {
      method: WordPressAuthMethod;
      username?: string;
      password?: string;
      jwt_token?: string;
    },
  ): Promise<MCPToolResponse> {
    try {
      const { method, username, password, jwt_token } = params;

      client.updateAuthConfig({
        method,
        username,
        password,
        jwtToken: jwt_token,
      });

      await client.testConnection();
      const user = await client.getCurrentUser();

      const content =
        `✅ **Authentication method switched successfully!**\n\n` +
        `**Site:** ${client.getConfig().siteUrl}\n` +
        `**New Method:** ${method}\n` +
        `**New User:** ${user.name} (@${user.slug})\n\n` +
        `You can now use tools with the new authentication method for this site.`;

      return { content };
    } catch (error) {
      return {
        error: {
          message: `Failed to switch auth method: ${getErrorMessage(error)}`,
          code: "AUTH_SWITCH_FAILED",
        },
      };
    }
  }
}

export default AuthTools;
