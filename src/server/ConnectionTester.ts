import { WordPressClient } from "@/client/api.js";
import { getErrorMessage } from "@/utils/error.js";
import { LoggerFactory } from "@/utils/logger.js";
import { ConfigHelpers } from "@/config/Config.js";

interface ErrorWithResponse {
  response?: {
    status?: number;
  };
}

interface ErrorWithCode {
  code?: string;
}

/**
 * Service for testing WordPress client connections
 * Handles connection validation and health checks
 */
export class ConnectionTester {
  private static logger = LoggerFactory.server().child({ component: "ConnectionTester" });

  /**
   * Test connections to all configured WordPress sites with timeout and concurrency control
   */
  public static async testClientConnections(
    wordpressClients: Map<string, WordPressClient>,
    options: { timeout?: number; maxConcurrent?: number } = {},
  ): Promise<void> {
    const { timeout = 5000, maxConcurrent = 3 } = options;

    this.logger.info("Testing connections to WordPress sites", {
      siteCount: wordpressClients.size,
      timeout,
      maxConcurrent,
    });

    const entries = Array.from(wordpressClients.entries());
    const results: Array<{ siteId: string; success: boolean; error?: string }> = [];

    // Process sites in batches to control concurrency
    for (let i = 0; i < entries.length; i += maxConcurrent) {
      const batch = entries.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async ([siteId, client]) => {
        const startTime = Date.now();
        try {
          // Add timeout to ping operation (skip timeout in tests to avoid timer issues)
          if (ConfigHelpers.isTest()) {
            // In test environment, just run the ping without timeout to avoid Jest timer issues
            await client.ping();
          } else {
            await Promise.race([
              client.ping(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), timeout)),
            ]);
          }

          const duration = Date.now() - startTime;
          this.logger.info("Connection successful", { siteId, duration: `${duration}ms` });
          results.push({ siteId, success: true });
        } catch (_error) {
          const duration = Date.now() - startTime;
          const errorMessage = getErrorMessage(_error);

          this.logger.warn("Connection failed", {
            siteId,
            error: errorMessage,
            duration: `${duration}ms`,
            isAuthError: ConnectionTester.isAuthenticationError(_error),
          });

          results.push({ siteId, success: false, error: errorMessage });
        }
      });

      await Promise.allSettled(batchPromises);
    }

    // Log summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    this.logger.info("Connection tests complete", {
      total: results.length,
      successful,
      failed,
      successRate: `${((successful / results.length) * 100).toFixed(1)}%`,
    });
  }

  /**
   * Check if error is authentication-related
   */
  private static isAuthenticationError(error: unknown): boolean {
    // Check for HTTP response status
    if (error && typeof error === "object" && "response" in error) {
      const response = (error as ErrorWithResponse).response;
      if (response?.status && [401, 403].includes(response.status)) {
        return true;
      }
    }
    const errorMessage = getErrorMessage(error);
    return (
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Forbidden") ||
      (error as ErrorWithCode)?.code === "WORDPRESS_AUTH_ERROR"
    );
  }

  /**
   * Perform health check for a specific client with timeout
   */
  public static async healthCheck(client: WordPressClient, siteId?: string, timeout: number = 3000): Promise<boolean> {
    try {
      await Promise.race([
        client.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Health check timeout")), timeout)),
      ]);

      this.logger.debug("Health check passed", { siteId });
      return true;
    } catch (_error) {
      this.logger.warn("Health check failed", {
        siteId,
        _error: getErrorMessage(_error),
      });
      return false;
    }
  }

  /**
   * Quick connectivity test without full authentication
   */
  public static async quickConnectivityTest(
    wordpressClients: Map<string, WordPressClient>,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const promises = Array.from(wordpressClients.entries()).map(async ([siteId, client]) => {
      try {
        // Just test basic connectivity, not full auth
        const isHealthy = await this.healthCheck(client, siteId, 1000);
        results.set(siteId, isHealthy);
      } catch (_error) {
        results.set(siteId, false);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Perform health checks for all clients
   */
  public static async healthCheckAll(wordpressClients: Map<string, WordPressClient>): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [siteId, client] of wordpressClients.entries()) {
      const isHealthy = await ConnectionTester.healthCheck(client);
      results.set(siteId, isHealthy);
    }

    return results;
  }
}
