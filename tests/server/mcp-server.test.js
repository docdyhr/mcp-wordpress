import { vi } from "vitest";
import { MCPWordPressServer } from "../../dist/index.js";

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
});
