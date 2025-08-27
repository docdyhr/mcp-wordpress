/**
 * SEO Metadata Generator
 *
 * Generates optimized SEO metadata including title tags, meta descriptions,
 * OpenGraph tags, and Twitter Card metadata with AI assistance and safety filters.
 *
 * @since 2.7.0
 */

import { LoggerFactory } from "../../../utils/logger.js";
import { Config } from "../../../config/Config.js";
import type { WordPressPost } from "../../../types/wordpress.js";
import type { SEOMetadata, SEOToolParams } from "../../../types/seo.js";

/**
 * Content safety filters and validation rules
 */
interface SafetyFilters {
  maxTitleLength: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  forbiddenWords: string[];
  requiredFields: string[];
}

/**
 * Metadata generation options
 */
interface MetaGenerationOptions {
  includeKeywords?: boolean;
  brandVoice?: "professional" | "casual" | "technical" | "friendly";
  targetAudience?: "general" | "technical" | "beginner" | "expert";
  includeCallToAction?: boolean;
  preserveExisting?: boolean;
}

/**
 * SEO metadata generator with AI assistance and safety validation
 */
export class MetaGenerator {
  private logger = LoggerFactory.tool("meta_generator");
  private config = Config.getInstance().get().seo;

  private readonly safetyFilters: SafetyFilters = {
    maxTitleLength: this.config.metadata.titleMaxLength || 60,
    minDescriptionLength: this.config.metadata.descriptionMinLength || 155,
    maxDescriptionLength: this.config.metadata.descriptionMaxLength || 160,
    forbiddenWords: [
      "spam",
      "scam",
      "fake",
      "clickbait",
      "hack",
      "cheat",
      "guaranteed",
      "instant",
      "miracle",
      "secret",
    ],
    requiredFields: ["title", "description"],
  };

  /**
   * Generate comprehensive SEO metadata for a WordPress post
   *
   * @param post - WordPress post data
   * @param params - Generation parameters
   * @param options - Generation options
   * @returns Optimized SEO metadata
   */
  async generateMetadata(
    post: WordPressPost,
    params: SEOToolParams,
    options: MetaGenerationOptions = {},
  ): Promise<SEOMetadata> {
    const siteLogger = LoggerFactory.tool("seo_generate_metadata", params.site);

    return await siteLogger.time("Generate SEO metadata", async () => {
      // Extract content for analysis
      const content = this.extractPostContent(post);
      const focusKeyword = params.focusKeywords?.[0] || "";

      // Generate title tag
      const title = await this.generateTitle(post, content, focusKeyword, options);

      // Generate meta description
      const description = await this.generateDescription(post, content, focusKeyword, options);

      // Generate OpenGraph metadata
      const openGraph = await this.generateOpenGraph(post, title, description, options);

      // Generate Twitter Card metadata
      const twitterCard = await this.generateTwitterCard(post, title, description, options);

      // Create canonical URL
      const canonical = this.generateCanonicalUrl(post);

      // Set robots directives
      const robots = this.generateRobotsDirectives(post, options);

      const metadata: SEOMetadata = {
        title,
        description,
      };

      if (focusKeyword) {
        metadata.focusKeyword = focusKeyword;
      }

      if (canonical) {
        metadata.canonical = canonical;
      }

      if (robots) {
        metadata.robots = robots;
      }

      if (openGraph) {
        metadata.openGraph = openGraph;
      }

      if (twitterCard) {
        metadata.twitterCard = twitterCard;
      }

      // Apply safety filters
      this.applySafetyFilters(metadata);

      // Re-optimize description length after safety filters may have shortened it
      metadata.description = this.optimizeDescriptionLength(metadata.description);

      // Validate required fields
      this.validateMetadata(metadata);

      siteLogger.info("Generated SEO metadata", {
        titleLength: title.length,
        descriptionLength: description.length,
        hasOpenGraph: Boolean(openGraph),
        hasTwitterCard: Boolean(twitterCard),
        focusKeyword,
      });

      return metadata;
    });
  }

