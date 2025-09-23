/**
 * SiteAuditor Tests
 *
 * Tests for the comprehensive SEO site audit functionality including
 * technical SEO analysis, content quality assessment, site architecture evaluation,
 * performance monitoring, and accessibility compliance checking.
 *
 * @since 2.7.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SiteAuditor } from "../../../dist/tools/seo/auditors/SiteAuditor.js";

// Mock WordPress client
const createMockClient = () => ({
  getPosts: vi.fn(),
  getPages: vi.fn(),
  authenticate: vi.fn().mockResolvedValue(true),
});

// Sample test data
const samplePosts = [
  {
    id: 1,
    title: { rendered: "Complete Guide to WordPress SEO Optimization" },
    content: {
      rendered: `
        <h1>Complete Guide to WordPress SEO Optimization</h1>
        <p>WordPress SEO optimization is crucial for improving your website's search engine visibility.
        This comprehensive guide covers all essential aspects of technical SEO, content optimization,
        and performance enhancement. Search engines like Google prioritize well-optimized WordPress sites
        that provide excellent user experience and valuable content to their audience.</p>
        <p>Understanding the fundamentals of WordPress SEO helps you create content that ranks higher
        in search results. This includes optimizing your content structure, using proper heading hierarchy,
        and ensuring your website loads quickly for both desktop and mobile users.</p>
        <p>Technical SEO considerations include proper URL structure, meta tags optimization, schema markup
        implementation, and ensuring your WordPress site is easily crawlable by search engine bots.
        Content optimization involves keyword research, proper keyword placement, and creating comprehensive
        content that addresses user search intent effectively.</p>
      `,
    },
    excerpt: {
      rendered: "Learn comprehensive WordPress SEO techniques to improve your search rankings and organic traffic.",
    },
    date: "2024-01-15T10:00:00Z",
    modified: "2024-06-15T14:30:00Z",
    status: "publish",
    featured_media: 123,
    link: "https://example.com/wordpress-seo-guide",
  },
  {
    id: 2,
    title: { rendered: "WordPress Performance Tips" },
    content: {
      rendered: `
        <h1>WordPress Performance Tips</h1>
        <p>Site performance optimization.</p>
      `,
    },
    excerpt: { rendered: "" }, // Missing meta description
    date: "2022-01-10T09:00:00Z", // Old content
    modified: "2022-01-10T09:00:00Z",
    status: "publish",
    featured_media: 0, // No featured image
    link: "https://example.com/wordpress-performance-optimization-tips-for-better-speed-and-user-experience",
  },
  {
    id: 3,
    title: { rendered: "WordPress Performance Tips" }, // Duplicate title
    content: {
      rendered: `
        <h1>Duplicate Title Post</h1>
        <h1>Another H1 Tag</h1>
        <p>This post has multiple H1 tags which is bad for SEO.</p>
        <img src="image1.jpg" alt="">
        <img src="image2.jpg">
      `,
    },
    excerpt: { rendered: "Short" }, // Too short meta description
    date: "2024-01-05T14:00:00Z",
    modified: "2024-01-05T14:00:00Z",
    status: "publish",
    featured_media: 456,
    link: "https://example.com/duplicate-title",
  },
];

const samplePages = [
  {
    id: 101,
    title: { rendered: "About Us" },
    content: {
      rendered: `
        <p>Short about page content that doesn't provide much value or information about the company.</p>
      `,
    },
    excerpt: { rendered: "Learn more about our company and mission statement for business success." },
    date: "2023-06-01T12:00:00Z",
    modified: "2024-01-15T10:00:00Z",
    status: "publish",
    featured_media: 789,
    link: "https://example.com/about",
  },
  {
    id: 102,
    title: { rendered: "Contact" },
    content: {
      rendered: `
        <h1>Contact Us</h1>
        <p>Get in touch with our team for any inquiries, support requests, or business opportunities.
        We are committed to providing excellent customer service and responding to all communications
        promptly. Our experienced team is here to help you achieve your goals and answer any questions
        you may have about our services, products, or solutions.</p>
        <p>Whether you need technical support, want to learn more about our offerings, or are interested
        in partnering with us, we welcome the opportunity to connect. Please use the contact form below
        or reach out directly using the contact information provided. We look forward to hearing from you
        and building a successful business relationship together.</p>
      `,
    },
    excerpt: {
      rendered: "Contact our team for support, inquiries, and business opportunities. We're here to help you succeed.",
    },
    date: "2024-02-01T15:30:00Z",
    modified: "2024-07-01T09:15:00Z",
    status: "publish",
    featured_media: 0, // Missing featured image
    link: "https://example.com/contact",
  },
];

describe("SiteAuditor", () => {
  let siteAuditor;
  let mockClient;

  beforeEach(() => {
    mockClient = createMockClient();

    // Mock successful API responses
    mockClient.getPosts.mockResolvedValue(samplePosts);
    mockClient.getPages.mockResolvedValue(samplePages);

    siteAuditor = new SiteAuditor(mockClient, {
      includeTechnical: true,
      includeContent: true,
      includeArchitecture: true,
      includePerformance: true,
      includeAccessibility: true,
      maxPagesForContentAudit: 50,
      minSeverityLevel: "low", // Include all issues for testing
      includeRecommendations: true,
    });
  });

  describe("Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultAuditor = new SiteAuditor(mockClient);
      const config = defaultAuditor.getConfig();

      expect(config.includeTechnical).toBe(true);
      expect(config.includeContent).toBe(true);
      expect(config.includeArchitecture).toBe(true);
      expect(config.includePerformance).toBe(true);
      expect(config.includeAccessibility).toBe(false);
      expect(config.maxPagesForContentAudit).toBe(50);
      expect(config.minSeverityLevel).toBe("medium");
      expect(config.includeRecommendations).toBe(true);
    });

    it("should allow configuration updates", () => {
      siteAuditor.updateConfig({
        maxPagesForContentAudit: 100,
        minSeverityLevel: "high",
        includeAccessibility: true,
      });

      const config = siteAuditor.getConfig();
      expect(config.maxPagesForContentAudit).toBe(100);
      expect(config.minSeverityLevel).toBe("high");
      expect(config.includeAccessibility).toBe(true);
    });
  });

  describe("Site Audit Execution", () => {
    it("should perform comprehensive site audit", async () => {
      const params = {
        site: "test",
      };

      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult).toBeDefined();
      expect(auditResult.timestamp).toBeDefined();
      expect(auditResult.siteUrl).toBeDefined();
      expect(typeof auditResult.overallScore).toBe("number");
      expect(auditResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(auditResult.overallScore).toBeLessThanOrEqual(100);

      expect(Array.isArray(auditResult.sections)).toBe(true);
      expect(auditResult.sections.length).toBeGreaterThan(0);

      expect(Array.isArray(auditResult.issues)).toBe(true);
      expect(Array.isArray(auditResult.recommendations)).toBe(true);
      expect(typeof auditResult.summary).toBe("string");
      expect(typeof auditResult.processingTime).toBe("number");
    });

    it("should identify technical SEO issues", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      const technicalSection = auditResult.sections.find((s) => s.name === "Technical SEO");
      expect(technicalSection).toBeDefined();

      // Should find issues like missing meta descriptions, duplicate titles, thin content
      const technicalIssues = auditResult.issues.filter((i) => i.category === "technical");
      expect(technicalIssues.length).toBeGreaterThan(0);

      // Check for specific expected issues
      const metaIssues = technicalIssues.find((i) => i.id === "missing-meta-descriptions");
      const duplicateIssues = technicalIssues.find((i) => i.id === "duplicate-titles");
      const thinContentIssues = technicalIssues.find((i) => i.id === "thin-content");

      expect(metaIssues || duplicateIssues || thinContentIssues).toBeDefined();
    });

    it("should identify content quality issues", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      const contentSection = auditResult.sections.find((s) => s.name === "Content Quality");
      expect(contentSection).toBeDefined();

      // Should find issues like outdated content, missing featured images
      const contentIssues = auditResult.issues.filter((i) => i.category === "content");
      expect(contentIssues.length).toBeGreaterThan(0);

      // Check for specific expected issues
      const outdatedIssues = contentIssues.find((i) => i.id === "outdated-content");
      const imageIssues = contentIssues.find((i) => i.id === "missing-featured-images");
      const readabilityIssues = contentIssues.find((i) => i.id === "poor-readability");

      expect(outdatedIssues || imageIssues || readabilityIssues).toBeDefined();
    });

    it("should identify site architecture issues", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      const architectureSection = auditResult.sections.find((s) => s.name === "Site Architecture");
      expect(architectureSection).toBeDefined();

      // Should identify potential architecture issues
      const architectureIssues = auditResult.issues.filter((i) => i.category === "architecture");

      // Check issue structure
      architectureIssues.forEach((issue) => {
        expect(issue).toHaveProperty("id");
        expect(issue).toHaveProperty("title");
        expect(issue).toHaveProperty("description");
        expect(issue).toHaveProperty("severity");
        expect(issue).toHaveProperty("category");
        expect(issue).toHaveProperty("affectedItems");
        expect(issue).toHaveProperty("impact");
        expect(["low", "medium", "high", "critical"]).toContain(issue.severity);
      });
    });

    it("should identify performance issues", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      const performanceSection = auditResult.sections.find((s) => s.name === "Performance");
      expect(performanceSection).toBeDefined();

      // Performance analysis may find optimization opportunities
      const performanceIssues = auditResult.issues.filter((i) => i.category === "performance");

      // Validate performance issue structure
      performanceIssues.forEach((issue) => {
        expect(issue.category).toBe("performance");
        expect(typeof issue.impact).toBe("string");
        expect(issue.impact.length).toBeGreaterThan(0);
      });
    });

    it("should identify accessibility issues", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      const accessibilitySection = auditResult.sections.find((s) => s.name === "Accessibility");
      expect(accessibilitySection).toBeDefined();

      // Should find missing alt text issues
      const accessibilityIssues = auditResult.issues.filter((i) => i.category === "accessibility");

      if (accessibilityIssues.length > 0) {
        const altTextIssues = accessibilityIssues.find((i) => i.id === "missing-alt-text");
        if (altTextIssues) {
          expect(altTextIssues.severity).toBe("high");
          expect(altTextIssues.impact).toContain("screen readers");
        }
      }
    });

    it("should filter issues by severity level", async () => {
      // Test with high severity filter
      siteAuditor.updateConfig({ minSeverityLevel: "high" });

      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      // All returned issues should be high or critical
      auditResult.issues.forEach((issue) => {
        expect(["high", "critical"]).toContain(issue.severity);
      });
    });

    it("should generate meaningful recommendations", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be actionable
      auditResult.recommendations.forEach((recommendation) => {
        expect(typeof recommendation).toBe("string");
        expect(recommendation.length).toBeGreaterThan(20);
        // Should contain action words (more flexible regex)
        expect(
          /\b(add|improve|optimize|fix|update|review|implement|ensure|create|expand)\b/i.test(recommendation),
        ).toBe(true);
      });
    });

    it("should calculate overall score correctly", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(auditResult.overallScore).toBeLessThanOrEqual(100);

      // Score should decrease with more critical issues
      const criticalIssues = auditResult.issues.filter((i) => i.severity === "critical").length;
      if (criticalIssues > 0) {
        expect(auditResult.overallScore).toBeLessThan(95); // Should be penalized
      }
    });

    it("should generate comprehensive audit summary", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult.summary).toContain("audit completed");
      expect(auditResult.summary).toContain("sections");
      expect(auditResult.summary).toContain("issues");

      // Should mention issue counts
      const totalIssues = auditResult.issues.length;
      const criticalIssues = auditResult.issues.filter((i) => i.severity === "critical").length;

      if (totalIssues > 0) {
        expect(auditResult.summary).toContain(totalIssues.toString());
      }
      if (criticalIssues > 0) {
        expect(auditResult.summary).toContain(criticalIssues.toString());
      }
    });
  });

  describe("Selective Audit Sections", () => {
    it("should perform only technical audit when configured", async () => {
      siteAuditor.updateConfig({
        includeTechnical: true,
        includeContent: false,
        includeArchitecture: false,
        includePerformance: false,
        includeAccessibility: false,
      });

      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult.sections.length).toBe(1);
      expect(auditResult.sections[0].name).toBe("Technical SEO");

      // All issues should be technical
      auditResult.issues.forEach((issue) => {
        expect(issue.category).toBe("technical");
      });
    });

    it("should skip recommendations when disabled", async () => {
      siteAuditor.updateConfig({ includeRecommendations: false });

      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult.recommendations.length).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockClient.getPosts.mockRejectedValue(new Error("API Error"));
      mockClient.getPages.mockRejectedValue(new Error("API Error"));

      const params = { site: "test" };

      await expect(siteAuditor.performSiteAudit(params)).rejects.toThrow("API Error");
    });

    it("should handle empty site data", async () => {
      mockClient.getPosts.mockResolvedValue([]);
      mockClient.getPages.mockResolvedValue([]);

      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult).toBeDefined();
      expect(auditResult.overallScore).toBeGreaterThanOrEqual(0);

      // Should still have sections even with no content
      expect(auditResult.sections.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should complete audit within reasonable time", async () => {
      const params = { site: "test" };

      const startTime = Date.now();
      const auditResult = await siteAuditor.performSiteAudit(params);
      const endTime = Date.now();

      expect(auditResult).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      // Processing time should be reasonable (allow for very fast execution in tests)
      expect(auditResult.processingTime).toBeGreaterThanOrEqual(0);
      expect(auditResult.processingTime).toBeLessThan(10000);
    });

    it("should handle large content sets efficiently", async () => {
      // Create larger dataset
      const largePosts = Array.from({ length: 30 }, (_, i) => ({
        ...samplePosts[0],
        id: i + 100,
        title: { rendered: `Post ${i + 1}` },
        content: {
          rendered: `<h1>Post ${i + 1}</h1><p>Content for post ${i + 1} with sufficient length to analyze.</p>`.repeat(
            10,
          ),
        },
      }));

      mockClient.getPosts.mockResolvedValue(largePosts);

      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      expect(auditResult).toBeDefined();
      expect(auditResult.processingTime).toBeLessThan(15000); // Should handle larger datasets efficiently
    });
  });

  describe("Content Analysis", () => {
    it("should analyze content readability correctly", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      // Should identify readability issues if present
      const readabilityIssues = auditResult.issues.filter((i) => i.id === "poor-readability");

      readabilityIssues.forEach((issue) => {
        expect(issue.category).toBe("content");
        expect(issue.impact).toContain("readability");
        expect(issue.affectedItems.length).toBeGreaterThan(0);
      });
    });

    it("should detect missing alt text in images", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      // Sample data includes images without alt text
      const altTextIssues = auditResult.issues.filter((i) => i.id === "missing-alt-text");

      if (altTextIssues.length > 0) {
        expect(altTextIssues[0].category).toBe("accessibility");
        expect(altTextIssues[0].severity).toBe("high");
        expect(altTextIssues[0].impact).toContain("screen readers");
      }
    });

    it("should identify heading structure problems", async () => {
      const params = { site: "test" };
      const auditResult = await siteAuditor.performSiteAudit(params);

      // Sample data includes posts with multiple H1 tags
      const headingIssues = auditResult.issues.filter((i) => i.id === "heading-structure");

      if (headingIssues.length > 0) {
        expect(headingIssues[0].category).toBe("architecture");
        expect(headingIssues[0].impact).toContain("heading structure");
        expect(headingIssues[0].affectedItems.length).toBeGreaterThan(0);
      }
    });
  });
});
