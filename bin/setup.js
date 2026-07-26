#!/usr/bin/env node

import { writeFileSync, existsSync, chmodSync } from "fs";
import { createInterface } from "readline/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { Writable } from "stream";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

/**
 * Serializes a single .env value, single-quoting it so values containing spaces, `#`, double
 * quotes, backslashes, or a lone apostrophe survive a round trip through dotenv's parser
 * instead of corrupting the file or being silently truncated at the first `#`. Single-quoted
 * dotenv values are taken completely literally (dotenv strips only the outermost matching
 * quote pair and expands nothing inside) — unlike double-quoted values, where dotenv expands
 * `\n` to a real newline but does *not* reverse `\"`/`\\`, so a naively backslash-escaped
 * double-quoted value does not round-trip correctly.
 *
 * Known residual limitation: a value containing BOTH an apostrophe and a `#` together (in
 * either order, anywhere in the string) still misparses — dotenv's own comment-stripping
 * logic loses track of whether it's inside quotes once an odd number of `'` precedes a `#`.
 * There is no escape sequence dotenv reverses that works around this from the write side; a
 * value needing both characters together is left as a documented gap rather than silently
 * corrupted in a way that looks like it should have worked.
 */
export function serializeEnvValue(value) {
  return `'${String(value)}'`;
}

/** Serializes a plain key/value map into .env file content, one KEY='value' line per entry. */
export function serializeEnvFile(envVars) {
  return (
    Object.entries(envVars)
      .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
      .join("\n") + "\n"
  );
}

/**
 * Builds the Claude Desktop MCP server config as a plain object (not a hand-spliced JSON
 * string) so every value is properly JSON-escaped regardless of embedded quotes/backslashes.
 */
export function buildClaudeDesktopConfig(config, distIndexPath) {
  const env = {
    WORDPRESS_SITE_URL: config.WORDPRESS_URL,
    WORDPRESS_AUTH_METHOD: config.AUTH_METHOD,
  };

  if (config.USERNAME) env.WORDPRESS_USERNAME = config.USERNAME;
  if (config.APPLICATION_PASSWORD) env.WORDPRESS_APP_PASSWORD = config.APPLICATION_PASSWORD;
  if (config.PASSWORD) env.WORDPRESS_PASSWORD = config.PASSWORD;
  if (config.JWT_SECRET) env.WORDPRESS_JWT_SECRET = config.JWT_SECRET;
  if (config.API_KEY) env.WORDPRESS_API_KEY = config.API_KEY;
  if (config.DEBUG !== undefined) env.DEBUG = config.DEBUG;
  if (config.RATE_LIMIT !== undefined) env.RATE_LIMIT = config.RATE_LIMIT;
  if (config.DISABLE_CACHE !== undefined) env.DISABLE_CACHE = config.DISABLE_CACHE;

  return {
    mcpServers: {
      wordpress: {
        command: "node",
        args: [distIndexPath],
        env,
      },
    },
  };
}

