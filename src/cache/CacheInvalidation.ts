/**
 * Intelligent cache invalidation strategies for WordPress MCP Server
 * Implements event-based and pattern-based invalidation
 */

import { HttpCacheWrapper } from "./HttpCacheWrapper.js";

export interface InvalidationRule {
  trigger: string;
  patterns: string[];
  immediate?: boolean;
  cascade?: boolean;
}

export interface InvalidationEvent {
  type: "create" | "update" | "delete";
  resource: string;
  id?: number | undefined;
  siteId: string;
  timestamp: number;
  data?: any;
}

/**
 * Cache invalidation manager that handles intelligent cache clearing
 */
export class CacheInvalidation {
  private invalidationRules: Map<string, InvalidationRule[]> = new Map();
  private eventQueue: InvalidationEvent[] = [];
  private processing = false;

  constructor(private httpCache: HttpCacheWrapper) {
    this.setupDefaultRules();
  }

  /**
   * Register invalidation rule
   */
  registerRule(resource: string, rule: InvalidationRule): void {
    if (!this.invalidationRules.has(resource)) {
      this.invalidationRules.set(resource, []);
    }
    this.invalidationRules.get(resource)!.push(rule);
  }

  /**
   * Trigger invalidation event
   */
  async trigger(event: InvalidationEvent): Promise<void> {
    this.eventQueue.push(event);

    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Invalidate cache for specific resource
   */
  async invalidateResource(
    resource: string,
    id?: number,
    type: "create" | "update" | "delete" = "update",
  ): Promise<void> {
    const event: InvalidationEvent = {
      type,
      resource,
      id,
      siteId: this.httpCache["siteId"], // Access private property
      timestamp: Date.now(),
    };

    await this.trigger(event);
  }

  /**
   * Setup default invalidation rules
   */
  private setupDefaultRules(): void {
    // Post invalidation rules
    this.registerRule("posts", {
      trigger: "create",
      patterns: [
        "posts", // All posts listings
        "posts/\\d+", // Specific post
        "categories", // Category listings (if post has categories)
        "tags", // Tag listings (if post has tags)
        "search", // Search results
      ],
      immediate: true,
      cascade: true,
    });

    this.registerRule("posts", {
      trigger: "update",
      patterns: [
        "posts/\\d+", // Specific post
        "posts.*", // All posts with parameters
        "search", // Search results
      ],
      immediate: true,
    });

    this.registerRule("posts", {
      trigger: "delete",
      patterns: [
        "posts", // All posts listings
        "posts/\\d+", // Specific post
        "categories", // Category counts might change
        "tags", // Tag counts might change
        "search", // Search results
      ],
      immediate: true,
      cascade: true,
    });

    // Page invalidation rules
    this.registerRule("pages", {
      trigger: "create",
      patterns: ["pages", "pages/\\d+"],
      immediate: true,
    });

    this.registerRule("pages", {
      trigger: "update",
      patterns: ["pages/\\d+", "pages.*"],
      immediate: true,
    });

    this.registerRule("pages", {
      trigger: "delete",
      patterns: ["pages", "pages/\\d+"],
      immediate: true,
    });

    // Comment invalidation rules
    this.registerRule("comments", {
      trigger: "create",
      patterns: [
        "comments",
        "comments.*",
        "posts/\\d+.*", // Parent post cache
      ],
      immediate: true,
    });

    this.registerRule("comments", {
      trigger: "update",
      patterns: [
        "comments/\\d+",
        "comments.*",
        "posts/\\d+.*", // Parent post cache
      ],
      immediate: true,
    });

    this.registerRule("comments", {
      trigger: "delete",
      patterns: [
        "comments",
        "comments/\\d+",
        "posts/\\d+.*", // Parent post cache
      ],
      immediate: true,
    });

    // Media invalidation rules
    this.registerRule("media", {
      trigger: "create",
      patterns: ["media", "media.*"],
      immediate: true,
    });

    this.registerRule("media", {
      trigger: "update",
      patterns: ["media/\\d+", "media.*"],
      immediate: true,
    });

    this.registerRule("media", {
      trigger: "delete",
      patterns: ["media", "media/\\d+"],
      immediate: true,
    });

    // User invalidation rules
    this.registerRule("users", {
      trigger: "create",
      patterns: ["users", "users.*"],
      immediate: true,
    });

    this.registerRule("users", {
      trigger: "update",
      patterns: [
        "users/\\d+",
        "users.*",
        "users/me", // Current user info
      ],
      immediate: true,
    });

    this.registerRule("users", {
      trigger: "delete",
      patterns: ["users", "users/\\d+"],
      immediate: true,
    });

    // Category invalidation rules
    this.registerRule("categories", {
      trigger: "create",
      patterns: ["categories", "categories.*", "posts.*"],
      immediate: true,
      cascade: true,
    });

    this.registerRule("categories", {
      trigger: "update",
      patterns: ["categories/\\d+", "categories.*", "posts.*"],
      immediate: true,
      cascade: true,
    });

    this.registerRule("categories", {
      trigger: "delete",
      patterns: ["categories", "categories/\\d+", "posts.*"],
      immediate: true,
      cascade: true,
    });

    // Tag invalidation rules
    this.registerRule("tags", {
      trigger: "create",
      patterns: ["tags", "tags.*", "posts.*"],
      immediate: true,
      cascade: true,
    });

    this.registerRule("tags", {
      trigger: "update",
      patterns: ["tags/\\d+", "tags.*", "posts.*"],
      immediate: true,
      cascade: true,
    });

    this.registerRule("tags", {
      trigger: "delete",
      patterns: ["tags", "tags/\\d+", "posts.*"],
      immediate: true,
      cascade: true,
    });

    // Settings invalidation rules (rarely change)
    this.registerRule("settings", {
      trigger: "update",
      patterns: ["settings.*"],
      immediate: true,
      cascade: false,
    });
  }

  /**
   * Process invalidation event queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process single invalidation event
   */
  private async processEvent(event: InvalidationEvent): Promise<void> {
    const rules = this.invalidationRules.get(event.resource) || [];

    for (const rule of rules) {
      if (rule.trigger === event.type || rule.trigger === "*") {
        await this.applyInvalidationRule(event, rule);
      }
    }
  }

  /**
   * Apply invalidation rule to cache
   */
  private async applyInvalidationRule(
    event: InvalidationEvent,
    rule: InvalidationRule,
  ): Promise<void> {
    for (const pattern of rule.patterns) {
      let invalidationPattern = pattern;

      // Replace placeholders with actual values
      if (event.id) {
        invalidationPattern = invalidationPattern.replace(
          "\\d+",
          event.id.toString(),
        );
      }

      // Invalidate matching cache entries
      const invalidated = this.httpCache.invalidatePattern(invalidationPattern);

      if (invalidated > 0) {
        console.log(
          `Invalidated ${invalidated} cache entries for pattern: ${invalidationPattern}`,
        );
      }
    }
  }

  /**
   * Get invalidation statistics
   */
  getStats(): {
    queueSize: number;
    rulesCount: number;
    processing: boolean;
  } {
    return {
      queueSize: this.eventQueue.length,
      rulesCount: Array.from(this.invalidationRules.values()).reduce(
        (acc, rules) => acc + rules.length,
        0,
      ),
      processing: this.processing,
    };
  }

  /**
   * Clear all invalidation rules
   */
  clearRules(): void {
    this.invalidationRules.clear();
  }

  /**
   * Get all registered rules
   */
  getRules(): Record<string, InvalidationRule[]> {
    const rules: Record<string, InvalidationRule[]> = {};
    for (const [resource, ruleList] of this.invalidationRules.entries()) {
      rules[resource] = [...ruleList];
    }
    return rules;
  }
}

/**
 * Cache invalidation patterns for common WordPress operations
 */
export class WordPressCachePatterns {
  /**
   * Invalidate all content-related caches
   */
  static invalidateContent(cache: HttpCacheWrapper): number {
    return cache.invalidatePattern("(posts|pages|comments|media)");
  }

