/**
 * Content Analyzer for SEO
 *
 * Analyzes WordPress content for SEO optimization opportunities including
 * readability scoring, keyword analysis, content structure evaluation,
 * and technical SEO factors.
 *
 * @since 2.7.0
 */

import { LoggerFactory } from "../../../utils/logger.js";
import { Config } from "../../../config/Config.js";
import type { WordPressPost } from "../../../types/wordpress.js";
import type { SEOAnalysisResult, SEOMetrics, SEORecommendation, SEOToolParams } from "../../../types/seo.js";

/**
 * Content analyzer for SEO evaluation
 */
export class ContentAnalyzer {
  private logger = LoggerFactory.tool("content_analyzer");
  private config = Config.getInstance().get().seo;

  /**
   * Analyze post content for SEO factors
   *
   * @param post - WordPress post data
   * @param params - Analysis parameters
   * @returns Comprehensive SEO analysis
   */
  async analyzePost(post: WordPressPost, params: SEOToolParams): Promise<SEOAnalysisResult> {
    const siteLogger = LoggerFactory.tool("seo_analyze_content", params.site);

    return await siteLogger.time("Content SEO analysis", async () => {
      // Extract content for analysis
      const content = this.extractContent(post);
      const plainText = this.stripHtml(content);

      // Perform various analyses
      const metrics = await this.calculateMetrics(plainText, content, params);
      const recommendations = await this.generateRecommendations(post, metrics, params);
      const keywordAnalysis = params.focusKeywords?.length
        ? await this.analyzeKeywords(plainText, params.focusKeywords[0])
        : undefined;
      const structure = await this.analyzeStructure(content);

      // Calculate overall SEO score
      const score = this.calculateOverallScore(metrics, recommendations);
      const status = this.getScoreStatus(score);

      const result: SEOAnalysisResult = {
        score,
        status,
        metrics,
        recommendations,
        structure,
        analyzedAt: new Date().toISOString(),
      };

      if (keywordAnalysis) {
        result.keywordAnalysis = keywordAnalysis;
      }

      return result;
    });
  }

  /**
   * Extract text content from WordPress post
   *
   * @param post - WordPress post
   * @returns Combined content string
   * @private
   */
  private extractContent(post: WordPressPost): string {
    const titleContent = typeof post.title === "object" ? post.title.rendered : post.title || "";
    const bodyContent = typeof post.content === "object" ? post.content.rendered : post.content || "";
    const excerptContent = typeof post.excerpt === "object" ? post.excerpt.rendered : post.excerpt || "";

    return `${titleContent} ${bodyContent} ${excerptContent}`.trim();
  }

