import { WordPressClient } from "@/client/api.js";
import type { MCPToolSchema } from "@/types/mcp.js";
import type { AuthConfig } from "@/types/client.js";
import { preserveToolError } from "@/utils/error.js";

// Kept in sync with ConfigurationSchema's AuthMethodSchema: "cookie" is
// deliberately excluded because it requires an already-established
// WordPress session nonce this tool has no way to obtain.
type SupportedAuthMethod = "app-password" | "jwt" | "basic" | "api-key";

/**
 * Provides authentication-related tools for WordPress sites.
 * This class encapsulates tool definitions and their corresponding handlers.
 */
export class AuthTools {
  /**
   * Retrieves the list of authentication tools.
   * @returns An array of MCPTool definitions.
   */
  public getTools(): Array<{
    name: string;
    description: string;
    inputSchema?: MCPToolSchema;
    handler: (client: WordPressClient, params: Record<string, unknown>) => Promise<unknown>;
  }> {
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
        // The 'site' parameter is added dynamically by the server
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: this.handleTestAuth.bind(this),
      },
      {
        name: "wp_get_auth_status",
        description: "Gets the current authentication status for a configured WordPress site.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: this.handleGetAuthStatus.bind(this),
      },
      {
        name: "wp_switch_auth_method",
        description:
          "Validates an alternative authentication method for a site without mutating the shared " +
          "client used by other tool invocations. The check is in-memory only and does not persist; " +
          "update your configuration file for durable changes.",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              description: "The authentication method to validate.",
              enum: ["app-password", "jwt", "basic", "api-key"],
            },
            username: {
              type: "string",
              description: "Required for 'app-password', 'basic', and 'jwt'.",
            },
            password: {
              type: "string",
              description: "The Application Password for 'app-password', or the account password for 'basic'/'jwt'.",
            },
            jwt_secret: {
              type: "string",
              description: "Required for 'jwt' — the WordPress JWT Authentication plugin's secret key.",
            },
            api_key: {
              type: "string",
              description: "Required for 'api-key'.",
            },
          },
          required: ["method"],
        },
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
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const TIMEOUT_MS = 10_000;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    const timeoutSignal = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        reject(new Error(`Connection timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);
    });

    try {
      return await Promise.race([
        (async () => {
          const reachable = await client.ping();
          // Promise.race doesn't cancel the losing branch — if ping() was
          // still pending when the timeout fired, the race has already
          // settled by the time it resolves. Stop here instead of making
          // an unnecessary (and unobserved) getCurrentUser() request.
          if (timedOut) {
            throw new Error("Superseded by timeout");
          }
          if (!reachable) {
            throw new Error(`Site unreachable: ${client.config.baseUrl}`);
          }
          const user = await client.getCurrentUser();
          const siteConfig = client.config;

          const content =
            "✅ **Authentication successful!**\n\n" +
            `**Site:** ${siteConfig.baseUrl}\n` +
            `**Method:** ${siteConfig.auth.method}\n` +
            `**User:** ${user.name} (@${user.slug})\n` +
            `**Roles:** ${user.roles?.join(", ") || "N/A"}\n\n` +
            "Your WordPress connection is working properly.";

          return { content };
        })(),
        timeoutSignal,
      ]);
    } catch (_error) {
      preserveToolError("Authentication test failed", _error);
    } finally {
      clearTimeout(timeoutHandle);
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
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const config = client.config;
      let content = `**Authentication Status for ${config.baseUrl}**\n\n` + `**Method:** ${config.auth.method}\n`;

      // Always do a live probe so the status reflects current reality,
      // not a stale in-memory flag that may not have been set yet.
      try {
        const user = await client.getCurrentUser();
        content =
          `**Authentication Status for ${config.baseUrl}**\n\n` +
          `**Authenticated:** ✅ Yes\n` +
          `**Method:** ${config.auth.method}\n` +
          `**User:** ${user.name} (@${user.slug})\n`;
      } catch {
        content +=
          `**Authenticated:** ❌ No\n` + "**Status:** Not connected. Use 'wp_test_auth' to verify credentials.";
      }

      return { content };
    } catch (_error) {
      preserveToolError("Failed to get auth status", _error);
    }
  }

  /**
   * Handles the 'wp_switch_auth_method' tool request.
   * Verifies the requested method's credentials with an isolated client so
   * the shared per-site client used by other tool invocations is never
   * mutated in place.
   * @param client - The WordPressClient instance for the target site.
   * @param params - The parameters for the tool request, including the new auth details.
   * @returns A promise that resolves to an MCPToolResponse.
   */
  public async handleSwitchAuthMethod(client: WordPressClient, params: Record<string, unknown>): Promise<unknown> {
    const { method, username, password, jwt_secret, api_key } = params as {
      method: SupportedAuthMethod;
      username?: string;
      password?: string;
      jwt_secret?: string;
      api_key?: string;
    };

    try {
      const newAuth = this.buildAuthConfig(method, { username, password, jwt_secret, api_key });
      await this.verifyAuthConfig(client, newAuth);

      const confirmation =
        method === "api-key"
          ? `✅ Validated '${method}' authentication in isolation. Note: the key is not verified with a live request; an invalid key will only surface as a 401/403 on later calls. The shared site client was not changed.`
          : `✅ Validated '${method}' authentication successfully in isolation. The shared site client was not changed.`;
      return { content: confirmation };
    } catch (_error) {
      preserveToolError("Failed to validate auth method", _error);
    }
  }

  private async verifyAuthConfig(client: WordPressClient, auth: AuthConfig): Promise<void> {
    const verificationClient = new WordPressClient({
      ...client.config,
      auth: { ...auth },
    });
    await verificationClient.authenticate();
  }

  /**
   * Builds a client AuthConfig for the requested method, validating that
   * its required fields were provided. Mirrors ConfigurationSchema's
   * per-method requirements so this tool and startup configuration agree
   * on what each method actually needs.
   */
  private buildAuthConfig(
    method: SupportedAuthMethod,
    fields: {
      username?: string | undefined;
      password?: string | undefined;
      jwt_secret?: string | undefined;
      api_key?: string | undefined;
    },
  ): AuthConfig {
    switch (method) {
      case "app-password":
        if (!fields.username || !fields.password) {
          throw new Error("'app-password' requires 'username' and 'password' (the WordPress Application Password).");
        }
        return { method: "app-password", username: fields.username, appPassword: fields.password };
      case "basic":
        if (!fields.username || !fields.password) {
          throw new Error("'basic' requires 'username' and 'password'.");
        }
        return { method: "basic", username: fields.username, password: fields.password };
      case "jwt":
        if (!fields.username || !fields.password || !fields.jwt_secret) {
          throw new Error("'jwt' requires 'username', 'password', and 'jwt_secret'.");
        }
        return { method: "jwt", username: fields.username, password: fields.password, secret: fields.jwt_secret };
      case "api-key":
        if (!fields.api_key) {
          throw new Error("'api-key' requires 'api_key'.");
        }
        return { method: "api-key", apiKey: fields.api_key };
      default:
        throw new Error(`Unsupported authentication method: ${method}`);
    }
  }
}

export default AuthTools;
