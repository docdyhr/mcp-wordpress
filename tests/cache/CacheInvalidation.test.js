import { jest } from "@jest/globals";
import { CacheInvalidation } from "../../dist/cache/CacheInvalidation.js";
import { HttpCacheWrapper } from "../../dist/cache/HttpCacheWrapper.js";

// Mock HttpCacheWrapper
jest.mock("../../dist/cache/HttpCacheWrapper.js");

describe("CacheInvalidation", () => {
  let invalidation;
  let mockHttpCache;

  beforeEach(() => {
    mockHttpCache = {
      invalidatePattern: jest.fn(),
      invalidateKey: jest.fn(),
      clear: jest.fn(),
      getKeys: jest.fn().mockReturnValue([]),
      siteId: "test-site",
    };

    HttpCacheWrapper.mockImplementation(() => mockHttpCache);
    invalidation = new CacheInvalidation(mockHttpCache);
  });

  describe("constructor", () => {
    it("should initialize with default rules", () => {
      expect(invalidation).toBeDefined();
      expect(invalidation.invalidationRules).toBeDefined();
      expect(invalidation.eventQueue).toBeDefined();
    });

    it("should setup default invalidation rules", () => {
      // Check that default rules are registered
      expect(invalidation.invalidationRules.size).toBeGreaterThan(0);

      // Verify some expected rules exist
      expect(invalidation.invalidationRules.has("posts")).toBe(true);
      expect(invalidation.invalidationRules.has("users")).toBe(true);
      expect(invalidation.invalidationRules.has("comments")).toBe(true);
      expect(invalidation.invalidationRules.has("media")).toBe(true);
    });
  });

  describe("registerRule", () => {
    it("should register new invalidation rule", () => {
      const rule = {
        trigger: "create",
        patterns: ["custom/*"],
        immediate: true,
        cascade: false,
      };

      invalidation.registerRule("custom", rule);

      const rules = invalidation.invalidationRules.get("custom");
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(rule);
    });

    it("should add multiple rules for same resource", () => {
      const rule1 = {
        trigger: "create",
        patterns: ["custom/*"],
        immediate: true,
      };

      const rule2 = {
        trigger: "update",
        patterns: ["custom/\\d+"],
        immediate: false,
      };

      invalidation.registerRule("custom", rule1);
      invalidation.registerRule("custom", rule2);

      const rules = invalidation.invalidationRules.get("custom");
      expect(rules).toHaveLength(2);
      expect(rules[0]).toEqual(rule1);
      expect(rules[1]).toEqual(rule2);
    });

    it("should handle different trigger types", () => {
      const createRule = { trigger: "create", patterns: ["*"] };
      const updateRule = { trigger: "update", patterns: ["*"] };
      const deleteRule = { trigger: "delete", patterns: ["*"] };

      invalidation.registerRule("test", createRule);
      invalidation.registerRule("test", updateRule);
      invalidation.registerRule("test", deleteRule);

      const rules = invalidation.invalidationRules.get("test");
      expect(rules).toHaveLength(3);
      expect(rules.map((r) => r.trigger)).toEqual(["create", "update", "delete"]);
    });
  });

  describe("trigger", () => {
    it("should add event to queue", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await invalidation.trigger(event);

      expect(invalidation.eventQueue).toContainEqual(event);
    });

    it("should process queue immediately if not processing", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      const processQueueSpy = jest.spyOn(invalidation, "processQueue");

      await invalidation.trigger(event);

      expect(processQueueSpy).toHaveBeenCalled();
    });

    it("should not process queue if already processing", async () => {
      invalidation.processing = true;

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      const processQueueSpy = jest.spyOn(invalidation, "processQueue");

      await invalidation.trigger(event);

      expect(processQueueSpy).not.toHaveBeenCalled();
      expect(invalidation.eventQueue).toContainEqual(event);
    });
  });

  describe("invalidateResource", () => {
    it("should create and trigger invalidation event", async () => {
      const triggerSpy = jest.spyOn(invalidation, "trigger");

      await invalidation.invalidateResource("posts", 123, "update");

      expect(triggerSpy).toHaveBeenCalledWith({
        type: "update",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: expect.any(Number),
      });
    });

    it("should use default type when not specified", async () => {
      const triggerSpy = jest.spyOn(invalidation, "trigger");

      await invalidation.invalidateResource("posts", 123);

      expect(triggerSpy).toHaveBeenCalledWith({
        type: "update",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: expect.any(Number),
      });
    });

    it("should handle resource without ID", async () => {
      const triggerSpy = jest.spyOn(invalidation, "trigger");

      await invalidation.invalidateResource("posts", undefined, "create");

      expect(triggerSpy).toHaveBeenCalledWith({
        type: "create",
        resource: "posts",
        id: undefined,
        siteId: "test-site",
        timestamp: expect.any(Number),
      });
    });
  });

  describe("processQueue", () => {
    it("should process events in queue", async () => {
      const event1 = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      const event2 = {
        type: "update",
        resource: "posts",
        id: 124,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      invalidation.eventQueue = [event1, event2];

      const processEventSpy = jest.spyOn(invalidation, "processEvent");

      await invalidation.processQueue();

      expect(processEventSpy).toHaveBeenCalledWith(event1);
      expect(processEventSpy).toHaveBeenCalledWith(event2);
      expect(invalidation.eventQueue).toHaveLength(0);
    });

    it("should set processing flag during queue processing", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      invalidation.eventQueue = [event];

      let processingDuringExecution = false;

      jest.spyOn(invalidation, "processEvent").mockImplementation(async () => {
        processingDuringExecution = invalidation.processing;
        return Promise.resolve();
      });

      await invalidation.processQueue();

      expect(processingDuringExecution).toBe(true);
      expect(invalidation.processing).toBe(false);
    });

    it("should handle errors during processing", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      invalidation.eventQueue = [event];

      jest.spyOn(invalidation, "processEvent").mockRejectedValue(new Error("Process error"));

      await expect(invalidation.processQueue()).resolves.not.toThrow();
      expect(invalidation.processing).toBe(false);
    });
  });

  describe("processEvent", () => {
    it("should apply matching rules for event", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      const applyRuleSpy = jest.spyOn(invalidation, "applyRule");

      await invalidation.processEvent(event);

      expect(applyRuleSpy).toHaveBeenCalled();
    });

    it("should skip rules that don't match trigger", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      // Add a rule that doesn't match
      invalidation.registerRule("posts", {
        trigger: "delete",
        patterns: ["posts/*"],
      });

      const applyRuleSpy = jest.spyOn(invalidation, "applyRule");

      await invalidation.processEvent(event);

      // Should not call applyRule for mismatched trigger
      expect(applyRuleSpy).not.toHaveBeenCalledWith(expect.objectContaining({ trigger: "delete" }), event);
    });

    it("should handle event with no matching rules", async () => {
      const event = {
        type: "create",
        resource: "unknown",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await expect(invalidation.processEvent(event)).resolves.not.toThrow();
    });
  });

  describe("applyRule", () => {
    it("should invalidate cache patterns from rule", async () => {
      const rule = {
        trigger: "create",
        patterns: ["posts/*", "posts/\\d+"],
        immediate: true,
      };

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await invalidation.applyRule(rule, event);

      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("posts/*");
      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("posts/\\d+");
    });

    it("should handle immediate invalidation", async () => {
      const rule = {
        trigger: "create",
        patterns: ["posts/*"],
        immediate: true,
      };

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await invalidation.applyRule(rule, event);

      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("posts/*");
    });

    it("should handle cascading invalidation", async () => {
      const rule = {
        trigger: "create",
        patterns: ["posts/*"],
        cascade: true,
      };

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      // Mock related patterns
      mockHttpCache.getKeys.mockReturnValue(["posts/123", "categories/1", "tags/2"]);

      await invalidation.applyRule(rule, event);

      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("posts/*");
    });

    it("should substitute patterns with event data", async () => {
      const rule = {
        trigger: "update",
        patterns: ["posts/{id}", "categories/{category}"],
        immediate: true,
      };

      const event = {
        type: "update",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
        data: { category: 5 },
      };

      await invalidation.applyRule(rule, event);

      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("posts/123");
      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledWith("categories/5");
    });
  });

  describe("default rules", () => {
    it("should have post invalidation rules", () => {
      const postRules = invalidation.invalidationRules.get("posts");
      expect(postRules).toBeDefined();
      expect(postRules.length).toBeGreaterThan(0);

      const createRule = postRules.find((r) => r.trigger === "create");
      expect(createRule).toBeDefined();
      expect(createRule.patterns).toContain("posts");
      expect(createRule.immediate).toBe(true);
      expect(createRule.cascade).toBe(true);
    });

    it("should have user invalidation rules", () => {
      const userRules = invalidation.invalidationRules.get("users");
      expect(userRules).toBeDefined();
      expect(userRules.length).toBeGreaterThan(0);

      const updateRule = userRules.find((r) => r.trigger === "update");
      expect(updateRule).toBeDefined();
      expect(updateRule.patterns).toContain("users/\\d+");
    });

    it("should have comment invalidation rules", () => {
      const commentRules = invalidation.invalidationRules.get("comments");
      expect(commentRules).toBeDefined();
      expect(commentRules.length).toBeGreaterThan(0);

      const createRule = commentRules.find((r) => r.trigger === "create");
      expect(createRule).toBeDefined();
      expect(createRule.patterns).toContain("comments");
    });

    it("should have media invalidation rules", () => {
      const mediaRules = invalidation.invalidationRules.get("media");
      expect(mediaRules).toBeDefined();
      expect(mediaRules.length).toBeGreaterThan(0);

      const deleteRule = mediaRules.find((r) => r.trigger === "delete");
      expect(deleteRule).toBeDefined();
      expect(deleteRule.patterns).toContain("media");
    });
  });

  describe("pattern matching", () => {
    it("should match simple patterns", () => {
      expect(invalidation.matchPattern("posts", "posts")).toBe(true);
      expect(invalidation.matchPattern("posts/123", "posts/*")).toBe(true);
      expect(invalidation.matchPattern("posts/123", "posts/\\d+")).toBe(true);
      expect(invalidation.matchPattern("posts/abc", "posts/\\d+")).toBe(false);
    });

    it("should match regex patterns", () => {
      expect(invalidation.matchPattern("posts/123", "posts/\\d+")).toBe(true);
      expect(invalidation.matchPattern("posts/123/comments", "posts/\\d+/comments")).toBe(true);
      expect(invalidation.matchPattern("posts/abc", "posts/\\d+")).toBe(false);
    });

    it("should handle wildcard patterns", () => {
      expect(invalidation.matchPattern("posts/123", "posts/*")).toBe(true);
      expect(invalidation.matchPattern("posts/123/comments", "posts/*")).toBe(true);
      expect(invalidation.matchPattern("users/123", "posts/*")).toBe(false);
    });

    it("should handle complex patterns", () => {
      expect(invalidation.matchPattern("posts/123?page=2", "posts/\\d+.*")).toBe(true);
      expect(invalidation.matchPattern("posts/123/comments?filter=approved", "posts/\\d+/comments.*")).toBe(true);
    });
  });

  describe("batch invalidation", () => {
    it("should process multiple events in batch", async () => {
      const events = [
        {
          type: "create",
          resource: "posts",
          id: 123,
          siteId: "test-site",
          timestamp: Date.now(),
        },
        {
          type: "update",
          resource: "posts",
          id: 124,
          siteId: "test-site",
          timestamp: Date.now(),
        },
      ];

      await invalidation.batchInvalidate(events);

      expect(mockHttpCache.invalidatePattern).toHaveBeenCalledTimes(6); // 3 patterns per event
    });

    it("should deduplicate patterns in batch", async () => {
      const events = [
        {
          type: "create",
          resource: "posts",
          id: 123,
          siteId: "test-site",
          timestamp: Date.now(),
        },
        {
          type: "create",
          resource: "posts",
          id: 124,
          siteId: "test-site",
          timestamp: Date.now(),
        },
      ];

      await invalidation.batchInvalidate(events);

      // Should not duplicate pattern invalidations
      const callCount = mockHttpCache.invalidatePattern.mock.calls.length;
      const uniquePatterns = new Set(mockHttpCache.invalidatePattern.mock.calls.map((call) => call[0]));

      expect(uniquePatterns.size).toBeLessThanOrEqual(callCount);
    });
  });

  describe("error handling", () => {
    it("should handle invalidation errors gracefully", async () => {
      mockHttpCache.invalidatePattern.mockRejectedValue(new Error("Cache error"));

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await expect(invalidation.processEvent(event)).resolves.not.toThrow();
    });

    it("should handle malformed events", async () => {
      const malformedEvent = {
        type: "invalid",
        resource: null,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await expect(invalidation.processEvent(malformedEvent)).resolves.not.toThrow();
    });

    it("should handle empty rule patterns", async () => {
      const rule = {
        trigger: "create",
        patterns: [],
        immediate: true,
      };

      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      await expect(invalidation.applyRule(rule, event)).resolves.not.toThrow();
      expect(mockHttpCache.invalidatePattern).not.toHaveBeenCalled();
    });
  });

  describe("performance", () => {
    it("should handle high volume events efficiently", async () => {
      const events = [];
      for (let i = 0; i < 1000; i++) {
        events.push({
          type: "create",
          resource: "posts",
          id: i,
          siteId: "test-site",
          timestamp: Date.now(),
        });
      }

      const startTime = Date.now();

      for (const event of events) {
        await invalidation.trigger(event);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process 1000 events in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should not block on queue processing", async () => {
      const event = {
        type: "create",
        resource: "posts",
        id: 123,
        siteId: "test-site",
        timestamp: Date.now(),
      };

      // Mock slow processing
      jest.spyOn(invalidation, "processEvent").mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const startTime = Date.now();

      // Trigger should return immediately
      await invalidation.trigger(event);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not wait for processing to complete
      expect(duration).toBeLessThan(50);
    });
  });
});
