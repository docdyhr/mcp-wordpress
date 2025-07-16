import { jest } from "@jest/globals";
import { ConnectionTester } from "../../dist/server/ConnectionTester.js";

// Mock dependencies
jest.mock("../../dist/client/api.js");
jest.mock("../../dist/utils/error.js", () => {
  return {
    getErrorMessage: jest.fn((error) => error.message || "Unknown error"),
  };
});

describe("ConnectionTester", () => {
  let mockClient1;
  let mockClient2;
  let mockClients;
  let originalConsoleError;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();

    mockClient1 = {
      ping: jest.fn(),
    };

    mockClient2 = {
      ping: jest.fn(),
    };

    mockClients = new Map([
      ["site1", mockClient1],
      ["site2", mockClient2],
    ]);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  describe("testClientConnections", () => {
    it("should test connections to all clients successfully", async () => {
      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockResolvedValue(true);

      await ConnectionTester.testClientConnections(mockClients);

      expect(mockClient1.ping).toHaveBeenCalled();
      expect(mockClient2.ping).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("INFO: Testing connections to all configured WordPress sites...");
      expect(console.error).toHaveBeenCalledWith("SUCCESS: Connection to site 'site1' successful.");
      expect(console.error).toHaveBeenCalledWith("SUCCESS: Connection to site 'site2' successful.");
      expect(console.error).toHaveBeenCalledWith("INFO: Connection tests complete.");
    });

    it("should handle connection failures", async () => {
      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockRejectedValue(new Error("Connection failed"));

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith("SUCCESS: Connection to site 'site1' successful.");
      expect(console.error).toHaveBeenCalledWith("ERROR: Failed to connect to site 'site2': Connection failed");
      expect(console.error).toHaveBeenCalledWith("INFO: Connection tests complete.");
    });

    it("should handle authentication errors specifically", async () => {
      const authError = new Error("Unauthorized");
      authError.response = { status: 401 };

      mockClient1.ping.mockRejectedValue(authError);
      mockClient2.ping.mockResolvedValue(true);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith("ERROR: Failed to connect to site 'site1': Unauthorized");
      expect(console.error).toHaveBeenCalledWith(
        "Authentication may have failed for site 'site1'. Please check credentials.",
      );
    });

    it("should handle 403 forbidden errors as authentication errors", async () => {
      const forbiddenError = new Error("Forbidden");
      forbiddenError.response = { status: 403 };

      mockClient1.ping.mockRejectedValue(forbiddenError);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith(
        "Authentication may have failed for site 'site1'. Please check credentials.",
      );
    });

    it("should handle WordPress auth error codes", async () => {
      const authError = new Error("WordPress auth error");
      authError.code = "WORDPRESS_AUTH_ERROR";

      mockClient1.ping.mockRejectedValue(authError);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith(
        "Authentication may have failed for site 'site1'. Please check credentials.",
      );
    });

    it("should handle empty client map", async () => {
      const emptyClients = new Map();

      await ConnectionTester.testClientConnections(emptyClients);

      expect(console.error).toHaveBeenCalledWith("INFO: Testing connections to all configured WordPress sites...");
      expect(console.error).toHaveBeenCalledWith("INFO: Connection tests complete.");
    });

    it("should handle concurrent connection tests", async () => {
      mockClient1.ping.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 100)));
      mockClient2.ping.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 150)));

      const startTime = Date.now();
      await ConnectionTester.testClientConnections(mockClients);
      const endTime = Date.now();

      // Should complete in roughly parallel time (not sequential)
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe("isAuthenticationError", () => {
    it("should identify 401 errors as authentication errors", () => {
      const error = { response: { status: 401 } };
      expect(ConnectionTester.isAuthenticationError(error)).toBe(true);
    });

    it("should identify 403 errors as authentication errors", () => {
      const error = { response: { status: 403 } };
      expect(ConnectionTester.isAuthenticationError(error)).toBe(true);
    });

    it("should identify WordPress auth error codes", () => {
      const error = { code: "WORDPRESS_AUTH_ERROR" };
      expect(ConnectionTester.isAuthenticationError(error)).toBe(true);
    });

    it("should not identify other errors as authentication errors", () => {
      const error404 = { response: { status: 404 } };
      const error500 = { response: { status: 500 } };
      const networkError = { code: "ECONNREFUSED" };
      const genericError = new Error("Generic error");

      expect(ConnectionTester.isAuthenticationError(error404)).toBe(false);
      expect(ConnectionTester.isAuthenticationError(error500)).toBe(false);
      expect(ConnectionTester.isAuthenticationError(networkError)).toBe(false);
      expect(ConnectionTester.isAuthenticationError(genericError)).toBe(false);
    });

    it("should handle null/undefined errors", () => {
      expect(ConnectionTester.isAuthenticationError(null)).toBe(false);
      expect(ConnectionTester.isAuthenticationError(undefined)).toBe(false);
    });
  });

  describe("healthCheck", () => {
    it("should return true for successful health check", async () => {
      mockClient1.ping.mockResolvedValue(true);

      const result = await ConnectionTester.healthCheck(mockClient1);

      expect(result).toBe(true);
      expect(mockClient1.ping).toHaveBeenCalled();
    });

    it("should return false for failed health check", async () => {
      mockClient1.ping.mockRejectedValue(new Error("Health check failed"));

      const result = await ConnectionTester.healthCheck(mockClient1);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Health check failed: Health check failed");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network unreachable");
      mockClient1.ping.mockRejectedValue(networkError);

      const result = await ConnectionTester.healthCheck(mockClient1);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Health check failed: Network unreachable");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      mockClient1.ping.mockRejectedValue(timeoutError);

      const result = await ConnectionTester.healthCheck(mockClient1);

      expect(result).toBe(false);
    });
  });

  describe("healthCheckAll", () => {
    it("should perform health checks for all clients", async () => {
      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockResolvedValue(true);

      const results = await ConnectionTester.healthCheckAll(mockClients);

      expect(results.get("site1")).toBe(true);
      expect(results.get("site2")).toBe(true);
      expect(results.size).toBe(2);
    });

    it("should handle mixed health check results", async () => {
      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockRejectedValue(new Error("Failed"));

      const results = await ConnectionTester.healthCheckAll(mockClients);

      expect(results.get("site1")).toBe(true);
      expect(results.get("site2")).toBe(false);
      expect(results.size).toBe(2);
    });

    it("should handle empty client map", async () => {
      const emptyClients = new Map();

      const results = await ConnectionTester.healthCheckAll(emptyClients);

      expect(results.size).toBe(0);
    });

    it("should perform health checks sequentially", async () => {
      let client1Called = false;
      let client2Called = false;

      mockClient1.ping.mockImplementation(async () => {
        client1Called = true;
        return true;
      });

      mockClient2.ping.mockImplementation(async () => {
        expect(client1Called).toBe(true); // Should be called after client1
        client2Called = true;
        return true;
      });

      await ConnectionTester.healthCheckAll(mockClients);

      expect(client1Called).toBe(true);
      expect(client2Called).toBe(true);
    });

    it("should continue health checks even if one fails", async () => {
      mockClient1.ping.mockRejectedValue(new Error("Client 1 failed"));
      mockClient2.ping.mockResolvedValue(true);

      const results = await ConnectionTester.healthCheckAll(mockClients);

      expect(results.get("site1")).toBe(false);
      expect(results.get("site2")).toBe(true);
      expect(mockClient2.ping).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle errors with no message", async () => {
      const errorWithoutMessage = {};
      mockClient1.ping.mockRejectedValue(errorWithoutMessage);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith("ERROR: Failed to connect to site 'site1': Unknown error");
    });

    it("should handle errors with complex response objects", async () => {
      const complexError = {
        response: {
          status: 500,
          statusText: "Internal Server Error",
          data: { message: "Database connection failed" },
        },
      };
      mockClient1.ping.mockRejectedValue(complexError);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("ERROR: Failed to connect to site 'site1'"));
    });

    it("should handle client ping method throwing synchronously", async () => {
      mockClient1.ping.mockImplementation(() => {
        throw new Error("Synchronous error");
      });

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith("ERROR: Failed to connect to site 'site1': Synchronous error");
    });
  });

  describe("integration scenarios", () => {
    it("should handle large number of clients", async () => {
      const largeClientMap = new Map();

      for (let i = 0; i < 100; i++) {
        const mockClient = { ping: jest.fn().mockResolvedValue(true) };
        largeClientMap.set(`site${i}`, mockClient);
      }

      await ConnectionTester.testClientConnections(largeClientMap);

      expect(console.error).toHaveBeenCalledWith("INFO: Testing connections to all configured WordPress sites...");
      expect(console.error).toHaveBeenCalledWith("INFO: Connection tests complete.");
    });

    it("should handle clients with special characters in site IDs", async () => {
      const specialClients = new Map([
        ["site-with-dashes", mockClient1],
        ["site_with_underscores", mockClient2],
      ]);

      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockResolvedValue(true);

      await ConnectionTester.testClientConnections(specialClients);

      expect(console.error).toHaveBeenCalledWith("SUCCESS: Connection to site 'site-with-dashes' successful.");
      expect(console.error).toHaveBeenCalledWith("SUCCESS: Connection to site 'site_with_underscores' successful.");
    });

    it("should handle mixed authentication and network errors", async () => {
      const authError = new Error("Unauthorized");
      authError.response = { status: 401 };

      const networkError = new Error("ECONNREFUSED");

      mockClient1.ping.mockRejectedValue(authError);
      mockClient2.ping.mockRejectedValue(networkError);

      await ConnectionTester.testClientConnections(mockClients);

      expect(console.error).toHaveBeenCalledWith(
        "Authentication may have failed for site 'site1'. Please check credentials.",
      );
      expect(console.error).toHaveBeenCalledWith("ERROR: Failed to connect to site 'site2': ECONNREFUSED");
    });
  });
});
