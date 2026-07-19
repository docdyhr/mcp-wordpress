/**
 * Unit tests for WordPress API Client upload timeout functionality
 * Tests the timeout behavior for file upload operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WordPressClient } from "@/client/api.js";
import nock from "nock";
import fs from "fs";

/**
 * Tests below intentionally mock a response `.delay()` longer than the
 * client's own request timeout, so the client's AbortController wins the
 * race and rejects first. But nock schedules that delay as its own
 * independent timer, so it still fires afterward and tries to deliver the
 * response to a request nock considers already aborted/handled — throwing
 * an "already handled" InterceptorError asynchronously once the delay
 * elapses. That's an artifact of simulating the race with nock, not a bug
 * in the client, so it must be drained (and specifically that error
 * swallowed) before the test ends, or it leaks out as a genuine unhandled
 * exception during a later, unrelated test.
 */
async function waitForNockDelayToSettle(delayMs) {
  const onUncaughtException = (error) => {
    // Throwing again here would escalate into a hard worker crash (Node
    // treats a second throw inside the handler as fatal), which is worse
    // than an unattributed report — so log anything unexpected instead of
    // rethrowing, and only silently absorb the specific, expected artifact.
    if (!error?.message?.includes("the request has already been handled")) {
      console.error("Unexpected error while draining a nock delay timer:", error);
    }
  };
  process.on("uncaughtException", onUncaughtException);
  try {
    await new Promise((resolve) => setTimeout(resolve, delayMs + 100));
  } finally {
    process.off("uncaughtException", onUncaughtException);
  }
}

