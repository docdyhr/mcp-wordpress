/**
 * Test to verify authentication headers are properly included in POST requests
 */

import nock from "nock";

describe("WordPress REST API Authentication Headers", () => {
  let client;
  let WordPressClient;
  const testBaseUrl = "https://test.wordpress.com";

  beforeEach(async () => {
    // Dynamic import
    const clientModule = await import("../dist/client/api.js");
    WordPressClient = clientModule.WordPressClient;

    // Clean up any pending mocks
    nock.cleanAll();

    // Create client with app password auth
    client = new WordPressClient({
      baseUrl: testBaseUrl,
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "xxxx yyyy zzzz aaaa bbbb cccc",
      },
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe("authentication headers", () => {
    it("should add Authorization header for app-password auth via request", async () => {
      let capturedHeaders;

      // Mock successful response and capture headers
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/users/me")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 1, name: "Test User" }];
        });

      await client.get("users/me");

      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);

      // Verify the encoded credentials
      const decoded = Buffer.from(capturedHeaders.authorization.replace("Basic ", ""), "base64").toString();
      expect(decoded).toBe("testuser:xxxx yyyy zzzz aaaa bbbb cccc");
    });
  });

  describe("request method", () => {
    it("should include Authorization header in GET requests", async () => {
      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/posts")
        .query({ per_page: 1 })
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, [{ id: 1, title: { rendered: "Test Post" } }]];
        });

      await client.getPosts({ per_page: 1 });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
    });

    it("should include Authorization header in POST requests", async () => {
      let capturedHeaders;
      let capturedBody;

      // Mock successful response
      nock(testBaseUrl)
        .post("/wp-json/wp/v2/posts")
        .reply(function (uri, requestBody) {
          capturedHeaders = this.req.headers;
          capturedBody = requestBody;
          return [200, { id: 123, title: { rendered: "New Post" } }];
        });

      await client.createPost({
        title: "New Post",
        content: "Test content",
        status: "draft",
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
      expect(capturedHeaders["content-type"]).toContain("application/json");
      expect(capturedBody).toEqual({
        title: "New Post",
        content: "Test content",
        status: "draft",
      });
    });

    it("should include Authorization header in PUT requests", async () => {
      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .put("/wp-json/wp/v2/posts/123")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 123, title: { rendered: "Updated Post" } }];
        });

      await client.updatePost({
        id: 123,
        title: "Updated Post",
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
    });

    it("should include Authorization header in DELETE requests", async () => {
      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .delete("/wp-json/wp/v2/posts/123")
        .query({ force: "true" })
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { deleted: true }];
        });

      await client.deletePost(123, true);

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
    });

    it("should not override auth headers when custom headers are provided", async () => {
      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/posts")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, []];
        });

      // Make request with custom headers
      await client.get("posts", {
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      // Should have both auth and custom headers
      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders["x-custom-header"]).toBe("custom-value");
    });

    it("should handle FormData requests without breaking auth headers", async () => {
      // Create mock FormData
      const FormData = (await import("form-data")).default;
      const formData = new FormData();
      formData.append("file", Buffer.from("test"), "test.jpg");

      // Test that FormData gets proper content-type headers from form-data library
      const headers = formData.getHeaders();
      expect(headers["content-type"]).toContain("multipart/form-data");

      // Mock successful response
      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .matchHeader("authorization", /^Basic/)
        .matchHeader("content-type", /multipart\/form-data/)
        .reply(200, {
          id: 456,
          source_url: "https://example.com/image.jpg",
        });

      const result = await client.post("media", formData);

      // Verify the request was successful
      expect(result.id).toBe(456);
      expect(result.source_url).toBe("https://example.com/image.jpg");
    });
  });

  describe("authentication with different methods", () => {
    it("should add Authorization header for basic auth via request", async () => {
      const basicClient = new WordPressClient({
        baseUrl: testBaseUrl,
        auth: {
          method: "basic",
          username: "testuser",
          password: "testpassword",
        },
      });

      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/users/me")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 1, name: "Test User" }];
        });

      await basicClient.get("users/me");

      expect(capturedHeaders.authorization).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);

      const decoded = Buffer.from(capturedHeaders.authorization.replace("Basic ", ""), "base64").toString();
      expect(decoded).toBe("testuser:testpassword");
    });

    it("should add Bearer token for JWT auth via request", async () => {
      const jwtClient = new WordPressClient({
        baseUrl: testBaseUrl,
        auth: {
          method: "jwt",
          secret: "test-jwt-secret",
          username: "testuser",
          password: "testpassword",
        },
      });

      // Mock the JWT token directly on the client instance
      jwtClient.jwtToken = "test-jwt-token";

      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/users/me")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 1, name: "Test User" }];
        });

      await jwtClient.get("users/me");

      expect(capturedHeaders.authorization).toBe("Bearer test-jwt-token");
    });

    it("should add X-API-Key header for API key auth via request", async () => {
      const apiKeyClient = new WordPressClient({
        baseUrl: testBaseUrl,
        auth: {
          method: "api-key",
          apiKey: "test-api-key-123",
        },
      });

      let capturedHeaders;

      // Mock successful response
      nock(testBaseUrl)
        .get("/wp-json/wp/v2/users/me")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 1, name: "Test User" }];
        });

      await apiKeyClient.get("users/me");

      expect(capturedHeaders["x-api-key"]).toBe("test-api-key-123");
    });
  });
});
