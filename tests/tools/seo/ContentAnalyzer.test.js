/**
 * Tests for SEO Content Analyzer
 *
 * @group unit
 * @group seo
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ContentAnalyzer } from "../../../dist/tools/seo/analyzers/ContentAnalyzer.js";

describe("SEO Content Analyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(ContentAnalyzer);
    });

    it("should have analyzePost method", () => {
      expect(analyzer.analyzePost).toBeDefined();
      expect(typeof analyzer.analyzePost).toBe("function");
    });
  });

  describe("Content analysis", () => {
    const samplePost = {
      id: 1,
      title: { rendered: "Sample SEO Test Post" },
      content: {
        rendered: `
          <h1>Main Heading</h1>
          <p>This is a test paragraph with some content for SEO analysis. 
          It contains multiple sentences to test readability scoring.</p>
          <h2>Subheading</h2>
          <p>Another paragraph with more content. This paragraph also contains 
          important information about SEO optimization.</p>
          <img src="test.jpg" alt="Test image">
          <p>A paragraph with <a href="/internal-link">internal link</a> and 
          <a href="https://external.com">external link</a>.</p>
        `,
      },
      excerpt: { rendered: "Test excerpt for SEO analysis" },
    };

    const analysisParams = {
      site: "test",
      postId: 1,
      analysisType: "full",
      focusKeywords: ["SEO"],
    };

    it("should analyze post content and return results", async () => {
      const result = await analyzer.analyzePost(samplePost, analysisParams);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("analyzedAt");

      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);

      expect(["poor", "needs-improvement", "good", "excellent"]).toContain(result.status);
    });

    it("should calculate basic metrics correctly", async () => {
      const result = await analyzer.analyzePost(samplePost, analysisParams);

      expect(result.metrics).toHaveProperty("wordCount");
      expect(result.metrics).toHaveProperty("fleschReadingEase");
      expect(result.metrics).toHaveProperty("fleschKincaidGrade");
      expect(result.metrics).toHaveProperty("headingCount");
      expect(result.metrics).toHaveProperty("imageCount");
      expect(result.metrics).toHaveProperty("internalLinkCount");
      expect(result.metrics).toHaveProperty("externalLinkCount");

      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.headingCount).toBeGreaterThan(0);
      expect(result.metrics.imageCount).toBe(1);
      expect(result.metrics.internalLinkCount).toBeGreaterThanOrEqual(1);
      expect(result.metrics.externalLinkCount).toBeGreaterThanOrEqual(1);
    });

    it("should generate appropriate recommendations", async () => {
      const result = await analyzer.analyzePost(samplePost, analysisParams);

      expect(Array.isArray(result.recommendations)).toBe(true);

      if (result.recommendations.length > 0) {
        const firstRecommendation = result.recommendations[0];
        expect(firstRecommendation).toHaveProperty("type");
        expect(firstRecommendation).toHaveProperty("priority");
        expect(firstRecommendation).toHaveProperty("message");
        expect(firstRecommendation).toHaveProperty("impact");
        expect(firstRecommendation).toHaveProperty("autoFixAvailable");

        expect(["title", "meta", "content", "structure", "keyword", "technical", "performance"]).toContain(
          firstRecommendation.type,
        );
        expect(["low", "medium", "high", "critical"]).toContain(firstRecommendation.priority);
        expect(typeof firstRecommendation.message).toBe("string");
        expect(firstRecommendation.impact).toBeGreaterThan(0);
        expect(firstRecommendation.impact).toBeLessThanOrEqual(100);
      }
    });

    it("should analyze keywords when provided", async () => {
      const result = await analyzer.analyzePost(samplePost, analysisParams);

      expect(result.keywordAnalysis).toBeDefined();
      expect(result.keywordAnalysis).toHaveProperty("primaryKeyword");
      expect(result.keywordAnalysis).toHaveProperty("keywordFound");
      expect(result.keywordAnalysis).toHaveProperty("occurrences");
      expect(result.keywordAnalysis).toHaveProperty("density");
      expect(result.keywordAnalysis).toHaveProperty("semanticKeywords");

      expect(result.keywordAnalysis.primaryKeyword).toBe("SEO");
      expect(typeof result.keywordAnalysis.keywordFound).toBe("boolean");
      expect(typeof result.keywordAnalysis.occurrences).toBe("number");
      expect(typeof result.keywordAnalysis.density).toBe("number");
      expect(Array.isArray(result.keywordAnalysis.semanticKeywords)).toBe(true);
    });

    it("should analyze content structure", async () => {
      const result = await analyzer.analyzePost(samplePost, analysisParams);

      expect(result.structure).toBeDefined();
      expect(result.structure).toHaveProperty("hasH1");
      expect(result.structure).toHaveProperty("h1Text");
      expect(result.structure).toHaveProperty("headingHierarchy");
      expect(result.structure).toHaveProperty("paragraphCount");
      expect(result.structure).toHaveProperty("avgParagraphLength");

      expect(result.structure.hasH1).toBe(true);
      expect(result.structure.h1Text).toBe("Main Heading");
      expect(typeof result.structure.headingHierarchy).toBe("boolean");
      expect(result.structure.paragraphCount).toBeGreaterThan(0);
    });

    it("should handle posts without focus keywords", async () => {
      const paramsWithoutKeywords = {
        site: "test",
        postId: 1,
        analysisType: "full",
      };

      const result = await analyzer.analyzePost(samplePost, paramsWithoutKeywords);

      expect(result.keywordAnalysis).toBeUndefined();
      expect(result.metrics.keywordDensity).toBe(0);
    });

    it("should handle empty or minimal content", async () => {
      const minimalPost = {
        id: 2,
        title: { rendered: "Short" },
        content: { rendered: "<p>Very short content.</p>" },
        excerpt: { rendered: "" },
      };

      const result = await analyzer.analyzePost(minimalPost, analysisParams);

      expect(result).toBeDefined();
      expect(result.metrics.wordCount).toBeLessThan(10);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should recommend longer content
      const contentRecommendation = result.recommendations.find(
        (r) => r.type === "content" && r.message.includes("too short"),
      );
      expect(contentRecommendation).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle posts with no HTML content", async () => {
      const plainTextPost = {
        id: 3,
        title: "Plain Title",
        content: "Plain text content without HTML tags. This should still be analyzed correctly.",
        excerpt: "",
      };

      const params = {
        site: "test",
        postId: 3,
        analysisType: "full",
        focusKeywords: ["SEO"],
      };

      const result = await analyzer.analyzePost(plainTextPost, params);

      expect(result).toBeDefined();
      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.headingCount).toBe(0);
    });

    it("should handle posts with malformed HTML", async () => {
      const malformedPost = {
        id: 4,
        title: { rendered: "Malformed HTML Test" },
        content: { rendered: "<h1>Unclosed heading<p>Paragraph without closing<img src='test.jpg'>" },
        excerpt: { rendered: "" },
      };

      const params = {
        site: "test",
        postId: 4,
        analysisType: "full",
        focusKeywords: ["SEO"],
      };

      const result = await analyzer.analyzePost(malformedPost, params);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should handle posts with special characters and unicode", async () => {
      const unicodePost = {
        id: 5,
        title: { rendered: "Unicode Test: Café & Résumé 中文" },
        content: {
          rendered: "<p>Content with émojis 🚀 and spëcial characters: àáâãäå</p>",
        },
        excerpt: { rendered: "" },
      };

      const params = {
        site: "test",
        postId: 5,
        analysisType: "full",
        focusKeywords: ["SEO"],
      };

      const result = await analyzer.analyzePost(unicodePost, params);

      expect(result).toBeDefined();
      expect(result.metrics.wordCount).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should complete analysis within reasonable time", async () => {
      const largePost = {
        id: 6,
        title: { rendered: "Performance Test Post" },
        content: {
          rendered: "<p>" + "This is a performance test paragraph. ".repeat(100) + "</p>".repeat(50),
        },
        excerpt: { rendered: "Performance test excerpt" },
      };

      const params = {
        site: "test",
        postId: 6,
        analysisType: "full",
        focusKeywords: ["SEO"],
      };

      const startTime = Date.now();
      const result = await analyzer.analyzePost(largePost, params);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
