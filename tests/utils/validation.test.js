import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  validateId,
  validateString,
  validateFilePath,
  validatePostStatus,
  validateUrl,
  validateFileSize,
  validateMimeType,
  sanitizeHtml,
  validateArray,
  validateEmail,
  validateUsername,
  validateSearchQuery,
  validatePaginationParams,
  validatePostParams,
} from "@/utils/validation.js";
import { isDisallowedHostname, isPrivateUrlAllowed, isInsecureHttpAllowed } from "@/utils/validation/network.js";
import { WordPressAPIError } from "@/types/client.js";

describe("validation utilities", () => {
  describe("validateId", () => {
    it("should validate correct IDs", () => {
      expect(validateId(1)).toBe(1);
      expect(validateId("123")).toBe(123);
      expect(validateId(999999)).toBe(999999);
    });

    it("should reject invalid IDs", () => {
      expect(() => validateId(0)).toThrow(WordPressAPIError);
      expect(() => validateId(-1)).toThrow(WordPressAPIError);
      expect(() => validateId("abc")).toThrow(WordPressAPIError);
      expect(() => validateId(null)).toThrow(WordPressAPIError);
      expect(() => validateId(undefined)).toThrow(WordPressAPIError);
      expect(() => validateId("")).toThrow(WordPressAPIError);
    });

    it("should reject decimal numbers", () => {
      expect(() => validateId(1.5)).toThrow(WordPressAPIError);
      expect(() => validateId("1.5")).toThrow(WordPressAPIError);
    });

    it("should reject numbers that are too large", () => {
      expect(() => validateId(2147483648)).toThrow(WordPressAPIError);
    });

    it("should include field name in error messages", () => {
      expect(() => validateId(null, "postId")).toThrow(/postId is required/);
      expect(() => validateId(-1, "userId")).toThrow(/userId.*positive number/);
    });
  });

  describe("validateString", () => {
    it("should validate correct strings", () => {
      expect(validateString("hello", "test")).toBe("hello");
      expect(validateString("  hello  ", "test")).toBe("hello");
      expect(validateString("a", "test", 1, 10)).toBe("a");
    });

    it("should reject invalid strings", () => {
      expect(() => validateString("", "test")).toThrow(WordPressAPIError);
      expect(() => validateString("   ", "test")).toThrow(WordPressAPIError);
      expect(() => validateString(null, "test")).toThrow(WordPressAPIError);
      expect(() => validateString(undefined, "test")).toThrow(WordPressAPIError);
    });

    it("should enforce length limits", () => {
      expect(() => validateString("a", "test", 2, 10)).toThrow(WordPressAPIError);
      expect(() => validateString("a".repeat(11), "test", 1, 10)).toThrow(WordPressAPIError);
    });

    it("should include field name in error messages", () => {
      expect(() => validateString("", "title")).toThrow(/Invalid title.*length must be between/);
      expect(() => validateString("a", "title", 2, 10)).toThrow(/Invalid title.*length must be between/);
    });
  });

  describe("validateFilePath", () => {
    let tmpRoot;

    beforeEach(() => {
      tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mcp-wp-upload-test-")));
    });

    afterEach(() => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it("disables uploads when no base directory is configured", () => {
      expect(() => validateFilePath("file.txt", undefined)).toThrow(WordPressAPIError);
      expect(() => validateFilePath("file.txt", "")).toThrow(WordPressAPIError);
    });

    it("rejects a missing configured root", () => {
      expect(() => validateFilePath("file.txt", path.join(tmpRoot, "does-not-exist"))).toThrow(WordPressAPIError);
    });

    it("validates a real file within the allowed directory", () => {
      const filePath = path.join(tmpRoot, "file.txt");
      fs.writeFileSync(filePath, "hello");
      expect(validateFilePath("file.txt", tmpRoot)).toBe(fs.realpathSync(filePath));
    });

    it("validates a nested real file within the allowed directory", () => {
      const nestedDir = path.join(tmpRoot, "folder");
      fs.mkdirSync(nestedDir);
      const filePath = path.join(nestedDir, "file.txt");
      fs.writeFileSync(filePath, "hello");
      expect(validateFilePath("folder/file.txt", tmpRoot)).toBe(fs.realpathSync(filePath));
    });

    it("rejects .. traversal outside the allowed directory", () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-wp-outside-"));
      fs.writeFileSync(path.join(outsideDir, "secret.txt"), "secret");
      try {
        expect(() => validateFilePath(`../${path.basename(outsideDir)}/secret.txt`, tmpRoot)).toThrow(
          WordPressAPIError,
        );
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it("rejects an absolute path outside the allowed directory", () => {
      const outsideFile = path.join(os.tmpdir(), `mcp-wp-abs-outside-${process.pid}.txt`);
      fs.writeFileSync(outsideFile, "secret");
      try {
        expect(() => validateFilePath(outsideFile, tmpRoot)).toThrow(WordPressAPIError);
      } finally {
        fs.rmSync(outsideFile, { force: true });
      }
    });

    it("rejects a sibling directory that merely shares a name prefix", () => {
      // Regression test: an allowed root of "/safe" must not match "/safe-secret"
      // via a raw string startsWith() comparison.
      const prefixCollisionDir = `${tmpRoot}-collision`;
      fs.mkdirSync(prefixCollisionDir, { recursive: true });
      const collisionFile = path.join(prefixCollisionDir, "file.txt");
      fs.writeFileSync(collisionFile, "secret");
      try {
        expect(() => validateFilePath(collisionFile, tmpRoot)).toThrow(WordPressAPIError);
      } finally {
        fs.rmSync(prefixCollisionDir, { recursive: true, force: true });
      }
    });

    it("rejects a symlink even when it points inside the allowed directory", () => {
      const realFile = path.join(tmpRoot, "real.txt");
      fs.writeFileSync(realFile, "hello");
      const symlinkPath = path.join(tmpRoot, "link.txt");
      fs.symlinkSync(realFile, symlinkPath);
      expect(() => validateFilePath("link.txt", tmpRoot)).toThrow(WordPressAPIError);
    });

    it("rejects a symlink that escapes the allowed directory", () => {
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-wp-outside-"));
      const outsideFile = path.join(outsideDir, "secret.txt");
      fs.writeFileSync(outsideFile, "secret");
      const symlinkPath = path.join(tmpRoot, "escape.txt");
      fs.symlinkSync(outsideFile, symlinkPath);
      try {
        expect(() => validateFilePath("escape.txt", tmpRoot)).toThrow(WordPressAPIError);
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it("rejects a directory passed as the file path", () => {
      fs.mkdirSync(path.join(tmpRoot, "folder"));
      expect(() => validateFilePath("folder", tmpRoot)).toThrow(WordPressAPIError);
    });

    it("rejects a path that resolves to a non-existent file", () => {
      expect(() => validateFilePath("does-not-exist.txt", tmpRoot)).toThrow(WordPressAPIError);
    });
  });

  describe("validatePostStatus", () => {
    it("should validate correct post statuses", () => {
      expect(validatePostStatus("publish")).toBe("publish");
      expect(validatePostStatus("draft")).toBe("draft");
      expect(validatePostStatus("pending")).toBe("pending");
      expect(validatePostStatus("private")).toBe("private");
      expect(validatePostStatus("trash")).toBe("trash");
    });

    it("should reject invalid post statuses", () => {
      expect(() => validatePostStatus("invalid")).toThrow(WordPressAPIError);
      expect(() => validatePostStatus("published")).toThrow(WordPressAPIError);
      expect(() => validatePostStatus("")).toThrow(WordPressAPIError);
    });
  });

  describe("validateUrl", () => {
    const originalAllowInsecureHttp = process.env.ALLOW_INSECURE_HTTP;
    const originalAllowPrivateUrls = process.env.ALLOW_PRIVATE_URLS;

    afterEach(() => {
      if (originalAllowInsecureHttp === undefined) {
        delete process.env.ALLOW_INSECURE_HTTP;
      } else {
        process.env.ALLOW_INSECURE_HTTP = originalAllowInsecureHttp;
      }
      if (originalAllowPrivateUrls === undefined) {
        delete process.env.ALLOW_PRIVATE_URLS;
      } else {
        process.env.ALLOW_PRIVATE_URLS = originalAllowPrivateUrls;
      }
    });

    it("should validate correct URLs", () => {
      expect(validateUrl("https://example.com")).toBe("https://example.com");
      expect(validateUrl("https://example.com/path")).toBe("https://example.com/path");
      expect(validateUrl("https://test.example.com")).toBe("https://test.example.com");
    });

    it("should reject invalid URLs", () => {
      expect(() => validateUrl("not-a-url")).toThrow(WordPressAPIError);
      expect(() => validateUrl("ftp://example.com")).toThrow(WordPressAPIError);
      expect(() => validateUrl("javascript:alert('xss')")).toThrow(WordPressAPIError);
      expect(() => validateUrl("")).toThrow(WordPressAPIError);
    });

    it("should include field name in error messages", () => {
      expect(() => validateUrl("invalid", "siteUrl")).toThrow(/Invalid siteUrl.*must start with http/);
    });

    it("should reject http URLs by default", () => {
      delete process.env.ALLOW_INSECURE_HTTP;
      expect(() => validateUrl("http://test.example.com")).toThrow(/HTTP is not allowed/);
    });

    it("should accept http URLs when ALLOW_INSECURE_HTTP=true", () => {
      process.env.ALLOW_INSECURE_HTTP = "true";
      expect(validateUrl("http://test.example.com")).toBe("http://test.example.com");
    });

    it("should reject private/localhost hostnames by default", () => {
      delete process.env.ALLOW_PRIVATE_URLS;
      process.env.ALLOW_INSECURE_HTTP = "true";
      expect(() => validateUrl("http://localhost:8080")).toThrow(/private\/localhost/i);
      expect(() => validateUrl("https://169.254.169.254")).toThrow(/private\/localhost/i);
    });

    it("should accept private/localhost hostnames when ALLOW_PRIVATE_URLS=true", () => {
      process.env.ALLOW_PRIVATE_URLS = "true";
      process.env.ALLOW_INSECURE_HTTP = "true";
      expect(validateUrl("http://localhost:8080")).toBe("http://localhost:8080");
    });
  });

  describe("isDisallowedHostname", () => {
    it("blocks localhost and loopback addresses", () => {
      expect(isDisallowedHostname("localhost")).toBe(true);
      expect(isDisallowedHostname("127.0.0.1")).toBe(true);
      expect(isDisallowedHostname("127.0.0.2")).toBe(true);
      expect(isDisallowedHostname("::1")).toBe(true);
    });

    it("blocks private IPv4 ranges", () => {
      expect(isDisallowedHostname("10.0.0.1")).toBe(true);
      expect(isDisallowedHostname("172.16.0.1")).toBe(true);
      expect(isDisallowedHostname("172.31.255.255")).toBe(true);
      expect(isDisallowedHostname("192.168.1.1")).toBe(true);
    });

    it("blocks link-local and unspecified IPv4 addresses, including cloud metadata", () => {
      expect(isDisallowedHostname("169.254.169.254")).toBe(true);
      expect(isDisallowedHostname("0.0.0.0")).toBe(true);
    });

    it("blocks IPv6 link-local and unique-local ranges", () => {
      expect(isDisallowedHostname("fe80::1")).toBe(true);
      expect(isDisallowedHostname("fc00::1")).toBe(true);
      expect(isDisallowedHostname("fd12:3456:789a::1")).toBe(true);
    });

    it("blocks IPv4-mapped IPv6 addresses that resolve to a private range (dotted-decimal form)", () => {
      expect(isDisallowedHostname("::ffff:169.254.169.254")).toBe(true);
      expect(isDisallowedHostname("::ffff:127.0.0.1")).toBe(true);
    });

    it("blocks IPv4-mapped IPv6 addresses in the hex form new URL() actually produces", () => {
      // new URL("https://[::ffff:169.254.169.254]/").hostname === "[::ffff:a9fe:a9fe]" —
      // WHATWG URL canonicalizes IPv4-mapped literals to hex, so a dotted-decimal-only
      // check here would silently never match real request traffic.
      expect(isDisallowedHostname("[::ffff:a9fe:a9fe]")).toBe(true);
      expect(isDisallowedHostname("::ffff:a9fe:a9fe")).toBe(true);
      expect(isDisallowedHostname("[::ffff:7f00:1]")).toBe(true); // 127.0.0.1
      // Full (uncompressed) hextet form, e.g. as an operator might type it directly
      expect(isDisallowedHostname("0:0:0:0:0:ffff:169.254.169.254")).toBe(true);
      expect(isDisallowedHostname("0:0:0:0:0:ffff:a9fe:a9fe")).toBe(true);
    });

    it("blocks additional reserved IPv4 ranges (CGN, IETF protocol, benchmarking)", () => {
      expect(isDisallowedHostname("100.64.0.1")).toBe(true);
      expect(isDisallowedHostname("100.127.255.255")).toBe(true);
      expect(isDisallowedHostname("192.0.0.1")).toBe(true);
      expect(isDisallowedHostname("198.18.0.1")).toBe(true);
      expect(isDisallowedHostname("198.19.255.255")).toBe(true);
      // Adjacent public ranges must not be swept in by mistake
      expect(isDisallowedHostname("100.63.255.255")).toBe(false);
      expect(isDisallowedHostname("100.128.0.0")).toBe(false);
      expect(isDisallowedHostname("192.0.1.1")).toBe(false);
      expect(isDisallowedHostname("198.20.0.1")).toBe(false);
    });

    it("blocks known cloud metadata hostnames", () => {
      expect(isDisallowedHostname("metadata.google.internal")).toBe(true);
      expect(isDisallowedHostname("metadata.goog")).toBe(true);
    });

    it("allows normal public hostnames and addresses, including public IPv4-mapped IPv6", () => {
      expect(isDisallowedHostname("example.com")).toBe(false);
      expect(isDisallowedHostname("wordpress.example.org")).toBe(false);
      expect(isDisallowedHostname("8.8.8.8")).toBe(false);
      expect(isDisallowedHostname("2001:4860:4860::8888")).toBe(false);
      expect(isDisallowedHostname("::ffff:8.8.8.8")).toBe(false);
      expect(isDisallowedHostname("[::ffff:808:808]")).toBe(false); // hex form of 8.8.8.8
    });
  });

  describe("isPrivateUrlAllowed / isInsecureHttpAllowed", () => {
    const originalAllowPrivateUrls = process.env.ALLOW_PRIVATE_URLS;
    const originalAllowInsecureHttp = process.env.ALLOW_INSECURE_HTTP;

    afterEach(() => {
      if (originalAllowPrivateUrls === undefined) {
        delete process.env.ALLOW_PRIVATE_URLS;
      } else {
        process.env.ALLOW_PRIVATE_URLS = originalAllowPrivateUrls;
      }
      if (originalAllowInsecureHttp === undefined) {
        delete process.env.ALLOW_INSECURE_HTTP;
      } else {
        process.env.ALLOW_INSECURE_HTTP = originalAllowInsecureHttp;
      }
    });

    it("default to false", () => {
      delete process.env.ALLOW_PRIVATE_URLS;
      delete process.env.ALLOW_INSECURE_HTTP;
      expect(isPrivateUrlAllowed()).toBe(false);
      expect(isInsecureHttpAllowed()).toBe(false);
    });

    it("respect the escape hatch env vars", () => {
      process.env.ALLOW_PRIVATE_URLS = "true";
      process.env.ALLOW_INSECURE_HTTP = "true";
      expect(isPrivateUrlAllowed()).toBe(true);
      expect(isInsecureHttpAllowed()).toBe(true);
    });
  });

  describe("validateFileSize", () => {
    it("should validate acceptable file sizes", () => {
      expect(() => validateFileSize(1024, 10)).not.toThrow();
      expect(() => validateFileSize(5 * 1024 * 1024, 10)).not.toThrow();
    });

    it("should reject files that are too large", () => {
      expect(() => validateFileSize(15 * 1024 * 1024, 10)).toThrow(WordPressAPIError);
      expect(() => validateFileSize(100 * 1024 * 1024, 50)).toThrow(WordPressAPIError);
    });

    it("should handle negative file sizes", () => {
      // The current implementation doesn't explicitly check for negative sizes
      expect(() => validateFileSize(-1, 10)).not.toThrow();
    });
  });

  describe("validateMimeType", () => {
    it("should validate allowed MIME types", () => {
      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

      expect(() => validateMimeType("image/jpeg", allowedTypes)).not.toThrow();
      expect(() => validateMimeType("image/png", allowedTypes)).not.toThrow();
      expect(() => validateMimeType("application/pdf", allowedTypes)).not.toThrow();
    });

    it("should reject disallowed MIME types", () => {
      const allowedTypes = ["image/jpeg", "image/png"];

      expect(() => validateMimeType("application/javascript", allowedTypes)).toThrow(WordPressAPIError);
      expect(() => validateMimeType("text/html", allowedTypes)).toThrow(WordPressAPIError);
      expect(() => validateMimeType("application/x-executable", allowedTypes)).toThrow(WordPressAPIError);
    });

    it("should reject empty MIME types", () => {
      expect(() => validateMimeType("", ["image/jpeg"])).toThrow(WordPressAPIError);
    });
  });

  describe("sanitizeHtml", () => {
    it("should allow safe HTML tags", () => {
      expect(sanitizeHtml("<p>Hello</p>")).toBe("<p>Hello</p>");
      expect(sanitizeHtml("<strong>Bold</strong>")).toBe("<strong>Bold</strong>");
      expect(sanitizeHtml("<em>Italic</em>")).toBe("<em>Italic</em>");
    });

    it("should remove dangerous tags and attributes", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>")).toBe("alert(&#39;xss&#39;)");
      expect(sanitizeHtml("<img src='x' onerror='alert(1)'>")).not.toContain("onerror");
      expect(sanitizeHtml("<a href='javascript:alert(1)'>Bad</a>")).not.toContain("javascript:");
    });

    it("should handle complex HTML", () => {
      const input = `<div><p>Hello <strong>world</strong></p><script>bad</script></div>`;
      const output = sanitizeHtml(input);
      expect(output).toContain("<p>Hello <strong>world</strong></p>");
      expect(output).not.toContain("script");
    });
  });

  describe("validateArray", () => {
    it("should validate arrays within limits", () => {
      expect(validateArray([1, 2, 3], "test")).toEqual([1, 2, 3]);
      expect(validateArray([1], "test", 1, 5)).toEqual([1]);
    });

    it("should reject arrays that are too small", () => {
      expect(() => validateArray([], "test", 1, 5)).toThrow(WordPressAPIError);
      expect(() => validateArray([1], "test", 2, 5)).toThrow(WordPressAPIError);
    });

    it("should reject arrays that are too large", () => {
      const largeArray = new Array(101).fill(1);
      expect(() => validateArray(largeArray, "test", 0, 100)).toThrow(WordPressAPIError);
    });

    it("should reject non-arrays", () => {
      expect(() => validateArray("not an array", "test")).toThrow(WordPressAPIError);
      expect(() => validateArray(123, "test")).toThrow(WordPressAPIError);
      expect(() => validateArray(null, "test")).toThrow(WordPressAPIError);
    });
  });

  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("user@example.com")).toBe("user@example.com");
      expect(validateEmail("test.user@example.com")).toBe("test.user@example.com");
      expect(validateEmail("user+tag@example.co.uk")).toBe("user+tag@example.co.uk");
    });

    it("should reject invalid email addresses", () => {
      expect(() => validateEmail("not-an-email")).toThrow(WordPressAPIError);
      expect(() => validateEmail("@example.com")).toThrow(WordPressAPIError);
      expect(() => validateEmail("user@")).toThrow(WordPressAPIError);
      expect(() => validateEmail("user @example.com")).toThrow(WordPressAPIError);
      expect(() => validateEmail("")).toThrow(WordPressAPIError);
    });
  });

  describe("validateUsername", () => {
    it("should validate correct usernames", () => {
      expect(validateUsername("testuser")).toBe("testuser");
      expect(validateUsername("user123")).toBe("user123");
      expect(validateUsername("test_user")).toBe("test_user");
    });

    it("should reject invalid usernames", () => {
      expect(() => validateUsername("")).toThrow(WordPressAPIError);
      expect(() => validateUsername("a")).toThrow(/between 3 and 60/);
      expect(() => validateUsername("user!")).toThrow(/can only contain/);
      expect(() => validateUsername("admin")).toThrow(/reserved/);
    });

    it("should enforce length limits", () => {
      const longUsername = "a".repeat(61);
      expect(() => validateUsername(longUsername)).toThrow(WordPressAPIError);
    });
  });

  describe("validateSearchQuery", () => {
    it("should validate safe search queries", () => {
      expect(validateSearchQuery("wordpress")).toBe("wordpress");
      expect(validateSearchQuery("hello world")).toBe("hello world");
      expect(validateSearchQuery("test-123")).toBe("test-123");
    });

    it("should sanitize dangerous search queries", () => {
      // validateSearchQuery sanitizes instead of throwing
      const result1 = validateSearchQuery("' OR '1'='1");
      expect(result1).not.toContain("'"); // quotes are removed

      const result2 = validateSearchQuery("'; DROP TABLE posts;--");
      expect(result2).not.toContain("DROP"); // SQL keywords are removed

      const result3 = validateSearchQuery("<script>alert(1)</script>");
      expect(result3).not.toContain("<script>"); // HTML tags are removed
    });

    it("should truncate overly long queries", () => {
      const longQuery = "a".repeat(201);
      const result = validateSearchQuery(longQuery);
      expect(result).toHaveLength(200);
    });

    it("should handle empty queries", () => {
      expect(validateSearchQuery("")).toBe("");
      expect(validateSearchQuery("   ")).toBe("");
    });
  });

  describe("validatePaginationParams", () => {
    it("should validate correct pagination params", () => {
      const result = validatePaginationParams({ page: 1, per_page: 10 });
      expect(result).toEqual({ page: 1, per_page: 10 });
    });

    it("should handle string numbers", () => {
      const result = validatePaginationParams({ page: "2", per_page: "20" });
      expect(result).toEqual({ page: 2, per_page: 20 });
    });

    it("should use default values", () => {
      const result = validatePaginationParams({});
      expect(result).toEqual({});
    });

    it("should reject invalid pagination params", () => {
      expect(() => validatePaginationParams({ page: 0 })).toThrow(WordPressAPIError);
      expect(() => validatePaginationParams({ page: -1 })).toThrow(WordPressAPIError);
      expect(() => validatePaginationParams({ per_page: 0 })).toThrow(WordPressAPIError);
      expect(() => validatePaginationParams({ per_page: 101 })).toThrow(WordPressAPIError);
    });

    it("should handle offset parameter", () => {
      const result = validatePaginationParams({ offset: 50 });
      expect(result.offset).toBe(50);
    });
  });

  describe("validatePostParams", () => {
    it("should validate basic post parameters", () => {
      const params = {
        title: "Test Post",
        content: "Test content",
        status: "draft",
      };

      const result = validatePostParams(params);
      expect(result.title).toBe("Test Post");
      expect(result.content).toBe("Test content");
      expect(result.status).toBe("draft");
    });

    it("should handle optional parameters", () => {
      const params = {
        title: "Test Post",
        content: "Test content",
        categories: [1, 2, 3],
        tags: [4, 5, 6],
      };

      const result = validatePostParams(params);
      expect(result.title).toBe("Test Post");
      expect(result.content).toBe("Test content");
      expect(result.categories).toEqual([1, 2, 3]);
      expect(result.tags).toEqual([4, 5, 6]);
    });

    it("should validate featured_media parameters", () => {
      // Valid featured_media ID
      const withFeaturedMedia = validatePostParams({
        title: "Test Post",
        featured_media: 42,
      });
      expect(withFeaturedMedia.featured_media).toBe(42);

      // Featured media set to 0 (remove featured image)
      const removeFeaturedMedia = validatePostParams({
        title: "Test Post",
        featured_media: 0,
      });
      expect(removeFeaturedMedia.featured_media).toBe(0);

      // Featured media set to null (remove featured image)
      const nullFeaturedMedia = validatePostParams({
        title: "Test Post",
        featured_media: null,
      });
      expect(nullFeaturedMedia.featured_media).toBe(0);
    });

    it("should reject invalid post parameters", () => {
      expect(() => validatePostParams({ title: "" })).toThrow(WordPressAPIError);
      expect(() => validatePostParams({ status: "invalid" })).toThrow(WordPressAPIError);
      expect(() => validatePostParams({ featured_media: "invalid" })).toThrow(WordPressAPIError);
    });

    it("should require title parameter", () => {
      expect(() => validatePostParams({})).toThrow(/title is required/);
    });

    it("should not require title on update (isUpdate=true)", () => {
      // content-only update must not throw
      expect(() => validatePostParams({ content: "Updated content" }, true)).not.toThrow();
      const result = validatePostParams({ content: "Updated content", status: "publish" }, true);
      expect(result.content).toBe("Updated content");
      expect(result.status).toBe("publish");
      expect(result.title).toBeUndefined();
    });

    it("should validate date parameters", () => {
      const params = {
        title: "Test Post",
        date: "2023-12-25T10:30:00Z",
      };

      const result = validatePostParams(params);
      expect(result.date).toBe("2023-12-25T10:30:00.000Z");
    });
  });
});
