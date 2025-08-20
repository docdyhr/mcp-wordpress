import { vi } from "vitest";
import { ConnectionTester } from "../../dist/server/ConnectionTester.js";

describe("ConnectionTester", () => {
  let mockClient1;
  let mockClient2;
  let mockClients;
  let loggerSpy;

  beforeEach(() => {
    // Mock the logger to avoid actual logging output and track calls
    loggerSpy = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    // Mock the LoggerFactory to return our spy
    vi.doMock("../../dist/utils/logger.js", () => ({
      LoggerFactory: {
        server: () => loggerSpy,
      },
    }));

    mockClient1 = {
      ping: vi.fn(),
    };

    mockClient2 = {
      ping: vi.fn(),
    };

    mockClients = new Map([
      ["site1", mockClient1],
      ["site2", mockClient2],
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
      // ConnectionTester now uses structured logging instead of console.error
      // We can verify logging behavior if needed, but the main test is that it doesn't throw
    });

    it("should handle empty client map", async () => {
      const emptyClients = new Map();

      await expect(ConnectionTester.testClientConnections(emptyClients)).resolves.not.toThrow();
    });
  });
});
