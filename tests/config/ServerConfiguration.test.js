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
import * as os from "os";
import * as path from "path";
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
    previousEnv = Object.fromEntries(
      [...SINGLE_SITE_ENV_VARS, "MCP_WORDPRESS_CONFIG"].map((key) => [key, process.env[key]]),
    );
    // A developer's exported MCP_WORDPRESS_CONFIG would turn the ENOENT fallback below into the
    // explicit-path fatal error.
    delete process.env.MCP_WORDPRESS_CONFIG;
    process.env.WORDPRESS_SITE_URL = "https://fallback.example.com";
    process.env.WORDPRESS_USERNAME = "fallback-user";
    process.env.WORDPRESS_APP_PASSWORD = "fallback-app-password-1234";
  });

  afterEach(() => {
    for (const key of [...SINGLE_SITE_ENV_VARS, "MCP_WORDPRESS_CONFIG"]) {
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

describe("ServerConfiguration multi-site config file resolution", () => {
  // The DXT install dir is replaced on every extension update, so a config that
  // only lives there silently disappears and the server falls back to the
  // single-site env config. Resolution order (first existing file wins):
  //   1. MCP_WORDPRESS_CONFIG (explicit; a missing file is fatal, never a fallback)
  //   2. ~/.config/mcp-wordpress/config.json
  //   3. ~/mcp-wordpress.config.json
  //   4. <install dir>/mcp-wordpress.config.json (legacy location)
  const home = os.homedir();
  const XDG_STYLE_PATH = path.join(home, ".config", "mcp-wordpress", "config.json");
  const HOME_PATH = path.join(home, "mcp-wordpress.config.json");
  const EXPLICIT_PATH = path.join(os.tmpdir(), "explicit-mcp-wordpress.json");

  const siteConfig = (id) => ({
    sites: [
      {
        id,
        name: `Site ${id}`,
        config: { ...VALID_MULTI_SITE_CONFIG.sites[0].config },
      },
    ],
  });

  let serverConfig;
  let installDirPath;
  let previousEnv;
  const RESOLUTION_ENV_VARS = [...SINGLE_SITE_ENV_VARS, "MCP_WORDPRESS_CONFIG", "MCP_WORDPRESS_ALLOW_MULTI_SITE"];

  // Pretend only these paths exist; each file's content is a distinct single-site config
  // named after the path's role so the loaded site ID reveals which file was read.
  function stubFiles(files) {
    mockAccess.mockImplementation(async (p) => {
      if (!(p in files)) throw enoent();
    });
    mockReadFile.mockImplementation(async (p) => JSON.stringify(siteConfig(files[p])));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockDotenvConfig.mockReturnValue({});
    serverConfig = ServerConfiguration.getInstance();
    installDirPath = path.resolve(serverConfig.getRootDir(), "mcp-wordpress.config.json");
    previousEnv = Object.fromEntries(RESOLUTION_ENV_VARS.map((key) => [key, process.env[key]]));
    delete process.env.MCP_WORDPRESS_CONFIG;
    process.env.WORDPRESS_SITE_URL = "https://fallback.example.com";
    process.env.WORDPRESS_USERNAME = "fallback-user";
    process.env.WORDPRESS_APP_PASSWORD = "fallback-app-password-1234";
  });

  afterEach(() => {
    for (const key of RESOLUTION_ENV_VARS) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  });

  it("loads the legacy install-dir config when it is the only file present", async () => {
    stubFiles({ [installDirPath]: "install-dir" });

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).toHaveBeenCalledWith(installDirPath, "utf-8");
    expect(result.configs.map((c) => c.id)).toEqual(["install-dir"]);
  });

  it("loads ~/mcp-wordpress.config.json when the install dir has no config (survives extension updates)", async () => {
    stubFiles({ [HOME_PATH]: "home" });

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).toHaveBeenCalledWith(HOME_PATH, "utf-8");
    expect(result.configs.map((c) => c.id)).toEqual(["home"]);
  });

  it("prefers ~/.config/mcp-wordpress/config.json over ~/mcp-wordpress.config.json", async () => {
    stubFiles({ [XDG_STYLE_PATH]: "xdg", [HOME_PATH]: "home", [installDirPath]: "install-dir" });

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledWith(XDG_STYLE_PATH, "utf-8");
    expect(result.configs.map((c) => c.id)).toEqual(["xdg"]);
  });

  it("prefers ~/mcp-wordpress.config.json over the install-dir config", async () => {
    stubFiles({ [HOME_PATH]: "home", [installDirPath]: "install-dir" });

    const result = await serverConfig.loadClientConfigurations();

    expect(result.configs.map((c) => c.id)).toEqual(["home"]);
  });

  it("prefers MCP_WORDPRESS_CONFIG over every default location", async () => {
    process.env.MCP_WORDPRESS_CONFIG = EXPLICIT_PATH;
    stubFiles({
      [EXPLICIT_PATH]: "explicit",
      [XDG_STYLE_PATH]: "xdg",
      [HOME_PATH]: "home",
      [installDirPath]: "install-dir",
    });

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledWith(EXPLICIT_PATH, "utf-8");
    expect(result.configs.map((c) => c.id)).toEqual(["explicit"]);
  });

  it("expands a leading ~ in MCP_WORDPRESS_CONFIG", async () => {
    process.env.MCP_WORDPRESS_CONFIG = "~/custom/sites.json";
    const expanded = path.join(home, "custom", "sites.json");
    stubFiles({ [expanded]: "tilde" });

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).toHaveBeenCalledWith(expanded, "utf-8");
    expect(result.configs.map((c) => c.id)).toEqual(["tilde"]);
  });

  it("fails closed when MCP_WORDPRESS_CONFIG points at a missing file instead of falling back", async () => {
    process.env.MCP_WORDPRESS_CONFIG = EXPLICIT_PATH;
    // Default locations exist, but an explicit path that is wrong must not silently
    // redirect to some other config (or to single-site env credentials).
    stubFiles({ [HOME_PATH]: "home" });

    const error = await serverConfig.loadClientConfigurations().catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("MCP_WORDPRESS_CONFIG");
    expect(error.message).toContain(EXPLICIT_PATH);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["unresolved DXT placeholder", "${user_config.config_path}"],
  ])("ignores an unset MCP_WORDPRESS_CONFIG (%s) and uses the default search", async (_label, value) => {
    process.env.MCP_WORDPRESS_CONFIG = value;
    stubFiles({ [HOME_PATH]: "home" });

    const result = await serverConfig.loadClientConfigurations();

    expect(result.configs.map((c) => c.id)).toEqual(["home"]);
  });

  it("falls back to single-site env config only when no candidate file exists", async () => {
    stubFiles({});

    const result = await serverConfig.loadClientConfigurations();

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(result.configs.map((c) => c.id)).toEqual(["default"]);
  });

  // Diagnostics reachable through a tool (the host log does not capture an extension's stderr).
  describe("getLoadInfo", () => {
    it("describes a multi-site load: file, source and site IDs", async () => {
      stubFiles({ [HOME_PATH]: "home" });

      await serverConfig.loadClientConfigurations();

      expect(serverConfig.getLoadInfo()).toEqual({
        mode: "multi-site",
        configPath: HOME_PATH,
        source: "home",
        siteIds: ["home"],
      });
    });

    it("describes a single-site fallback and the paths that were searched", async () => {
      stubFiles({});

      await serverConfig.loadClientConfigurations();

      expect(serverConfig.getLoadInfo()).toEqual({
        mode: "single-site",
        siteIds: ["default"],
        searched: [XDG_STYLE_PATH, HOME_PATH, installDirPath],
      });
    });

    it("reports the explicit source for MCP_WORDPRESS_CONFIG", async () => {
      process.env.MCP_WORDPRESS_CONFIG = EXPLICIT_PATH;
      stubFiles({ [EXPLICIT_PATH]: "explicit" });

      await serverConfig.loadClientConfigurations();

      expect(serverConfig.getLoadInfo()).toMatchObject({
        mode: "multi-site",
        source: "env",
        configPath: EXPLICIT_PATH,
      });
    });
  });

  describe("diagnostics", () => {
    let warn;

    beforeEach(() => {
      warn = vi.spyOn(serverConfig.logger, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it("warns about shadowed copies when a default location wins", async () => {
      stubFiles({ [XDG_STYLE_PATH]: "xdg", [HOME_PATH]: "home", [installDirPath]: "install-dir" });

      await serverConfig.loadClientConfigurations();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Multiple multi-site config files"),
        expect.objectContaining({ configPath: XDG_STYLE_PATH, ignored: [HOME_PATH, installDirPath] }),
      );
    });

    it("also warns about shadowed copies when MCP_WORDPRESS_CONFIG wins", async () => {
      process.env.MCP_WORDPRESS_CONFIG = EXPLICIT_PATH;
      stubFiles({ [EXPLICIT_PATH]: "explicit", [HOME_PATH]: "home" });

      await serverConfig.loadClientConfigurations();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Multiple multi-site config files"),
        expect.objectContaining({ configPath: EXPLICIT_PATH, ignored: [HOME_PATH] }),
      );
    });

    it("does not warn when only one config file exists", async () => {
      stubFiles({ [HOME_PATH]: "home" });

      await serverConfig.loadClientConfigurations();

      expect(warn).not.toHaveBeenCalled();
    });

    // The original incident: multi-site was intended, no file was found, and the server silently
    // became single-site. If the opt-in is set that is almost certainly a misconfiguration.
    it("warns when the multi-site opt-in is set but no config file was found", async () => {
      process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE = "true";
      stubFiles({});

      const result = await serverConfig.loadClientConfigurations();

      expect(result.configs.map((c) => c.id)).toEqual(["default"]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("MCP_WORDPRESS_ALLOW_MULTI_SITE is true but no multi-site config file was found"),
        expect.objectContaining({ searched: expect.arrayContaining([HOME_PATH, installDirPath]) }),
      );
    });

    it("stays quiet about a missing config when the opt-in is not set (plain single-site use)", async () => {
      delete process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE;
      stubFiles({});

      await serverConfig.loadClientConfigurations();

      expect(warn).not.toHaveBeenCalled();
    });
  });

  it("fails closed on a permission error for a default location instead of skipping it", async () => {
    mockAccess.mockImplementation(async (p) => {
      if (p === HOME_PATH) throw eacces();
      throw enoent();
    });

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow(/Failed to access multi-site/);
    expect(mockReadFile).not.toHaveBeenCalled();
  });
});

