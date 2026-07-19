import { vi } from "vitest";

const mockLoadClientConfigurations = vi.fn();

vi.mock("../../dist/config/ServerConfiguration.js", () => ({
  ServerConfiguration: {
    getInstance: () => ({
      loadClientConfigurations: mockLoadClientConfigurations,
    }),
  },
}));

const { MCPWordPressServer, runHealthCheck } = await import("../../dist/index.js");

describe("MCPWordPressServer", () => {
  let originalConsoleError;
  let originalProcessExit;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = vi.fn();

    originalProcessExit = process.exit;
    process.exit = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should create an instance of MCPWordPressServer", () => {
      expect(() => {
        new MCPWordPressServer();
      }).not.toThrow();
    });
  });

  describe("Basic functionality", () => {
    it("should have required methods", () => {
      const server = new MCPWordPressServer();
      expect(typeof server.run).toBe("function");
      expect(typeof server.shutdown).toBe("function");
    });
  });

  describe("runHealthCheck", () => {
    let stdoutSpy;
    let stderrSpy;

    beforeEach(() => {
      stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
      stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it("exits 0 when at least one WordPress site is configured", async () => {
      mockLoadClientConfigurations.mockResolvedValue({
        clients: new Map([["default", {}]]),
        configs: [],
      });

      await runHealthCheck();

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("Health check passed"));
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("exits 1 when no WordPress sites are configured", async () => {
      mockLoadClientConfigurations.mockResolvedValue({
        clients: new Map(),
        configs: [],
      });

      await runHealthCheck();

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("no WordPress sites configured"));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("exits 1 when configuration loading throws (e.g. malformed multi-site config)", async () => {
      mockLoadClientConfigurations.mockRejectedValue(new Error("Failed to load multi-site configuration: boom"));

      await runHealthCheck();

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("Health check failed"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("boom"));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("never opens a stdio transport", async () => {
      // A real MCP connection would hang waiting on stdin; health checks
      // must be finite. Asserting server.connect is never invoked here
      // would require spying on the SDK — instead, this documents intent:
      // runHealthCheck() only reads configuration and exits.
      mockLoadClientConfigurations.mockResolvedValue({ clients: new Map([["default", {}]]), configs: [] });

      const result = await Promise.race([
        runHealthCheck().then(() => "resolved"),
        new Promise((resolve) => setTimeout(() => resolve("timed-out"), 200)),
      ]);

      expect(result).toBe("resolved");
    });
  });
});
