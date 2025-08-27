/**
 * Internal Linking Suggester
 *
 * This module analyzes WordPress content to suggest relevant internal linking
 * opportunities based on semantic analysis, keyword matching, and content clustering.
 * It helps improve site architecture, user navigation, and SEO link equity distribution.
 *
 * Features:
 * - Semantic content analysis for relevance scoring
 * - Keyword-based link suggestions with confidence metrics
 * - Topic clustering for hub-and-spoke content architecture
 * - Anchor text optimization recommendations
 * - Link density and distribution analysis
 * - Context-aware link placement suggestions
 *
 * @since 2.7.0
 */

import { WordPressClient } from "../../../client/api.js";
import { LoggerFactory } from "../../../utils/logger.js";
import type { InternalLinkSuggestion, SEOToolParams } from "../../../types/seo.js";
import type { WordPressPost } from "../../../types/wordpress.js";

/**
 * Configuration for internal linking suggestions
 */
interface LinkingSuggestionConfig {
  /** Maximum number of suggestions to return */
  maxSuggestions: number;

  /** Minimum relevance score threshold (0-100) */
  minRelevanceScore: number;

  /** Maximum links per post to suggest */
  maxLinksPerPost: number;

  /** Enable semantic analysis */
  useSemanticAnalysis: boolean;

  /** Include category-based suggestions */
  includeCategoryMatches: boolean;

  /** Include tag-based suggestions */
  includeTagMatches: boolean;

  /** Minimum word count for target posts */
  minWordCount: number;

  /** Exclude posts older than X days */
  maxPostAge: number;

  /** Enable contextual placement suggestions */
  enableContextualPlacement: boolean;
}

/**
 * Content analysis result for relevance scoring
 */
interface ContentAnalysis {
  /** Extracted keywords with frequency */
  keywords: Array<{ word: string; frequency: number; tfidf: number }>;

  /** Main topics identified in content */
  topics: string[];

  /** Content category based on analysis */
  category: string;

  /** Semantic fingerprint for similarity matching */
  semanticFingerprint: number[];

  /** Word count */
  wordCount: number;

  /** Reading level */
  readingLevel: number;
}

/**
 * Link placement context
 */
interface LinkPlacementContext {
  /** Paragraph index where link could be placed */
  paragraphIndex: number;

  /** Character position within paragraph */
  characterPosition: number;

  /** Surrounding text context */
  contextBefore: string;

  /** Surrounding text context */
  contextAfter: string;

  /** Suggested anchor text */
  suggestedAnchor: string;

  /** Confidence score for this placement (0-100) */
  placementScore: number;
}

/**
 * Topic cluster information
 */
interface TopicCluster {
  /** Cluster identifier */
  clusterId: string;

  /** Main topic/theme */
  topic: string;

  /** Posts in this cluster */
  posts: Array<{
    postId: number;
    title: string;
    url: string;
    relevanceScore: number;
    isHub: boolean;
  }>;

  /** Cluster coherence score */
  coherenceScore: number;

  /** Suggested hub post (if any) */
  hubPost?: number;
}

/**
 * Internal Linking Suggester Class
 */
export class InternalLinkingSuggester {
  private logger = LoggerFactory.tool("internal_linking");
  private config: LinkingSuggestionConfig;

  constructor(
    private client: WordPressClient,
    config?: Partial<LinkingSuggestionConfig>,
  ) {
    // Default configuration
    this.config = {
      maxSuggestions: 10,
      minRelevanceScore: 30,
      maxLinksPerPost: 5,
      useSemanticAnalysis: true,
      includeCategoryMatches: true,
      includeTagMatches: true,
      minWordCount: 300,
      maxPostAge: 365, // 1 year
      enableContextualPlacement: true,
      ...config,
    };
  }