describe("ServerConfiguration multi-site production guard", () => {
  // Vitest sets NODE_ENV=test, which makes ConfigHelpers.isTest() true and
  // exempts these tests themselves from the guard by default — the tests
  // below explicitly flip NODE_ENV to simulate a non-CI/non-test boot and
  // must call Config.reset() afterward so the singleton re-reads the real
  // environment on the next access, in this file and any that follow it.
  //
  // Config.detectCIEnvironment() checks CI, NODE_ENV==="ci", GITHUB_ACTIONS,
  // TRAVIS, and CIRCLECI — all of them must be cleared, not just CI, or the
  // "fails closed" test below passes locally (no GITHUB_ACTIONS set) but
  // silently no-ops in real CI, where GitHub Actions always sets
  // GITHUB_ACTIONS=true and isCI() stays true regardless of CI itself.
  let serverConfig;
  const GUARD_ENV_VARS = [
    "NODE_ENV",
    "CI",
    "GITHUB_ACTIONS",
    "TRAVIS",
    "CIRCLECI",
    "MCP_WORDPRESS_ALLOW_MULTI_SITE",
    "MCP_WORDPRESS_CONFIG",
  ];
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
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
    delete process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE;
    Config.reset();

    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow(/MCP_WORDPRESS_ALLOW_MULTI_SITE/);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("still requires the opt-in for a config discovered in the home directory, and names the file", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
    delete process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE;
    delete process.env.MCP_WORDPRESS_CONFIG;
    Config.reset();

    // Home-directory discovery is implicit, so it must not be a way around the guard.
    const homeConfig = path.join(os.homedir(), "mcp-wordpress.config.json");
    mockAccess.mockImplementation(async (p) => {
      if (p !== homeConfig) throw enoent();
    });
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    await expect(serverConfig.loadClientConfigurations()).rejects.toThrow(homeConfig);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("proceeds when MCP_WORDPRESS_ALLOW_MULTI_SITE=true is set outside CI/test", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.TRAVIS;
    delete process.env.CIRCLECI;
    process.env.MCP_WORDPRESS_ALLOW_MULTI_SITE = "true";
    Config.reset();

    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify(VALID_MULTI_SITE_CONFIG));

    const result = await serverConfig.loadClientConfigurations();

    expect(result.configs).toHaveLength(1);
    expect(result.configs[0].id).toBe("site1");
  });
});
