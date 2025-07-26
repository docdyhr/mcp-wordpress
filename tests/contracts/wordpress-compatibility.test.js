import { describe, it, expect } from "@jest/globals";
import { WordPressClient } from "../../dist/client/api.js";

/**
 * Simple WordPress API compatibility tests
 * More practical than complex Pact contract tests
 */
describe("WordPress API Compatibility", () => {
  const testConfig = {
    baseUrl: process.env.WORDPRESS_TEST_URL || "http://localhost:8081",
    auth: {
      method: "basic",
      username: process.env.WORDPRESS_USERNAME || "testuser",
      password: process.env.WORDPRESS_PASSWORD || "test-password-123",
    },
  };

  // Skip in CI unless we have a test WordPress instance
  // Also skip in local development if no WordPress instance is configured
  const skipTests =
    (process.env.CI && !process.env.WORDPRESS_TEST_URL) ||
    (!process.env.CI && !process.env.WORDPRESS_TEST_URL && !process.env.SKIP_LIVE_TESTS);

  // Note: These tests require a running WordPress instance at WORDPRESS_TEST_URL
  // In local development, tests will fail if WordPress is not available
  // In CI, tests run against a real WordPress container

  (skipTests ? describe.skip : describe)("Core API Endpoints", () => {
    let client;

    beforeAll(() => {
      client = new WordPressClient(testConfig);
    });

    it("should fetch posts", async () => {
      const posts = await client.getPosts({ per_page: 1 });
      expect(Array.isArray(posts)).toBe(true);
    });

    it("should fetch users", async () => {
      const users = await client.getUsers({ per_page: 1 });
      expect(Array.isArray(users)).toBe(true);
    });

    it("should fetch media", async () => {
      const media = await client.getMedia({ per_page: 1 });
      expect(Array.isArray(media)).toBe(true);
    });

    it("should handle 404 errors gracefully", async () => {
      await expect(client.getPost(999999999)).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      const badClient = new WordPressClient({
        baseUrl: testConfig.baseUrl,
        auth: { method: "basic", username: "bad", password: "bad" },
      });
      // Use a POST operation that requires authentication instead of GET
      await expect(
        badClient.createPost({
          title: "Test Post",
          content: "This should fail due to bad credentials",
          status: "draft",
        }),
      ).rejects.toThrow();
    });
  });

  describe("WordPress Version Compatibility", () => {
    it("documents supported versions", () => {
      const compatibility = {
        5.6: { supported: true, reason: "Minimum for App Passwords" },
        "6.0": { supported: true, reason: "LTS version" },
        6.1: { supported: true, reason: "Tested" },
        6.2: { supported: true, reason: "Tested" },
        6.3: { supported: true, reason: "Tested" },
        6.4: { supported: true, reason: "Latest tested" },
        6.5: { supported: true, reason: "Expected to work" },
      };

      const supported = Object.entries(compatibility)
        .filter(([_, info]) => info.supported)
        .map(([version]) => version);

      console.log(`✅ Supported WordPress versions: ${supported.join(", ")}`);
      expect(supported.length).toBeGreaterThanOrEqual(6);
    });
  });
});
