/**
 * Schema Generator
 *
 * This module generates JSON-LD structured data markup for WordPress content.
 * It supports all major Schema.org types and provides intelligent content extraction
 * and schema optimization for better search engine understanding.
 *
 * Supported Schema Types:
 * - Article, BlogPosting, NewsArticle
 * - Product, Offer, AggregateRating
 * - FAQ, Question, Answer
 * - HowTo, HowToStep, HowToDirection
 * - Organization, LocalBusiness, Person
 * - Website, WebPage, BreadcrumbList
 * - Event, Recipe, Course, VideoObject
 *
 * @since 2.7.0
 */

import { LoggerFactory } from "@/utils/logger.js";
import type { SchemaMarkup, SEOToolParams } from "@/types/seo.js";
import type { WordPressPost } from "@/types/wordpress.js";

/**
 * Schema generation options
 */
interface SchemaOptions {
  /** Include author information */
  includeAuthor?: boolean;

  /** Include organization data */
  includeOrganization?: boolean;

  /** Include breadcrumbs */
  includeBreadcrumbs?: boolean;

  /** Include images */
  includeImages?: boolean;

  /** Custom schema properties to merge */
  customProperties?: Record<string, unknown>;

  /** Site-specific configuration */
  siteConfig?: {
    name?: string;
    url?: string;
    logo?: string;
    description?: string;
    socialProfiles?: string[];
    contactInfo?: {
      telephone?: string;
      email?: string;
      address?: string;
    };
  };
}

/**
 * Article schema data structure
 */
interface ArticleSchemaData {
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: {
    "@type": "Person";
    name: string;
    url?: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  image?: string[];
  mainEntityOfPage: string;
  wordCount?: number;
  keywords?: string[];
}

/**
 * Product schema data structure
 */
interface ProductSchemaData {
  name: string;
  description: string;
  image?: string[];
  brand?: {
    "@type": "Brand";
    name: string;
  };
  offers?: {
    "@type": "Offer";
    price?: string;
    priceCurrency?: string;
    availability?: string;
    url?: string;
    validFrom?: string;
    validThrough?: string;
  };
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  review?: Array<{
    "@type": "Review";
    reviewRating: {
      "@type": "Rating";
      ratingValue: number;
    };
    author: {
      "@type": "Person";
      name: string;
    };
    reviewBody: string;
  }>;
}

/**
 * FAQ schema data structure
 */
interface FAQSchemaData {
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

/**
 * Schema Generator Class
 */
export class SchemaGenerator {
  private logger = LoggerFactory.tool("schema_generator");

  constructor() {}

  /**
   * Generate schema markup for a WordPress post
   */
  async generateSchema(post: WordPressPost, params: SEOToolParams, options: SchemaOptions = {}): Promise<SchemaMarkup> {
    this.logger.debug("Generating schema markup", {
      postId: post.id,
      schemaType: params.schemaType,
      title: post.title?.rendered?.substring(0, 50),
    });

    if (!params.schemaType) {
      throw new Error("Schema type is required for schema generation");
    }

    const baseSchema: SchemaMarkup = {
      "@context": "https://schema.org",
      "@type": params.schemaType,
    };

    // Generate schema based on type
    switch (params.schemaType) {
      case "Article":
        return this.generateArticleSchema(post, baseSchema, options);

      case "Product":
        return this.generateProductSchema(post, baseSchema, options);

      case "FAQ":
        return this.generateFAQSchema(post, baseSchema, options);

      case "HowTo":
        return this.generateHowToSchema(post, baseSchema, options);

      case "Organization":
        return this.generateOrganizationSchema(post, baseSchema, options);

      case "LocalBusiness":
        return this.generateLocalBusinessSchema(post, baseSchema, options);

      case "Website":
        return this.generateWebsiteSchema(post, baseSchema, options);

      case "BreadcrumbList":
        return this.generateBreadcrumbSchema(post, baseSchema, options);

      case "Event":
        return this.generateEventSchema(post, baseSchema, options);

      case "Recipe":
        return this.generateRecipeSchema(post, baseSchema, options);

      case "Course":
        return this.generateCourseSchema(post, baseSchema, options);

      case "VideoObject":
        return this.generateVideoSchema(post, baseSchema, options);

      case "Person":
        return this.generatePersonSchema(post, baseSchema, options);

      case "Review":
        return this.generateReviewSchema(post, baseSchema, options);

      default:
        throw new Error(`Unsupported schema type: ${params.schemaType}`);
    }
  }

