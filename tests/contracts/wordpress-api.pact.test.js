import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { Pact } from "@pact-foundation/pact";
import { WordPressClient } from "../../dist/client/api.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Contract testing for WordPress REST API interactions
 * This ensures our client works correctly with the WordPress API contract
 *
 * Can run in two modes:
 * 1. Mock mode (default): Uses Pact mock provider
 * 2. Live mode: Uses real WordPress instance when PACT_LIVE_TESTING=true
 */
describe("WordPress API Contract Tests", () => {
  let provider;
  let wordpressClient;
  const isLiveTesting = process.env.PACT_LIVE_TESTING === "true";

  beforeAll(async () => {
    if (isLiveTesting) {
      console.log("🌐 Running contract tests against live WordPress instance");

      // Use live WordPress configuration
      wordpressClient = new WordPressClient({
        baseUrl: process.env.WORDPRESS_TEST_URL || "http://localhost:8081",
        auth: {
          method: process.env.WORDPRESS_AUTH_METHOD || "app-password",
          username: process.env.WORDPRESS_USERNAME || "testuser",
          appPassword:
            process.env.WORDPRESS_APP_PASSWORD || "test-password-123",
        },
      });

      // Verify live WordPress is accessible
      try {
        const response = await fetch(
          `${wordpressClient.config.baseUrl}/wp-json/wp/v2/`,
        );
        if (!response.ok) {
          throw new Error(`WordPress not accessible: ${response.status}`);
        }
        console.log("✅ Live WordPress instance is accessible");
      } catch (error) {
        throw new Error(
          `Failed to connect to live WordPress: ${error.message}`,
        );
      }
    } else {
      console.log("🎭 Running contract tests with Pact mock provider");

      // Setup mock provider for WordPress REST API
      provider = new Pact({
        consumer: "mcp-wordpress-server",
        provider: "wordpress-rest-api",
        port: 8080,
        log: path.resolve(__dirname, "../logs", "pact.log"),
        dir: path.resolve(__dirname, "../pacts"),
        logLevel: "info",
      });

      // Start the mock provider
      await provider.setup();

      // Initialize WordPress client to use mock provider
      wordpressClient = new WordPressClient({
        baseUrl: "http://localhost:8080",
        auth: {
          method: "app-password",
          username: "testuser",
          appPassword: "test-password-123",
        },
      });
    }
  });

  afterAll(async () => {
    if (!isLiveTesting && provider) {
      // Verify all interactions and cleanup (only for mock testing)
      await provider.verify();
      await provider.finalize();
    }
  });

  describe("Posts API Contract", () => {
    it("should create a post with valid response format", async () => {
      // Define the expected interaction
      const postData = {
        title: "Test Post Title",
        content: "This is test content",
        status: "draft",
      };

      if (!isLiveTesting) {
        const expectedResponse = {
          id: 123,
          title: {
            rendered: "Test Post Title",
          },
          content: {
            rendered: "This is test content",
          },
          status: "draft",
          author: 1,
          date: "2024-01-01T12:00:00",
          modified: "2024-01-01T12:00:00",
          slug: "test-post-title",
          link: "http://localhost:8080/test-post-title",
          excerpt: {
            rendered: "",
          },
          featured_media: 0,
          comment_status: "open",
          ping_status: "open",
          sticky: false,
          template: "",
          format: "standard",
          meta: {},
          categories: [1],
          tags: [],
        };

        await provider.addInteraction({
          state: "WordPress site exists with authenticated user",
          uponReceiving: "a request to create a post",
          withRequest: {
            method: "POST",
            path: "/wp-json/wp/v2/posts",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
            },
            body: postData,
          },
          willRespondWith: {
            status: 201,
            headers: {
              "Content-Type": "application/json",
            },
            body: expectedResponse,
          },
        });
      }

      // Execute the request
      const result = await wordpressClient.createPost(postData);

      // Verify the response structure matches our contract
      expect(result).toMatchObject({
        id: expect.any(Number),
        title: {
          rendered: expect.any(String),
        },
        content: {
          rendered: expect.any(String),
        },
        status: expect.any(String),
        author: expect.any(Number),
      });
    });

    it("should retrieve posts with correct pagination format", async () => {
      if (!isLiveTesting) {
        const expectedResponse = [
          {
            id: 1,
            title: { rendered: "Post 1" },
            content: { rendered: "Content 1" },
            status: "publish",
            author: 1,
            date: "2024-01-01T12:00:00",
            modified: "2024-01-01T12:00:00",
            slug: "post-1",
            excerpt: { rendered: "Excerpt 1" },
          },
          {
            id: 2,
            title: { rendered: "Post 2" },
            content: { rendered: "Content 2" },
            status: "publish",
            author: 1,
            date: "2024-01-02T12:00:00",
            modified: "2024-01-02T12:00:00",
            slug: "post-2",
            excerpt: { rendered: "Excerpt 2" },
          },
        ];

        await provider.addInteraction({
          state: "WordPress site has published posts",
          uponReceiving: "a request to list posts with pagination",
          withRequest: {
            method: "GET",
            path: "/wp-json/wp/v2/posts",
            query: {
              page: "1",
              per_page: "10",
            },
            headers: {
              Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-WP-Total": "2",
              "X-WP-TotalPages": "1",
            },
            body: expectedResponse,
          },
        });
      }

      const result = await wordpressClient.getPosts({ page: 1, per_page: 10 });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: expect.any(Number),
        title: { rendered: expect.any(String) },
        content: { rendered: expect.any(String) },
        status: expect.any(String),
      });
    });

    it("should handle post not found error correctly", async () => {
      await provider.addInteraction({
        state: "post with ID 999 does not exist",
        uponReceiving: "a request for a non-existent post",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts/999",
          headers: {
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            code: "rest_post_invalid_id",
            message: "Invalid post ID.",
            data: {
              status: 404,
            },
          },
        },
      });

      await expect(wordpressClient.getPost(999)).rejects.toThrow();
    });
  });

  describe("Media API Contract", () => {
    it("should upload media with correct multipart format", async () => {
      const expectedResponse = {
        id: 456,
        title: { rendered: "test-image.jpg" },
        source_url: "http://localhost:8080/wp-content/uploads/test-image.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        media_details: {
          width: 1024,
          height: 768,
          file: "2024/01/test-image.jpg",
          sizes: {
            thumbnail: {
              file: "test-image-150x150.jpg",
              width: 150,
              height: 150,
              mime_type: "image/jpeg",
              source_url:
                "http://localhost:8080/wp-content/uploads/test-image-150x150.jpg",
            },
          },
        },
      };

      await provider.addInteraction({
        state: "WordPress site accepts media uploads",
        uponReceiving: "a media upload request",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/media",
          headers: {
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
            "Content-Type":
              "multipart/form-data; boundary=----WebKitFormBoundary",
          },
          body: expect.any(Object), // FormData is complex to match exactly
        },
        willRespondWith: {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
          body: expectedResponse,
        },
      });

      // Mock file data - create a temporary file for testing
      /* eslint-env node */
      const fs = require("fs");
      const path = require("path");
      const tempFile = path.join(__dirname, "test-image.jpg");
      fs.writeFileSync(tempFile, Buffer.from("fake image data"));

      try {
        const result = await wordpressClient.uploadMedia({
          file_path: tempFile,
          title: "test-image.jpg",
        });

        expect(result).toMatchObject({
          id: expect.any(Number),
          source_url: expect.any(String),
          mime_type: expect.any(String),
          media_type: expect.any(String),
        });
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });

  describe("Users API Contract", () => {
    it("should retrieve user information with correct format", async () => {
      const expectedResponse = {
        id: 1,
        username: "testuser",
        name: "Test User",
        email: "test@example.com",
        url: "",
        description: "Test user description",
        link: "http://localhost:8080/author/testuser",
        slug: "testuser",
        avatar_urls: {
          24: "http://localhost:8080/avatar-24.png",
          48: "http://localhost:8080/avatar-48.png",
          96: "http://localhost:8080/avatar-96.png",
        },
        meta: [],
        roles: ["administrator"],
        capabilities: {
          edit_posts: true,
          delete_posts: true,
        },
      };

      await provider.addInteraction({
        state: "user with ID 1 exists",
        uponReceiving: "a request for user information",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/users/1",
          headers: {
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: expectedResponse,
        },
      });

      const result = await wordpressClient.getUser(1);

      expect(result).toMatchObject({
        id: expect.any(Number),
        username: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        roles: expect.any(Array),
      });
    });
  });

  describe("Authentication Contract", () => {
    it("should handle authentication failure correctly", async () => {
      await provider.addInteraction({
        state: "invalid credentials provided",
        uponReceiving: "a request with invalid authentication",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts",
          headers: {
            Authorization: "Basic aW52YWxpZDppbnZhbGlk",
          },
        },
        willRespondWith: {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            code: "rest_cannot_access",
            message: "Sorry, you are not allowed to do that.",
            data: {
              status: 401,
            },
          },
        },
      });

      const invalidClient = new WordPressClient({
        baseUrl: "http://localhost:8080",
        auth: {
          method: "app-password",
          username: "invalid",
          appPassword: "invalid",
        },
      });

      await expect(invalidClient.getPosts()).rejects.toThrow();
    });

    it("should handle rate limiting correctly", async () => {
      await provider.addInteraction({
        state: "rate limit exceeded for user",
        uponReceiving: "a request that exceeds rate limits",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/posts",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
        },
        willRespondWith: {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
          body: {
            code: "rest_rate_limit_exceeded",
            message: "Rate limit exceeded. Please try again later.",
            data: {
              status: 429,
            },
          },
        },
      });

      await expect(
        wordpressClient.createPost({
          title: "Test",
          content: "Test",
        }),
      ).rejects.toThrow();
    });
  });

  describe("API Error Handling Contract", () => {
    it("should handle malformed request data", async () => {
      await provider.addInteraction({
        state: "WordPress site is operational",
        uponReceiving: "a request with malformed post data",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/posts",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
          body: {
            title: "", // Invalid: empty title
            content: null, // Invalid: null content
          },
        },
        willRespondWith: {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            code: "rest_invalid_param",
            message: "Invalid parameter(s): title, content",
            data: {
              status: 400,
              params: {
                title: "Title cannot be empty",
                content: "Content cannot be null",
              },
            },
          },
        },
      });

      await expect(
        wordpressClient.createPost({
          title: "",
          content: null,
        }),
      ).rejects.toThrow();
    });

    it("should handle server errors gracefully", async () => {
      await provider.addInteraction({
        state: "WordPress site is experiencing server issues",
        uponReceiving: "a request during server maintenance",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts",
          headers: {
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
        },
        willRespondWith: {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "300",
          },
          body: {
            code: "rest_service_unavailable",
            message: "Service temporarily unavailable. Please try again later.",
            data: {
              status: 503,
            },
          },
        },
      });

      await expect(wordpressClient.getPosts()).rejects.toThrow();
    });
  });
});
