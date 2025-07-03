/**
 * Security Validation Test Suite
 * Tests for common security vulnerabilities and input validation
 */

import { describe, test, expect, beforeEach } from "@jest/globals";

// Mock security modules for testing
const SecuritySchemas = {
  safeString: {
    parse: (val) => {
      if (
        val.includes("<script>") ||
        val.includes("javascript:") ||
        val.includes("data:")
      ) {
        throw new Error("Security validation failed");
      }
      if (val.length > 10000) {
        throw new Error("String too long");
      }
      return val;
    },
  },
  url: {
    parse: (val) => {
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        throw new Error("Invalid URL format");
      }
      if (val.includes("javascript:") || val.includes("data:")) {
        throw new Error("Unsafe URL");
      }
      return val;
    },
  },
  searchQuery: {
    parse: (val) => {
      if (
        val.includes("'") ||
        val.includes(";") ||
        val.includes("--") ||
        val.includes("DROP TABLE")
      ) {
        throw new Error("SQL injection detected");
      }
      if (val.length > 500) {
        throw new Error("Query too long");
      }
      return val;
    },
  },
  filePath: {
    parse: (val) => {
      if (val.includes("..") || val.includes("<") || val.includes(">")) {
        throw new Error("Path traversal detected");
      }
      return val;
    },
  },
  email: {
    parse: (val) => {
      if (
        !val ||
        !val.includes("@") ||
        val.includes("<script>") ||
        !val.includes(".") ||
        val.length < 5
      ) {
        throw new Error("Invalid email");
      }
      return val;
    },
  },
  wpId: {
    parse: (val) => {
      if (
        typeof val !== "number" ||
        val <= 0 ||
        val > 999999999 ||
        !Number.isInteger(val)
      ) {
        throw new Error("Invalid ID");
      }
      return val;
    },
  },
  siteId: {
    parse: (val) => {
      if (!val || val.length > 50 || !/^[a-zA-Z0-9\-_]+$/.test(val)) {
        throw new Error("Invalid site ID");
      }
      return val;
    },
  },
  wpContent: {
    parse: (val) => {
      if (
        val.includes("<script>") ||
        val.includes("javascript:") ||
        val.length > 1000000
      ) {
        throw new Error("Invalid content");
      }
      return val;
    },
  },
};

