import { existsSync, chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { WordPressSetup, serializeEnvValue, serializeEnvFile, buildClaudeDesktopConfig } from "../../bin/setup.js";

describe("bin/setup.js env serialization", () => {
  it("single-quotes values containing spaces, #, double quotes, and backslashes", () => {
    expect(serializeEnvValue("simple")).toBe("'simple'");
    expect(serializeEnvValue("has spaces")).toBe("'has spaces'");
    expect(serializeEnvValue("has # a hash")).toBe("'has # a hash'");
    expect(serializeEnvValue('has "quotes"')).toBe("'has \"quotes\"'");
    expect(serializeEnvValue("has\\backslash")).toBe("'has\\backslash'");
  });

  it("serializes a full env var map with a trailing newline, one KEY='value' per line", () => {
    const content = serializeEnvFile({ FOO: "bar", BAZ: "has space" });
    expect(content).toBe("FOO='bar'\nBAZ='has space'\n");
  });

  it("round-trips values with spaces, #, double quotes, backslashes, and apostrophes through dotenv's own parser", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mcp-wordpress-setup-test-"));
    const envPath = join(dir, ".env");
    try {
      const dotenv = await import("dotenv");
      const cases = [
        "value with spaces, a # hash, and a trailing space ",
        'value with "double quotes" embedded',
        "value with a\\backslash",
        "value with an apostrophe don't stop",
        "O'Brien123",
      ];

      for (const [i, tricky] of cases.entries()) {
        writeFileSync(envPath, serializeEnvFile({ TRICKY: tricky }));
        const parsed = dotenv.parse(readFileSync(envPath));
        expect(parsed.TRICKY, `case ${i}: ${JSON.stringify(tricky)}`).toBe(tricky);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("documents a known dotenv parser limitation: apostrophe + # together in the same value still misparses", async () => {
    // This is not a bug in serializeEnvValue — dotenv's own comment-stripping logic loses
    // track of quote state once an odd number of `'` precedes a `#`, and there is no escape
    // sequence dotenv reverses that works around it from the write side (see the docstring
    // on serializeEnvValue). Locked in here so nobody "fixes" this by re-introducing broken
    // backslash-escaping under the assumption it's an oversight.
    const dir = mkdtempSync(join(tmpdir(), "mcp-wordpress-setup-test-"));
    const envPath = join(dir, ".env");
    try {
      const dotenv = await import("dotenv");
      const problematic = "don't # this breaks";
      writeFileSync(envPath, serializeEnvFile({ TRICKY: problematic }));
      const parsed = dotenv.parse(readFileSync(envPath));

      expect(parsed.TRICKY).not.toBe(problematic);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("bin/setup.js buildClaudeDesktopConfig", () => {
  it("produces valid, correctly-escaped JSON for a secret containing an embedded quote", () => {
    const config = buildClaudeDesktopConfig(
      {
        WORDPRESS_URL: "https://example.com",
        AUTH_METHOD: "app-password",
        USERNAME: "admin",
        APPLICATION_PASSWORD: 'weird"password\\with\\backslashes',
      },
      "/path/to/dist/index.js",
    );

    const json = JSON.stringify(config, null, 2);
    const reparsed = JSON.parse(json); // throws if the escaping were ever hand-rolled and wrong

    expect(reparsed.mcpServers.wordpress.env.WORDPRESS_APP_PASSWORD).toBe('weird"password\\with\\backslashes');
    expect(reparsed.mcpServers.wordpress.command).toBe("node");
    expect(reparsed.mcpServers.wordpress.args).toEqual(["/path/to/dist/index.js"]);
  });

  it("includes DEBUG/RATE_LIMIT/DISABLE_CACHE when present", () => {
    const config = buildClaudeDesktopConfig(
      {
        WORDPRESS_URL: "https://example.com",
        AUTH_METHOD: "app-password",
        DEBUG: "true",
        RATE_LIMIT: "60",
        DISABLE_CACHE: "false",
      },
      "/path/to/dist/index.js",
    );

    expect(config.mcpServers.wordpress.env.DEBUG).toBe("true");
    expect(config.mcpServers.wordpress.env.RATE_LIMIT).toBe("60");
    expect(config.mcpServers.wordpress.env.DISABLE_CACHE).toBe("false");
  });

  it("omits optional auth fields that were never collected", () => {
    const config = buildClaudeDesktopConfig(
      { WORDPRESS_URL: "https://example.com", AUTH_METHOD: "api-key", API_KEY: "abc123" },
      "/path/to/dist/index.js",
    );

    expect(config.mcpServers.wordpress.env.WORDPRESS_API_KEY).toBe("abc123");
    expect(config.mcpServers.wordpress.env.WORDPRESS_APP_PASSWORD).toBeUndefined();
    expect(config.mcpServers.wordpress.env.WORDPRESS_PASSWORD).toBeUndefined();
    expect(config.mcpServers.wordpress.env.WORDPRESS_JWT_SECRET).toBeUndefined();
  });
});

describe("bin/setup.js saveConfiguration", () => {
  let dir;
  let setup;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mcp-wordpress-setup-test-"));
    setup = new WordPressSetup();
    setup.envPath = join(dir, ".env");
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    setup.rl.close();
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("persists DEBUG, RATE_LIMIT, and DISABLE_CACHE (previously collected but silently discarded)", async () => {
    setup.config = {
      WORDPRESS_URL: "https://example.com",
      USERNAME: "admin",
      AUTH_METHOD: "app-password",
      APPLICATION_PASSWORD: "app pass word",
      DEBUG: "true",
      DISABLE_CACHE: "true",
      RATE_LIMIT: "30",
    };

    await setup.saveConfiguration();

    const written = readFileSync(setup.envPath, "utf8");
    expect(written).toContain("DEBUG='true'");
    expect(written).toContain("DISABLE_CACHE='true'");
    expect(written).toContain("RATE_LIMIT='30'");
  });

  it("sets owner-only (0600) permissions on a freshly created file", async () => {
    if (process.platform === "win32") return; // POSIX permission bits don't apply

    setup.config = {
      WORDPRESS_URL: "https://example.com",
      USERNAME: "admin",
      AUTH_METHOD: "app-password",
      APPLICATION_PASSWORD: "secret",
      DEBUG: "false",
      DISABLE_CACHE: "false",
      RATE_LIMIT: "60",
    };

    await setup.saveConfiguration();

    const mode = statSync(setup.envPath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("resets permissions to 0600 when overwriting a pre-existing file with looser permissions", async () => {
    if (process.platform === "win32") return; // POSIX permission bits don't apply

    writeFileSync(setup.envPath, "OLD=value\n");
    chmodSync(setup.envPath, 0o644); // simulate a pre-existing, world-readable file

    setup.config = {
      WORDPRESS_URL: "https://example.com",
      USERNAME: "admin",
      AUTH_METHOD: "app-password",
      APPLICATION_PASSWORD: "secret",
      DEBUG: "false",
      DISABLE_CACHE: "false",
      RATE_LIMIT: "60",
    };

    await setup.saveConfiguration();

    expect(existsSync(setup.envPath)).toBe(true);
    const mode = statSync(setup.envPath).mode & 0o777;
    // Regression: writeFileSync's `mode` option only applies at file *creation* — on a
    // pre-existing file it silently keeps the old (here, overly permissive) bits unless
    // something explicitly chmod()s afterward.
    expect(mode).toBe(0o600);
  });
});