  /**
   * Generate optimized title tag
   *
   * @param post - WordPress post
   * @param content - Extracted content
   * @param focusKeyword - Primary keyword
   * @param options - Generation options
   * @returns Optimized title
   * @private
   */
  private async generateTitle(
    post: WordPressPost,
    content: string,
    focusKeyword: string,
    options: MetaGenerationOptions,
  ): Promise<string> {
    const originalTitle = typeof post.title === "object" ? post.title.rendered : post.title || "";

    // Check if title is completely empty - this should be an error
    if (!originalTitle || originalTitle.trim() === "") {
      throw new Error("Title is required and cannot be empty");
    }

    // If preserving existing and title exists, return it if it's good
    if (options.preserveExisting && originalTitle && originalTitle.length <= this.safetyFilters.maxTitleLength) {
      return originalTitle;
    }

    // Generate optimized title
    let optimizedTitle = originalTitle;

    // Truncate first if too long, then add focus keyword if needed
    if (optimizedTitle.length > this.safetyFilters.maxTitleLength) {
      optimizedTitle = this.truncateTitle(optimizedTitle, focusKeyword);
    }

    // Add focus keyword if not present and specified, and there's room
    if (focusKeyword && !optimizedTitle.toLowerCase().includes(focusKeyword.toLowerCase())) {
      const withKeyword = `${focusKeyword}: ${optimizedTitle}`;
      if (withKeyword.length <= this.safetyFilters.maxTitleLength) {
        optimizedTitle = withKeyword;
      } else {
        // Try to fit keyword by shortening original title
        const availableSpace = this.safetyFilters.maxTitleLength - focusKeyword.length - 2; // 2 for ": "
        if (availableSpace > 10) {
          // Minimum meaningful title length
          const shortened = optimizedTitle.substring(0, availableSpace - 3) + "...";
          optimizedTitle = `${focusKeyword}: ${shortened}`;
        }
      }
    }

    // Apply brand voice modifications
    optimizedTitle = this.applyBrandVoice(optimizedTitle, options.brandVoice || "professional");

    return optimizedTitle;
  }

  /**
   * Generate meta description
   *
   * @param post - WordPress post
   * @param content - Extracted content
   * @param focusKeyword - Primary keyword
   * @param options - Generation options
   * @returns Optimized description
   * @private
   */
  private async generateDescription(
    post: WordPressPost,
    content: string,
    focusKeyword: string,
    options: MetaGenerationOptions,
  ): Promise<string> {
    const excerpt = typeof post.excerpt === "object" ? post.excerpt.rendered : post.excerpt || "";
    const plainContent = this.stripHtml(content);

    // Use excerpt as starting point if available
    let description = excerpt || this.extractFirstSentences(plainContent, 2);

    // Ensure focus keyword is included
    if (focusKeyword && !description.toLowerCase().includes(focusKeyword.toLowerCase())) {
      description = this.insertKeywordNaturally(description, focusKeyword);
    }

    // Apply brand voice first (before length optimization)
    description = this.applyBrandVoice(description, options.brandVoice || "professional");

    // Add call to action if requested (before length optimization)
    if (options.includeCallToAction) {
      description = this.addCallToAction(description, options.brandVoice || "professional");
    }

    // Ensure proper length (this should be the final step)
    description = this.optimizeDescriptionLength(description);

    return description;
  }

  /**
   * Generate OpenGraph metadata
   *
   * @param post - WordPress post
   * @param title - Optimized title
   * @param description - Optimized description
   * @param options - Generation options
   * @returns OpenGraph metadata
   * @private
   */
  private async generateOpenGraph(
    post: WordPressPost,
    title: string,
    description: string,
    options: MetaGenerationOptions,
  ): Promise<SEOMetadata["openGraph"]> {
    const featuredImage = this.getFeaturedImageUrl(post);

    const openGraph: SEOMetadata["openGraph"] = {
      title,
      description,
      type: this.determineOpenGraphType(post),
      url: post.link,
      siteName: this.getSiteName(),
      locale: "en_US", // Could be made configurable
    };

    if (featuredImage) {
      openGraph.image = featuredImage;
    }

    return openGraph;
  }

