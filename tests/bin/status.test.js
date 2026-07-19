import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { WordPressStatus } from "../../bin/status.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const statusScriptPath = join(__dirname, "../../bin/status.js");

describe("bin/status.js credential redaction", () => {
  const SECRET_APP_PASSWORD = "abcd1234EFGHsecretApplicationPasswordValue";
  const SECRET_JWT_SECRET = "jwtSECRETvalueTHATmustNEVERleak0987";
  const SECRET_JWT_PASSWORD = "jwtUserPasswordSECRETvalue1122";
  const SECRET_BASIC_PASSWORD = "basicAuthSECRETpasswordVALUE4455";
  const SECRET_COOKIE_NONCE = "cookieNonceSECRETvalue998877";

  let logSpy;
  let originalEnv;

  const relevantEnvVars = [
    "WORDPRESS_SITE_URL",
    "WORDPRESS_USERNAME",
    "WORDPRESS_APP_PASSWORD",
    "WORDPRESS_PASSWORD",
    "WORDPRESS_JWT_SECRET",
    "WORDPRESS_API_KEY",
    "WORDPRESS_COOKIE_NONCE",
  ];

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of relevantEnvVars) {
      delete process.env[key];
    }
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
  });

  function loggedOutput() {
    return logSpy.mock.calls.flat().map(String).join("\n");
  }

  it("never prints the full application password", async () => {
    process.env.WORDPRESS_SITE_URL = "https://example.test";
    process.env.WORDPRESS_USERNAME = "admin";
    process.env.WORDPRESS_APP_PASSWORD = SECRET_APP_PASSWORD;

    const status = new WordPressStatus();
    await status.checkConfiguration();

    expect(loggedOutput()).not.toContain(SECRET_APP_PASSWORD);
  });

  it("never prints the full JWT secret or password", async () => {
    process.env.WORDPRESS_SITE_URL = "https://example.test";
    process.env.WORDPRESS_USERNAME = "jwtuser";
    process.env.WORDPRESS_PASSWORD = SECRET_JWT_PASSWORD;
    process.env.WORDPRESS_JWT_SECRET = SECRET_JWT_SECRET;

    const status = new WordPressStatus();
    await status.checkConfiguration();

    const output = loggedOutput();
    expect(output).not.toContain(SECRET_JWT_SECRET);
    expect(output).not.toContain(SECRET_JWT_PASSWORD);
  });

  it("never prints the full Basic auth password", async () => {
    process.env.WORDPRESS_SITE_URL = "https://example.test";
    process.env.WORDPRESS_USERNAME = "basicuser";
    process.env.WORDPRESS_PASSWORD = SECRET_BASIC_PASSWORD;

    const status = new WordPressStatus();
    await status.checkConfiguration();

    expect(loggedOutput()).not.toContain(SECRET_BASIC_PASSWORD);
  });

  it("never prints the full cookie nonce", async () => {
    process.env.WORDPRESS_SITE_URL = "https://example.test";
    process.env.WORDPRESS_COOKIE_NONCE = SECRET_COOKIE_NONCE;

    const status = new WordPressStatus();
    await status.checkConfiguration();

    expect(loggedOutput()).not.toContain(SECRET_COOKIE_NONCE);
  });

  it("classifies credential-shaped variable names as sensitive regardless of prefix", () => {
    const status = new WordPressStatus();
    const sensitiveNames = [
      "WORDPRESS_APP_PASSWORD",
      "WORDPRESS_PASSWORD",
      "WORDPRESS_JWT_SECRET",
      "WORDPRESS_API_KEY",
      "WORDPRESS_API_SECRET",
      "WORDPRESS_OAUTH_CLIENT_SECRET",
      "WORDPRESS_COOKIE_NONCE",
    ];
    for (const name of sensitiveNames) {
      expect(status.isSensitiveVarName(name)).toBe(true);
    }
  });

  it("does not classify non-credential variable names as sensitive", () => {
    const status = new WordPressStatus();
    const nonSensitiveNames = [
      "WORDPRESS_SITE_URL",
      "WORDPRESS_USERNAME",
      "WORDPRESS_TIMEOUT",
      "DEBUG",
      "CACHE_ENABLED",
    ];
    for (const name of nonSensitiveNames) {
      expect(status.isSensitiveVarName(name)).toBe(false);
    }
  });

  it("does not dump the resolved auth config object to stdout", () => {
    // Regression guard: checkWordPressConnection() previously logged the raw
    // auth config object (including plaintext secrets) via
    // `console.log("Debug: Auth config:", authConfig)`.
    const source = readFileSync(statusScriptPath, "utf-8");
    expect(source).not.toMatch(/console\.log\([^)]*authConfig/);
  });
});
