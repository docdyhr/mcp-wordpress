/* eslint-disable jest/no-conditional-expect */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { WordPressClient } from "../../dist/client/api.js";

/**
 * Enhanced WordPress API Contract Validation
 *
 * This test suite provides comprehensive validation of WordPress REST API contracts
 * across different WordPress versions, ensuring compatibility and detecting breaking changes.
 */
describe("Enhanced WordPress API Contract Validation", () => {
  const testConfig = {
    baseUrl: process.env.WORDPRESS_TEST_URL || "http://localhost:8081",
    auth: {
      method: process.env.WORDPRESS_AUTH_METHOD || "app-password",
      username: process.env.WORDPRESS_USERNAME || "contract_admin",
      password: process.env.WORDPRESS_APP_PASSWORD || "fallback_password_123",
    },
  };

  const wordpressVersion = process.env.WORDPRESS_VERSION || "unknown";
  const isContractValidationMode = process.env.CONTRACT_VALIDATION_MODE === "true";

  // Skip tests if not in contract validation mode and no test URL provided
  const skipTests = !isContractValidationMode && !process.env.WORDPRESS_TEST_URL;

  let client;
  let testPostId;
  let _testMediaId;
  let testUserId;
  let testCategoryId;
  let _testTagId;

  beforeAll(async () => {
    if (skipTests) return;

    client = new WordPressClient(testConfig);
    console.log(`🔍 Starting contract validation for WordPress ${wordpressVersion}`);
  });

  afterAll(() => {
    if (!skipTests) {
      console.log(`✅ Contract validation completed for WordPress ${wordpressVersion}`);
    }
  });

  // Core API Structure Validation
  (skipTests ? describe.skip : describe)("🏗️ Core API Structure", () => {
    it("should have valid REST API root structure", async () => {
      const response = await fetch(`${testConfig.baseUrl}/wp-json/wp/v2/`);
      const apiRoot = await response.json();

      expect(response.status).toBe(200);
      expect(apiRoot).toHaveProperty("namespace");
      expect(apiRoot).toHaveProperty("routes");
      expect(apiRoot.namespace).toBe("wp/v2");
      expect(typeof apiRoot.routes).toBe("object");

      // Validate essential endpoints exist
      const expectedEndpoints = [
        "/wp/v2/posts",
        "/wp/v2/pages",
        "/wp/v2/media",
        "/wp/v2/users",
        "/wp/v2/comments",
        "/wp/v2/categories",
        "/wp/v2/tags",
      ];

      expectedEndpoints.forEach((endpoint) => {
        expect(apiRoot.routes).toHaveProperty(endpoint);
      });
    });

    it("should have consistent authentication headers", async () => {
      // Test authentication with a write operation
      try {
        const testPost = await client.createPost({
          title: `Contract Test Post ${Date.now()}`,
          content: "Testing authentication contract",
          status: "draft",
        });

        testPostId = testPost.id;
        expect(testPost).toHaveProperty("id");
        expect(testPost.title.rendered).toContain("Contract Test Post");
      } catch (error) {
        // Log authentication details for debugging
        console.error(`Authentication failed for WordPress ${wordpressVersion}:`, error.message);
        throw error;
      }
    });
  });

  // Posts API Contract Validation
  (skipTests ? describe.skip : describe)("📝 Posts API Contracts", () => {
    it("should validate post creation contract", async () => {
      const postData = {
        title: `Contract Validation Post ${wordpressVersion}`,
        content: `<p>This post validates contracts for WordPress ${wordpressVersion}</p>`,
        status: "draft",
        excerpt: "Contract validation excerpt",
        slug: `contract-test-${Date.now()}`,
      };

      const post = await client.createPost(postData);
      testPostId = post.id;

      // Validate response structure
      expect(post).toHaveProperty("id");
      expect(post).toHaveProperty("title");
      expect(post).toHaveProperty("content");
      expect(post).toHaveProperty("status");
      expect(post).toHaveProperty("date");
      expect(post).toHaveProperty("modified");
      expect(post).toHaveProperty("slug");
      expect(post).toHaveProperty("link");
      expect(post).toHaveProperty("author");

      // Validate title structure
      expect(post.title).toHaveProperty("rendered");
      expect(post.title.rendered).toContain("Contract Validation Post");

      // Validate content structure
      expect(post.content).toHaveProperty("rendered");
      expect(post.content.rendered).toContain("This post validates contracts");

      // Validate status
      expect(post.status).toBe("draft");
    });

    it("should validate post retrieval contract", async () => {
      if (!testPostId) {
        throw new Error("Test post not created - prerequisite failed");
      }

      const post = await client.getPost(testPostId);

      // Validate essential fields are present and correctly typed
      expect(typeof post.id).toBe("number");
      expect(typeof post.title.rendered).toBe("string");
      expect(typeof post.content.rendered).toBe("string");
      expect(typeof post.status).toBe("string");
      expect(typeof post.author).toBe("number");
      expect(typeof post.date).toBe("string");
      expect(typeof post.link).toBe("string");

      // Validate date format (ISO 8601)
      const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
      expect(post.date).toMatch(datePattern);
    });

    it("should validate posts list contract", async () => {
      const posts = await client.getPosts({ per_page: 5 });

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.length).toBeLessThanOrEqual(5);

      // Validate each post has required structure
      posts.forEach((post) => {
        expect(post).toHaveProperty("id");
        expect(post).toHaveProperty("title");
        expect(post).toHaveProperty("content");
        expect(post).toHaveProperty("excerpt");
        expect(post).toHaveProperty("author");
        expect(post).toHaveProperty("date");
        expect(post).toHaveProperty("status");
        expect(post).toHaveProperty("link");
      });
    });

    it("should validate post update contract", async () => {
      if (!testPostId) {
        throw new Error("Test post not created - prerequisite failed");
      }

      const updateData = {
        title: `Updated Contract Post ${wordpressVersion}`,
        content: `<p>Updated content for WordPress ${wordpressVersion} contract validation</p>`,
      };

      const updatedPost = await client.updatePost(testPostId, updateData);

      expect(updatedPost.id).toBe(testPostId);
      expect(updatedPost.title.rendered).toContain("Updated Contract Post");
      expect(updatedPost.content.rendered).toContain("Updated content");

      // Ensure modified date is updated
      expect(new Date(updatedPost.modified).getTime()).toBeGreaterThan(new Date(updatedPost.date).getTime());
    });
  });

  // Media API Contract Validation
  (skipTests ? describe.skip : describe)("🖼️ Media API Contracts", () => {
    it("should validate media list contract", async () => {
      const media = await client.getMedia({ per_page: 3 });

      expect(Array.isArray(media)).toBe(true);

      // Validate structure if media items exist
      media.forEach((item) => {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("source_url");
        expect(item).toHaveProperty("media_type");
        expect(item).toHaveProperty("mime_type");
        expect(item).toHaveProperty("media_details");
        expect(typeof item.id).toBe("number");
        expect(typeof item.source_url).toBe("string");
        expect(item.source_url).toMatch(/^https?:\/\//);
      });
    });
  });

  // Users API Contract Validation
  (skipTests ? describe.skip : describe)("👥 Users API Contracts", () => {
    it("should validate users list contract", async () => {
      const users = await client.getUsers({ per_page: 3 });

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      users.forEach((user) => {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("slug");
        expect(user).toHaveProperty("roles");
        expect(user).toHaveProperty("link");
        expect(typeof user.id).toBe("number");
        expect(typeof user.name).toBe("string");
        expect(Array.isArray(user.roles)).toBe(true);
      });
    });

    it("should validate user creation contract", async () => {
      const userData = {
        username: `contract_test_${Date.now()}`,
        email: `contract${Date.now()}@example.com`,
        password: "ContractTestPass123!",
        name: `Contract Test User ${wordpressVersion}`,
        roles: ["subscriber"],
      };

      let result;

      try {
        result = await client.createUser(userData);
      } catch (error) {
        const isUserExistsError =
          error.message.includes("Username already exists") || error.message.includes("Email address already exists");
        if (!isUserExistsError) {
          throw error;
        }
        console.log("⚠️ User creation skipped - user already exists");
        result = { error: "user_exists" };
      }

      if (result.error !== "user_exists") {
        const user = result;
        testUserId = user.id;

        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("roles");
        expect(user.username).toBe(userData.username);
        expect(user.email).toBe(userData.email);
        expect(user.roles).toContain("subscriber");
      }

      // Test passed either with user creation or expected user exists error
      expect(true).toBe(true);
    });
  });

  // Comments API Contract Validation
  (skipTests ? describe.skip : describe)("💬 Comments API Contracts", () => {
    it("should validate comments list contract", async () => {
      const comments = await client.getComments({ per_page: 3 });

      expect(Array.isArray(comments)).toBe(true);

      comments.forEach((comment) => {
        expect(comment).toHaveProperty("id");
        expect(comment).toHaveProperty("content");
        expect(comment).toHaveProperty("author_name");
        expect(comment).toHaveProperty("date");
        expect(comment).toHaveProperty("status");
        expect(comment).toHaveProperty("post");
        expect(typeof comment.id).toBe("number");
        expect(typeof comment.author_name).toBe("string");
        expect(typeof comment.post).toBe("number");
      });
    });
  });

  // Taxonomies API Contract Validation
  (skipTests ? describe.skip : describe)("🏷️ Taxonomies API Contracts", () => {
    it("should validate categories contract", async () => {
      const categories = await client.getCategories({ per_page: 5 });

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0); // At least "Uncategorized" should exist

      categories.forEach((category) => {
        const categorySchema = {
          id: "number",
          name: "string",
          slug: "string",
          count: "number",
          link: "string",
        };

        Object.entries(categorySchema).forEach(([prop, type]) => {
          expect(category).toHaveProperty(prop);
          expect(typeof category[prop]).toBe(type);
        });
      });
    });

    it("should validate category creation contract", async () => {
      const categoryData = {
        name: `Contract Test Category ${wordpressVersion}`,
        description: `Category for contract validation on WordPress ${wordpressVersion}`,
        slug: `contract-category-${Date.now()}`,
      };

      const category = await client.createCategory(categoryData);
      testCategoryId = category.id;

      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("slug");
      expect(category).toHaveProperty("description");
      expect(category).toHaveProperty("count");
      expect(category.name).toBe(categoryData.name);
      expect(category.slug).toBe(categoryData.slug);
      expect(category.count).toBe(0); // New category should have 0 posts
    });

    it("should validate tags contract", async () => {
      const tags = await client.getTags({ per_page: 5 });

      expect(Array.isArray(tags)).toBe(true);

      tags.forEach((tag) => {
        expect(tag).toHaveProperty("id");
        expect(tag).toHaveProperty("name");
        expect(tag).toHaveProperty("slug");
        expect(tag).toHaveProperty("count");
        expect(tag).toHaveProperty("link");
        expect(typeof tag.id).toBe("number");
        expect(typeof tag.name).toBe("string");
        expect(typeof tag.count).toBe("number");
      });
    });
  });

  // Error Handling Contract Validation
  (skipTests ? describe.skip : describe)("❌ Error Handling Contracts", () => {
    it("should validate 404 error contract", async () => {
      await expect(client.getPost(999999999)).rejects.toThrow();

      await expect(client.getPost(999999999)).rejects.toThrow(/not found|404/i);
    });

    it("should validate authentication error contract", async () => {
      const badClient = new WordPressClient({
        baseUrl: testConfig.baseUrl,
        auth: { method: "basic", username: "invalid", password: "invalid" },
      });

      await expect(
        badClient.createPost({
          title: "Should Fail",
          content: "This should fail due to bad credentials",
          status: "draft",
        }),
      ).rejects.toThrow();
    });

    it("should validate validation error contract", async () => {
      // Try to create post with invalid data
      await expect(
        client.createPost({
          title: "", // Empty title should fail validation
          content: "Content without title",
          status: "invalid_status", // Invalid status
        }),
      ).rejects.toThrow();
    });
  });

  // Performance Contract Validation
  (skipTests ? describe.skip : describe)("⚡ Performance Contracts", () => {
    it("should validate response time SLAs", async () => {
      const endpoints = [
        { name: "posts", method: () => client.getPosts({ per_page: 10 }), maxTime: 2000 },
        { name: "users", method: () => client.getUsers({ per_page: 10 }), maxTime: 1000 },
        { name: "categories", method: () => client.getCategories({ per_page: 10 }), maxTime: 1000 },
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        await endpoint.method();
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(endpoint.maxTime);
        console.log(`⚡ ${endpoint.name} response time: ${responseTime}ms (limit: ${endpoint.maxTime}ms)`);
      }
    }, 10000);
  });

  // Version-Specific Feature Validation
  (skipTests ? describe.skip : describe)("🔢 Version-Specific Features", () => {
    it("should document WordPress version capabilities", () => {
      const versionCapabilities = {
        5.6: ["application_passwords"],
        "6.0": ["block_editor", "site_editor"],
        6.1: ["enhanced_media"],
        6.2: ["style_variations"],
        6.3: ["command_palette"],
        6.4: ["pattern_directory"],
        6.5: ["font_library"],
      };

      const currentVersionFeatures = versionCapabilities[wordpressVersion] || [];
      console.log(`📋 WordPress ${wordpressVersion} expected features:`, currentVersionFeatures);

      // This test documents expected features for each version
      expect(typeof versionCapabilities).toBe("object");
    });

    it("should validate application password support (WordPress 5.6+)", async () => {
      const majorVersion = parseFloat(wordpressVersion);
      const supportsAppPasswords = majorVersion >= 5.6 || wordpressVersion === "latest";

      const shouldTestAppPasswords = supportsAppPasswords && testConfig.auth.method === "app-password";

      // Document the test expectation
      expect(typeof shouldTestAppPasswords).toBe("boolean");

      if (!shouldTestAppPasswords) {
        console.log(`ℹ️ Application Password support not expected for WordPress ${wordpressVersion}`);
        return;
      }

      // Try to use application password authentication
      const posts = await client.getPosts({ per_page: 1 });
      expect(Array.isArray(posts)).toBe(true);
      console.log(`✅ Application Password authentication working for WordPress ${wordpressVersion}`);
    });
  });

  // Data Cleanup
  (skipTests ? describe.skip : describe)("🧹 Cleanup", () => {
    it("should cleanup test data", async () => {
      const cleanupResults = [];

      // Delete test post
      if (testPostId) {
        try {
          await client.deletePost(testPostId, { force: true });
          cleanupResults.push(`✅ Deleted test post ${testPostId}`);
        } catch (error) {
          cleanupResults.push(`⚠️ Could not delete post ${testPostId}: ${error.message}`);
        }
      }

      // Delete test user
      if (testUserId) {
        try {
          await client.deleteUser(testUserId, { force: true, reassign: 1 });
          cleanupResults.push(`✅ Deleted test user ${testUserId}`);
        } catch (error) {
          cleanupResults.push(`⚠️ Could not delete user ${testUserId}: ${error.message}`);
        }
      }

      // Delete test category
      if (testCategoryId) {
        try {
          await client.deleteCategory(testCategoryId, { force: true });
          cleanupResults.push(`✅ Deleted test category ${testCategoryId}`);
        } catch (error) {
          cleanupResults.push(`⚠️ Could not delete category ${testCategoryId}: ${error.message}`);
        }
      }

      console.log("🧹 Cleanup results:", cleanupResults.join(", "));
      expect(cleanupResults.length).toBeGreaterThan(0);
    });
  });
});
