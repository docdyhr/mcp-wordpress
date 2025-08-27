/**
 * MetaGenerator Tests
 *
 * Tests for the SEO metadata generation functionality including
 * title optimization, description generation, OpenGraph/Twitter cards,
 * and safety filters.
 *
 * @since 2.7.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MetaGenerator } from "../../../dist/tools/seo/generators/MetaGenerator.js";

describe("MetaGenerator", () => {
  let generator;

  beforeEach(() => {
    generator = new MetaGenerator();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(MetaGenerator);
    });

    it("should have generateMetadata method", () => {
      expect(generator.generateMetadata).toBeDefined();
      expect(typeof generator.generateMetadata).toBe("function");
    });
  });

  describe("Title Generation", () => {
    const samplePost = {
      id: 1,
      title: { rendered: "WordPress SEO Best Practices Guide" },
      content: {
        rendered: `<p>This comprehensive guide covers WordPress SEO optimization techniques and strategies for better search rankings.</p>`,
      },
      excerpt: { rendered: "Learn WordPress SEO optimization techniques" },
      link: "https://example.com/wordpress-seo-guide",
      status: "publish",
      type: "post",
    };

    it("should generate optimized title with focus keyword", async () => {
      const params = {
        postId: 1,
        focusKeywords: ["SEO"],
        site: "test",
      };

      const result = await generator.generateMetadata(samplePost, params);

      expect(result.title).toBeDefined();
      expect(result.title.length).toBeLessThanOrEqual(60);
      expect(result.title.toLowerCase()).toContain("seo");
    });

    it("should truncate long titles properly", async () => {
      const longTitlePost = {
        ...samplePost,
        title: {
          rendered:
            "This is an extremely long WordPress SEO title that exceeds the recommended 60 character limit for search engines",
        },
      };

      const params = {
        postId: 1,
        focusKeywords: ["WordPress SEO"],
        site: "test",
      };

      const result = await generator.generateMetadata(longTitlePost, params);

      expect(result.title.length).toBeLessThanOrEqual(60);
      expect(result.title.toLowerCase()).toContain("wordpress");
      expect(result.title.toLowerCase()).toContain("seo");
    });

    it("should preserve existing good titles when requested", async () => {
      const goodTitlePost = {
        ...samplePost,
        title: { rendered: "Perfect SEO Title" },
      };

      const params = {
        postId: 1,
        focusKeywords: ["SEO"],
        site: "test",
      };

      const options = {
        preserveExisting: true,
      };

      const result = await generator.generateMetadata(goodTitlePost, params, options);

      expect(result.title).toBe("Perfect SEO Title");
    });
  });

  describe("Description Generation", () => {
    const samplePost = {
      id: 2,
      title: { rendered: "WordPress Performance Guide" },
      content: {
        rendered: `<p>WordPress performance optimization is crucial for user experience and SEO. 
        This guide covers caching, image optimization, database optimization, and more advanced techniques. 
        Learn how to make your WordPress site lightning fast.</p>`,
      },
      excerpt: { rendered: "Learn WordPress performance optimization techniques for better speed and SEO." },
      link: "https://example.com/wordpress-performance",
      status: "publish",
      type: "post",
    };

    it("should generate description within character limits", async () => {
      const params = {
        postId: 2,
        focusKeywords: ["WordPress", "performance"],
        site: "test",
      };

      const result = await generator.generateMetadata(samplePost, params);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThanOrEqual(155);
      expect(result.description.length).toBeLessThanOrEqual(160);
      expect(result.description.toLowerCase()).toContain("wordpress");
      expect(result.description.toLowerCase()).toContain("performance");
    });

    it("should add call to action when requested", async () => {
      const params = {
        postId: 2,
        focusKeywords: ["WordPress"],
        site: "test",
      };

      const options = {
        includeCallToAction: true,
        brandVoice: "friendly",
      };

      const result = await generator.generateMetadata(samplePost, params, options);

      expect(result.description).toBeDefined();
      // Should contain some form of CTA
      expect(result.description.toLowerCase()).toMatch(/(learn|discover|check|read)/);
    });

    it("should handle posts with minimal content", async () => {
      const minimalPost = {
        ...samplePost,
        content: { rendered: "<p>Short content.</p>" },
        excerpt: { rendered: "" },
      };

      const params = {
        postId: 2,
        focusKeywords: ["WordPress"],
        site: "test",
      };

      const result = await generator.generateMetadata(minimalPost, params);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThanOrEqual(155);
      expect(result.description.toLowerCase()).toContain("wordpress");
    });
  });

  describe("OpenGraph Metadata", () => {
    const samplePost = {
      id: 3,
      title: { rendered: "OpenGraph Test Post" },
      content: { rendered: "<p>Testing OpenGraph metadata generation.</p>" },
      excerpt: { rendered: "OpenGraph test description" },
      link: "https://example.com/og-test",
      status: "publish",
      type: "post",
    };

    it("should generate complete OpenGraph metadata", async () => {
      const params = {
        postId: 3,
        site: "test",
      };

      const result = await generator.generateMetadata(samplePost, params);

      expect(result.openGraph).toBeDefined();
      expect(result.openGraph.title).toBeDefined();
      expect(result.openGraph.description).toBeDefined();
      expect(result.openGraph.type).toBeDefined();
      expect(result.openGraph.url).toBe("https://example.com/og-test");
      expect(result.openGraph.siteName).toBeDefined();
      expect(result.openGraph.locale).toBeDefined();
    });

    it("should set correct OpenGraph type based on post type", async () => {
      const pagePost = {
        ...samplePost,
        type: "page",
      };

      const params = {
        postId: 3,
        site: "test",
      };

      const result = await generator.generateMetadata(pagePost, params);

      expect(result.openGraph.type).toBe("website");

      // Test regular post
      const articleResult = await generator.generateMetadata(samplePost, params);
      expect(articleResult.openGraph.type).toBe("article");
    });
  });

  describe("Twitter Card Metadata", () => {
    const samplePost = {
      id: 4,
      title: { rendered: "Twitter Card Test" },
      content: { rendered: "<p>Testing Twitter Card metadata.</p>" },
      excerpt: { rendered: "Twitter Card test description" },
      link: "https://example.com/twitter-test",
      status: "publish",
      type: "post",
    };

    it("should generate Twitter Card metadata", async () => {
      const params = {
        postId: 4,
        site: "test",
      };

      const result = await generator.generateMetadata(samplePost, params);

      expect(result.twitterCard).toBeDefined();
      expect(result.twitterCard.card).toMatch(/summary|summary_large_image/);
      expect(result.twitterCard.title).toBeDefined();
      expect(result.twitterCard.description).toBeDefined();
    });

    it("should use summary_large_image when image is available", async () => {
      // This test would need enhanced when image detection is implemented
      const params = {
        postId: 4,
        site: "test",
      };

      const result = await generator.generateMetadata(samplePost, params);

      // For now, should default to summary since no image detection
      expect(result.twitterCard.card).toBe("summary");
    });
  });

  describe("Safety Filters", () => {
    const spamPost = {
      id: 5,
      title: { rendered: "Guaranteed Miracle SEO Hack - Secret Techniques!" },
      content: {
        rendered:
          "<p>This spam content contains guaranteed miracle solutions and secret hacks for instant results!</p>",
      },
      excerpt: { rendered: "Guaranteed instant SEO results with secret hacks!" },
      link: "https://example.com/spam-test",
      status: "publish",
      type: "post",
    };

    it("should filter forbidden words from title", async () => {
      const params = {
        postId: 5,
        site: "test",
      };

      const result = await generator.generateMetadata(spamPost, params);

      expect(result.title.toLowerCase()).not.toContain("guaranteed");
      expect(result.title.toLowerCase()).not.toContain("miracle");
      expect(result.title.toLowerCase()).not.toContain("secret");
      expect(result.title.toLowerCase()).not.toContain("hack");
    });

    it("should filter forbidden words from description", async () => {
      const params = {
        postId: 5,
        site: "test",
      };

      const result = await generator.generateMetadata(spamPost, params);

      expect(result.description.toLowerCase()).not.toContain("guaranteed");
      expect(result.description.toLowerCase()).not.toContain("instant");
      expect(result.description.toLowerCase()).not.toContain("secret");
    });

    it("should sanitize HTML and script tags", async () => {
      const maliciousPost = {
        id: 6,
        title: { rendered: "Clean Title<script>alert('xss')</script>" },
        content: { rendered: '<p>Content with <script>alert("xss")</script> and onclick="hack()" attributes.</p>' },
        excerpt: { rendered: "Clean excerpt<script>alert('test')</script>" },
        link: "https://example.com/malicious-test",
        status: "publish",
        type: "post",
      };

      const params = {
        postId: 6,
        site: "test",
      };

      const result = await generator.generateMetadata(maliciousPost, params);

      expect(result.title).not.toContain("<script>");
      expect(result.title).not.toContain("onclick");
      expect(result.description).not.toContain("<script>");
      expect(result.description).not.toContain("javascript:");
    });
  });

  describe("Validation", () => {
    const validPost = {
      id: 7,
      title: { rendered: "Valid Post Title" },
      content: { rendered: "<p>Valid post content with sufficient length for description generation.</p>" },
      excerpt: { rendered: "Valid excerpt for testing metadata validation." },
      link: "https://example.com/valid-test",
      status: "publish",
      type: "post",
    };

    it("should validate required fields", async () => {
      const params = {
        postId: 7,
        site: "test",
      };

      const result = await generator.generateMetadata(validPost, params);

      expect(result.title).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it("should enforce character limits", async () => {
      const params = {
        postId: 7,
        site: "test",
      };

      const result = await generator.generateMetadata(validPost, params);

      expect(result.title.length).toBeLessThanOrEqual(60);
      expect(result.description.length).toBeGreaterThanOrEqual(155);
      expect(result.description.length).toBeLessThanOrEqual(160);
    });

    it("should generate canonical URL", async () => {
      const params = {
        postId: 7,
        site: "test",
      };

      const result = await generator.generateMetadata(validPost, params);

      expect(result.canonical).toBeDefined();
      expect(result.canonical).toBe("https://example.com/valid-test");
    });

    it("should set proper robots directives", async () => {
      const params = {
        postId: 7,
        site: "test",
      };

      const result = await generator.generateMetadata(validPost, params);

      expect(result.robots).toBeDefined();
      expect(result.robots.index).toBe(true); // Published post should be indexed
      expect(result.robots.follow).toBe(true);
    });

    it("should handle draft posts correctly", async () => {
      const draftPost = {
        ...validPost,
        status: "draft",
      };

      const params = {
        postId: 7,
        site: "test",
      };

      const result = await generator.generateMetadata(draftPost, params);

      expect(result.robots.index).toBe(false); // Draft posts should not be indexed
    });
  });

  describe("Brand Voice", () => {
    const samplePost = {
      id: 8,
      title: { rendered: "Brand Voice Test Post" },
      content: { rendered: "<p>Testing different brand voices for metadata generation.</p>" },
      excerpt: { rendered: "Brand voice testing for SEO metadata." },
      link: "https://example.com/brand-voice-test",
      status: "publish",
      type: "post",
    };

    it("should apply casual brand voice", async () => {
      const params = {
        postId: 8,
        site: "test",
      };

      const options = {
        brandVoice: "casual",
        includeCallToAction: true,
      };

      const result = await generator.generateMetadata(samplePost, params, options);

      // Casual brand voice might add exclamation marks
      expect(result.description).toMatch(/[!]/);
    });

    it("should apply professional brand voice", async () => {
      const params = {
        postId: 8,
        site: "test",
      };

      const options = {
        brandVoice: "professional",
        includeCallToAction: true,
      };

      const result = await generator.generateMetadata(samplePost, params, options);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThanOrEqual(155);
    });
  });

  describe("Edge Cases", () => {
    it("should handle posts with no title", async () => {
      const noTitlePost = {
        id: 9,
        title: { rendered: "" },
        content: { rendered: "<p>Post content without a title for testing edge cases.</p>" },
        excerpt: { rendered: "Testing edge case handling" },
        link: "https://example.com/no-title-test",
        status: "publish",
        type: "post",
      };

      const params = {
        postId: 9,
        focusKeywords: ["testing"],
        site: "test",
      };

      await expect(generator.generateMetadata(noTitlePost, params)).rejects.toThrow(/title is required/i);
    });

    it("should handle posts with very short content", async () => {
      const shortPost = {
        id: 10,
        title: { rendered: "Short Post" },
        content: { rendered: "<p>Short.</p>" },
        excerpt: { rendered: "" },
        link: "https://example.com/short-test",
        status: "publish",
        type: "post",
      };

      const params = {
        postId: 10,
        focusKeywords: ["short"],
        site: "test",
      };

      const result = await generator.generateMetadata(shortPost, params);

      expect(result.description.length).toBeGreaterThanOrEqual(155);
      expect(result.description.toLowerCase()).toContain("short");
    });
  });
});