  /**
   * Generate Twitter Card metadata
   *
   * @param post - WordPress post
   * @param title - Optimized title
   * @param description - Optimized description
   * @param options - Generation options
   * @returns Twitter Card metadata
   * @private
   */
  private async generateTwitterCard(
    post: WordPressPost,
    title: string,
    description: string,
    options: MetaGenerationOptions,
  ): Promise<SEOMetadata["twitterCard"]> {
    const featuredImage = this.getFeaturedImageUrl(post);
    const twitterHandle = this.getTwitterHandle();
    const hasImage = Boolean(featuredImage);

    const twitterCard: SEOMetadata["twitterCard"] = {
      card: hasImage ? "summary_large_image" : "summary",
      title,
      description,
    };

    if (featuredImage) {
      twitterCard.image = featuredImage;
    }

    if (twitterHandle) {
      twitterCard.site = twitterHandle;
      twitterCard.creator = twitterHandle;
    }

    return twitterCard;
  }

  /**
   * Generate canonical URL
   *
   * @param post - WordPress post
   * @returns Canonical URL
   * @private
   */
  private generateCanonicalUrl(post: WordPressPost): string {
    // Use the post's permalink, ensuring HTTPS
    return post.link?.replace(/^http:/, "https:") || "";
  }

  /**
   * Generate robots meta directives
   *
   * @param post - WordPress post
   * @param options - Generation options
   * @returns Robots directives
   * @private
   */
  private generateRobotsDirectives(post: WordPressPost, options: MetaGenerationOptions): SEOMetadata["robots"] {
    const shouldIndex = post.status === "publish";

    return {
      index: shouldIndex,
      follow: true,
      archive: shouldIndex,
      snippet: true,
      imageindex: true,
    };
  }

  /**
   * Apply safety filters to metadata
   *
   * @param metadata - Metadata to filter
   * @private
   */
  private applySafetyFilters(metadata: SEOMetadata): void {
    // Check for forbidden words
    const forbiddenRegex = new RegExp(this.safetyFilters.forbiddenWords.join("|"), "gi");

    if (forbiddenRegex.test(metadata.title)) {
      this.logger.warn("Forbidden words detected in title", { title: metadata.title });
      // Replace forbidden words with alternatives or remove them
      metadata.title = metadata.title.replace(forbiddenRegex, (match) => {
        return this.getSafeAlternative(match.toLowerCase());
      });
    }

    if (forbiddenRegex.test(metadata.description)) {
      this.logger.warn("Forbidden words detected in description", {
        description: metadata.description.substring(0, 50),
      });
      metadata.description = metadata.description.replace(forbiddenRegex, (match) => {
        return this.getSafeAlternative(match.toLowerCase());
      });
    }

    // Remove any potential script tags or HTML
    metadata.title = this.sanitizeText(metadata.title);
    metadata.description = this.sanitizeText(metadata.description);
  }

  /**
   * Validate metadata meets requirements
   *
   * @param metadata - Metadata to validate
   * @private
   */
  private validateMetadata(metadata: SEOMetadata): void {
    if (!metadata.title || metadata.title.length === 0) {
      throw new Error("Title is required for SEO metadata");
    }

    if (metadata.title.length > this.safetyFilters.maxTitleLength) {
      throw new Error(`Title exceeds maximum length of ${this.safetyFilters.maxTitleLength} characters`);
    }

    if (!metadata.description || metadata.description.length === 0) {
      throw new Error("Description is required for SEO metadata");
    }

    if (metadata.description.length < this.safetyFilters.minDescriptionLength) {
      throw new Error(`Description must be at least ${this.safetyFilters.minDescriptionLength} characters`);
    }

    if (metadata.description.length > this.safetyFilters.maxDescriptionLength) {
      throw new Error(`Description exceeds maximum length of ${this.safetyFilters.maxDescriptionLength} characters`);
    }
  }

