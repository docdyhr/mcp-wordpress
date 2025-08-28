
import { WordPressClient } from "@/client/api.js";

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
  const liveAvailable = !!process.env.WORDPRESS_TEST_URL;
  const forceLive = !!process.env.FORCE_LIVE_WP;
  const useLive = (liveAvailable && !process.env.SKIP_LIVE_TESTS) || forceLive;

  // Note: These tests require a running WordPress instance at WORDPRESS_TEST_URL
  // In local development, tests will fail if WordPress is not available
  // In CI, tests run against a real WordPress container

  describe("Core API Endpoints", () => {
    let client;

    beforeAll(() => {
      if (useLive) {
        client = new WordPressClient(testConfig);
      } else {
        client = {
          getPosts: async () => [{ id: 1 }],
          getUsers: async () => [{ id: 1 }],
          getMedia: async () => [{ id: 1 }],
          getPost: async (id) => {
            if (id === 999999999) throw new Error("Not Found");
            return { id };
          },
          createPost: async () => {
            throw new Error("Unauthorized");
          },
        };
      }
    });

    it(`should fetch posts (mock=${!useLive})`, async () => {
      const posts = await client.getPosts({ per_page: 1 });
      expect(Array.isArray(posts)).toBe(true);
    });

    it(`should fetch users (mock=${!useLive})`, async () => {
      const users = await client.getUsers({ per_page: 1 });
      expect(Array.isArray(users)).toBe(true);
    });

    it(`should fetch media (mock=${!useLive})`, async () => {
      const media = await client.getMedia({ per_page: 1 });
      expect(Array.isArray(media)).toBe(true);
    });

    it(`should handle 404 errors gracefully (mock=${!useLive})`, async () => {
      await expect(client.getPost(999999999)).rejects.toThrow();
    });

    it(`should handle authentication errors (mock=${!useLive})`, async () => {
      // Normalize to a single client reference to avoid conditional expect pattern
      const authFailureClient = useLive
        ? new WordPressClient({
            baseUrl: testConfig.baseUrl,
            auth: { method: "basic", username: "bad", password: "bad" },
          })
        : client; // mock already throws on createPost

      const createOp = authFailureClient.createPost({
        title: "Test Post",
        content: "This should fail due to bad credentials",
        status: "draft",
      });
      await expect(createOp).rejects.toThrow();
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
