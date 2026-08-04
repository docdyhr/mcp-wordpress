/**
 * Regression tests for fail-closed multi-site configuration loading.
 *
 * ServerConfiguration.loadClientConfigurations() must only fall back to
 * single-site environment configuration when the multi-site config file is
 * genuinely absent (ENOENT). Any other failure — permission errors,
 * malformed JSON, schema validation failures, duplicate site IDs — must stop
 * startup instead of silently redirecting operations to the environment
 * site's credentials.
 *
 * fs and dotenv are mocked so this suite never touches the real,
 * credential-bearing .env / mcp-wordpress.config.json files at the repo root.
 */
import { vi } from "vitest";

const mockAccess = vi.fn();
const mockReadFile = vi.fn();
const mockDotenvConfig = vi.fn();

vi.mock("dotenv", () => ({
  default: { config: mockDotenvConfig },
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: mockAccess,
      readFile: mockReadFile,
    },
  };
});

const { ServerConfiguration } = await import("../../dist/config/ServerConfiguration.js");
const { Config } = await import("../../dist/config/Config.js");

function enoent() {
  const error = new Error("ENOENT: no such file or directory");
  error.code = "ENOENT";
  return error;
}

function eacces() {
  const error = new Error("EACCES: permission denied");
  error.code = "EACCES";
  return error;
}

const VALID_MULTI_SITE_CONFIG = {
  sites: [
    {
      id: "site1",
      name: "Site One",
      config: {
        WORDPRESS_SITE_URL: "https://example.com",
        WORDPRESS_USERNAME: "admin",
        WORDPRESS_APP_PASSWORD: "abcd1234efgh5678",
      },
    },
  ],
};

const SINGLE_SITE_ENV_VARS = ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME", "WORDPRESS_APP_PASSWORD"];

describe("ServerConfiguration multi-site fail-closed behavior", () => {
  let serverConfig;
  let previousEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDotenvConfig.mockReturnValue({});
    serverConfig = ServerConfiguration.getInstance();
    // Single-site env fallback must use known fake values, not leftover real
    // credentials from a prior test process/.env read.
    previousEnv = Object.fromEntries(SINGLE_SITE_ENV_VARS.map((key) => [key, process.env[key]]));
    process.env.WORDPRESS_SITE_URL = "https://fallback.example.com";
    process.env.WORDPRESS_USERNAME = "fallback-user";
    process.env.WORDPRESS_APP_PASSWORD = "fallback-app-password-1234";
  });

  afterEach(() => {
    for (const key of SINGLE_SITE_ENV_VARS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  });

  it("falls back to single-site env config when the config file does not exist (ENOENT)", async () => {
    mockAccess.mockRejectedValue(enoent());

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("default");
    expect(result.configs[0].config.WORDPRESS_SITE_URL).toBe("https://fallback.example.com");
  });

  it("fails closed on permission errors instead of falling back to single-site", async () => {
    mockAccess.mockRejectedValue(eacces());

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("fails closed on malformed JSON instead of falling back to single-site", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue("{ not valid json");

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow();
  });

  it("fails closed on schema validation failure instead of falling back to single-site", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify({ sites: [{ id: "site1" /* missing config */ }] }));

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow();
  });

  it("fails closed on duplicate site IDs instead of falling back to single-site", async () => {
    mockAccess.mockResolvedValue(undefined);
    const duplicateConfig = {
      sites: [VALID_MULTI_SITE_CONFIG.sites[0], { ...VALID_MULTI_SITE_CONFIG.sites[0], name: "Site Two" }],
    };
    mockReadFile.mockResolvedValue(JSON.stringify(duplicateConfig));

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow();
  });

  it("loads real multi-site clients when the config file is valid", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    const result = await serverConfig.loadClientConfigurations();

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("site1");
    expect(result.clients.has("site1")).toBe(true);
  });
});

describe("ServerConfiguration multi-site production guard", () => {
  // Vitest sets NODE_ENV=test, which makes ConfigHelpers.isTest() true and
  // exempts these tests themselves from the guard by default — the tests
  // below explicitly flip NODE_ENV to simulate a non-CI/non-test boot and
  // must call Config.reset() afterward so the singleton re-reads the real
  // environment on the next access, in this file and any that follow it.
  let serverConfig;
  const GUARD_ENV_VARS = ["NODE_ENV", "CI", "MCP_WORDPRESS_ALLOW_MULTI_SITE"];
  let previousEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDotenvConfig.mockReturnValue({});
    serverConfig = ServerConfiguration.getInstance();
    previousEnv = Object.fromEntries(GUARD_ENV_VARS.map((key) => [key, process.env[key]]));
  });

  afterEach(() => {
    for (const key of GUARD_ENV_VARS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
    Config.reset();
  });

  it("fails closed when MCP_WORDPRESS_ALLOW_MULTI_SITE is not set outside CI/test", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CI;
    delete process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE;
    Config.reset();

    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow(/MCP_WORDPRESS_ALLOW_MULTI_SITE/);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("proceeds when MCP_WORDPRESS_ALLOW_MULTI_SITE=true is set outside CI/test", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CI;
    process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE = "true";
    Config.reset();

    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    const result = await serverConfig.loadClientConfigurations();

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("site1");
  });
});