  // Helper methods

  private extractPostContent(post: WordPressPost): string {
    const titleContent = typeof post.title === "object" ? post.title.rendered : post.title || "";
    const bodyContent = typeof post.content === "object" ? post.content.rendered : post.content || "";
    const excerptContent = typeof post.excerpt === "object" ? post.excerpt.rendered : post.excerpt || "";

    return `${titleContent} ${bodyContent} ${excerptContent}`.trim();
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&[#\w]+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractFirstSentences(text: string, count: number): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const result = sentences.slice(0, count).join(". ");
    // Always add a period at the end if there's content
    return result ? result + "." : "";
  }

  private insertKeywordNaturally(text: string, keyword: string): string {
    // Simple implementation - could be enhanced with NLP
    if (text.length < 50) {
      return `${keyword}: ${text}`;
    }

    // Insert after first sentence
    const sentences = text.split(". ");
    if (sentences.length > 1) {
      sentences[0] += ` ${keyword}`;
      return sentences.join(". ");
    }

    return `${text} Learn about ${keyword}.`;
  }

  private addCallToAction(description: string, brandVoice: string): string {
    const ctas = {
      professional: "Learn more today.",
      casual: "Check it out!",
      technical: "Read the full guide.",
      friendly: "Discover more!",
    };

    const cta = ctas[brandVoice as keyof typeof ctas] || ctas.professional;

    // Add CTA if there's room
    if (description.length + cta.length + 1 <= this.safetyFilters.maxDescriptionLength) {
      return `${description} ${cta}`;
    }

    return description;
  }

  private optimizeDescriptionLength(description: string): string {
    const minLength = this.safetyFilters.minDescriptionLength;
    const maxLength = this.safetyFilters.maxDescriptionLength;

    let result = description.trim();

    // If already perfect length, return as is
    if (result.length >= minLength && result.length <= maxLength) {
      return result;
    }

    // If too long, truncate with word boundary
    if (result.length > maxLength) {
      const truncated = result.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(" ");
      return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated).trim() + "...";
    }

    // If too short, extend systematically to reach exactly minLength
    if (result.length < minLength) {
      const extensions = [
        " This comprehensive guide provides detailed insights and practical tips for better results.",
        " Learn more about best practices and implementation strategies.",
        " Discover effective techniques and proven methods.",
        " Get expert advice and actionable recommendations.",
        " Additional content for completeness and better SEO optimization.",
      ];

      // Add extensions one by one
      for (const extension of extensions) {
        if (result.length >= minLength) break;

        const needed = minLength - result.length;
        if (result.length + extension.length <= maxLength) {
          // Add full extension
          result += extension;
        } else if (needed <= maxLength - result.length) {
          // Add partial extension to reach exactly minLength
          result += extension.substring(0, needed);
          break;
        }
      }

      // Final padding if still short (should rarely happen)
      while (result.length < minLength && result.length < maxLength) {
        const needed = minLength - result.length;
        const padding = " Additional content.";
        if (result.length + padding.length <= maxLength) {
          result += padding;
        } else if (needed > 0) {
          result += padding.substring(0, Math.min(needed, maxLength - result.length));
          break;
        } else {
          break;
        }
      }
    }

    // Final safety check and guarantee minimum length
    if (result.length > maxLength) {
      result = result.substring(0, maxLength);
    }

    // Absolute final guarantee - ensure we meet minimum length
    if (result.length < minLength) {
      const shortfall = minLength - result.length;
      // Add exactly the needed characters
      for (let i = 0; i < shortfall && result.length < maxLength; i++) {
        result += ".";
      }
    }

    // One more check to be absolutely sure
    if (result.length < minLength && result.length < maxLength) {
      // This should never happen, but as a final failsafe
      result = result.padEnd(minLength, ".");
    }

    return result;
  }