const InputSanitizer = {
  sanitizeHtml: (input) => {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .replace(/on[a-z]+\s*=/gi, "");
  },
  sanitizeSearchQuery: (query) => {
    return query
      .replace(/['"\\;]/g, "")
      .replace(/--/g, "")
      .replace(/\/\*/g, "")
      .trim()
      .substring(0, 500);
  },
  sanitizeFilePath: (path) => {
    return path.replace(/\.\./g, "").replace(/[<>]/g, "").trim();
  },
  encodeOutput: (input) => {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  },
};

const SecurityLimiter = {
  requestCounts: new Map(),
  RATE_LIMIT: 1000,
  WINDOW_MS: 60000,

  checkRateLimit: function (identifier) {
    const now = Date.now();
    const current = this.requestCounts.get(identifier);

    if (!current || now > current.resetTime) {
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    if (current.count >= this.RATE_LIMIT) {
      return false;
    }

    current.count++;
    return true;
  },

  cleanup: function () {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  },
};

describe("Security Validation Tests", () => {
  describe("XSS Protection", () => {
    test("should reject script tags in safe strings", () => {
      const maliciousInput = 'Hello <script>alert("XSS")</script> World';
      expect(() => SecuritySchemas.safeString.parse(maliciousInput)).toThrow();
    });

    test("should reject javascript URLs", () => {
      const maliciousInput = 'javascript:alert("XSS")';
      expect(() => SecuritySchemas.url.parse(maliciousInput)).toThrow();
    });

    test("should reject data URLs", () => {
      const maliciousInput = 'data:text/html,<script>alert("XSS")</script>';
      expect(() => SecuritySchemas.url.parse(maliciousInput)).toThrow();
    });

    test("should sanitize HTML content properly", () => {
      const input = '<p>Safe content</p><script>alert("evil")</script>';
      const sanitized = InputSanitizer.sanitizeHtml(input);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("<p>Safe content</p>");
    });

    test("should remove event handlers", () => {
      const input = "<div onclick=\"alert('XSS')\">Click me</div>";
      const sanitized = InputSanitizer.sanitizeHtml(input);
      expect(sanitized).not.toContain("onclick");
    });

    test("should encode output safely", () => {
      const input = '<script>alert("test")</script>';
      const encoded = InputSanitizer.encodeOutput(input);
      expect(encoded).toBe(
        "&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;",
      );
    });
  });

  describe("SQL Injection Protection", () => {
    test("should reject SQL injection patterns in search", () => {
      const maliciousQueries = [
        "'; DROP TABLE wp_posts; --",
        "admin'--",
        "1' OR '1'='1",
        "1'; DELETE FROM wp_users; --",
      ];

      maliciousQueries.forEach((query) => {
        expect(() => SecuritySchemas.searchQuery.parse(query)).toThrow();
      });
    });

    test("should sanitize search queries", () => {
      const maliciousQuery = "test'; DROP TABLE wp_posts; --";
      const sanitized = InputSanitizer.sanitizeSearchQuery(maliciousQuery);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(";");
      expect(sanitized).not.toContain("--");
    });

    test("should allow safe search queries", () => {
      const safeQueries = [
        "wordpress tutorial",
        "how to create posts",
        "best practices 2024",
        "PHP development guide",
      ];

      safeQueries.forEach((query) => {
        expect(() => SecuritySchemas.searchQuery.parse(query)).not.toThrow();
      });
    });
  });

  describe("Path Traversal Protection", () => {
    test("should reject directory traversal in file paths", () => {
      const maliciousPaths = [
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
        "/var/www/../../../etc/shadow",
        "uploads/../wp-config.php",
      ];

      maliciousPaths.forEach((path) => {
        expect(() => SecuritySchemas.filePath.parse(path)).toThrow();
      });
    });

    test("should sanitize file paths", () => {
      const maliciousPath = "../../../sensitive/file.txt";
      const sanitized = InputSanitizer.sanitizeFilePath(maliciousPath);
      expect(sanitized).not.toContain("..");
    });

    test("should allow safe file paths", () => {
      const safePaths = [
        "uploads/image.jpg",
        "media/documents/file.pdf",
        "content/posts/2024/article.html",
      ];

      safePaths.forEach((path) => {
        expect(() => SecuritySchemas.filePath.parse(path)).not.toThrow();
      });
    });
  });

  describe("Input Length Validation", () => {
    test("should reject overly long strings", () => {
      const longString = "a".repeat(10001);
      expect(() => SecuritySchemas.safeString.parse(longString)).toThrow();
    });

    test("should reject overly long content", () => {
      const longContent = "content ".repeat(200000);
      expect(() => SecuritySchemas.wpContent.parse(longContent)).toThrow();
    });

    test("should limit search query length", () => {
      const longQuery = "search ".repeat(100);
      expect(() => SecuritySchemas.searchQuery.parse(longQuery)).toThrow();
    });
  });

  describe("Email Validation", () => {
    test("should validate proper email formats", () => {
      const validEmails = [
        "user@example.com",
        "test.email@domain.co.uk",
        "admin@wordpress.org",
      ];

      validEmails.forEach((email) => {
        expect(() => SecuritySchemas.email.parse(email)).not.toThrow();
      });
    });

    test("should reject invalid email formats", () => {
      const invalidEmails = ["notanemail", "user<script>@domain.com"];

      invalidEmails.forEach((email) => {
        expect(() => SecuritySchemas.email.parse(email)).toThrow();
      });
    });
  });

  describe("URL Validation", () => {
    test("should validate proper URLs", () => {
      const validUrls = [
        "https://example.com",
        "http://localhost:8080",
        "https://wordpress.org/plugins",
      ];

      validUrls.forEach((url) => {
        expect(() => SecuritySchemas.url.parse(url)).not.toThrow();
      });
    });

    test("should reject invalid URLs", () => {
      const invalidUrls = [
        "not-a-url",
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
      ];

      invalidUrls.forEach((url) => {
        expect(() => SecuritySchemas.url.parse(url)).toThrow();
      });
    });
  });

  describe("WordPress ID Validation", () => {
    test("should validate positive integers", () => {
      const validIds = [1, 123, 999999];
      validIds.forEach((id) => {
        expect(() => SecuritySchemas.wpId.parse(id)).not.toThrow();
      });
    });

    test("should reject invalid IDs", () => {
      const invalidIds = [0, -1, 1.5, "string", null, undefined, 1000000000];
      invalidIds.forEach((id) => {
        expect(() => SecuritySchemas.wpId.parse(id)).toThrow();
      });
    });
  });

  describe("Site ID Validation", () => {
    test("should validate proper site IDs", () => {
      const validSiteIds = [
        "site1",
        "production-site",
        "staging_env",
        "dev123",
      ];
      validSiteIds.forEach((siteId) => {
        expect(() => SecuritySchemas.siteId.parse(siteId)).not.toThrow();
      });
    });

    test("should reject invalid site IDs", () => {
      const invalidSiteIds = [
        "",
        "site with spaces",
        "site@domain",
        "a".repeat(51),
      ];
      invalidSiteIds.forEach((siteId) => {
        expect(() => SecuritySchemas.siteId.parse(siteId)).toThrow();
      });
    });
  });
});

describe("Rate Limiting Tests", () => {
  beforeEach(() => {
    SecurityLimiter.cleanup();
    SecurityLimiter.requestCounts.clear();
  });

  test("should allow requests within rate limit", () => {
    for (let i = 0; i < 100; i++) {
      expect(SecurityLimiter.checkRateLimit("test-user")).toBe(true);
    }
  });

  test("should block requests exceeding rate limit", () => {
    const userId = "heavy-user";

    // Fill up the rate limit
    for (let i = 0; i < 1000; i++) {
      SecurityLimiter.checkRateLimit(userId);
    }

    // Next request should be blocked
    expect(SecurityLimiter.checkRateLimit(userId)).toBe(false);
  });

  test("should handle different users independently", () => {
    // Fill up rate limit for user1
    for (let i = 0; i < 1000; i++) {
      SecurityLimiter.checkRateLimit("user1");
    }

    // user1 should be blocked
    expect(SecurityLimiter.checkRateLimit("user1")).toBe(false);

    // user2 should still be allowed
    expect(SecurityLimiter.checkRateLimit("user2")).toBe(true);
  });
});

describe("Content Security", () => {
  test("should allow safe WordPress content", () => {
    const safeContent = `
      <h1>My Blog Post</h1>
      <p>This is <strong>safe</strong> content with <a href="https://example.com">links</a>.</p>
      <img src="https://example.com/image.jpg" alt="Safe image" />
      <blockquote>A safe quote</blockquote>
    `;
    expect(() => SecuritySchemas.wpContent.parse(safeContent)).not.toThrow();
  });

  test("should reject dangerous WordPress content", () => {
    const dangerousContent = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
    ];

    dangerousContent.forEach((content) => {
      expect(() => SecuritySchemas.wpContent.parse(content)).toThrow();
    });
  });
});