  /**
   * Strip HTML tags and return plain text
   *
   * @param html - HTML content
   * @returns Plain text
   * @private
   */
  private stripHtml(html: string): string {
    // Remove HTML tags, scripts, and styles
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&[#\w]+;/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Calculate comprehensive content metrics
   *
   * @param plainText - Plain text content
   * @param htmlContent - Original HTML content
   * @param params - Analysis parameters
   * @returns SEO metrics
   * @private
   */
  private async calculateMetrics(plainText: string, htmlContent: string, params: SEOToolParams): Promise<SEOMetrics> {
    const words = this.getWords(plainText);
    const sentences = this.getSentences(plainText);
    const syllables = this.countSyllables(plainText);

    // Calculate readability scores
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / Math.max(words.length, 1);

    const fleschReadingEase = this.calculateFleschReadingEase(avgWordsPerSentence, avgSyllablesPerWord);

    const fleschKincaidGrade = this.calculateFleschKincaidGrade(avgWordsPerSentence, avgSyllablesPerWord);

    // Keyword density for focus keyword
    const keywordDensity = params.focusKeywords?.length
      ? this.calculateKeywordDensity(plainText, params.focusKeywords[0])
      : 0;

    // HTML structure analysis
    const headings = this.countHeadings(htmlContent);
    const links = this.countLinks(htmlContent);
    const images = this.countImages(htmlContent);

    return {
      wordCount: words.length,
      avgWordsPerSentence,
      avgSyllablesPerWord,
      fleschReadingEase,
      fleschKincaidGrade,
      keywordDensity,
      headingCount: headings.total,
      internalLinkCount: links.internal,
      externalLinkCount: links.external,
      imageCount: images.total,
      imagesWithAltText: images.withAlt,
      readingTime: Math.ceil(words.length / 200), // Assume 200 WPM reading speed
    };
  }

  /**
   * Generate SEO recommendations based on analysis
   *
   * @param post - WordPress post
   * @param metrics - Calculated metrics
   * @param params - Analysis parameters
   * @returns Array of recommendations
   * @private
   */
  private async generateRecommendations(
    post: WordPressPost,
    metrics: SEOMetrics,
    params: SEOToolParams,
  ): Promise<SEORecommendation[]> {
    const recommendations: SEORecommendation[] = [];

    // Word count recommendations
    if (metrics.wordCount < this.config.analysis.minWordCount) {
      recommendations.push({
        type: "content",
        priority: "high",
        message: `Content is too short (${metrics.wordCount} words). Aim for at least ${this.config.analysis.minWordCount} words for better SEO.`,
        impact: 80,
        autoFixAvailable: false,
        helpUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
      });
    }

    // Readability recommendations
    if (metrics.fleschReadingEase < this.config.analysis.minReadabilityScore) {
      recommendations.push({
        type: "content",
        priority: "medium",
        message: `Content readability is low (${metrics.fleschReadingEase.toFixed(
          1,
        )}). Consider using shorter sentences and simpler words.`,
        impact: 60,
        autoFixAvailable: false,
        suggestedFix: "Break up long sentences and use more common vocabulary.",
      });
    }

    // Keyword density recommendations
    if (params.focusKeywords?.length) {
      const targetDensity = this.config.analysis.targetKeywordDensity;
      const maxDensity = this.config.analysis.maxKeywordDensity;

      if (metrics.keywordDensity < targetDensity) {
        recommendations.push({
          type: "keyword",
          priority: "medium",
          message: `Focus keyword density is low (${metrics.keywordDensity.toFixed(
            1,
          )}%). Consider adding the keyword "${params.focusKeywords[0]}" more naturally throughout the content.`,
          impact: 70,
          autoFixAvailable: false,
        });
      } else if (metrics.keywordDensity > maxDensity) {
        recommendations.push({
          type: "keyword",
          priority: "medium",
          message: `Focus keyword density is too high (${metrics.keywordDensity.toFixed(
            1,
          )}%). This might be considered keyword stuffing.`,
          impact: 75,
          autoFixAvailable: false,
          suggestedFix: `Reduce keyword usage to around ${targetDensity}%`,
        });
      }
    }

    // Image recommendations
    if (metrics.imageCount > 0 && metrics.imagesWithAltText < metrics.imageCount) {
      const missingAlt = metrics.imageCount - metrics.imagesWithAltText;
      recommendations.push({
        type: "technical",
        priority: "high",
        message: `${missingAlt} image(s) missing alt text. Alt text improves accessibility and SEO.`,
        impact: 85,
        autoFixAvailable: false,
        suggestedFix: "Add descriptive alt text to all images",
      });
    }

    // Heading structure recommendations
    if (metrics.headingCount === 0) {
      recommendations.push({
        type: "structure",
        priority: "high",
        message: "No headings found. Use H1-H6 tags to structure your content.",
        impact: 90,
        autoFixAvailable: false,
        suggestedFix: "Add at least one H1 heading and use H2-H6 for subheadings",
      });
    }

    // Internal linking recommendations
    if (metrics.internalLinkCount === 0) {
      recommendations.push({
        type: "structure",
        priority: "medium",
        message: "No internal links found. Internal linking helps with site navigation and SEO.",
        impact: 65,
        autoFixAvailable: false,
        suggestedFix: "Add 2-3 relevant internal links to other pages on your site",
      });
    }

    return recommendations;
  }

  /**
   * Analyze focus keyword usage
   *
   * @param plainText - Plain text content
   * @param keyword - Focus keyword
   * @returns Keyword analysis
   * @private
   */
  private async analyzeKeywords(
    plainText: string,
    keyword: string,
  ): Promise<{
    primaryKeyword: string;
    keywordFound: boolean;
    occurrences: number;
    density: number;
    semanticKeywords: string[];
    competitorGap?: string[];
  }> {
    const lowerText = plainText.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const words = this.getWords(plainText);

    // Count exact keyword occurrences
    const keywordRegex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = lowerText.match(keywordRegex) || [];
    const occurrences = matches.length;

    // Calculate keyword density
    const density = (occurrences / words.length) * 100;

    // Find semantic keywords (simple implementation)
    const semanticKeywords = this.findSemanticKeywords(plainText, keyword);

    return {
      primaryKeyword: keyword,
      keywordFound: occurrences > 0,
      occurrences,
      density,
      semanticKeywords,
    };
  }

  /**
   * Analyze content structure
   *
   * @param htmlContent - HTML content
   * @returns Structure analysis
   * @private
   */
  private async analyzeStructure(htmlContent: string): Promise<{
    hasH1: boolean;
    h1Text: string;
    headingHierarchy: boolean;
    paragraphCount: number;
    avgParagraphLength: number;
  }> {
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const h1Text = h1Match ? this.stripHtml(h1Match[1]) : "";
    const hasH1 = Boolean(h1Match);

    // Check heading hierarchy (simplified)
    const headingHierarchy = this.checkHeadingHierarchy(htmlContent);

    // Analyze paragraphs
    const paragraphs = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    const paragraphTexts = paragraphs.map((p) => this.stripHtml(p)).filter((text) => text.trim().length > 0);
    const avgParagraphLength =
      paragraphTexts.length > 0
        ? paragraphTexts.reduce((sum, text) => sum + this.getWords(text).length, 0) / paragraphTexts.length
        : 0;

    return {
      hasH1,
      h1Text,
      headingHierarchy,
      paragraphCount: paragraphTexts.length,
      avgParagraphLength,
    };
  }

  // Helper methods

  private getWords(text: string): string[] {
    return text.toLowerCase().match(/\b\w+\b/g) || [];
  }

  private getSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  }

  private countSyllables(text: string): number {
    const words = this.getWords(text);
    return words.reduce((total, word) => {
      // Simple syllable counting heuristic
      const vowels = word.match(/[aeiouy]+/g);
      let count = vowels ? vowels.length : 0;
      if (word.endsWith("e")) count--;
      return total + Math.max(1, count);
    }, 0);
  }

  private calculateFleschReadingEase(avgWordsPerSentence: number, avgSyllablesPerWord: number): number {
    return 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  }

  private calculateFleschKincaidGrade(avgWordsPerSentence: number, avgSyllablesPerWord: number): number {
    return 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  }

  private calculateKeywordDensity(text: string, keyword: string): number {
    const words = this.getWords(text);
    const keywordWords = this.getWords(keyword.toLowerCase());

    if (words.length === 0 || keywordWords.length === 0) return 0;

    // Count occurrences of the exact keyword phrase
    const textString = words.join(" ");
    const keywordString = keywordWords.join(" ");
    const regex = new RegExp(keywordString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = textString.match(regex) || [];

    return (matches.length / words.length) * 100;
  }

  private countHeadings(htmlContent: string): { total: number; byLevel: Record<string, number> } {
    const byLevel: Record<string, number> = {};
    let total = 0;

    for (let i = 1; i <= 6; i++) {
      const regex = new RegExp(`<h${i}[^>]*>.*?</h${i}>`, "gi");
      const matches = htmlContent.match(regex) || [];
      byLevel[`h${i}`] = matches.length;
      total += matches.length;
    }

    return { total, byLevel };
  }

  private countLinks(htmlContent: string): { internal: number; external: number; total: number } {
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    const links = [];
    let match;

    while ((match = linkRegex.exec(htmlContent)) !== null) {
      links.push(match[1]);
    }

    const internal = links.filter(
      (href) => href.startsWith("/") || href.startsWith("#") || href.includes(this.getCurrentDomain()),
    ).length;

    const external = links.length - internal;

    return { internal, external, total: links.length };
  }

  private countImages(htmlContent: string): { total: number; withAlt: number } {
    const imageRegex = /<img[^>]*>/gi;
    const images = htmlContent.match(imageRegex) || [];

    const withAlt = images.filter((img) => /alt\s*=\s*["'][^"']+["']/i.test(img)).length;

    return { total: images.length, withAlt };
  }

  private findSemanticKeywords(text: string, mainKeyword: string): string[] {
    // Simple semantic keyword detection
    // In a real implementation, this would use NLP libraries or APIs
    const _words = this.getWords(text);
    const _mainKeywordWords = this.getWords(mainKeyword.toLowerCase());

    // Find words that commonly appear with the main keyword
    const semanticKeywords: string[] = [];

    // This is a simplified implementation
    // Real semantic analysis would use word embeddings, LSI, or similar techniques

    return semanticKeywords.slice(0, 10); // Return top 10 semantic keywords
  }

  private checkHeadingHierarchy(htmlContent: string): boolean {
    const headingMatches = htmlContent.match(/<h([1-6])[^>]*>/gi);
    if (!headingMatches) return true;

    const levels = headingMatches.map((match) => {
      const levelMatch = match.match(/<h([1-6])/i);
      return levelMatch ? parseInt(levelMatch[1]) : 0;
    });

    // Check if headings follow proper hierarchy (no skipping levels)
    let currentLevel = 0;
    for (const level of levels) {
      if (level > currentLevel + 1) {
        return false; // Skipped a level
      }
      currentLevel = Math.max(currentLevel, level);
    }

    return true;
  }

  private getCurrentDomain(): string {
    // This would need to be determined from the WordPress site URL
    // For testing purposes, return a default domain
    return "localhost";
  }

  private calculateOverallScore(metrics: SEOMetrics, recommendations: SEORecommendation[]): number {
    let score = 100;

    // Deduct points for each recommendation based on impact
    for (const rec of recommendations) {
      const deduction = rec.impact * 0.3; // Scale impact to reasonable deduction
      score -= deduction;
    }

    // Bonus points for good metrics
    if (metrics.wordCount >= this.config.analysis.minWordCount) {
      score += 5;
    }

    if (metrics.fleschReadingEase >= this.config.analysis.minReadabilityScore) {
      score += 5;
    }

    if (metrics.imagesWithAltText === metrics.imageCount && metrics.imageCount > 0) {
      score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getScoreStatus(score: number): "poor" | "needs-improvement" | "good" | "excellent" {
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "needs-improvement";
    return "poor";
  }
}