  /**
   * Generate Article schema markup
   */
  private generateArticleSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const content = this.extractTextContent(post.content?.rendered || "");
    const excerpt = this.extractTextContent(post.excerpt?.rendered || "");
    const images = this.extractImages(post.content?.rendered || "");

    const articleData: ArticleSchemaData = {
      headline: post.title?.rendered || "Untitled",
      description: excerpt || content.substring(0, 160) + "...",
      datePublished: post.date || new Date().toISOString(),
      dateModified: post.modified || post.date || new Date().toISOString(),
      author: {
        "@type": "Person",
        name: this.getAuthorName(post),
        ...(this.getAuthorUrl(post) ? { url: this.getAuthorUrl(post)! } : {}),
      },
      publisher: this.getPublisherInfo(options),
      mainEntityOfPage: post.link || `https://example.com/post/${post.id}`,
      wordCount: this.countWords(content),
      ...(images.length > 0 && { image: images }),
      ...(options.customProperties?.keywords ? { keywords: options.customProperties.keywords as string[] } : {}),
    };

    return {
      ...baseSchema,
      ...articleData,
    };
  }

  /**
   * Generate Product schema markup
   */
  private generateProductSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const content = this.extractTextContent(post.content?.rendered || "");
    const excerpt = this.extractTextContent(post.excerpt?.rendered || "");
    const images = this.extractImages(post.content?.rendered || "");

    // Extract product information from content
    const productInfo = this.extractProductInfo(content);