class WordPressSetup {
  constructor() {
    // Wraps stdout so secret prompts can suppress real-character echo and print asterisks
    // instead, without needing a second readline interface competing for the same stdin.
    this.mutableStdout = new Writable({
      write: (chunk, encoding, callback) => {
        if (!this.mutableStdout.muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });
    this.mutableStdout.muted = false;

    this.rl = createInterface({
      input: process.stdin,
      output: this.mutableStdout,
      terminal: true,
    });
    this.config = {};
    this.envPath = join(rootDir, ".env");
  }

  async run() {
    try {
      console.log("🔧 WordPress MCP Server Setup");
      console.log("==============================\n");

      await this.detectExistingConfig();
      await this.gatherConfiguration();
      await this.testConnection();
      await this.saveConfiguration();
      await this.showNextSteps();
    } catch (error) {
      console.error("❌ Setup failed:", error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Like this.rl.question(), but echoes '*' instead of the real characters typed — for
   * passwords, secrets, and API keys, which must never appear in a terminal scrollback or
   * screen-recording in plaintext.
   */
  async questionHidden(promptText) {
    process.stdout.write(promptText);
    this.mutableStdout.muted = true;
    try {
      return await this.rl.question("");
    } finally {
      this.mutableStdout.muted = false;
      process.stdout.write("\n");
    }
  }

  async detectExistingConfig() {
    if (existsSync(this.envPath)) {
      const answer = await this.rl.question("⚠️  Existing configuration found. Overwrite? (y/N): ");
      if (answer.toLowerCase() !== "y") {
        console.log("Setup cancelled.");
        process.exit(0);
      }
    }
  }

  async gatherConfiguration() {
    console.log("📝 WordPress Site Configuration\n");

    // WordPress URL
    this.config.WORDPRESS_URL = await this.rl.question("WordPress Site URL (e.g., https://example.com): ");
    if (!this.config.WORDPRESS_URL.startsWith("http")) {
      this.config.WORDPRESS_URL = "https://" + this.config.WORDPRESS_URL;
    }
    this.config.WORDPRESS_URL = this.config.WORDPRESS_URL.replace(/\/$/, "");

    // Authentication method
    console.log("\n🔐 Authentication Method:");
    console.log("1. Application Password (Recommended)");
    console.log("2. Basic Authentication (Username/Password)");
    console.log("3. JWT Token");
    console.log("4. API Key");

    const authChoice = await this.rl.question("Choose authentication method (1-4): ");

    switch (authChoice) {
      case "1":
        await this.setupApplicationPassword();
        break;
      case "2":
        await this.setupBasicAuth();
        break;
      case "3":
        await this.setupJWT();
        break;
      case "4":
        await this.setupAPIKey();
        break;
      default:
        console.log("Invalid choice, defaulting to Application Password");
        await this.setupApplicationPassword();
    }

    // Optional settings
    console.log("\n⚙️  Optional Settings:");

    const debugAnswer = await this.rl.question("Enable debug logging? (y/N): ");
    this.config.DEBUG = debugAnswer.toLowerCase() === "y" ? "true" : "false";

    const cacheAnswer = await this.rl.question("Enable caching? (Y/n): ");
    this.config.DISABLE_CACHE = cacheAnswer.toLowerCase() === "n" ? "true" : "false";

    const rateLimit = await this.rl.question("Rate limit (requests per minute, default 60): ");
    this.config.RATE_LIMIT = rateLimit || "60";
  }

  async setupApplicationPassword() {
    this.config.AUTH_METHOD = "app-password";
    this.config.USERNAME = await this.rl.question("WordPress Username: ");

    console.log("\n📱 Application Password Setup:");
    console.log("1. Go to your WordPress admin dashboard");
    console.log("2. Navigate to Users > Profile");
    console.log('3. Scroll to "Application Passwords"');
    console.log('4. Enter "MCP WordPress Server" as the name');
    console.log('5. Click "Add New Application Password"');
    console.log("6. Copy the generated password (it will only be shown once)");

    const openBrowser = await this.rl.question("\nOpen WordPress admin in browser? (Y/n): ");
    if (openBrowser.toLowerCase() !== "n") {
      try {
        await open(`${this.config.WORDPRESS_URL}/wp-admin/profile.php#application-passwords-section`);
      } catch {
        console.log("Could not open browser automatically");
      }
    }

    this.config.APPLICATION_PASSWORD = await this.questionHidden("\nPaste Application Password: ");
  }

  async setupBasicAuth() {
    this.config.AUTH_METHOD = "basic";
    this.config.USERNAME = await this.rl.question("WordPress Username: ");
    this.config.PASSWORD = await this.questionHidden("WordPress Password: ");

    console.log("\n⚠️  Note: Basic authentication may require additional plugin setup");
  }

  async setupJWT() {
    this.config.AUTH_METHOD = "jwt";
    this.config.JWT_SECRET = await this.questionHidden("JWT Secret Key: ");
    this.config.USERNAME = await this.rl.question("WordPress Username: ");
    this.config.PASSWORD = await this.questionHidden("WordPress Password: ");

    console.log("\n⚠️  Note: JWT authentication requires JWT Authentication plugin");
  }

  async setupAPIKey() {
    this.config.AUTH_METHOD = "api-key";
    this.config.API_KEY = await this.questionHidden("API Key: ");
  }

  async ensureBuild() {
    console.log("🔨 Building TypeScript project...");
    try {
      execSync("npm run build", { cwd: rootDir, stdio: "pipe" });
      console.log("✅ Build successful!");
    } catch {
      throw new Error('TypeScript build failed. Please run "npm run build" manually.');
    }
  }

  async testConnection() {
    console.log("\n🔄 Testing WordPress connection...");

    // Ensure TypeScript is compiled
    await this.ensureBuild();

    try {
      // Create a temporary client to test connection
      const { WordPressClient } = await import("../dist/client/api.js");
      const client = new WordPressClient({
        baseUrl: this.config.WORDPRESS_URL,
        auth: this.getAuthConfig(),
      });

      await client.authenticate();
      // getSiteInfo() hits the REST root (wp-json/wp/v2/); the client's own
      // apiUrl already includes that prefix, so passing "/wp/v2/" here would
      // request .../wp-json/wp/v2/wp/v2/ and 404.
      const siteInfo = await client.getSiteInfo();

      console.log("✅ Connection successful!");
      console.log(`   Site: ${siteInfo.name || "WordPress Site"}`);
      console.log(`   URL: ${this.config.WORDPRESS_URL}`);
    } catch (error) {
      console.log("❌ Connection failed:", error.message);
      const retry = await this.rl.question("Retry with different settings? (y/N): ");
      if (retry.toLowerCase() === "y") {
        await this.gatherConfiguration();
        return this.testConnection();
      }
      throw error;
    }
  }

  getAuthConfig() {
    switch (this.config.AUTH_METHOD) {
      case "app-password":
        return {
          method: "app-password",
          username: this.config.USERNAME,
          appPassword: this.config.APPLICATION_PASSWORD,
        };
      case "basic":
        return {
          method: "basic",
          username: this.config.USERNAME,
          password: this.config.PASSWORD,
        };
      case "jwt":
        return {
          method: "jwt",
          secret: this.config.JWT_SECRET,
          username: this.config.USERNAME,
          password: this.config.PASSWORD,
        };
      case "api-key":
        return {
          method: "api-key",
          apiKey: this.config.API_KEY,
        };
      default:
        throw new Error("Invalid authentication method");
    }
  }

  async saveConfiguration() {
    console.log("\n💾 Saving configuration...");

    // Map config keys to environment variable names
    const envVars = {
      WORDPRESS_SITE_URL: this.config.WORDPRESS_URL,
      WORDPRESS_USERNAME: this.config.USERNAME,
      WORDPRESS_AUTH_METHOD: this.config.AUTH_METHOD,
      DEBUG: this.config.DEBUG,
      DISABLE_CACHE: this.config.DISABLE_CACHE,
      RATE_LIMIT: this.config.RATE_LIMIT,
    };

    if (this.config.APPLICATION_PASSWORD) {
      envVars["WORDPRESS_APP_PASSWORD"] = this.config.APPLICATION_PASSWORD;
    }
    if (this.config.PASSWORD) {
      envVars["WORDPRESS_PASSWORD"] = this.config.PASSWORD;
    }
    if (this.config.JWT_SECRET) {
      envVars["WORDPRESS_JWT_SECRET"] = this.config.JWT_SECRET;
    }
    if (this.config.API_KEY) {
      envVars["WORDPRESS_API_KEY"] = this.config.API_KEY;
    }

    const envContent = serializeEnvFile(envVars);

    // Owner-only permissions: the file holds plaintext credentials. The `mode` option on
    // writeFileSync only applies when the file is newly created (POSIX open() semantics) — if
    // an existing, more permissive .env is being overwritten, its old mode bits otherwise
    // survive untouched. chmodSync below closes that gap unconditionally. Windows has no
    // equivalent permission model, so both calls are POSIX-only.
    writeFileSync(this.envPath, envContent, { mode: 0o600 });
    if (process.platform !== "win32") {
      chmodSync(this.envPath, 0o600);
    }
    console.log("✅ Configuration saved to .env file (permissions set to owner-only where supported)");
  }

  async showNextSteps() {
    console.log("\n🎉 Setup Complete!");
    console.log("==================");
    console.log("\nNext steps:");
    console.log("1. Test the server: npm run status");
    console.log("2. Run integration tests: npm test");
    console.log("3. Start the MCP server: npm start");
    console.log("\nFor Claude Desktop integration:");
    console.log("Add this to your Claude Desktop MCP settings:\n");
    const claudeConfig = buildClaudeDesktopConfig(this.config, join(rootDir, "dist/index.js"));
    console.log(JSON.stringify(claudeConfig, null, 2));
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new WordPressSetup();
  setup.run();
}

export { WordPressSetup };
