import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { Pact } from "@pact-foundation/pact";
import { WordPressClient } from "../../dist/client/api.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Contract testing for WordPress REST API interactions
 * Tests the contract between MCP WordPress Server and WordPress REST API
 */
describe("WordPress API Contract Tests", () => {
  let provider;
  let wordpressClient;

  // Skip in CI unless explicitly enabled
  const skipInCI = process.env.CI && !process.env.ENABLE_CONTRACT_TESTS;

  if (skipInCI) {
    it("should skip contract tests in CI", () => {
      console.log("⏭️ Skipping contract tests in CI - set ENABLE_CONTRACT_TESTS=true to enable");
      expect(true).toBe(true);
    });
    return;
  }

  beforeAll(async () => {
    // Setup Pact mock provider
    provider = new Pact({
      consumer: "mcp-wordpress-server",
      provider: "wordpress-rest-api",
      port: 8080,
      log: path.resolve(__dirname, "../logs", "pact.log"),
      dir: path.resolve(__dirname, "../pacts"),
      logLevel: "info",
      spec: 2,
    });

    await provider.setup();

    // Create WordPress client using mock provider
    wordpressClient = new WordPressClient({
      baseUrl: "http://localhost:8080",
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "test-password-123",
      },
    });
  });

  afterAll(async () => {
    if (provider) {
      await provider.verify();
      await provider.finalize();
    }
  });

  describe("Posts API Contract", () => {
    it("should retrieve posts with correct format", async () => {
      const expectedResponse = [
        {
          id: 1,
          date: "2024-01-01T12:00:00",
          date_gmt: "2024-01-01T12:00:00",
          guid: { rendered: "http://localhost:8080/?p=1" },
          modified: "2024-01-01T12:00:00",
          modified_gmt: "2024-01-01T12:00:00",
          slug: "test-post",
          status: "publish",
          type: "post",
          link: "http://localhost:8080/test-post",
          title: { rendered: "Test Post" },
          content: { rendered: "<p>Test content</p>", protected: false },
          excerpt: { rendered: "<p>Test excerpt</p>", protected: false },
          author: 1,
          featured_media: 0,
          comment_status: "open",
          ping_status: "open",
          sticky: false,
          template: "",
          format: "standard",
          meta: [],
          categories: [1],
          tags: [],
        },
      ];

      await provider.addInteraction({
        state: "WordPress has posts",
        uponReceiving: "a request for posts",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts",
          headers: {
            Accept: "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-WP-Total": "1",
            "X-WP-TotalPages": "1",
          },
          body: expectedResponse,
        },
      });

      const response = await wordpressClient.getPosts({});

      expect(response).toBeTruthy();
      expect(Array.isArray(response)).toBe(true);
      expect(response[0]).toMatchObject({
        id: expect.any(Number),
        title: { rendered: expect.any(String) },
        content: { rendered: expect.any(String) },
        status: expect.any(String),
      });
    });

    it("should create a post successfully", async () => {
      const newPost = {
        title: "New Test Post",
        content: "This is test content",
        status: "draft",
      };

      const expectedResponse = {
        id: 123,
        date: "2024-01-01T12:00:00",
        date_gmt: "2024-01-01T12:00:00",
        guid: { rendered: "http://localhost:8080/?p=123" },
        modified: "2024-01-01T12:00:00",
        modified_gmt: "2024-01-01T12:00:00",
        slug: "new-test-post",
        status: "draft",
        type: "post",
        link: "http://localhost:8080/?p=123",
        title: { rendered: "New Test Post" },
        content: { rendered: "<p>This is test content</p>", protected: false },
        excerpt: { rendered: "", protected: false },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1],
        tags: [],
      };

      await provider.addInteraction({
        state: "WordPress can create posts",
        uponReceiving: "a request to create a post",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/posts",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
          body: newPost,
        },
        willRespondWith: {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
          body: expectedResponse,
        },
      });

      const response = await wordpressClient.createPost(newPost);

      expect(response).toBeTruthy();
      expect(response.id).toBe(123);
      expect(response.title.rendered).toBe("New Test Post");
      expect(response.status).toBe("draft");
    });

    it("should handle 404 errors correctly", async () => {
      await provider.addInteraction({
        state: "post 999 does not exist",
        uponReceiving: "a request for non-existent post",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts/999",
          headers: {
            Accept: "application/json",
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
            data: { status: 404 },
          },
        },
      });

      await expect(wordpressClient.getPost(999)).rejects.toThrow();
    });
  });

  describe("Media API Contract", () => {
    it("should retrieve media items", async () => {
      const expectedResponse = [
        {
          id: 10,
          date: "2024-01-01T12:00:00",
          date_gmt: "2024-01-01T12:00:00",
          guid: { rendered: "http://localhost:8080/wp-content/uploads/test.jpg" },
          modified: "2024-01-01T12:00:00",
          modified_gmt: "2024-01-01T12:00:00",
          slug: "test-image",
          status: "inherit",
          type: "attachment",
          link: "http://localhost:8080/test-image",
          title: { rendered: "Test Image" },
          author: 1,
          comment_status: "open",
          ping_status: "closed",
          template: "",
          meta: [],
          alt_text: "",
          caption: { rendered: "" },
          description: { rendered: "" },
          media_type: "image",
          mime_type: "image/jpeg",
          media_details: {
            width: 1024,
            height: 768,
            file: "2024/01/test.jpg",
            filesize: 102400,
            sizes: {},
          },
          source_url: "http://localhost:8080/wp-content/uploads/2024/01/test.jpg",
        },
      ];

      await provider.addInteraction({
        state: "WordPress has media items",
        uponReceiving: "a request for media",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/media",
          headers: {
            Accept: "application/json",
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

      const response = await wordpressClient.getMedia({});

      expect(response).toBeTruthy();
      expect(Array.isArray(response)).toBe(true);
      expect(response[0]).toMatchObject({
        id: expect.any(Number),
        source_url: expect.any(String),
        mime_type: expect.any(String),
      });
    });
  });

  describe("Authentication Contract", () => {
    it("should reject unauthorized requests", async () => {
      await provider.addInteraction({
        state: "invalid credentials",
        uponReceiving: "a request with invalid auth",
        withRequest: {
          method: "GET",
          path: "/wp-json/wp/v2/posts",
          headers: {
            Accept: "application/json",
            Authorization: "Basic aW52YWxpZDppbnZhbGlk",
          },
        },
        willRespondWith: {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            code: "rest_forbidden",
            message: "Sorry, you are not allowed to do that.",
            data: { status: 401 },
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

      await expect(invalidClient.getPosts({})).rejects.toThrow();
    });
  });

  describe("Error Handling Contract", () => {
    it("should handle rate limiting", async () => {
      await provider.addInteraction({
        state: "rate limit exceeded",
        uponReceiving: "a request exceeding rate limit",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/posts",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
          body: {
            title: "Test",
            content: "Test",
          },
        },
        willRespondWith: {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
          body: {
            code: "rest_too_many_requests",
            message: "Too many requests, please try again later.",
            data: { status: 429 },
          },
        },
      });

      await expect(wordpressClient.createPost({ title: "Test", content: "Test" })).rejects.toThrow();
    });

    it("should handle validation errors", async () => {
      await provider.addInteraction({
        state: "validation rules active",
        uponReceiving: "a request with invalid data",
        withRequest: {
          method: "POST",
          path: "/wp-json/wp/v2/posts",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Basic dGVzdHVzZXI6dGVzdC1wYXNzd29yZC0xMjM=",
          },
          body: {
            title: "",
            content: "",
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
                title: "Title is required",
                content: "Content is required",
              },
            },
          },
        },
      });

      await expect(wordpressClient.createPost({ title: "", content: "" })).rejects.toThrow();
    });
  });
});
