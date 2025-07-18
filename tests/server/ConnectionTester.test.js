import { jest } from "@jest/globals";
import { ConnectionTester } from "../../dist/server/ConnectionTester.js";

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
    });

    it("should handle connection failures gracefully", async () => {
      mockClient1.ping.mockResolvedValue(true);
      mockClient2.ping.mockRejectedValue(new Error("Connection failed"));

      await ConnectionTester.testClientConnections(mockClients);

      expect(mockClient1.ping).toHaveBeenCalled();
      expect(mockClient2.ping).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle empty client map", async () => {
      const emptyClients = new Map();

      await expect(ConnectionTester.testClientConnections(emptyClients)).resolves.not.toThrow();
    });
  });
});
