/**
 * SchemaGenerator Tests
 *
 * Tests for the SEO schema markup generation functionality including
 * all supported Schema.org types, content extraction, and validation.
 *
 * @since 2.7.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SchemaGenerator } from "../../../dist/tools/seo/generators/SchemaGenerator.js";

describe("SchemaGenerator", () => {
  let generator;

  beforeEach(() => {
    generator = new SchemaGenerator();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(SchemaGenerator);
    });

    it("should have generateSchema method", () => {
      expect(generator.generateSchema).toBeDefined();
      expect(typeof generator.generateSchema).toBe("function");
    });

    it("should have validateSchema method", () => {
      expect(generator.validateSchema).toBeDefined();
      expect(typeof generator.validateSchema).toBe("function");
    });
  });

  describe("Article Schema Generation", () => {
    const samplePost = {
      id: 1,
      title: { rendered: "Complete Guide to WordPress SEO" },
      content: {
        rendered: `
          <h1>Complete Guide to WordPress SEO</h1>
          <p>WordPress SEO is essential for increasing your website's visibility in search engines. 
          This comprehensive guide covers all aspects of optimizing your WordPress site for better rankings.</p>
          <img src="https://example.com/seo-guide.jpg" alt="SEO Guide">
          <h2>Why SEO Matters</h2>
          <p>Search Engine Optimization helps your content reach more people and drives organic traffic to your site.</p>
        `,
      },
      excerpt: { rendered: "Learn comprehensive WordPress SEO techniques to improve your search rankings." },
      link: "https://example.com/wordpress-seo-guide",
      date: "2023-01-15T10:00:00Z",
      modified: "2023-01-16T12:00:00Z",
      status: "publish",
      type: "post",
    };

    it("should generate Article schema markup", async () => {
      const params = {
        postId: 1,
        schemaType: "Article",
        site: "test",
      };

      const options = {
        includeAuthor: true,
        includeOrganization: true,
        siteConfig: {
          name: "SEO Blog",
          url: "https://example.com",
          logo: "https://example.com/logo.png",
        },
      };

      const result = await generator.generateSchema(samplePost, params, options);

      expect(result).toBeDefined();
      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("Article");
      expect(result.headline).toBe("Complete Guide to WordPress SEO");
      expect(result.description).toContain("WordPress SEO techniques");
      expect(result.datePublished).toBe("2023-01-15T10:00:00Z");
      expect(result.dateModified).toBe("2023-01-16T12:00:00Z");
      expect(result.author).toBeDefined();
      expect(result.author["@type"]).toBe("Person");
      expect(result.publisher).toBeDefined();
      expect(result.publisher["@type"]).toBe("Organization");
      expect(result.mainEntityOfPage).toBe("https://example.com/wordpress-seo-guide");
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.image).toBeDefined();
      expect(Array.isArray(result.image)).toBe(true);
    });

    it("should generate Article schema markup with different content", async () => {
      const params = {
        postId: 1,
        schemaType: "Article",
        site: "test",
      };

      const result = await generator.generateSchema(samplePost, params);

      expect(result["@type"]).toBe("Article");
      expect(result.headline).toBeDefined();
      expect(result.author).toBeDefined();
      expect(result.publisher).toBeDefined();
    });

    it("should handle posts without excerpts", async () => {
      const postWithoutExcerpt = {
        ...samplePost,
        excerpt: { rendered: "" },
      };

      const params = {
        postId: 1,
        schemaType: "Article",
        site: "test",
      };

      const result = await generator.generateSchema(postWithoutExcerpt, params);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
      expect(result.description).toContain("WordPress SEO is essential");
    });

    it("should include custom keywords when provided", async () => {
      const params = {
        postId: 1,
        schemaType: "Article",
        site: "test",
      };

      const options = {
        customProperties: {
          keywords: ["WordPress", "SEO", "optimization", "guide"],
        },
      };

      const result = await generator.generateSchema(samplePost, params, options);

      expect(result.keywords).toBeDefined();
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(result.keywords).toContain("WordPress");
      expect(result.keywords).toContain("SEO");
    });
  });

  describe("Product Schema Generation", () => {
    const productPost = {
      id: 2,
      title: { rendered: "Premium WordPress Theme" },
      content: {
        rendered: `
          <h1>Premium WordPress Theme</h1>
          <p>A professional WordPress theme with advanced features and responsive design.</p>
          <img src="https://example.com/theme-preview.jpg" alt="Theme Preview">
          <p>Price: $99</p>
          <p>Brand: ThemeCompany</p>
        `,
      },
      excerpt: { rendered: "Professional WordPress theme with responsive design and advanced features." },
      link: "https://example.com/premium-theme",
      status: "publish",
      type: "product",
    };

    it("should generate Product schema markup", async () => {
      const params = {
        postId: 2,
        schemaType: "Product",
        site: "test",
      };

      const result = await generator.generateSchema(productPost, params);

      expect(result["@type"]).toBe("Product");
      expect(result.name).toBe("Premium WordPress Theme");
      expect(result.description).toContain("Professional WordPress theme");
      expect(result.image).toBeDefined();
      expect(Array.isArray(result.image)).toBe(true);
    });

    it("should handle products without specific product data", async () => {
      const simpleProduct = {
        ...productPost,
        content: { rendered: "<p>Simple product description without pricing.</p>" },
      };

      const params = {
        postId: 2,
        schemaType: "Product",
        site: "test",
      };

      const result = await generator.generateSchema(simpleProduct, params);

      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      // Should not have offers without price data
      expect(result.offers).toBeUndefined();
    });
  });

  describe("FAQ Schema Generation", () => {
    const faqPost = {
      id: 3,
      title: { rendered: "WordPress SEO FAQ" },
      content: {
        rendered: `
          <h1>WordPress SEO FAQ</h1>
          <h2>What is WordPress SEO?</h2>
          <p>WordPress SEO refers to the practice of optimizing your WordPress website to rank higher in search engines.</p>
          <h2>How do I improve my WordPress SEO?</h2>
          <p>You can improve WordPress SEO by optimizing content, using proper headings, adding meta descriptions, and using SEO plugins.</p>
          <h3>Do I need an SEO plugin?</h3>
          <p>While not strictly necessary, SEO plugins like Yoast or RankMath make optimization much easier.</p>
        `,
      },
      excerpt: { rendered: "Frequently asked questions about WordPress SEO optimization." },
      link: "https://example.com/wordpress-seo-faq",
      status: "publish",
      type: "page",
    };

    it("should generate FAQ schema markup", async () => {
      const params = {
        postId: 3,
        schemaType: "FAQ",
        site: "test",
      };

      const result = await generator.generateSchema(faqPost, params);

      expect(result["@type"]).toBe("FAQ");
      expect(result.mainEntity).toBeDefined();
      expect(Array.isArray(result.mainEntity)).toBe(true);
      expect(result.mainEntity.length).toBeGreaterThan(0);

      const firstQuestion = result.mainEntity[0];
      expect(firstQuestion["@type"]).toBe("Question");
      expect(firstQuestion.name).toContain("What is WordPress SEO");
      expect(firstQuestion.acceptedAnswer).toBeDefined();
      expect(firstQuestion.acceptedAnswer["@type"]).toBe("Answer");
      expect(firstQuestion.acceptedAnswer.text).toContain("optimizing your WordPress website");
    });

    it("should handle content without FAQ structure", async () => {
      const nonFaqPost = {
        ...faqPost,
        content: { rendered: "<p>This is regular content without FAQ structure.</p>" },
      };

      const params = {
        postId: 3,
        schemaType: "FAQ",
        site: "test",
      };

      const result = await generator.generateSchema(nonFaqPost, params);

      expect(result.mainEntity).toBeDefined();
      expect(Array.isArray(result.mainEntity)).toBe(true);
      expect(result.mainEntity.length).toBe(0);
    });
  });

  describe("HowTo Schema Generation", () => {
    const howToPost = {
      id: 4,
      title: { rendered: "How to Install WordPress" },
      content: {
        rendered: `
          <h1>How to Install WordPress</h1>
          <p>Learn how to install WordPress in just a few simple steps. This process takes about 5 minutes.</p>
          <img src="https://example.com/wordpress-install.jpg" alt="WordPress Installation">
          <h2>Step 1: Download WordPress</h2>
          <p>Visit wordpress.org and download the latest version of WordPress.</p>
          <h2>Step 2: Upload Files</h2>
          <p>Upload the WordPress files to your web server using FTP or hosting control panel.</p>
          <h2>Step 3: Create Database</h2>
          <p>Create a MySQL database and user for your WordPress installation.</p>
        `,
      },
      excerpt: { rendered: "Step-by-step guide to installing WordPress on your website." },
      link: "https://example.com/install-wordpress",
      status: "publish",
      type: "post",
    };

    it("should generate HowTo schema markup", async () => {
      const params = {
        postId: 4,
        schemaType: "HowTo",
        site: "test",
      };

      const result = await generator.generateSchema(howToPost, params);

      expect(result["@type"]).toBe("HowTo");
      expect(result.name).toBe("How to Install WordPress");
      expect(result.description).toContain("Step-by-step guide");
      expect(result.image).toBeDefined();
      expect(result.totalTime).toBe("PT5M"); // 5 minutes
      expect(result.step).toBeDefined();
      expect(Array.isArray(result.step)).toBe(true);
      expect(result.step.length).toBeGreaterThan(0);

      const firstStep = result.step[0];
      expect(firstStep["@type"]).toBe("HowToStep");
      expect(firstStep.position).toBe(1);
      expect(firstStep.name).toContain("Download WordPress");
      expect(firstStep.text).toContain("Visit wordpress.org");
    });

    it("should extract duration from content", async () => {
      const timedPost = {
        ...howToPost,
        content: {
          rendered: "<p>This tutorial takes approximately 30 minutes to complete.</p>",
        },
      };

      const params = {
        postId: 4,
        schemaType: "HowTo",
        site: "test",
      };

      const result = await generator.generateSchema(timedPost, params);

      expect(result.totalTime).toBe("PT30M");
    });
  });

  describe("Organization Schema Generation", () => {
    const organizationPost = {
      id: 5,
      title: { rendered: "About TechCorp" },
      content: {
        rendered: `
          <h1>About TechCorp</h1>
          <p>TechCorp is a leading technology company specializing in web development and digital marketing solutions.</p>
          <img src="https://example.com/techcorp-logo.jpg" alt="TechCorp Logo">
        `,
      },
      excerpt: { rendered: "Leading technology company specializing in web development solutions." },
      link: "https://techcorp.com/about",
      status: "publish",
      type: "page",
    };

    it("should generate Organization schema markup", async () => {
      const params = {
        postId: 5,
        schemaType: "Organization",
        site: "test",
      };

      const options = {
        siteConfig: {
          name: "TechCorp",
          url: "https://techcorp.com",
          logo: "https://techcorp.com/logo.png",
          description: "Leading technology company",
          socialProfiles: ["https://twitter.com/techcorp", "https://linkedin.com/company/techcorp"],
          contactInfo: {
            telephone: "+1-555-0123",
            email: "info@techcorp.com",
          },
        },
      };

      const result = await generator.generateSchema(organizationPost, params, options);

      expect(result["@type"]).toBe("Organization");
      expect(result.name).toBe("TechCorp");
      expect(result.description).toContain("Leading technology company");
      expect(result.url).toBe("https://techcorp.com");
      expect(result.logo).toBeDefined();
      expect(result.logo["@type"]).toBe("ImageObject");
      expect(result.logo.url).toBe("https://techcorp.com/logo.png");
      expect(result.sameAs).toBeDefined();
      expect(Array.isArray(result.sameAs)).toBe(true);
      expect(result.sameAs).toContain("https://twitter.com/techcorp");
      expect(result.contactPoint).toBeDefined();
      expect(result.contactPoint.telephone).toBe("+1-555-0123");
      expect(result.contactPoint.email).toBe("info@techcorp.com");
    });
  });

  describe("Website Schema Generation", () => {
    const websitePost = {
      id: 6,
      title: { rendered: "TechCorp Homepage" },
      content: { rendered: "<p>Welcome to TechCorp, your technology partner.</p>" },
      excerpt: { rendered: "TechCorp homepage with company information and services." },
      link: "https://techcorp.com",
      status: "publish",
      type: "page",
    };

    it("should generate Website schema markup", async () => {
      const params = {
        postId: 6,
        schemaType: "Website",
        site: "test",
      };

      const options = {
        siteConfig: {
          name: "TechCorp Website",
          url: "https://techcorp.com",
          description: "Technology solutions and services",
        },
      };

      const result = await generator.generateSchema(websitePost, params, options);

      expect(result["@type"]).toBe("Website");
      expect(result.name).toBe("TechCorp Website");
      expect(result.url).toBe("https://techcorp.com");
      expect(result.potentialAction).toBeDefined();
      expect(result.potentialAction["@type"]).toBe("SearchAction");
      expect(result.potentialAction.target).toBeDefined();
      expect(result.potentialAction["query-input"]).toBe("required name=search_term_string");
    });
  });

  describe("BreadcrumbList Schema Generation", () => {
    const breadcrumbPost = {
      id: 7,
      title: { rendered: "WordPress SEO Tips" },
      content: { rendered: "<p>Advanced WordPress SEO tips and techniques.</p>" },
      link: "https://example.com/blog/wordpress-seo-tips",
      status: "publish",
      type: "post",
    };

    it("should generate BreadcrumbList schema markup", async () => {
      const params = {
        postId: 7,
        schemaType: "BreadcrumbList",
        site: "test",
      };

      const result = await generator.generateSchema(breadcrumbPost, params);

      expect(result["@type"]).toBe("BreadcrumbList");
      expect(result.itemListElement).toBeDefined();
      expect(Array.isArray(result.itemListElement)).toBe(true);
      expect(result.itemListElement.length).toBeGreaterThan(0);

      const firstItem = result.itemListElement[0];
      expect(firstItem["@type"]).toBe("ListItem");
      expect(firstItem.position).toBe(1);
      expect(firstItem.name).toBe("Home");
      expect(firstItem.item).toBeDefined();

      const lastItem = result.itemListElement[result.itemListElement.length - 1];
      expect(lastItem.name).toBe("WordPress SEO Tips");
    });
  });

  describe("Schema Validation", () => {
    it("should validate valid Article schema", () => {
      const validSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Test Article",
        author: {
          "@type": "Person",
          name: "Test Author",
        },
      };

      const result = generator.validateSchema(validSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing @context", () => {
      const invalidSchema = {
        "@type": "Article",
        headline: "Test Article",
      };

      const result = generator.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing @context");
    });

    it("should detect missing @type", () => {
      const invalidSchema = {
        "@context": "https://schema.org",
        headline: "Test Article",
      };

      const result = generator.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing @type");
    });

    it("should detect missing required Article properties", () => {
      const invalidSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
      };

      const result = generator.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Article schema missing required headline property");
    });

    it("should detect missing required Product properties", () => {
      const invalidSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
      };

      const result = generator.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Product schema missing required name property");
    });
  });

  describe("Error Handling", () => {
    const samplePost = {
      id: 8,
      title: { rendered: "Test Post" },
      content: { rendered: "<p>Test content</p>" },
      status: "publish",
    };

    it("should throw error for missing schema type", async () => {
      const params = {
        postId: 8,
        site: "test",
      };

      await expect(generator.generateSchema(samplePost, params)).rejects.toThrow("Schema type is required");
    });

    it("should throw error for unsupported schema type", async () => {
      const params = {
        postId: 8,
        schemaType: "UnsupportedType",
        site: "test",
      };

      await expect(generator.generateSchema(samplePost, params)).rejects.toThrow(
        "Unsupported schema type: UnsupportedType",
      );
    });
  });

  describe("Content Extraction", () => {
    it("should extract images from HTML content", async () => {
      const postWithImages = {
        id: 9,
        title: { rendered: "Image Gallery Post" },
        content: {
          rendered: `
            <p>Check out these images:</p>
            <img src="https://example.com/image1.jpg" alt="Image 1">
            <img src="https://example.com/image2.png" alt="Image 2">
            <img src="https://example.com/image3.gif" alt="Image 3">
          `,
        },
        status: "publish",
      };

      const params = {
        postId: 9,
        schemaType: "Article",
        site: "test",
      };

      const result = await generator.generateSchema(postWithImages, params);

      expect(result.image).toBeDefined();
      expect(Array.isArray(result.image)).toBe(true);
      expect(result.image).toHaveLength(3);
      expect(result.image).toContain("https://example.com/image1.jpg");
      expect(result.image).toContain("https://example.com/image2.png");
      expect(result.image).toContain("https://example.com/image3.gif");
    });

    it("should count words correctly", async () => {
      const longContentPost = {
        id: 10,
        title: { rendered: "Long Article" },
        content: {
          rendered: `
            <h1>Long Article</h1>
            <p>This is a paragraph with exactly ten words in it.</p>
            <p>This is another paragraph with more words than the previous one.</p>
          `,
        },
        status: "publish",
      };

      const params = {
        postId: 10,
        schemaType: "Article",
        site: "test",
      };

      const result = await generator.generateSchema(longContentPost, params);

      expect(result.wordCount).toBeDefined();
      expect(typeof result.wordCount).toBe("number");
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });
});
