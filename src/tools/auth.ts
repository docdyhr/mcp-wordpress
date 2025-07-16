import { WordPressClient } from "../client/api.js";
import { AuthMethod } from "../types/client.js";
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
  public getTools(): any[] {
    return [
      {
        name: "wp_test_auth",
        description:
          "Tests the authentication and connectivity for a configured WordPress site with detailed connection diagnostics.\n\n" +
          "**Usage Examples:**\n" +
          "• Test connection: `wp_test_auth`\n" +
          '• Multi-site test: `wp_test_auth --site="my-site"`\n' +
          "• Verify setup: Use this after configuring new credentials\n" +
          "• Troubleshoot: Run when experiencing connection issues\n" +
          "• Health check: Regular verification of WordPress connectivity",
        parameters: [], // The 'site' parameter is added dynamically by the server
        handler: this.handleTestAuth.bind(this),
      },
      {
        name: "wp_get_auth_status",
        description: "Gets the current authentication status for a configured WordPress site.",
        parameters: [],
        handler: this.handleGetAuthStatus.bind(this),
      },
      {
        name: "wp_switch_auth_method",
        description: "Switches the authentication method for a site for the current session.",
        parameters: [
          {
            name: "method",
            type: "string",
            required: true,
            description: "The new authentication method to use.",
            enum: ["app-password", "jwt", "basic", "api-key", "cookie"],
          },
          {
            name: "username",
            type: "string",
            description: "The username for 'app-password' or 'basic' authentication.",
          },
          {
            name: "password",
            type: "string",
            description: "The Application Password for 'app-password' or password for 'basic' auth.",
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
  public async handleTestAuth(client: WordPressClient, params: any): Promise<any> {
    try {
      await client.ping();
      const user = await client.getCurrentUser();
      const siteConfig = client.config;

      const content =
        "✅ **Authentication successful!**\n\n" +
        `**Site:** ${siteConfig.baseUrl}\n` +
        `**Method:** ${siteConfig.auth.method}\n` +
        `**User:** ${user.name} (@${user.slug})\n` +
        `**Roles:** ${user.roles?.join(", ") || "N/A"}\n\n` +
        "Your WordPress connection is working properly.";

      return content;
    } catch (error) {
      throw new Error(`Authentication test failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Handles the 'wp_get_auth_status' tool request.
   * Reports whether the client is currently authenticated.
   * @param client - The WordPressClient instance for the target site.
   * @param params - The parameters for the tool request.
   * @returns A promise that resolves to an MCPToolResponse.
   */
  public async handleGetAuthStatus(client: WordPressClient, params: any): Promise<any> {
    try {
      const isAuthenticated = client.isAuthenticated;
      const config = client.config;
      let content =
        `**Authentication Status for ${config.baseUrl}**\n\n` +
        `**Authenticated:** ${isAuthenticated ? "✅ Yes" : "❌ No"}\n` +
        `**Method:** ${config.auth.method}\n`;

      if (isAuthenticated) {
        const user = await client.getCurrentUser();
        content += `**User:** ${user.name} (@${user.slug})\n`;
      } else {
        content += "**Status:** Not connected. Use 'wp_test_auth' to connect and verify credentials.";
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to get auth status: ${getErrorMessage(error)}`);
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
      method: AuthMethod;
      username?: string;
      password?: string;
      jwt_token?: string;
    },
  ): Promise<any> {
    try {
      // This functionality is not currently supported as the client
      // doesn't have an updateAuthConfig method
      throw new Error(
        "Dynamic authentication method switching is not currently supported. Please update your configuration file and restart the server.",
      );
    } catch (error) {
      throw new Error(`Failed to switch auth method: ${getErrorMessage(error)}`);
    }
  }
}

export default AuthTools;
