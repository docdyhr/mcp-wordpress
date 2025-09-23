/**
 * Tests for Environment Variable Loading
 */

import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

describe("Environment Variable Loading", () => {
  const testEnvPath = join(rootDir, ".env.test");
  const originalCwd = process.cwd();
  let originalEnv;

  beforeEach(() => {
    // Backup original environment
    originalEnv = { ...process.env };

    // Create test .env file
    const testEnvContent = `
WORDPRESS_SITE_URL=https://test.example.com
WORDPRESS_USERNAME=testuser
WORDPRESS_APP_PASSWORD=test1234567890
WORDPRESS_AUTH_METHOD=app-password
DEBUG=false
`;
    writeFileSync(testEnvPath, testEnvContent);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Cleanup test .env file
    if (existsSync(testEnvPath)) {
      unlinkSync(testEnvPath);
    }

    // Restore original working directory
    process.chdir(originalCwd);
  });

  it("should load .env from project root when called from same directory", async () => {
    // Change to project root
    process.chdir(rootDir);

    // Clear environment variables
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;

    // Test the dotenv loading logic manually
    const { config } = await import("dotenv");
    const envPath = join(rootDir, ".env.test");

    const result = config({ path: envPath });

    expect(result.error).toBeUndefined();
    expect(result.parsed).toBeDefined();
    expect(result.parsed.WORDPRESS_SITE_URL).toBe("https://test.example.com");
    expect(result.parsed.WORDPRESS_USERNAME).toBe("testuser");
  });

  it("should load .env from project root when called from different directory", async () => {
    // Change to a different directory (e.g., home directory)
    const tempDir = process.env.HOME || "/tmp";
    process.chdir(tempDir);

    // Clear environment variables
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;

    // Test the dotenv loading logic manually
    const { config } = await import("dotenv");
    const envPath = join(rootDir, ".env.test");

    const result = config({ path: envPath });

    expect(result.error).toBeUndefined();
    expect(result.parsed).toBeDefined();
    expect(result.parsed.WORDPRESS_SITE_URL).toBe("https://test.example.com");
    expect(result.parsed.WORDPRESS_USERNAME).toBe("testuser");
  });

  it("should handle missing .env file gracefully", async () => {
    const { config } = await import("dotenv");
    const nonExistentPath = join(rootDir, ".env.nonexistent");

    const result = config({ path: nonExistentPath });

    // dotenv should not throw an error for missing files
    expect(result.error).toBeDefined();
    expect(result.parsed).toEqual({});
  });

  it("should load environment variables in the correct format", async () => {
    const { config } = await import("dotenv");
    const envPath = join(rootDir, ".env.test");

    const result = config({ path: envPath });

    expect(result.parsed).toMatchObject({
      WORDPRESS_SITE_URL: expect.stringMatching(/^https?:\/\//),
      WORDPRESS_USERNAME: expect.any(String),
      WORDPRESS_APP_PASSWORD: expect.any(String),
      WORDPRESS_AUTH_METHOD: expect.stringMatching(/^(app-password|jwt|basic|api-key|cookie)$/),
      DEBUG: expect.stringMatching(/^(true|false)$/),
    });
  });

  it("should resolve paths correctly relative to dist directory", () => {
    // Simulate being in the dist directory (where compiled index.js is)
    const distDir = join(rootDir, "dist");

    // Test path resolution logic
    const mockFilename = join(distDir, "index.js");
    const mockDirname = dirname(mockFilename);
    const resolvedRootDir = join(mockDirname, "..");
    const resolvedEnvPath = join(resolvedRootDir, ".env.test");

    expect(resolvedRootDir).toBe(rootDir);
    expect(existsSync(resolvedEnvPath)).toBe(true);
  });

  it("should work when server is started from dist directory", async () => {
    // Test path resolution logic that would be used in dist/index.js
    const mockDistPath = join(rootDir, "dist", "index.js");
    const mockDistDir = dirname(mockDistPath);
    const resolvedRootDir = join(mockDistDir, "..");
    const resolvedEnvPath = join(resolvedRootDir, ".env.test");

    // Verify the path resolution works correctly
    expect(resolvedRootDir).toBe(rootDir);
    expect(existsSync(resolvedEnvPath)).toBe(true);

    // Test that we can load the env file from this resolved path
    const { config } = await import("dotenv");
    const result = config({ path: resolvedEnvPath });

    expect(result.error).toBeUndefined();
    expect(result.parsed.WORDPRESS_SITE_URL).toBe("https://test.example.com");
  });

  it("should work when server is started from parent directory", async () => {
    // Test that the absolute path approach works regardless of working directory
    const absoluteEnvPath = join(rootDir, ".env.test");

    // Change to parent directory to simulate running from different location
    const originalCwd = process.cwd();
    try {
      const parentDir = dirname(rootDir);
      process.chdir(parentDir);

      // The absolute path should still work
      const { config } = await import("dotenv");
      const result = config({ path: absoluteEnvPath });

      expect(result.error).toBeUndefined();
      expect(result.parsed.WORDPRESS_SITE_URL).toBe("https://test.example.com");
      expect(result.parsed.WORDPRESS_USERNAME).toBe("testuser");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
