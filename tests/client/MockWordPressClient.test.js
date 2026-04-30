/**
 * Tests for MockWordPressClient
 */

import { describe, it, expect } from "vitest";
import { MockWordPressClient } from "@/client/MockWordPressClient.js";

const config = {
  baseUrl: "https://demo.wordpress.com",
  auth: { method: "app-password", username: "admin", appPassword: "test pass word" },
};

describe("MockWordPressClient", () => {
  let client;

  beforeEach(() => {
    client = new MockWordPressClient(config);
  });

  describe("authenticate()", () => {
    it("returns true without making network calls", async () => {
      expect(await client.authenticate()).toBe(true);
    });
  });

  describe("getSiteUrl()", () => {
    it("returns the mock demo URL", () => {
      expect(client.getSiteUrl()).toBe("https://demo.wordpress.com");
    });
  });

  describe("getPosts()", () => {
    it("returns an array of mock posts", async () => {
      const posts = await client.getPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
    });

    it("each post has required fields", async () => {
      const posts = await client.getPosts();
      for (const post of posts) {
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
      }
    });

    it("respects per_page param", async () => {
      const posts = await client.getPosts({ per_page: 1 });
      expect(posts).toHaveLength(1);
    });

    it("returns all posts when no per_page set", async () => {
      const posts = await client.getPosts();
      expect(posts.length).toBe(3);
    });
  });

  describe("getPost()", () => {
    it("returns a mock post for a given id", async () => {
      const post = await client.getPost(42);
      expect(post.id).toBe(42);
      expect(post.title.rendered).toContain("42");
    });

    it("throws for id 999999 (sentinel error id)", async () => {
      await expect(client.getPost(999999)).rejects.toThrow("Invalid post ID.");
    });
  });

  describe("getCurrentUser()", () => {
    it("returns mock user object", async () => {
      const user = await client.getCurrentUser();
      expect(user.id).toBe(1);
      expect(user.name).toBeDefined();
      expect(user.roles).toContain("administrator");
    });
  });

  describe("getSiteSettings()", () => {
    it("returns mock site settings", async () => {
      const settings = await client.getSiteSettings();
      expect(settings.title).toBeDefined();
      expect(settings.url).toBeDefined();
    });
  });

  describe("createPost()", () => {
    it("returns a mock post with the provided title", async () => {
      const post = await client.createPost({ title: "My New Post" });
      expect(post.title.rendered).toBe("My New Post");
    });

    it("uses provided status", async () => {
      const post = await client.createPost({ title: "Draft Post", status: "draft" });
      expect(post.status).toBe("draft");
    });

    it("defaults status to publish when not provided", async () => {
      const post = await client.createPost({ title: "Published" });
      expect(post.status).toBe("publish");
    });

    it("returns a post with a positive id", async () => {
      const post = await client.createPost({ title: "Test" });
      expect(post.id).toBeGreaterThan(0);
    });
  });

  describe("updatePost()", () => {
    it("returns a mock post with the given id", async () => {
      const post = await client.updatePost({ id: 5, title: "Updated" });
      expect(post.id).toBe(5);
      expect(post.title.rendered).toBe("Updated");
    });

    it("sets modified timestamp", async () => {
      const post = await client.updatePost({ id: 1 });
      expect(post.modified).toBeDefined();
    });
  });

  describe("search()", () => {
    it("returns results for a non-empty query", async () => {
      const results = await client.search("hello");
      expect(results.length).toBeGreaterThan(0);
    });

    it("each result contains the search query in title", async () => {
      const results = await client.search("wordpress");
      for (const r of results) {
        expect(r.title).toContain("wordpress");
      }
    });

    it("returns empty array for empty query", async () => {
      const results = await client.search("");
      expect(results).toHaveLength(0);
    });

    it("accepts optional types parameter", async () => {
      const results = await client.search("test", ["post"]);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("deletePost()", () => {
    it("returns deleted: true", async () => {
      const result = await client.deletePost(1);
      expect(result.deleted).toBe(true);
    });

    it("returns the previous post data", async () => {
      const result = await client.deletePost(10);
      expect(result.previous).toBeDefined();
      expect(result.previous?.id).toBe(10);
    });

    it("accepts force parameter without error", async () => {
      const result = await client.deletePost(1, true);
      expect(result.deleted).toBe(true);
    });
  });
});