  /**
   * Generate internal linking suggestions for a specific post
   */
  async generateSuggestions(sourcePost: WordPressPost, params: SEOToolParams): Promise<InternalLinkSuggestion[]> {
    this.logger.debug("Generating internal linking suggestions", {
      postId: sourcePost.id,
      title: sourcePost.title?.rendered?.substring(0, 50),
      maxSuggestions: this.config.maxSuggestions,
    });

    try {
      // Analyze source post content
      const sourceAnalysis = await this.analyzePostContent(sourcePost);

      // Get candidate posts for linking
      const candidatePosts = await this.getCandidatePosts(sourcePost, params);

      // Analyze candidate posts
      const candidateAnalyses = await Promise.all(candidatePosts.map((post) => this.analyzePostContent(post)));

      // Calculate relevance scores
      const scoredSuggestions = this.calculateRelevanceScores(
        sourcePost,
        sourceAnalysis,
        candidatePosts,
        candidateAnalyses,
      );

      // Filter and rank suggestions
      const filteredSuggestions = scoredSuggestions
        .filter((suggestion) => suggestion.relevance >= this.config.minRelevanceScore)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, this.config.maxSuggestions);

      // Add contextual placement information
      const enhancedSuggestions = await Promise.all(
        filteredSuggestions.map((suggestion) => this.enhanceWithContextualPlacement(sourcePost, suggestion)),
      );

      this.logger.info("Generated internal linking suggestions", {
        sourcePostId: sourcePost.id,
        candidatesAnalyzed: candidatePosts.length,
        suggestionsFound: enhancedSuggestions.length,
        avgRelevanceScore:
          enhancedSuggestions.length > 0
            ? (enhancedSuggestions.reduce((sum, s) => sum + s.relevance, 0) / enhancedSuggestions.length).toFixed(1)
            : 0,
      });

      return enhancedSuggestions;
    } catch (_error) {
      this.logger.error("Failed to generate internal linking suggestions", {
        postId: sourcePost.id,
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  /**
   * Analyze content clustering for site-wide link architecture
   */
  async analyzeContentClusters(params: SEOToolParams): Promise<TopicCluster[]> {
    this.logger.debug("Analyzing content clusters", {
      site: params.site,
    });

    try {
      // Get all published posts
      const allPosts = await this.getAllPosts(params);

      // Analyze all posts
      const postAnalyses = await Promise.all(allPosts.map((post) => this.analyzePostContent(post)));

      // Create topic clusters using similarity analysis
      const clusters = this.createTopicClusters(allPosts, postAnalyses);

      // Identify hub posts for each cluster
      const enhancedClusters = clusters.map((cluster) => this.identifyHubPost(cluster));

      this.logger.info("Content clustering analysis completed", {
        totalPosts: allPosts.length,
        clustersFound: enhancedClusters.length,
        avgClusterSize: enhancedClusters.length > 0 ? (allPosts.length / enhancedClusters.length).toFixed(1) : 0,
      });

      return enhancedClusters;
    } catch (_error) {
      this.logger.error("Failed to analyze content clusters", {
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error;
    }
  }

  /**
   * Get bulk linking suggestions for multiple posts
   */
  async generateBulkSuggestions(
    postIds: number[],
    params: SEOToolParams,
  ): Promise<Array<{ postId: number; suggestions: InternalLinkSuggestion[] }>> {
    this.logger.debug("Generating bulk internal linking suggestions", {
      postCount: postIds.length,
    });

    const results = [];

    for (const postId of postIds) {
      try {
        const post = await this.client.getPost(postId);
        if (post) {
          const suggestions = await this.generateSuggestions(post as WordPressPost, params);
          results.push({ postId, suggestions });
        }
      } catch (_error) {
        this.logger.warn("Failed to generate suggestions for post", {
          postId,
          _error: _error instanceof Error ? _error.message : String(_error),
        });
        results.push({ postId, suggestions: [] });
      }
    }

    return results;
  }

  /**
   * Analyze post content for relevance scoring
   */
  private async analyzePostContent(post: WordPressPost): Promise<ContentAnalysis> {
    const content = this.extractTextContent(post.content?.rendered || "");
    const title = post.title?.rendered || "";
    const fullText = `${title} ${content}`;

    // Extract keywords with TF-IDF scoring
    const keywords = this.extractKeywords(fullText);

    // Identify main topics
    const topics = this.extractTopics(fullText, keywords);

    // Determine content category
    const category = this.categorizeContent(fullText, keywords);

    // Generate semantic fingerprint
    const semanticFingerprint = this.generateSemanticFingerprint(fullText, keywords);

    return {
      keywords,
      topics,
      category,
      semanticFingerprint,
      wordCount: this.countWords(content),
      readingLevel: this.calculateReadingLevel(content),
    };
  }

  /**
   * Get candidate posts for internal linking
   */
  private async getCandidatePosts(sourcePost: WordPressPost, params: SEOToolParams): Promise<WordPressPost[]> {
    try {
      // Get all published posts except the source post
      const allPosts = await this.getAllPosts(params);

      return allPosts.filter((post) => {
        // Exclude source post
        if (post.id === sourcePost.id) return false;

        // Only include published posts
        if (post.status !== "publish") return false;

        // Check minimum word count
        const wordCount = this.countWords(this.extractTextContent(post.content?.rendered || ""));
        if (wordCount < this.config.minWordCount) return false;

        // Check post age if specified
        if (this.config.maxPostAge > 0) {
          const postDate = new Date(post.date || "");
          const daysSincePost = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePost > this.config.maxPostAge) return false;
        }

        return true;
      });
    } catch (_error) {
      this.logger.error("Failed to get candidate posts", {
        _error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error; // Re-throw error to maintain error propagation
    }
  }

  /**
   * Get all published posts
   */
  async getAllPosts(params: SEOToolParams): Promise<WordPressPost[]> {
    // In a real implementation, this would fetch from WordPress API
    // const response = await this.client.getPosts({ per_page: 100, status: 'publish' });
    // return response as WordPressPost[];

    // For now, return empty array (tests will mock this method)
    return [];
  }

  /**
   * Calculate relevance scores between source and candidate posts
   */
  private calculateRelevanceScores(
    sourcePost: WordPressPost,
    sourceAnalysis: ContentAnalysis,
    candidatePosts: WordPressPost[],
    candidateAnalyses: ContentAnalysis[],
  ): InternalLinkSuggestion[] {
    return candidatePosts.map((candidatePost, index) => {
      const candidateAnalysis = candidateAnalyses[index];

      // Calculate various relevance factors
      const keywordSimilarity = this.calculateKeywordSimilarity(sourceAnalysis.keywords, candidateAnalysis.keywords);

      const topicSimilarity = this.calculateTopicSimilarity(sourceAnalysis.topics, candidateAnalysis.topics);

      const semanticSimilarity = this.calculateSemanticSimilarity(
        sourceAnalysis.semanticFingerprint,
        candidateAnalysis.semanticFingerprint,
      );

      const categorySimilarity = sourceAnalysis.category === candidateAnalysis.category ? 0.3 : 0;

      // Weighted relevance score
      const relevanceScore = Math.round(
        keywordSimilarity * 0.4 + topicSimilarity * 0.3 + semanticSimilarity * 0.2 + categorySimilarity * 0.1,
      );

      // Generate suggested anchor text
      const anchorText = this.generateAnchorText(candidatePost, sourceAnalysis.keywords);

      // Determine reason for suggestion
      const reason = this.generateSuggestionReason(
        keywordSimilarity,
        topicSimilarity,
        semanticSimilarity,
        categorySimilarity,
      );

      return {
        sourcePostId: sourcePost.id,
        targetPostId: candidatePost.id,
        targetTitle: candidatePost.title?.rendered || "Untitled",
        targetUrl: candidatePost.link || `#${candidatePost.id}`,
        anchorText,
        relevance: relevanceScore,
        reason,
        context: "", // Will be filled by contextual placement
      };
    });
  }

  /**
   * Enhance suggestions with contextual placement information
   */
  private async enhanceWithContextualPlacement(
    sourcePost: WordPressPost,
    suggestion: InternalLinkSuggestion,
  ): Promise<InternalLinkSuggestion> {
    if (!this.config.enableContextualPlacement) {
      return suggestion;
    }

    const content = sourcePost.content?.rendered || "";
    const placements = this.findOptimalPlacements(content, suggestion.anchorText, suggestion.targetTitle);

    if (placements.length > 0) {
      const bestPlacement = placements[0];
      suggestion.context = `${bestPlacement.contextBefore}[${suggestion.anchorText}]${bestPlacement.contextAfter}`;
    }

    return suggestion;
  }

  /**
   * Create topic clusters from analyzed posts
   */
  private createTopicClusters(posts: WordPressPost[], analyses: ContentAnalysis[]): TopicCluster[] {
    const clusters: TopicCluster[] = [];
    const clustered = new Set<number>();

    analyses.forEach((analysis, index) => {
      if (clustered.has(index)) return;

      const post = posts[index];
      const cluster: TopicCluster = {
        clusterId: `cluster_${clusters.length + 1}`,
        topic: analysis.topics[0] || analysis.category,
        posts: [
          {
            postId: post.id,
            title: post.title?.rendered || "Untitled",
            url: post.link || `#${post.id}`,
            relevanceScore: 100,
            isHub: false,
          },
        ],
        coherenceScore: 0,
      };

      // Find similar posts
      analyses.forEach((otherAnalysis, otherIndex) => {
        if (otherIndex === index || clustered.has(otherIndex)) return;

        const similarity = this.calculateSemanticSimilarity(
          analysis.semanticFingerprint,
          otherAnalysis.semanticFingerprint,
        );

        if (similarity > 60) {
          // Similarity threshold for clustering
          const otherPost = posts[otherIndex];
          cluster.posts.push({
            postId: otherPost.id,
            title: otherPost.title?.rendered || "Untitled",
            url: otherPost.link || `#${otherPost.id}`,
            relevanceScore: similarity,
            isHub: false,
          });
          clustered.add(otherIndex);
        }
      });

      if (cluster.posts.length > 1) {
        clusters.push(cluster);
        clustered.add(index);
      }
    });

    return clusters;
  }

  /**
   * Identify hub post for a cluster
   */
  private identifyHubPost(cluster: TopicCluster): TopicCluster {
    // Find the post with highest average relevance to other posts in cluster
    let bestHubScore = 0;
    let hubPostId = cluster.posts[0].postId;

    cluster.posts.forEach((post) => {
      const avgRelevance =
        cluster.posts.filter((p) => p.postId !== post.postId).reduce((sum, p) => sum + p.relevanceScore, 0) /
        (cluster.posts.length - 1);

      if (avgRelevance > bestHubScore) {
        bestHubScore = avgRelevance;
        hubPostId = post.postId;
      }
    });

    // Mark hub post
    cluster.posts.forEach((post) => {
      post.isHub = post.postId === hubPostId;
    });

    cluster.hubPost = hubPostId;
    cluster.coherenceScore = bestHubScore;

    return cluster;
  }

  // Utility methods for content analysis

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
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Extract keywords with TF-IDF scoring
   */
  private extractKeywords(text: string): Array<{ word: string; frequency: number; tfidf: number }> {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isStopWord(word));

    const wordCounts = new Map<string, number>();
    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const totalWords = words.length;
    const uniqueWords = wordCounts.size;

    return Array.from(wordCounts.entries())
      .map(([word, count]) => ({
        word,
        frequency: count,
        tfidf: (count / totalWords) * Math.log(uniqueWords / count), // Simplified TF-IDF
      }))
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 20); // Top 20 keywords
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "this",
      "that",
      "these",
      "those",
      "i",
      "me",
      "my",
      "myself",
      "we",
      "our",
      "ours",
      "ourselves",
      "you",
      "your",
      "yours",
      "yourself",
      "he",
      "him",
      "his",
      "himself",
      "she",
      "her",
      "hers",
      "herself",
      "it",
      "its",
      "itself",
      "they",
      "them",
      "their",
      "theirs",
      "themselves",
      "what",
      "which",
      "who",
      "whom",
      "whose",
      "this",
      "that",
      "these",
      "those",
      "am",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "having",
      "do",
      "does",
      "did",
      "doing",
      "will",
      "would",
      "should",
      "could",
      "can",
      "may",
      "might",
      "must",
      "shall",
    ]);

    return stopWords.has(word.toLowerCase());
  }

  /**
   * Extract main topics from content
   */
  private extractTopics(text: string, keywords: Array<{ word: string; frequency: number; tfidf: number }>): string[] {
    // Simple topic extraction based on high-frequency keywords
    return keywords
      .slice(0, 5)
      .map((kw) => kw.word)
      .filter((word) => word.length > 4); // Filter for meaningful topic words
  }

  /**
   * Categorize content based on keywords and patterns
   */
  private categorizeContent(text: string, keywords: Array<{ word: string; frequency: number; tfidf: number }>): string {
    const keywordSet = new Set(keywords.map((kw) => kw.word));

    // Define category keywords
    const categories = {
      tutorial: ["tutorial", "guide", "how", "step", "learn", "beginners", "basics"],
      review: ["review", "comparison", "versus", "pros", "cons", "rating", "opinion"],
      news: ["news", "update", "announcement", "breaking", "latest", "recent"],
      technical: ["code", "programming", "development", "api", "technical", "implementation"],
      business: ["business", "marketing", "strategy", "growth", "revenue", "profit"],
      general: [],
    };

    let bestMatch = "general";
    let bestScore = 0;

    Object.entries(categories).forEach(([category, categoryKeywords]) => {
      const matches = categoryKeywords.filter((kw) => keywordSet.has(kw)).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestMatch = category;
      }
    });

    return bestMatch;
  }

  /**
   * Generate semantic fingerprint for similarity comparison
   */
  private generateSemanticFingerprint(
    text: string,
    keywords: Array<{ word: string; frequency: number; tfidf: number }>,
  ): number[] {
    // Simple semantic fingerprint based on keyword TF-IDF scores
    const fingerprint = new Array(50).fill(0);

    keywords.slice(0, 50).forEach((keyword, index) => {
      fingerprint[index] = keyword.tfidf;
    });

    return fingerprint;
  }

  /**
   * Calculate reading level (simplified Flesch-Kincaid)
   */
  private calculateReadingLevel(text: string): number {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    return 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = word.match(/[aeiouy]+/g);
    let syllableCount = vowels ? vowels.length : 1;

    // Adjust for silent e
    if (word.endsWith("e")) {
      syllableCount--;
    }

    return Math.max(syllableCount, 1);
  }

  /**
   * Calculate keyword similarity between two posts
   */
  private calculateKeywordSimilarity(
    keywords1: Array<{ word: string; frequency: number; tfidf: number }>,
    keywords2: Array<{ word: string; frequency: number; tfidf: number }>,
  ): number {
    const set1 = new Set(keywords1.map((kw) => kw.word));
    const set2 = new Set(keywords2.map((kw) => kw.word));

    const intersection = new Set([...set1].filter((word) => set2.has(word)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  }

  /**
   * Calculate topic similarity between two posts
   */
  private calculateTopicSimilarity(topics1: string[], topics2: string[]): number {
    const set1 = new Set(topics1);
    const set2 = new Set(topics2);

    const intersection = new Set([...set1].filter((topic) => set2.has(topic)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  }

  /**
   * Calculate semantic similarity using fingerprints
   */
  private calculateSemanticSimilarity(fingerprint1: number[], fingerprint2: number[]): number {
    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < Math.min(fingerprint1.length, fingerprint2.length); i++) {
      dotProduct += fingerprint1[i] * fingerprint2[i];
      norm1 += fingerprint1[i] * fingerprint1[i];
      norm2 += fingerprint2[i] * fingerprint2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? (dotProduct / magnitude) * 100 : 0;
  }

  /**
   * Generate suggested anchor text for a link
   */
  private generateAnchorText(
    targetPost: WordPressPost,
    sourceKeywords: Array<{ word: string; frequency: number; tfidf: number }>,
  ): string {
    const title = targetPost.title?.rendered || "Untitled";

    // Try to find relevant keywords from source in target title
    const relevantKeywords = sourceKeywords
      .filter((kw) => title.toLowerCase().includes(kw.word.toLowerCase()))
      .slice(0, 3);

    if (relevantKeywords.length > 0) {
      // Use the most relevant keyword phrase from title
      const keyword = relevantKeywords[0].word;
      const titleWords = title.toLowerCase().split(/\s+/);
      const keywordIndex = titleWords.findIndex((word) => word.includes(keyword.toLowerCase()));

      if (keywordIndex >= 0) {
        // Return 2-3 words around the keyword
        const start = Math.max(0, keywordIndex - 1);
        const end = Math.min(titleWords.length, keywordIndex + 2);
        return titleWords.slice(start, end).join(" ");
      }
    }

    // Fallback to title (truncated if necessary)
    return title.length > 50 ? title.substring(0, 47) + "..." : title;
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateSuggestionReason(
    keywordSim: number,
    topicSim: number,
    semanticSim: number,
    categorySim: number,
  ): string {
    if (keywordSim > 50) {
      return "Strong keyword overlap suggests high relevance";
    } else if (topicSim > 60) {
      return "Similar topics make this a good contextual link";
    } else if (semanticSim > 40) {
      return "Semantic content analysis indicates relevance";
    } else if (categorySim > 0) {
      return "Same content category suggests related information";
    } else {
      return "General content relevance detected";
    }
  }

  /**
   * Find optimal placements for internal links within content
   */
  private findOptimalPlacements(content: string, anchorText: string, targetTitle: string): LinkPlacementContext[] {
    const placements: LinkPlacementContext[] = [];

    // Extract paragraphs
    const paragraphs = content
      .split(/<\/p>/i)
      .map((p) => this.extractTextContent(p).trim())
      .filter((p) => p.length > 50);

    paragraphs.forEach((paragraph, pIndex) => {
      // Look for relevant keywords or phrases
      const lowerParagraph = paragraph.toLowerCase();
      const lowerAnchor = anchorText.toLowerCase();
      const lowerTitle = targetTitle.toLowerCase();

      // Check for exact anchor text match
      let position = lowerParagraph.indexOf(lowerAnchor);
      if (position >= 0) {
        placements.push({
          paragraphIndex: pIndex,
          characterPosition: position,
          contextBefore: paragraph.substring(Math.max(0, position - 30), position),
          contextAfter: paragraph.substring(position + anchorText.length, position + anchorText.length + 30),
          suggestedAnchor: anchorText,
          placementScore: 90,
        });
        return;
      }

      // Look for title keywords
      const titleWords = lowerTitle.split(/\s+/);
      titleWords.forEach((word) => {
        if (word.length > 4) {
          position = lowerParagraph.indexOf(word);
          if (position >= 0 && placements.length < 3) {
            placements.push({
              paragraphIndex: pIndex,
              characterPosition: position,
              contextBefore: paragraph.substring(Math.max(0, position - 30), position),
              contextAfter: paragraph.substring(position + word.length, position + word.length + 30),
              suggestedAnchor: word,
              placementScore: 70,
            });
          }
        }
      });
    });

    return placements.sort((a, b) => b.placementScore - a.placementScore).slice(0, 3);
  }

  /**
   * Get current configuration
   */
  getConfig(): LinkingSuggestionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LinkingSuggestionConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.debug("Configuration updated", { config: this.config });
  }
}
