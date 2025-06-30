import { describe, it, expect, beforeAll } from '@jest/globals';
import { WordPressClient } from '../../dist/client/api.js';

/**
 * Live contract testing for WordPress REST API
 * Tests against a real WordPress instance to validate API contracts
 */
describe('WordPress API Live Contract Tests', () => {
  let wordpressClient;

  beforeAll(async () => {
    console.log('🌐 Running live contract tests against WordPress instance');

    // Use live WordPress configuration with flexible auth
    const authConfig = {
      method: process.env.WORDPRESS_AUTH_METHOD || 'app-password',
      username: process.env.WORDPRESS_USERNAME || 'testuser'
    };

    // Set the appropriate password field based on auth method
    if (authConfig.method === 'basic') {
      authConfig.password = process.env.WORDPRESS_APP_PASSWORD;
    } else {
      authConfig.appPassword = process.env.WORDPRESS_APP_PASSWORD;
    }

    wordpressClient = new WordPressClient({
      baseUrl: process.env.WORDPRESS_TEST_URL || 'http://localhost:8081',
      auth: authConfig
    });

    // Verify live WordPress is accessible
    try {
      const response = await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/`
      );
      if (!response.ok) {
        throw new Error(`WordPress not accessible: ${response.status}`);
      }
      console.log('✅ Live WordPress instance is accessible');
    } catch (error) {
      throw new Error(`Failed to connect to live WordPress: ${error.message}`);
    }
  });

  describe('Posts API Contract', () => {
    it('should create a post with valid response format', async () => {
      const postData = {
        title: 'Contract Test Post',
        content: 'This is a test post for contract validation',
        status: 'publish'
      };

      const result = await wordpressClient.createPost(postData);

      // Verify the response structure matches our contract
      expect(result).toMatchObject({
        id: expect.any(Number),
        title: {
          rendered: expect.any(String)
        },
        content: {
          rendered: expect.any(String)
        },
        status: expect.any(String),
        author: expect.any(Number)
      });

      // Verify the data we sent is reflected
      expect(result.title.rendered).toContain('Contract Test Post');
      expect(result.status).toBe('publish');
    });

    it('should retrieve posts with correct pagination format', async () => {
      const result = await wordpressClient.getPosts({ page: 1, per_page: 10 });

      expect(Array.isArray(result)).toBe(true);

      // Should always have at least one post (created during setup)
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: expect.any(Number),
        title: {
          rendered: expect.any(String)
        },
        content: {
          rendered: expect.any(String)
        },
        status: expect.any(String)
      });
    });

    it('should handle post not found error correctly', async () => {
      await expect(wordpressClient.getPost(999999)).rejects.toThrow();
    });
  });

  describe('REST API Discovery', () => {
    it('should return valid API index', async () => {
      const response = await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/`
      );
      expect(response.ok).toBe(true);

      const apiIndex = await response.json();
      expect(apiIndex).toHaveProperty('namespace');
      expect(apiIndex).toHaveProperty('routes');
    });

    it('should have required endpoints available', async () => {
      const response = await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/`
      );
      const apiIndex = await response.json();

      // Check that key endpoints are available
      expect(apiIndex.routes).toHaveProperty('/wp/v2/posts');
      expect(apiIndex.routes).toHaveProperty('/wp/v2/pages');
      expect(apiIndex.routes).toHaveProperty('/wp/v2/users');
    });
  });

  describe('Authentication Contract', () => {
    it('should authenticate successfully with valid credentials', async () => {
      // Test authentication by trying to create a draft post (requires authentication and write permissions)
      const authHeader = `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`;

      const testPostData = {
        title: 'Auth Test Post',
        content: 'Testing authentication',
        status: 'draft'
      };

      const response = await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testPostData)
        }
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);

      const post = await response.json();
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post.title.rendered).toContain('Auth Test Post');

      // Clean up: delete the test post
      await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/posts/${post.id}?force=true`,
        {
          method: 'DELETE',
          headers: {
            Authorization: authHeader
          }
        }
      );
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(
        `${wordpressClient.config.baseUrl}/wp-json/wp/v2/users/me`,
        {
          headers: {
            Authorization: 'Basic aW52YWxpZDppbnZhbGlk' // invalid:invalid
          }
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Content Management Contract', () => {
    let createdPostId;

    it('should create, read, update, and delete posts', async () => {
      // Create
      const createData = {
        title: 'CRUD Test Post',
        content: 'Original content',
        status: 'draft'
      };

      const created = await wordpressClient.createPost(createData);
      expect(created.id).toBeDefined();
      createdPostId = created.id;

      // Read
      const read = await wordpressClient.getPost(createdPostId);
      expect(read.id).toBe(createdPostId);
      expect(read.title.rendered).toContain('CRUD Test Post');

      // Update
      const updated = await wordpressClient.updatePost({
        id: createdPostId,
        content: 'Updated content',
        status: 'publish'
      });
      expect(updated.content.rendered).toContain('Updated content');
      expect(updated.status).toBe('publish');

      // Delete
      const deleted = await wordpressClient.deletePost(createdPostId, true);
      expect(deleted.deleted).toBe(true);
    });
  });
});
