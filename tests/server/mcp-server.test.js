import { jest } from "@jest/globals";
import { MCPWordPressServer } from "../../dist/index.js";
import { ServerConfiguration } from "../../dist/config/ServerConfiguration.js";
import { ToolRegistry } from "../../dist/server/ToolRegistry.js";
import { ConnectionTester } from "../../dist/server/ConnectionTester.js";
import { WordPressClient } from "../../dist/client/api.js";

// Mock dependencies
jest.mock("../../dist/config/ServerConfiguration.js");
jest.mock("../../dist/server/ToolRegistry.js");
jest.mock("../../dist/server/ConnectionTester.js");
jest.mock("../../dist/client/api.js");

// Mock MCP SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

describe("MCPWordPressServer", () => {
  let mockServerConfig;
  let mockToolRegistry;
  let mockConnectionTester;
  let mockWordPressClient;
  let mockMcpServer;
  let originalConsoleError;
  let originalProcessExit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console.error to capture logs
    originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock process.exit
    originalProcessExit = process.exit;
    process.exit = jest.fn();

    // Mock ServerConfiguration
    mockServerConfig = {
      loadClientConfigurations: jest.fn(),
    };
    ServerConfiguration.getInstance.mockReturnValue(mockServerConfig);

    // Mock ToolRegistry
    mockToolRegistry = {
      registerAllTools: jest.fn(),
    };
    ToolRegistry.mockImplementation(() => mockToolRegistry);

    // Mock ConnectionTester
    mockConnectionTester = {
      testClientConnections: jest.fn(),
    };
    ConnectionTester.testClientConnections = mockConnectionTester.testClientConnections;

    // Mock WordPressClient
    mockWordPressClient = {};
    WordPressClient.mockImplementation(() => mockWordPressClient);

    // Mock MCP Server
    mockMcpServer = {
      connect: jest.fn(),
      close: jest.fn(),
    };

    // Reset environment variables
    delete process.env.NODE_ENV;
    process.argv = ["node", "index.js"];
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with valid configuration", () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1", name: "Test Site" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const _server = new MCPWordPressServer();

      expect(ServerConfiguration.getInstance).toHaveBeenCalled();
      expect(mockServerConfig.loadClientConfigurations).toHaveBeenCalled();
      expect(ToolRegistry).toHaveBeenCalledWith(expect.any(Object), mockClients);
      expect(mockToolRegistry.registerAllTools).toHaveBeenCalled();
    });

    it("should exit with error if no WordPress sites are configured", () => {
      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: new Map(),
        configs: [],
      });

      new MCPWordPressServer();

      expect(console.error).toHaveBeenCalledWith(
        "ERROR: No WordPress sites were configured. Please check that environment variables are set correctly.",
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should pass MCP config to loadClientConfigurations", () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];
      const mcpConfig = { test: "config" };

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      new MCPWordPressServer(mcpConfig);

      expect(mockServerConfig.loadClientConfigurations).toHaveBeenCalledWith(mcpConfig);
    });

    it("should display expected environment variables when no sites configured", () => {
      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: new Map(),
        configs: [],
      });

      new MCPWordPressServer();

      expect(console.error).toHaveBeenCalledWith("Expected environment variables:");
      expect(console.error).toHaveBeenCalledWith("  - WORDPRESS_SITE_URL");
      expect(console.error).toHaveBeenCalledWith("  - WORDPRESS_USERNAME");
      expect(console.error).toHaveBeenCalledWith("  - WORDPRESS_APP_PASSWORD");
    });
  });

  describe("run", () => {
    let server;
    let _mockTransport;

    beforeEach(() => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      server = new MCPWordPressServer();

      _mockTransport = {};
      mockMcpServer.connect.mockResolvedValue(undefined);
      server.server = mockMcpServer;
    });

    it("should test connections in normal mode", async () => {
      mockConnectionTester.testClientConnections.mockResolvedValue(undefined);

      await server.run();

      expect(console.error).toHaveBeenCalledWith("INFO: Testing connections to configured WordPress sites...");
      expect(mockConnectionTester.testClientConnections).toHaveBeenCalled();
      expect(mockMcpServer.connect).toHaveBeenCalled();
    });

    it("should skip connection testing in DXT mode", async () => {
      process.env.NODE_ENV = "dxt";

      await server.run();

      expect(console.error).toHaveBeenCalledWith(
        "INFO: DXT mode detected - skipping connection tests for faster startup",
      );
      expect(mockConnectionTester.testClientConnections).not.toHaveBeenCalled();
      expect(mockMcpServer.connect).toHaveBeenCalled();
    });

    it("should skip connection testing when DXT entry point detected", async () => {
      process.argv[0] = "/path/to/dxt-entry";

      await server.run();

      expect(console.error).toHaveBeenCalledWith(
        "INFO: DXT mode detected - skipping connection tests for faster startup",
      );
      expect(mockConnectionTester.testClientConnections).not.toHaveBeenCalled();
    });

    it("should handle connection test failures gracefully", async () => {
      const testError = new Error("Connection failed");
      mockConnectionTester.testClientConnections.mockRejectedValue(testError);

      await server.run();

      expect(console.error).toHaveBeenCalledWith("WARNING: Connection test failed: Connection failed");
      expect(console.error).toHaveBeenCalledWith(
        "INFO: Continuing with server startup. Tools will be available but connections may fail.",
      );
      expect(mockMcpServer.connect).toHaveBeenCalled();
    });

    it("should set up connection timeout", async () => {
      jest.useFakeTimers();

      // Mock a delayed connection
      mockMcpServer.connect.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 35000); // 35 seconds
          }),
      );

      const runPromise = server.run();

      // Fast forward time to trigger timeout
      jest.advanceTimersByTime(30000);

      await runPromise.catch(() => {}); // Ignore timeout error

      expect(console.error).toHaveBeenCalledWith("ERROR: Server connection timed out after 30 seconds");
      expect(process.exit).toHaveBeenCalledWith(1);

      jest.useRealTimers();
    });

    it("should clear timeout on successful connection", async () => {
      jest.useFakeTimers();

      const runPromise = server.run();

      // Fast forward a bit but not to timeout
      jest.advanceTimersByTime(15000);

      await runPromise;

      expect(console.error).toHaveBeenCalledWith("INFO: Server started and connected. Tools available for 1 site(s).");
      expect(process.exit).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should handle server connection errors", async () => {
      const connectionError = new Error("Connection error");
      mockMcpServer.connect.mockRejectedValue(connectionError);

      await expect(server.run()).rejects.toThrow("Connection error");
    });

    it("should keep process alive after successful connection", async () => {
      const mockResume = jest.fn();
      process.stdin.resume = mockResume;

      await server.run();

      expect(mockResume).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("should shutdown server gracefully", async () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const server = new MCPWordPressServer();
      server.server = mockMcpServer;

      await server.shutdown();

      expect(console.error).toHaveBeenCalledWith("INFO: Shutting down MCP WordPress Server...");
      expect(mockMcpServer.close).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("INFO: Server stopped.");
    });

    it("should handle shutdown errors gracefully", async () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const server = new MCPWordPressServer();
      server.server = mockMcpServer;

      const shutdownError = new Error("Shutdown error");
      mockMcpServer.close.mockRejectedValue(shutdownError);

      await expect(server.shutdown()).rejects.toThrow("Shutdown error");
    });
  });

  describe("private methods", () => {
    let server;

    beforeEach(() => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      server = new MCPWordPressServer();
    });

    it("should load configuration correctly", () => {
      expect(server.wordpressClients).toBeInstanceOf(Map);
      expect(server.wordpressClients.size).toBe(1);
      expect(server.siteConfigs).toHaveLength(1);
    });

    it("should setup tools correctly", () => {
      expect(mockToolRegistry.registerAllTools).toHaveBeenCalled();
    });

    it("should test client connections", async () => {
      mockConnectionTester.testClientConnections.mockResolvedValue(undefined);

      await server.testClientConnections();

      expect(mockConnectionTester.testClientConnections).toHaveBeenCalledWith(server.wordpressClients);
      expect(server.initialized).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle configuration loading errors", () => {
      const configError = new Error("Config error");
      mockServerConfig.loadClientConfigurations.mockImplementation(() => {
        throw configError;
      });

      expect(() => new MCPWordPressServer()).toThrow("Config error");
    });

    it("should handle tool registry errors", () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const registryError = new Error("Registry error");
      mockToolRegistry.registerAllTools.mockImplementation(() => {
        throw registryError;
      });

      expect(() => new MCPWordPressServer()).toThrow("Registry error");
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple sites configuration", () => {
      const mockClients = new Map([
        ["site1", mockWordPressClient],
        ["site2", mockWordPressClient],
      ]);
      const mockConfigs = [
        { id: "site1", name: "Site 1" },
        { id: "site2", name: "Site 2" },
      ];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const server = new MCPWordPressServer();

      expect(server.wordpressClients.size).toBe(2);
      expect(server.siteConfigs).toHaveLength(2);
    });

    it("should handle empty configuration gracefully", () => {
      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: new Map(),
        configs: [],
      });

      new MCPWordPressServer();

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle partial connection test failures", async () => {
      const mockClients = new Map([["site1", mockWordPressClient]]);
      const mockConfigs = [{ id: "site1" }];

      mockServerConfig.loadClientConfigurations.mockReturnValue({
        clients: mockClients,
        configs: mockConfigs,
      });

      const server = new MCPWordPressServer();
      server.server = mockMcpServer;

      const partialError = new Error("Site 1 connection failed");
      mockConnectionTester.testClientConnections.mockRejectedValue(partialError);

      await server.run();

      expect(console.error).toHaveBeenCalledWith("WARNING: Connection test failed: Site 1 connection failed");
      expect(mockMcpServer.connect).toHaveBeenCalled();
    });
  });
});
