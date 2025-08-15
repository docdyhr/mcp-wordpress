/**
 * Comprehensive Security Sanitization Tests
 *
 * Tests the enhanced sanitizeHtml function against all GitHub Advanced Security findings
 * and common XSS attack vectors.
 */

import { sanitizeHtml } from "../../dist/utils/validation/security.js";

describe("Enhanced HTML Sanitization Security Tests", () => {
  describe("Script Tag Removal", () => {
    test("should remove standard script tags", () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(&quot;xss&quot;)Hello");
      expect(result).not.toContain("<script");
    });

    test("should remove script tags with attributes", () => {
      const malicious = '<script type="text/javascript" src="evil.js">alert("xss")</script>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(&quot;xss&quot;)");
      expect(result).not.toContain("<script");
    });

    test("should remove script tags with whitespace variations", () => {
      const malicious = '< script >alert("xss")</ script >';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(&quot;xss&quot;)");
      expect(result).not.toContain("<script");
    });

    test("should remove self-closing script tags", () => {
      const malicious = '<script src="evil.js" />Content';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("Content");
      expect(result).not.toContain("script");
    });

    test("should remove malformed script tags", () => {
      const malicious = '<script>alert("xss")Content';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(&quot;xss&quot;)Content");
      expect(result).not.toContain("<script");
    });

    test("should handle multiple script tags", () => {
      const malicious = "<script>alert(1)</script>Safe<script>alert(2)</script>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(1)Safealert(2)");
      expect(result).not.toContain("script");
      expect(result).not.toContain("<script");
    });
  });

  describe("Event Handler Removal", () => {
    test("should remove onclick handlers", () => {
      const malicious = "<div onclick=\"alert('xss')\">Click me</div>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<div>Click me</div>");
      expect(result).not.toContain("onclick");
    });

    test("should remove event handlers without quotes", () => {
      const malicious = "<img src=x onerror=alert(1)>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe('<img src="x">');
      expect(result).not.toContain("onerror");
    });

    test("should remove all types of event handlers", () => {
      const events = [
        "onload",
        "onerror",
        "onclick",
        "onmouseover",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onkeydown",
        "onkeyup",
      ];

      events.forEach((event) => {
        const malicious = `<div ${event}="alert('xss')">Test</div>`;
        const result = sanitizeHtml(malicious);
        expect(result).toBe("<div>Test</div>");
        expect(result).not.toContain(event);
      });
    });
  });

  describe("Dangerous Protocol Removal", () => {
    test("should remove javascript: protocol", () => {
      const malicious = "<a href=\"javascript:alert('xss')\">Link</a>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<a>Link</a>");
      expect(result).not.toContain("javascript:");
    });

    test("should remove vbscript: protocol", () => {
      const malicious = "<a href=\"vbscript:msgbox('xss')\">Link</a>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<a>Link</a>");
      expect(result).not.toContain("vbscript:");
    });

    test("should remove data: protocol", () => {
      const malicious = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<img>");
      expect(result).not.toContain("data:");
    });

    test("should handle protocols with whitespace", () => {
      const malicious = '<a href="javascript : alert(1)">Link</a>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe('<a href="javascript : alert(1)">Link</a>');
      expect(result).toContain("javascript");
    });
  });

  describe("Dangerous Element Removal", () => {
    test("should remove iframe elements", () => {
      const malicious = '<iframe src="evil.html">Content</iframe>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("Content");
      expect(result).not.toContain("iframe");
    });

    test("should remove object elements", () => {
      const malicious = '<object data="evil.swf">Content</object>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("Content");
      expect(result).not.toContain("object");
    });

    test("should remove embed elements", () => {
      const malicious = '<embed src="evil.swf">Content';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("Content");
      expect(result).not.toContain("embed");
    });

    test("should remove form elements", () => {
      const malicious = '<form action="evil.php"><input type="text"></form>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("");
      expect(result).not.toContain("form");
      expect(result).not.toContain("input");
    });
  });

  describe("HTML Entity Handling", () => {
    test("should handle encoded script tags", () => {
      const malicious = "&lt;script&gt;alert(1)&lt;/script&gt;";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;");
      expect(result).not.toContain("<script");
    });

    test("should handle numeric HTML entities", () => {
      const malicious = "&#60;script&#62;alert(1)&#60;/script&#62;";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("&amp;#60;script&amp;#62;alert(1)&amp;#60;/script&amp;#62;");
      expect(result).not.toContain("<script");
    });

    test("should handle hex HTML entities", () => {
      const malicious = "&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("&amp;#x3c;script&amp;#x3e;alert(1)&amp;#x3c;/script&amp;#x3e;");
      expect(result).not.toContain("<script");
    });
  });

  describe("Style Attribute Removal", () => {
    test("should remove style attributes", () => {
      const malicious = '<div style="background:url(javascript:alert(1))">Content</div>';
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<div>Content</div>");
      expect(result).not.toContain("style");
    });

    test("should remove style with expression", () => {
      const malicious = "<div style=\"width:expression(alert('xss'))\">Content</div>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("<div>Content</div>");
      expect(result).not.toContain("expression");
    });
  });

  describe("Comment Removal", () => {
    test("should remove HTML comments", () => {
      const malicious = "<!-- <script>alert(1)</script> -->Safe Content";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("&lt;!-- alert(1) --&gt;Safe Content");
      expect(result).not.toContain("<!--");
      expect(result).not.toContain("<script");
    });

    test("should remove conditional comments", () => {
      const malicious = "<!--[if IE]><script>alert(1)</script><![endif]-->Content";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("&lt;!--[if IE]&gt;alert(1)&lt;![endif]--&gt;Content");
      expect(result).not.toContain("<!--");
      expect(result).not.toContain("<script");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty input", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml(null)).toBe("");
      expect(sanitizeHtml(undefined)).toBe("");
    });

    test("should handle non-string input", () => {
      expect(sanitizeHtml(123)).toBe("");
      expect(sanitizeHtml({})).toBe("");
      expect(sanitizeHtml([])).toBe("");
    });

    test("should preserve safe HTML", () => {
      const safe = '<p>This is <strong>safe</strong> content with a <a href="https://example.com">link</a></p>';
      const result = sanitizeHtml(safe);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain('<a href="https://example.com">');
      expect(result).toContain("safe");
    });

    test("should normalize whitespace", () => {
      const messy = "<p>  Multiple    spaces   </p>";
      const result = sanitizeHtml(messy);
      expect(result).toBe("<p> Multiple spaces </p>");
    });
  });

  describe("Complex Attack Scenarios", () => {
    test("should handle nested script attempts", () => {
      const malicious = "<scr<script>ipt>alert(1)</scr</script>ipt>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("ipt&gt;alert(1)ipt&gt;");
      expect(result).not.toContain("<script");
    });

    test("should handle mixed case attempts", () => {
      const malicious = "<ScRiPt>alert(1)</ScRiPt>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(1)");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("ScRiPt");
    });

    test("should handle unicode variations", () => {
      const malicious = "<script\u0000>alert(1)</script>";
      const result = sanitizeHtml(malicious);
      expect(result).toBe("alert(1)");
      expect(result).not.toContain("<script");
    });

    test("should handle multiple attack vectors in one string", () => {
      const malicious = `
        <script>alert(1)</script>
        <img src=x onerror=alert(2)>
        <iframe src="javascript:alert(3)"></iframe>
        <div onclick="alert(4)">Click</div>
        <style>body{background:url(javascript:alert(5))}</style>
      `;
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("iframe");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("style");
      expect(result).toContain("Click"); // Safe content should remain
      expect(result).toContain("<img src="); // Safe img should remain
      expect(result).toContain("<div>"); // Safe div should remain
    });
  });

  describe("WordPress Content Scenarios", () => {
    test("should handle WordPress post content safely", () => {
      const wpContent = `
        <p>This is a blog post with <strong>bold text</strong> and a <a href="https://example.com">link</a>.</p>
        <img src="image.jpg" alt="Description">
        <blockquote>This is a quote</blockquote>
        <ul><li>List item 1</li><li>List item 2</li></ul>
      `;
      const result = sanitizeHtml(wpContent);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain('<a href="https://example.com">');
      expect(result).toContain("<img");
      expect(result).toContain("<blockquote>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
    });

    test("should handle WordPress excerpt with malicious content", () => {
      const excerpt = '<p>Safe excerpt content <script>alert("xss")</script> continues safely</p>';
      const result = sanitizeHtml(excerpt);
      expect(result).toBe("<p>Safe excerpt content alert(&quot;xss&quot;) continues safely</p>");
      expect(result).not.toContain("<script");
    });
  });
});
