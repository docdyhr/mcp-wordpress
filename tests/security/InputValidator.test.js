/**
 * Tests for InputValidator security utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SecuritySchemas,
  InputSanitizer,
  SecurityValidationError,
  ToolSchemas,
  SecurityLimiter,
} from "@/security/InputValidator.js";

describe("SecuritySchemas", () => {
  describe("safeString", () => {
    it("accepts normal text", () => {
      expect(SecuritySchemas.safeString.parse("Hello world")).toBe("Hello world");
    });

    it("rejects script tags", () => {
      expect(() => SecuritySchemas.safeString.parse("<script>alert(1)</script>")).toThrow();
    });

    it("rejects closing script tags", () => {
      expect(() => SecuritySchemas.safeString.parse("</script>")).toThrow();
    });

    it("rejects javascript: URLs", () => {
      expect(() => SecuritySchemas.safeString.parse("javascript:alert(1)")).toThrow();
    });

    it("rejects javascript: with whitespace", () => {
      expect(() => SecuritySchemas.safeString.parse("javascript :alert(1)")).toThrow();
    });

    it("rejects data: URLs", () => {
      expect(() => SecuritySchemas.safeString.parse("data:text/html,<h1>test</h1>")).toThrow();
    });

    it("rejects onerror event handler", () => {
      expect(() => SecuritySchemas.safeString.parse("onerror=alert(1)")).toThrow();
    });

    it("rejects onload event handler", () => {
      expect(() => SecuritySchemas.safeString.parse("onload=alert(1)")).toThrow();
    });

    it("rejects onfocus event handler", () => {
      expect(() => SecuritySchemas.safeString.parse("onfocus=alert(1)")).toThrow();
    });

    it("rejects strings over 10000 chars", () => {
      expect(() => SecuritySchemas.safeString.parse("a".repeat(10001))).toThrow();
    });

    it("accepts strings at max length", () => {
      expect(SecuritySchemas.safeString.parse("a".repeat(10000))).toHaveLength(10000);
    });
  });

  describe("htmlContent", () => {
    it("accepts normal HTML", () => {
      expect(SecuritySchemas.htmlContent.parse("<p>Hello</p>")).toBe("<p>Hello</p>");
    });

    it("rejects script tags", () => {
      expect(() => SecuritySchemas.htmlContent.parse("<script>alert(1)</script>")).toThrow();
    });

    it("rejects javascript: URLs", () => {
      expect(() => SecuritySchemas.htmlContent.parse('<a href="javascript:void(0)">x</a>')).toThrow();
    });

    it("rejects strings over 100000 chars", () => {
      expect(() => SecuritySchemas.htmlContent.parse("a".repeat(100001))).toThrow();
    });
  });

  describe("url", () => {
    it("accepts valid https URL", () => {
      expect(SecuritySchemas.url.parse("https://example.com/path")).toBe("https://example.com/path");
    });

    it("accepts valid http URL", () => {
      expect(SecuritySchemas.url.parse("http://example.com")).toBe("http://example.com");
    });

    it("rejects non-URL string", () => {
      expect(() => SecuritySchemas.url.parse("not a url")).toThrow();
    });

    it("rejects javascript: URL", () => {
      expect(() => SecuritySchemas.url.parse("javascript:alert(1)")).toThrow();
    });

    it("rejects data: URL", () => {
      expect(() => SecuritySchemas.url.parse("data:text/html,test")).toThrow();
    });
  });

  describe("email", () => {
    it("accepts valid email", () => {
      expect(SecuritySchemas.email.parse("user@example.com")).toBe("user@example.com");
    });

    it("rejects invalid email", () => {
      expect(() => SecuritySchemas.email.parse("notanemail")).toThrow();
    });

    it("rejects email over 254 chars", () => {
      const longEmail = "a".repeat(250) + "@b.co";
      expect(() => SecuritySchemas.email.parse(longEmail)).toThrow();
    });
  });

  describe("slug", () => {
    it("accepts valid slug", () => {
      expect(SecuritySchemas.slug.parse("my-post-123")).toBe("my-post-123");
    });

    it("rejects empty slug", () => {
      expect(() => SecuritySchemas.slug.parse("")).toThrow();
    });

    it("rejects slug with uppercase", () => {
      expect(() => SecuritySchemas.slug.parse("MyPost")).toThrow();
    });

    it("rejects slug with spaces", () => {
      expect(() => SecuritySchemas.slug.parse("my post")).toThrow();
    });

    it("rejects slug over 100 chars", () => {
      expect(() => SecuritySchemas.slug.parse("a".repeat(101))).toThrow();
    });
  });

  describe("wpContent", () => {
    it("accepts normal content", () => {
      expect(SecuritySchemas.wpContent.parse("<p>Blog post content</p>")).toBe("<p>Blog post content</p>");
    });

    it("rejects script tags", () => {
      expect(() => SecuritySchemas.wpContent.parse("<script>evil()</script>")).toThrow();
    });

    it("rejects javascript: URLs", () => {
      expect(() => SecuritySchemas.wpContent.parse('<img src="javascript:void(0)">')).toThrow();
    });
  });

  describe("siteId", () => {
    it("accepts valid site ID", () => {
      expect(SecuritySchemas.siteId.parse("site-1_prod")).toBe("site-1_prod");
    });

    it("rejects empty site ID", () => {
      expect(() => SecuritySchemas.siteId.parse("")).toThrow();
    });

    it("rejects site ID with special chars", () => {
      expect(() => SecuritySchemas.siteId.parse("site!@#")).toThrow();
    });

    it("rejects site ID over 50 chars", () => {
      expect(() => SecuritySchemas.siteId.parse("a".repeat(51))).toThrow();
    });
  });

  describe("wpId", () => {
    it("accepts positive integer", () => {
      expect(SecuritySchemas.wpId.parse(42)).toBe(42);
    });

    it("rejects zero", () => {
      expect(() => SecuritySchemas.wpId.parse(0)).toThrow();
    });

    it("rejects negative number", () => {
      expect(() => SecuritySchemas.wpId.parse(-1)).toThrow();
    });

    it("rejects float", () => {
      expect(() => SecuritySchemas.wpId.parse(1.5)).toThrow();
    });

    it("rejects too large ID", () => {
      expect(() => SecuritySchemas.wpId.parse(1000000000)).toThrow();
    });
  });

  describe("searchQuery", () => {
    it("accepts normal search query", () => {
      expect(SecuritySchemas.searchQuery.parse("hello world")).toBe("hello world");
    });

    it("rejects single quotes", () => {
      expect(() => SecuritySchemas.searchQuery.parse("'; DROP TABLE users; --")).toThrow();
    });

    it("rejects SQL double-hyphen comments", () => {
      expect(() => SecuritySchemas.searchQuery.parse("test -- comment")).toThrow();
    });

    it("rejects SQL block comments", () => {
      expect(() => SecuritySchemas.searchQuery.parse("test /* comment")).toThrow();
    });

    it("rejects query over 500 chars", () => {
      expect(() => SecuritySchemas.searchQuery.parse("a".repeat(501))).toThrow();
    });
  });

  describe("filePath", () => {
    it("accepts valid file path", () => {
      expect(SecuritySchemas.filePath.parse("/var/www/file.txt")).toBe("/var/www/file.txt");
    });

    it("rejects path traversal", () => {
      expect(() => SecuritySchemas.filePath.parse("../../etc/passwd")).toThrow();
    });

    it("rejects angle brackets", () => {
      expect(() => SecuritySchemas.filePath.parse("/path/<evil>")).toThrow();
    });

    it("rejects paths over 500 chars", () => {
      expect(() => SecuritySchemas.filePath.parse("/" + "a".repeat(500))).toThrow();
    });
  });

  describe("passwordMask", () => {
    it("redacts any password value", () => {
      expect(SecuritySchemas.passwordMask.parse("super-secret-password")).toBe("[REDACTED]");
    });

    it("redacts empty string", () => {
      expect(SecuritySchemas.passwordMask.parse("")).toBe("[REDACTED]");
    });
  });

  describe("appPassword", () => {
    it("accepts valid 24-char alphanumeric app password", () => {
      const valid = "abcdef123456ABCDEF123456";
      expect(SecuritySchemas.appPassword.parse(valid)).toBeDefined();
    });

    it("rejects password with wrong length", () => {
      expect(() => SecuritySchemas.appPassword.parse("tooshort")).toThrow();
    });

    it("rejects password with invalid characters", () => {
      expect(() => SecuritySchemas.appPassword.parse("abc!@#$%^&*()ABCDEFGHIJ")).toThrow();
    });
  });
});

describe("InputSanitizer", () => {
  describe("sanitizeHtml", () => {
    it("removes script open tags", () => {
      const result = InputSanitizer.sanitizeHtml('<script type="text/javascript">alert(1)</script>');
      expect(result).not.toContain("<script");
      expect(result).not.toContain("</script");
    });

    it("removes javascript: URLs", () => {
      const result = InputSanitizer.sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toContain("javascript:");
    });

    it("removes data: URLs", () => {
      const result = InputSanitizer.sanitizeHtml('<img src="data:text/html,<h1>test</h1>">');
      expect(result).not.toContain("data:");
    });

    it("removes vbscript: URLs", () => {
      const result = InputSanitizer.sanitizeHtml("vbscript:msgbox(1)");
      expect(result).not.toContain("vbscript:");
    });

    it("removes event handlers", () => {
      const result = InputSanitizer.sanitizeHtml('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain("onerror=");
    });

    it("removes iframes", () => {
      const result = InputSanitizer.sanitizeHtml('<iframe src="http://evil.com"></iframe>');
      expect(result).not.toContain("<iframe");
    });

    it("removes object tags", () => {
      const result = InputSanitizer.sanitizeHtml('<object data="evil.swf"></object>');
      expect(result).not.toContain("<object");
    });

    it("removes embed tags", () => {
      const result = InputSanitizer.sanitizeHtml('<embed src="evil.swf">');
      expect(result).not.toContain("<embed");
    });

    it("handles nested dangerous patterns like jajavascript:", () => {
      const result = InputSanitizer.sanitizeHtml("jajavascript:vascript:alert(1)");
      expect(result).not.toContain("javascript:");
    });

    it("preserves safe HTML", () => {
      const safe = "<p>Hello <strong>world</strong></p>";
      expect(InputSanitizer.sanitizeHtml(safe)).toBe(safe);
    });

    it("handles empty string", () => {
      expect(InputSanitizer.sanitizeHtml("")).toBe("");
    });
  });

  describe("sanitizeSearchQuery", () => {
    it("removes single quotes", () => {
      expect(InputSanitizer.sanitizeSearchQuery("it's a test")).not.toContain("'");
    });

    it("removes double-hyphen SQL comments", () => {
      expect(InputSanitizer.sanitizeSearchQuery("test -- comment")).not.toContain("--");
    });

    it("removes block comment openers", () => {
      expect(InputSanitizer.sanitizeSearchQuery("test /* comment")).not.toContain("/*");
    });

    it("removes wildcards", () => {
      expect(InputSanitizer.sanitizeSearchQuery("test*")).not.toContain("*");
    });

    it("trims whitespace", () => {
      expect(InputSanitizer.sanitizeSearchQuery("  hello  ")).toBe("hello");
    });

    it("limits to 500 chars", () => {
      const long = "a".repeat(600);
      expect(InputSanitizer.sanitizeSearchQuery(long)).toHaveLength(500);
    });
  });

  describe("sanitizeFilePath", () => {
    it("removes path traversal sequences", () => {
      expect(InputSanitizer.sanitizeFilePath("../../etc/passwd")).not.toContain("..");
    });

    it("removes angle brackets", () => {
      expect(InputSanitizer.sanitizeFilePath("/path/<evil>")).not.toMatch(/[<>]/);
    });

    it("removes shell metacharacters", () => {
      const result = InputSanitizer.sanitizeFilePath("/path/|rm -rf");
      expect(result).not.toContain("|");
    });

    it("trims whitespace", () => {
      expect(InputSanitizer.sanitizeFilePath("  /path/file  ")).toBe("/path/file");
    });

    it("preserves valid path", () => {
      expect(InputSanitizer.sanitizeFilePath("/var/www/html/file.txt")).toBe("/var/www/html/file.txt");
    });
  });

  describe("encodeOutput", () => {
    it("encodes ampersands", () => {
      expect(InputSanitizer.encodeOutput("a & b")).toBe("a &amp; b");
    });

    it("encodes less-than", () => {
      expect(InputSanitizer.encodeOutput("<div>")).toBe("&lt;div&gt;");
    });

    it("encodes double quotes", () => {
      expect(InputSanitizer.encodeOutput('"hello"')).toBe("&quot;hello&quot;");
    });

    it("encodes single quotes", () => {
      expect(InputSanitizer.encodeOutput("it's")).toBe("it&#x27;s");
    });

    it("preserves plain text", () => {
      expect(InputSanitizer.encodeOutput("hello world 123")).toBe("hello world 123");
    });
  });
});

describe("SecurityValidationError", () => {
  it("has name SecurityValidationError", () => {
    const err = new SecurityValidationError("test");
    expect(err.name).toBe("SecurityValidationError");
  });

  it("stores the message", () => {
    const err = new SecurityValidationError("validation failed");
    expect(err.message).toBe("validation failed");
  });

  it("stores issues array", () => {
    const issues = [{ message: "bad input" }];
    const err = new SecurityValidationError("failed", issues);
    expect(err.issues).toEqual(issues);
  });

  it("defaults to empty issues array", () => {
    const err = new SecurityValidationError("failed");
    expect(err.issues).toEqual([]);
  });

  it("is an instance of Error", () => {
    expect(new SecurityValidationError("x")).toBeInstanceOf(Error);
  });
});

describe("ToolSchemas", () => {
  describe("postData", () => {
    it("accepts valid post data", () => {
      const data = { title: "My Post", status: "draft" };
      expect(ToolSchemas.postData.parse(data)).toMatchObject(data);
    });

    it("rejects invalid status", () => {
      expect(() => ToolSchemas.postData.parse({ status: "invalid" })).toThrow();
    });

    it("accepts empty object (all fields optional)", () => {
      expect(ToolSchemas.postData.parse({})).toEqual({});
    });
  });

  describe("idParams", () => {
    it("accepts valid id", () => {
      expect(ToolSchemas.idParams.parse({ id: 1 })).toMatchObject({ id: 1 });
    });

    it("rejects missing id", () => {
      expect(() => ToolSchemas.idParams.parse({})).toThrow();
    });

    it("rejects non-positive id", () => {
      expect(() => ToolSchemas.idParams.parse({ id: 0 })).toThrow();
    });
  });

  describe("searchParams", () => {
    it("accepts valid search params", () => {
      expect(ToolSchemas.searchParams.parse({ query: "hello" })).toMatchObject({ query: "hello" });
    });

    it("rejects missing query", () => {
      expect(() => ToolSchemas.searchParams.parse({})).toThrow();
    });
  });

  describe("listParams", () => {
    it("accepts empty object", () => {
      expect(ToolSchemas.listParams.parse({})).toEqual({});
    });

    it("accepts valid pagination", () => {
      expect(ToolSchemas.listParams.parse({ page: 1, perPage: 10 })).toMatchObject({ page: 1, perPage: 10 });
    });

    it("rejects invalid order", () => {
      expect(() => ToolSchemas.listParams.parse({ order: "invalid" })).toThrow();
    });
  });
});

describe("SecurityLimiter", () => {
  beforeEach(() => {
    // Clean up any state from previous tests
    SecurityLimiter.cleanup();
  });

  it("allows first request for a new identifier", () => {
    expect(SecurityLimiter.checkRateLimit("test-user-unique-1")).toBe(true);
  });

  it("allows multiple requests under the limit", () => {
    const id = "test-user-unique-2";
    for (let i = 0; i < 10; i++) {
      expect(SecurityLimiter.checkRateLimit(id)).toBe(true);
    }
  });

  it("tracks different identifiers independently", () => {
    expect(SecurityLimiter.checkRateLimit("user-a-x1")).toBe(true);
    expect(SecurityLimiter.checkRateLimit("user-b-x1")).toBe(true);
  });

  it("cleanup runs without error", () => {
    SecurityLimiter.checkRateLimit("cleanup-test");
    expect(() => SecurityLimiter.cleanup()).not.toThrow();
  });
});