    const productData: ProductSchemaData = {
      name: post.title?.rendered || "Untitled Product",
      description: excerpt || content.substring(0, 160) + "...",
      ...(images.length > 0 && { image: images }),
      ...(productInfo.brand && {
        brand: {
          "@type": "Brand",
          name: productInfo.brand,
        },
      }),
      ...(productInfo.price && {
        offers: {
          "@type": "Offer",
          price: productInfo.price,
          priceCurrency: productInfo.currency || "USD",
          availability: productInfo.availability || "https://schema.org/InStock",
          url: post.link || `https://example.com/product/${post.id}`,
          ...(productInfo.validFrom && { validFrom: productInfo.validFrom }),
          ...(productInfo.validThrough && { validThrough: productInfo.validThrough }),
        },
      }),
      ...(productInfo.rating && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: productInfo.rating.average,
          reviewCount: productInfo.rating.count,
          bestRating: productInfo.rating.best || 5,
          worstRating: productInfo.rating.worst || 1,
        },
      }),
    };

    return {
      ...baseSchema,
      ...productData,
    };
  }

  /**
   * Generate FAQ schema markup
   */
  private generateFAQSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const content = post.content?.rendered || "";
    const faqItems = this.extractFAQItems(content);

    if (faqItems.length === 0) {
      this.logger.warn("No FAQ items found in content", { postId: post.id });
    }

    const faqData: FAQSchemaData = {
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };

    return {
      ...baseSchema,
      ...faqData,
    };
  }

  /**
   * Generate HowTo schema markup
   */
  private generateHowToSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const content = post.content?.rendered || "";
    const steps = this.extractHowToSteps(content);
    const images = this.extractImages(content);
    const totalTime = this.extractDuration(content);

    return {
      ...baseSchema,
      name: post.title?.rendered || "Untitled Guide",
      description: this.extractTextContent(post.excerpt?.rendered || "").substring(0, 160),
      ...(images.length > 0 && { image: images }),
      ...(totalTime && { totalTime }),
      supply: this.extractSupplies(content),
      tool: this.extractTools(content),
      step: steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
        ...(step.image && { image: step.image }),
      })),
    };
  }

  /**
   * Generate Organization schema markup
   */
  private generateOrganizationSchema(
    post: WordPressPost,
    baseSchema: SchemaMarkup,
    options: SchemaOptions,
  ): SchemaMarkup {
    const siteConfig = options.siteConfig || {};

    return {
      ...baseSchema,
      name: siteConfig.name || post.title?.rendered || "Organization",
      description: siteConfig.description || this.extractTextContent(post.excerpt?.rendered || ""),
      url: siteConfig.url || post.link || "https://example.com",
      ...(siteConfig.logo && {
        logo: {
          "@type": "ImageObject",
          url: siteConfig.logo,
        },
      }),
      ...(siteConfig.socialProfiles && { sameAs: siteConfig.socialProfiles }),
      ...(siteConfig.contactInfo && {
        contactPoint: {
          "@type": "ContactPoint",
          ...(siteConfig.contactInfo.telephone && { telephone: siteConfig.contactInfo.telephone }),
          ...(siteConfig.contactInfo.email && { email: siteConfig.contactInfo.email }),
        },
      }),
    };
  }

  /**
   * Generate LocalBusiness schema markup
   */
  private generateLocalBusinessSchema(
    post: WordPressPost,
    baseSchema: SchemaMarkup,
    options: SchemaOptions,
  ): SchemaMarkup {
    const organizationSchema = this.generateOrganizationSchema(post, baseSchema, options);
    const businessInfo = this.extractBusinessInfo(post.content?.rendered || "");

    return {
      ...organizationSchema,
      "@type": "LocalBusiness",
      ...(businessInfo.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: businessInfo.address.street,
          addressLocality: businessInfo.address.city,
          addressRegion: businessInfo.address.state,
          postalCode: businessInfo.address.zip,
          addressCountry: businessInfo.address.country,
        },
      }),
      ...(businessInfo.phone && { telephone: businessInfo.phone }),
      ...(businessInfo.hours && { openingHours: businessInfo.hours }),
      ...(businessInfo.priceRange && { priceRange: businessInfo.priceRange }),
    };
  }

  /**
   * Generate Website schema markup
   */
  private generateWebsiteSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const siteConfig = options.siteConfig || {};

    return {
      ...baseSchema,
      name: siteConfig.name || "Website",
      description: siteConfig.description || this.extractTextContent(post.excerpt?.rendered || ""),
      url: siteConfig.url || "https://example.com",
      ...(options.includeAuthor && {
        author: {
          "@type": "Organization",
          name: siteConfig.name || "Website Owner",
        },
      }),
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url || "https://example.com"}?s={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    };
  }

  /**
   * Generate BreadcrumbList schema markup
   */
  private generateBreadcrumbSchema(
    post: WordPressPost,
    baseSchema: SchemaMarkup,
    options: SchemaOptions,
  ): SchemaMarkup {
    // Extract breadcrumb path from post URL or categories
    const breadcrumbs = this.extractBreadcrumbs(post);

    return {
      ...baseSchema,
      itemListElement: breadcrumbs.map((breadcrumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: breadcrumb.name,
        item: breadcrumb.url,
      })),
    };
  }

  /**
   * Generate Event schema markup
   */
  private generateEventSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const eventInfo = this.extractEventInfo(post.content?.rendered || "");

    return {
      ...baseSchema,
      name: post.title?.rendered || "Event",
      description: this.extractTextContent(post.excerpt?.rendered || ""),
      startDate: eventInfo.startDate || new Date().toISOString(),
      ...(eventInfo.endDate && { endDate: eventInfo.endDate }),
      ...(eventInfo.location && {
        location: {
          "@type": "Place",
          name: eventInfo.location.name,
          ...(eventInfo.location.address && {
            address: {
              "@type": "PostalAddress",
              streetAddress: eventInfo.location.address,
            },
          }),
        },
      }),
      ...(eventInfo.organizer && {
        organizer: {
          "@type": "Organization",
          name: eventInfo.organizer,
        },
      }),
    };
  }

  /**
   * Generate Recipe schema markup
   */
  private generateRecipeSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const recipeInfo = this.extractRecipeInfo(post.content?.rendered || "");
    const images = this.extractImages(post.content?.rendered || "");

    return {
      ...baseSchema,
      name: post.title?.rendered || "Recipe",
      description: this.extractTextContent(post.excerpt?.rendered || ""),
      ...(images.length > 0 && { image: images }),
      author: {
        "@type": "Person",
        name: this.getAuthorName(post),
      },
      ...(recipeInfo.prepTime && { prepTime: recipeInfo.prepTime }),
      ...(recipeInfo.cookTime && { cookTime: recipeInfo.cookTime }),
      ...(recipeInfo.totalTime && { totalTime: recipeInfo.totalTime }),
      ...(recipeInfo.servings && { recipeYield: recipeInfo.servings }),
      ...(recipeInfo.ingredients.length > 0 && { recipeIngredient: recipeInfo.ingredients }),
      ...(recipeInfo.instructions.length > 0 && {
        recipeInstructions: recipeInfo.instructions.map((instruction, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: instruction,
        })),
      }),
      ...(recipeInfo.nutrition && {
        nutrition: {
          "@type": "NutritionInformation",
          calories: recipeInfo.nutrition.calories,
        },
      }),
    };
  }

  /**
   * Generate Course schema markup
   */
  private generateCourseSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const courseInfo = this.extractCourseInfo(post.content?.rendered || "");

    return {
      ...baseSchema,
      name: post.title?.rendered || "Course",
      description: this.extractTextContent(post.excerpt?.rendered || ""),
      provider: {
        "@type": "Organization",
        name: options.siteConfig?.name || "Course Provider",
      },
      ...(courseInfo.instructor && {
        instructor: {
          "@type": "Person",
          name: courseInfo.instructor,
        },
      }),
      ...(courseInfo.duration && { timeRequired: courseInfo.duration }),
      ...(courseInfo.level && { courseLevel: courseInfo.level }),
      ...(courseInfo.prerequisites.length > 0 && { coursePrerequisites: courseInfo.prerequisites }),
    };
  }

  /**
   * Generate VideoObject schema markup
   */
  private generateVideoSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const videoInfo = this.extractVideoInfo(post.content?.rendered || "");

    return {
      ...baseSchema,
      name: post.title?.rendered || "Video",
      description: this.extractTextContent(post.excerpt?.rendered || ""),
      ...(videoInfo.url && { contentUrl: videoInfo.url }),
      ...(videoInfo.thumbnail && { thumbnailUrl: videoInfo.thumbnail }),
      ...(videoInfo.duration && { duration: videoInfo.duration }),
      uploadDate: post.date || new Date().toISOString(),
      author: {
        "@type": "Person",
        name: this.getAuthorName(post),
      },
    };
  }

  /**
   * Generate Person schema markup
   */
  private generatePersonSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const personInfo = this.extractPersonInfo(post.content?.rendered || "");

    return {
      ...baseSchema,
      name: post.title?.rendered || "Person",
      description: this.extractTextContent(post.excerpt?.rendered || ""),
      ...(personInfo.jobTitle && { jobTitle: personInfo.jobTitle }),
      ...(personInfo.affiliation && {
        affiliation: {
          "@type": "Organization",
          name: personInfo.affiliation,
        },
      }),
      ...(personInfo.email && { email: personInfo.email }),
      ...(personInfo.socialProfiles && { sameAs: personInfo.socialProfiles }),
    };
  }

  /**
   * Generate Review schema markup
   */
  private generateReviewSchema(post: WordPressPost, baseSchema: SchemaMarkup, options: SchemaOptions): SchemaMarkup {
    const reviewInfo = this.extractReviewInfo(post.content?.rendered || "");

    return {
      ...baseSchema,
      itemReviewed: {
        "@type": reviewInfo.itemType || "Thing",
        name: reviewInfo.itemName || "Reviewed Item",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: reviewInfo.rating || 5,
        bestRating: reviewInfo.bestRating || 5,
        worstRating: reviewInfo.worstRating || 1,
      },
      author: {
        "@type": "Person",
        name: this.getAuthorName(post),
      },
      reviewBody: this.extractTextContent(post.content?.rendered || ""),
      datePublished: post.date || new Date().toISOString(),
    };
  }

  // Helper methods for content extraction

  /**
   * Extract plain text from HTML content
   */
  private extractTextContent(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract images from HTML content
   */
  private extractImages(html: string): string[] {
    const images: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }

    return images;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Get author name from post
   */
  private getAuthorName(post: WordPressPost): string {
    // This would typically come from WordPress API author data
    return "Author"; // Placeholder
  }

  /**
   * Get author URL from post
   */
  private getAuthorUrl(post: WordPressPost): string | undefined {
    // This would typically come from WordPress API author data
    return undefined; // Placeholder
  }

  /**
   * Get publisher information
   */
  private getPublisherInfo(options: SchemaOptions): ArticleSchemaData["publisher"] {
    const siteConfig = options.siteConfig || {};

    return {
      "@type": "Organization",
      name: siteConfig.name || "Publisher",
      ...(siteConfig.logo && {
        logo: {
          "@type": "ImageObject",
          url: siteConfig.logo,
        },
      }),
    };
  }

  /**
   * Extract product information from content
   */
  private extractProductInfo(content: string): {
    brand?: string;
    price?: string;
    currency?: string;
    availability?: string;
    validFrom?: string;
    validThrough?: string;
    rating?: {
      average: number;
      count: number;
      best?: number;
      worst?: number;
    };
  } {
    // Implement product information extraction logic
    return {}; // Placeholder
  }

  /**
   * Extract FAQ items from content
   */
  private extractFAQItems(html: string): Array<{ question: string; answer: string }> {
    const faqItems: Array<{ question: string; answer: string }> = [];

    // Look for FAQ patterns in HTML
    const faqRegex = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p[^>]*>(.*?)<\/p>/gi;
    let match;

    while ((match = faqRegex.exec(html)) !== null) {
      const question = this.extractTextContent(match[1]);
      const answer = this.extractTextContent(match[2]);

      if (question && answer) {
        faqItems.push({ question, answer });
      }
    }

    return faqItems;
  }

  /**
   * Extract HowTo steps from content
   */
  private extractHowToSteps(html: string): Array<{ name: string; text: string; image?: string }> {
    const steps: Array<{ name: string; text: string; image?: string }> = [];

    // Look for step patterns in HTML
    const stepRegex = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p[^>]*>(.*?)<\/p>/gi;
    let match;

    while ((match = stepRegex.exec(html)) !== null) {
      const name = this.extractTextContent(match[1]);
      const text = this.extractTextContent(match[2]);

      if (name && text) {
        steps.push({ name, text });
      }
    }

    return steps;
  }

  /**
   * Extract duration from content
   */
  private extractDuration(content: string): string | undefined {
    const durationMatch = content.match(/(\d+)\s*(minutes?|hours?|mins?)/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();

      if (unit.startsWith("min")) {
        return `PT${value}M`;
      } else if (unit.startsWith("hour")) {
        return `PT${value}H`;
      }
    }
    return undefined;
  }

  /**
   * Extract supplies from content
   */
  private extractSupplies(content: string): string[] {
    // Implement supplies extraction logic
    return []; // Placeholder
  }

  /**
   * Extract tools from content
   */
  private extractTools(content: string): string[] {
    // Implement tools extraction logic
    return []; // Placeholder
  }

  /**
   * Extract business information from content
   */
  private extractBusinessInfo(content: string): {
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    phone?: string;
    hours?: string[];
    priceRange?: string;
  } {
    // Implement business info extraction logic
    return {}; // Placeholder
  }

  /**
   * Extract breadcrumbs from post
   */
  private extractBreadcrumbs(post: WordPressPost): Array<{ name: string; url: string }> {
    // Implement breadcrumb extraction logic
    return [
      { name: "Home", url: "https://example.com" },
      { name: post.title?.rendered || "Post", url: post.link || "#" },
    ]; // Placeholder
  }

  /**
   * Extract event information from content
   */
  private extractEventInfo(content: string): {
    startDate?: string;
    endDate?: string;
    location?: {
      name: string;
      address?: string;
    };
    organizer?: string;
  } {
    // Implement event info extraction logic
    return {}; // Placeholder
  }

  /**
   * Extract recipe information from content
   */
  private extractRecipeInfo(content: string): {
    prepTime?: string;
    cookTime?: string;
    totalTime?: string;
    servings?: string;
    ingredients: string[];
    instructions: string[];
    nutrition?: {
      calories: string;
    };
  } {
    // Implement recipe info extraction logic
    return {
      ingredients: [],
      instructions: [],
    }; // Placeholder
  }

  /**
   * Extract course information from content
   */
  private extractCourseInfo(content: string): {
    instructor?: string;
    duration?: string;
    level?: string;
    prerequisites: string[];
  } {
    // Implement course info extraction logic
    return {
      prerequisites: [],
    }; // Placeholder
  }

  /**
   * Extract video information from content
   */
  private extractVideoInfo(content: string): {
    url?: string;
    thumbnail?: string;
    duration?: string;
  } {
    // Implement video info extraction logic
    return {}; // Placeholder
  }

  /**
   * Extract person information from content
   */
  private extractPersonInfo(content: string): {
    jobTitle?: string;
    affiliation?: string;
    email?: string;
    socialProfiles?: string[];
  } {
    // Implement person info extraction logic
    return {}; // Placeholder
  }

  /**
   * Extract review information from content
   */
  private extractReviewInfo(content: string): {
    itemName?: string;
    itemType?: string;
    rating?: number;
    bestRating?: number;
    worstRating?: number;
  } {
    // Look for rating patterns in content
    const ratingMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+)/i);

    if (ratingMatch) {
      return {
        rating: parseFloat(ratingMatch[1]),
        bestRating: parseInt(ratingMatch[2]),
      };
    }

    return {}; // Placeholder
  }

  /**
   * Validate generated schema markup
   */
  validateSchema(schema: SchemaMarkup): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!schema["@context"]) {
      errors.push("Missing @context");
    }

    if (!schema["@type"]) {
      errors.push("Missing @type");
    }

    // Type-specific validation
    if (schema["@type"] === "Article" && !schema.headline) {
      errors.push("Article schema missing required headline property");
    }

    if (schema["@type"] === "Product" && !schema.name) {
      errors.push("Product schema missing required name property");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