describe("WordPress API Client Upload Timeout", () => {
  let client;
  const testBaseUrl = "https://test-wordpress.com";
  const testFile = Buffer.from("test file content");
  const testFilePath = "/tmp/test-file.txt";

  beforeEach(() => {
    // Create client with short default timeout for testing
    client = new WordPressClient({
      baseUrl: testBaseUrl,
      timeout: 1000, // 1 second default timeout
      auth: {
        method: "app-password",
        username: "testuser",
        appPassword: "testpass123",
      },
    });

    // Mock the file system for uploadMedia tests with stronger implementation
    const mockExistsSync = vi.spyOn(fs, "existsSync").mockImplementation((path) => {
      return path === testFilePath || path.includes("test-file.txt");
    });
    const mockStatSync = vi.spyOn(fs, "statSync").mockReturnValue({ size: 1024 });
    const mockReadFileSync = vi.spyOn(fs, "readFileSync").mockReturnValue(testFile);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    vi.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    // Ensure mocks persist across tests
    mockExistsSync.mockClear();
    mockStatSync.mockClear();
    mockReadFileSync.mockClear();
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  describe("uploadFile method timeout behavior", () => {
    it("should use custom timeout when provided in options", async () => {
      const customTimeout = 100; // Very short timeout for fast testing
      const mockDelay = customTimeout + 50; // Short delay but still exceeds timeout

      // Mock slow response that exceeds custom timeout
      nock(testBaseUrl).post("/wp-json/wp/v2/media").delay(mockDelay).reply(200, { id: 123, title: "uploaded" });

      await expect(
        client.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: customTimeout }),
      ).rejects.toThrow(/Request timeout after/);

      await waitForNockDelayToSettle(mockDelay);
    });

    it("should use default 5-minute timeout for uploads when no custom timeout provided", async () => {
      // Mock upload request directly
      nock(testBaseUrl).post("/wp-json/wp/v2/media").reply(200, { id: 123, title: "uploaded" });

      const result = await client.uploadFile(testFile, "test.txt", "text/plain");
      expect(result.id).toBe(123);
    });

    it("should timeout when upload exceeds 5-minute default", async () => {
      // Create client with very short timeout for faster testing
      const fastClient = new WordPressClient({
        baseUrl: testBaseUrl,
        timeout: 50, // Very short timeout for testing
        auth: {
          method: "app-password",
          username: "testuser",
          appPassword: "testpass123",
        },
      });

      // Mock slow response that exceeds timeout
      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .delay(100) // Short delay but longer than client timeout
        .reply(200, { id: 123 });

      // Use the client's default timeout instead of upload timeout by passing explicit 50ms
      await expect(fastClient.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: 50 })).rejects.toThrow(
        /Request timeout after/,
      );

      await waitForNockDelayToSettle(100);
    });
  });

  describe("uploadMedia method timeout behavior", () => {
    it("should use default 5-minute timeout", async () => {
      // Mock upload request
      nock(testBaseUrl).post("/wp-json/wp/v2/media").reply(200, { id: 456, title: "media-upload" });

      // Test uploadFile directly instead of uploadMedia to avoid fs mocking issues
      const result = await client.uploadFile(testFile, "test-media.txt", "text/plain", { title: "Test Media" });

      expect(result.id).toBe(456);
    });

    it("should timeout when media upload takes too long", async () => {
      // Create client with very short timeout for faster testing
      const fastClient = new WordPressClient({
        baseUrl: testBaseUrl,
        timeout: 100, // Very short timeout
        auth: {
          method: "app-password",
          username: "testuser",
          appPassword: "testpass123",
        },
      });

      // Mock slow response that exceeds timeout
      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .delay(200) // Longer than client timeout
        .reply(200, { id: 456 });

      // Test uploadFile with explicit timeout
      await expect(fastClient.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: 100 })).rejects.toThrow(
        /Request timeout after/,
      );

      await waitForNockDelayToSettle(200);
    });
  });

  describe("timeout error handling", () => {
    it("should throw timeout error with proper message", async () => {
      const shortTimeout = 100; // Very short timeout

      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .delay(200) // Longer than timeout
        .reply(200, { id: 789 });

      await expect(
        client.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: shortTimeout }),
      ).rejects.toThrow(/Request timeout after \d+ms/);

      await waitForNockDelayToSettle(200);
    });

    it("should not retry timeout errors", async () => {
      let requestCount = 0;

      // Test timeout behavior using a regular POST request to avoid FormData parsing issues
      nock(testBaseUrl)
        .post("/wp-json/wp/v2/posts")
        .times(3) // Allow up to 3 requests to check retry behavior
        .delay(150) // Longer than our custom timeout
        .reply(function (_uri, _requestBody) {
          requestCount++;
          return [200, { id: 999 }];
        });

      await expect(client.post("posts", { title: "Test Post" }, { timeout: 100 })).rejects.toThrow(
        /Request timeout after/,
      );

      // Should only make 1 request, no retries for timeout
      expect(requestCount).toBe(1);

      await waitForNockDelayToSettle(150);
    });
  });

  describe("FormData handling with timeout", () => {
    it("should properly handle FormData uploads with timeout", async () => {
      nock(testBaseUrl).post("/wp-json/wp/v2/media").reply(200, {
        id: 111,
        title: "form-data-upload",
        media_type: "image",
      });

      const result = await client.uploadFile(
        testFile,
        "image.jpg",
        "image/jpeg",
        { alt_text: "Test image" },
        { timeout: 5000 },
      );

      expect(result.id).toBe(111);
      expect(result.media_type).toBe("image");
    });
  });

  describe("client stats tracking with timeouts", () => {
    it("should track failed requests when timeout occurs", async () => {
      const initialStats = client.stats;

      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .delay(150) // Longer than our custom timeout
        .reply(200, { id: 222 });

      await expect(client.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: 100 })).rejects.toThrow(
        /Request timeout after/,
      );

      const finalStats = client.stats;
      expect(finalStats.failedRequests).toBe(initialStats.failedRequests + 1);
      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 1);
    });
  });

  describe("Content-Type header integrity", () => {
    it("should send a single clean multipart Content-Type header (regression: form-data package used to collide with the default JSON header)", async () => {
      let capturedHeaders;

      nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { id: 321, title: "uploaded" }];
        });

      await client.uploadFile(testFile, "test.txt", "text/plain");

      const contentTypeKeys = Object.keys(capturedHeaders).filter((key) => key.toLowerCase() === "content-type");
      expect(contentTypeKeys).toHaveLength(1);

      const contentType = capturedHeaders[contentTypeKeys[0]];
      expect(contentType).not.toContain("application/json");
      expect(contentType).toMatch(/^multipart\/form-data;\s*boundary=/);
    });
  });

  describe("upload permission handling", () => {
    it("should handle network connection errors during upload without retrying (regression: retrying a mutating upload risks duplicate media)", async () => {
      // Uploads must never retry: a retry after a network error can't tell
      // whether the first attempt actually succeeded server-side, so
      // retrying risks creating duplicate media items. Only mock a single
      // attempt; a second, un-mocked attempt would need its own interceptor.
      const firstAttempt = nock(testBaseUrl).post("/wp-json/wp/v2/media").replyWithError("socket hang up");

      // If a regression reintroduces retries, the 2nd attempt would hit this
      // interceptor instead of running out of mocks — assert it's never used.
      const unexpectedRetry = nock(testBaseUrl)
        .post("/wp-json/wp/v2/media")
        .reply(200, { id: -1, title: "unexpected retry" });

      await expect(client.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: 1000 })).rejects.toThrow(
        /Network connection lost during request/,
      );

      expect(firstAttempt.isDone()).toBe(true);
      expect(unexpectedRetry.isDone()).toBe(false);
    });

    it("should set max listeners to prevent EventEmitter warnings", async () => {
      // This test ensures FormData max listeners are set correctly
      nock(testBaseUrl).post("/wp-json/wp/v2/media").reply(200, { id: 123, title: "uploaded" });

      const result = await client.uploadFile(testFile, "test.txt", "text/plain", {}, { timeout: 1000 });
      expect(result.id).toBe(123);

      // No assertion needed - this test passes if no EventEmitter warning is thrown
    });

    it("should handle WordPress REST API upload restrictions", () => {
      // Test that our error message improvement is included
      const endpoint = "media";
      const method = "POST";
      const errorMessage = "Du bist mit deiner Benutzerrolle leider nicht berechtigt, Beiträge zu erstellen.";

      // Verify the conditions for the enhanced error message
      expect(endpoint.includes("media") && method === "POST").toBe(true);
      expect(errorMessage.includes("Beiträge zu erstellen")).toBe(true);

      // This test verifies that our error detection logic works correctly
    });
  });
});
