import { WordPressClient } from "../client/api.js";
import { getErrorMessage } from "../utils/error.js";

/**
 * Service for testing WordPress client connections
 * Handles connection validation and health checks
 */
export class ConnectionTester {
  /**
   * Test connections to all configured WordPress sites
   */
  public static async testClientConnections(
    wordpressClients: Map<string, WordPressClient>,
  ): Promise<void> {
    console.error(
      "INFO: Testing connections to all configured WordPress sites...",
    );

    const connectionPromises = Array.from(wordpressClients.entries()).map(
      async ([siteId, client]) => {
        try {
          await client.ping();
          console.error(`SUCCESS: Connection to site '${siteId}' successful.`);
        } catch (error) {
          console.error(
            `ERROR: Failed to connect to site '${siteId}': ${getErrorMessage(error)}`,
          );

          if (ConnectionTester.isAuthenticationError(error)) {
            console.error(
              `Authentication may have failed for site '${siteId}'. Please check credentials.`,
            );
          }
        }
      },
    );

    await Promise.all(connectionPromises);
    console.error("INFO: Connection tests complete.");
  }

  /**
   * Check if error is authentication-related
   */
  private static isAuthenticationError(error: any): boolean {
    if (error?.response?.status && [401, 403].includes(error.response.status)) {
      return true;
    }
    return error?.code === "WORDPRESS_AUTH_ERROR";
  }

  /**
   * Perform health check for a specific client
   */
  public static async healthCheck(client: WordPressClient): Promise<boolean> {
    try {
      await client.ping();
      return true;
    } catch (error) {
      console.error(`Health check failed: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Perform health checks for all clients
   */
  public static async healthCheckAll(
    wordpressClients: Map<string, WordPressClient>,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [siteId, client] of wordpressClients.entries()) {
      const isHealthy = await ConnectionTester.healthCheck(client);
      results.set(siteId, isHealthy);
    }

    return results;
  }
}