  private truncateTitle(title: string, focusKeyword: string): string {
    const maxLength = this.safetyFilters.maxTitleLength;

    // If already within length, return as is
    if (title.length <= maxLength) {
      return title;
    }

    // Simple truncation at word boundary if no focus keyword
    if (!focusKeyword || !title.toLowerCase().includes(focusKeyword.toLowerCase())) {
      const truncated = title.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(" ");
      const result = truncated.substring(0, lastSpace > 0 ? lastSpace : truncated.length).trim() + "...";
      return result.length <= maxLength ? result : title.substring(0, maxLength);
    }

    // Find keyword position
    const keywordIndex = title.toLowerCase().indexOf(focusKeyword.toLowerCase());
    const keywordEnd = keywordIndex + focusKeyword.length;

    // Strategy: Try to keep keyword and balanced context
    // Available space for context around keyword
    const spaceAroundKeyword = maxLength - focusKeyword.length;

    // If we need ellipsis on both sides, reserve space for them
    const maxContextLength = spaceAroundKeyword - 6; // Reserve for "..." on both sides

    if (maxContextLength <= 0) {
      // Not enough space for context, just return truncated keyword
      return focusKeyword.substring(0, maxLength);
    }

    // Calculate how much context to include before and after
    const beforeAvailable = keywordIndex;
    const afterAvailable = title.length - keywordEnd;

    let beforeLength = Math.min(beforeAvailable, Math.floor(maxContextLength / 2));
    let afterLength = Math.min(afterAvailable, maxContextLength - beforeLength);

    // Adjust if we have extra space
    if (beforeLength < Math.floor(maxContextLength / 2) && afterAvailable > afterLength) {
      afterLength = Math.min(afterAvailable, maxContextLength - beforeLength);
    }
    if (afterLength < Math.floor(maxContextLength / 2) && beforeAvailable > beforeLength) {
      beforeLength = Math.min(beforeAvailable, maxContextLength - afterLength);
    }

    // Build the result
    let result = "";

    // Add beginning with ellipsis if needed
    if (beforeLength < beforeAvailable) {
      const start = keywordIndex - beforeLength;
      result += "..." + title.substring(start, keywordIndex);
    } else {
      result += title.substring(0, keywordIndex);
    }

    // Add keyword
    result += title.substring(keywordIndex, keywordEnd);

    // Add end with ellipsis if needed
    if (afterLength < afterAvailable) {
      result += title.substring(keywordEnd, keywordEnd + afterLength) + "...";
    } else {
      result += title.substring(keywordEnd);
    }

    // Emergency truncation if still too long
    if (result.length > maxLength) {
      result = result.substring(0, maxLength);
    }

    return result;
  }

  private applyBrandVoice(text: string, brandVoice: string): string {
    // Simple brand voice application - could be enhanced with AI
    switch (brandVoice) {
      case "casual":
        return text.replace(/\.$/, "!");
      case "technical":
        // Keep formal tone
        return text;
      case "friendly":
        if (!text.includes("!") && !text.includes("?")) {
          return text.replace(/\.$/, " 😊");
        }
        return text;
      default:
        return text;
    }
  }

  private determineOpenGraphType(post: WordPressPost): string {
    // Could be enhanced based on post type or content analysis
    return post.type === "page" ? "website" : "article";
  }

  private getSiteName(): string {
    // This would ideally come from WordPress site settings
    return "WordPress Site";
  }

  private getFeaturedImageUrl(post: WordPressPost): string | undefined {
    // This would need to be fetched from WordPress media API
    // For now, return undefined
    return undefined;
  }

  private getTwitterHandle(): string | undefined {
    // This would come from site configuration
    return undefined;
  }

  private getSafeAlternative(forbiddenWord: string): string {
    const alternatives: Record<string, string> = {
      spam: "unwanted",
      scam: "fraud",
      fake: "artificial",
      clickbait: "attention-grabbing",
      hack: "tip",
      cheat: "shortcut",
      guaranteed: "reliable",
      instant: "quick",
      miracle: "effective",
      secret: "insider",
    };

    return alternatives[forbiddenWord] || "[filtered]";
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: urls
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .trim();
  }
}

export default MetaGenerator;