  /**
   * Invalidate all taxonomy-related caches
   */
  static invalidateTaxonomies(cache: HttpCacheWrapper): number {
    return cache.invalidatePattern("(categories|tags|taxonomies)");
  }

  /**
   * Invalidate all user-related caches
   */
  static invalidateUsers(cache: HttpCacheWrapper): number {
    return cache.invalidatePattern("users");
  }

  /**
   * Invalidate search-related caches
   */
  static invalidateSearch(cache: HttpCacheWrapper): number {
    return cache.invalidatePattern("search");
  }

  /**
   * Invalidate all caches (nuclear option)
   */
  static invalidateAll(cache: HttpCacheWrapper): number {
    return cache.invalidateAll();
  }
}

/**
 * Cache warming strategies for common WordPress data
 */
export class CacheWarmer {
  constructor(private httpCache: HttpCacheWrapper) {}

  /**
   * Warm cache with essential WordPress data
   */
  async warmEssentials(): Promise<void> {
    // Implementation would depend on your specific WordPress client
    // This is a placeholder for the structure
    console.log("Warming essential caches...");
  }

  /**
   * Warm cache with taxonomy data
   */
  async warmTaxonomies(): Promise<void> {
    console.log("Warming taxonomy caches...");
  }

  /**
   * Warm cache with user data
   */
  async warmUsers(): Promise<void> {
    console.log("Warming user caches...");
  }
}
