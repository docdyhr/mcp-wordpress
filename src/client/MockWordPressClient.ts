import { WordPressClient } from "./api.js";
import { WordPressClientConfig } from "../types/client.js";
import { LoggerFactory } from "../utils/logger.js";
import type {
  WordPressPost,
  WordPressUser,
  WordPressSiteSettings,
  PostQueryParams,
  CreatePostRequest,
  UpdatePostRequest,
} from "../types/wordpress.js";

/**
 * Mock WordPress client for CI environments
 * Provides realistic responses without connecting to actual WordPress
 */
export class MockWordPressClient extends WordPressClient {
  private isMockMode = true;
  private logger = LoggerFactory.api("mock");

  constructor(config: WordPressClientConfig) {
    super(config);
  }

  /**
   * Override authenticate to not make actual requests
   */
  async authenticate(): Promise<boolean> {
    this.logger.info("Mock authentication - skipping actual connection");
    return true;
  }

  /**
   * Mock getPosts with realistic data
   */
  async getPosts(params?: PostQueryParams): Promise<WordPressPost[]> {
    const mockPosts: WordPressPost[] = [
      {
        id: 1,
        date: "2024-01-15T10:00:00",
        date_gmt: "2024-01-15T10:00:00",
        guid: { rendered: "https://demo.wordpress.com/?p=1" },
        modified: "2024-01-15T10:00:00",
        modified_gmt: "2024-01-15T10:00:00",
        slug: "hello-world",
        status: "publish",
        type: "post",
        link: "https://demo.wordpress.com/hello-world/",
        title: { rendered: "Hello World - Demo Post" },
        content: { rendered: "<p>This is a demo post for CI testing.</p>" },
        excerpt: { rendered: "<p>This is a demo post for CI testing.</p>" },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1],
        tags: [],
      },
      {
        id: 2,
        date: "2024-01-16T12:00:00",
        date_gmt: "2024-01-16T12:00:00",
        guid: { rendered: "https://demo.wordpress.com/?p=2" },
        modified: "2024-01-16T12:00:00",
        modified_gmt: "2024-01-16T12:00:00",
        slug: "sample-post",
        status: "publish",
        type: "post",
        link: "https://demo.wordpress.com/sample-post/",
        title: { rendered: "Sample Post for Testing" },
        content: { rendered: "<p>This is another demo post with sample content.</p>" },
        excerpt: { rendered: "<p>This is another demo post with sample content.</p>" },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1],
        tags: [1],
      },
      {
        id: 3,
        date: "2024-01-17T14:30:00",
        date_gmt: "2024-01-17T14:30:00",
        guid: { rendered: "https://demo.wordpress.com/?p=3" },
        modified: "2024-01-17T14:30:00",
        modified_gmt: "2024-01-17T14:30:00",
        slug: "latest-news",
        status: "publish",
        type: "post",
        link: "https://demo.wordpress.com/latest-news/",
        title: { rendered: "Latest News Update" },
        content: { rendered: "<p>This is the latest news update for demonstration.</p>" },
        excerpt: { rendered: "<p>This is the latest news update for demonstration.</p>" },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1, 2],
        tags: [1, 2],
      },
    ];

    // Apply basic filtering based on params
    let filteredPosts = mockPosts;
    if (params?.per_page) {
      filteredPosts = filteredPosts.slice(0, parseInt(params.per_page.toString()));
    }

    return filteredPosts;
  }

  /**
   * Mock getPost with realistic data
   */
  async getPost(id: number): Promise<WordPressPost> {
    if (id === 999999) {
      throw new Error("Invalid post ID.");
    }

    const mockPost: WordPressPost = {
      id: id,
      date: "2024-01-15T10:00:00",
      date_gmt: "2024-01-15T10:00:00",
      guid: { rendered: `https://demo.wordpress.com/?p=${id}` },
      modified: "2024-01-15T10:00:00",
      modified_gmt: "2024-01-15T10:00:00",
      slug: `demo-post-${id}`,
      status: "publish",
      type: "post",
      link: `https://demo.wordpress.com/demo-post-${id}/`,
      title: { rendered: `Demo Post ${id}` },
      content: { rendered: `<p>This is demo content for post ${id}.</p>` },
      excerpt: { rendered: `<p>This is demo content for post ${id}.</p>` },
      author: 1,
      featured_media: 0,
      comment_status: "open",
      ping_status: "open",
      sticky: false,
      template: "",
      format: "standard",
      meta: [],
      categories: [1],
      tags: [],
    };

    return mockPost;
  }

  /**
   * Mock getCurrentUser with realistic data
   */
  async getCurrentUser(): Promise<WordPressUser> {
    const mockUser: WordPressUser = {
      id: 1,
      name: "CI Demo User",
      username: "ci-demo-user",
      first_name: "CI",
      last_name: "Demo",
      slug: "ci-demo-user",
      email: "demo@example.com",
      url: "https://demo.wordpress.com",
      description: "Demo user for CI testing",
      link: "https://demo.wordpress.com/author/ci-demo-user/",
      locale: "en_US",
      nickname: "CI Demo",
      registered_date: "2024-01-01T00:00:00+00:00",
      roles: ["administrator"],
      capabilities: {
        read: true,
        level_0: true,
        level_1: true,
        level_2: true,
        level_3: true,
        level_4: true,
        level_5: true,
        level_6: true,
        level_7: true,
        level_8: true,
        level_9: true,
        level_10: true,
        delete_others_pages: true,
        delete_others_posts: true,
        delete_pages: true,
        delete_posts: true,
        delete_private_pages: true,
        delete_private_posts: true,
        delete_published_pages: true,
        delete_published_posts: true,
        edit_dashboard: true,
        edit_others_pages: true,
        edit_others_posts: true,
        edit_pages: true,
        edit_posts: true,
        edit_private_pages: true,
        edit_private_posts: true,
        edit_published_pages: true,
        edit_published_posts: true,
        edit_theme_options: true,
        export: true,
        import: true,
        list_users: true,
        manage_categories: true,
        manage_links: true,
        manage_options: true,
        moderate_comments: true,
        promote_users: true,
        publish_pages: true,
        publish_posts: true,
        read_private_pages: true,
        read_private_posts: true,
        remove_users: true,
        switch_themes: true,
        upload_files: true,
        customize: true,
        delete_site: true,
      },
      extra_capabilities: {
        administrator: true,
      },
      avatar_urls: {
        "24": "https://secure.gravatar.com/avatar/example?s=24&d=mm&r=g",
        "48": "https://secure.gravatar.com/avatar/example?s=48&d=mm&r=g",
        "96": "https://secure.gravatar.com/avatar/example?s=96&d=mm&r=g",
      },
      meta: [],
    };

    return mockUser;
  }

  /**
   * Mock getSiteSettings with realistic data
   */
  async getSiteSettings(): Promise<WordPressSiteSettings> {
    const mockSettings: WordPressSiteSettings = {
      title: "Demo WordPress Site",
      description: "A demonstration site for CI testing",
      url: "https://demo.wordpress.com",
      email: "admin@demo.wordpress.com",
      timezone: "UTC",
      date_format: "F j, Y",
      time_format: "g:i a",
      start_of_week: 1,
      language: "en_US",
      use_smilies: true,
      default_category: 1,
      default_post_format: "0",
      posts_per_page: 10,
      default_ping_status: "open",
      default_comment_status: "open",
    };

    return mockSettings;
  }

  /**
   * Mock createPost
   */
  async createPost(data: CreatePostRequest): Promise<WordPressPost> {
    const mockPost: WordPressPost = {
      id: Math.floor(Math.random() * 1000) + 100,
      date: new Date().toISOString(),
      date_gmt: new Date().toISOString(),
      guid: { rendered: `https://demo.wordpress.com/?p=${Math.floor(Math.random() * 1000) + 100}` },
      modified: new Date().toISOString(),
      modified_gmt: new Date().toISOString(),
      slug: data.title?.toLowerCase().replace(/\s+/g, "-") || "new-post",
      status: data.status || "publish",
      type: "post",
      link: `https://demo.wordpress.com/${data.title?.toLowerCase().replace(/\s+/g, "-") || "new-post"}/`,
      title: { rendered: data.title || "New Post" },
      content: { rendered: data.content || "<p>New post content</p>" },
      excerpt: { rendered: data.excerpt || "<p>New post excerpt</p>" },
      author: 1,
      featured_media: 0,
      comment_status: "open",
      ping_status: "open",
      sticky: false,
      template: "",
      format: "standard",
      meta: [],
      categories: [1],
      tags: [],
    };

    return mockPost;
  }

  /**
   * Mock updatePost
   */
  async updatePost(data: UpdatePostRequest): Promise<WordPressPost> {
    const mockPost: WordPressPost = {
      id: data.id,
      date: "2024-01-15T10:00:00",
      date_gmt: "2024-01-15T10:00:00",
      guid: { rendered: `https://demo.wordpress.com/?p=${data.id}` },
      modified: new Date().toISOString(),
      modified_gmt: new Date().toISOString(),
      slug: data.title?.toLowerCase().replace(/\s+/g, "-") || `post-${data.id}`,
      status: data.status || "publish",
      type: "post",
      link: `https://demo.wordpress.com/${data.title?.toLowerCase().replace(/\s+/g, "-") || `post-${data.id}`}/`,
      title: { rendered: data.title || `Updated Post ${data.id}` },
      content: { rendered: data.content || "<p>Updated content</p>" },
      excerpt: { rendered: data.excerpt || "<p>Updated excerpt</p>" },
      author: 1,
      featured_media: 0,
      comment_status: "open",
      ping_status: "open",
      sticky: false,
      template: "",
      format: "standard",
      meta: [],
      categories: [1],
      tags: [],
    };

    return mockPost;
  }

  /**
   * Mock search
   */
  async search(query: string, types?: string[], subtype?: string): Promise<any[]> {
    if (!query) {
      return [];
    }

    return [
      {
        id: 1,
        title: `Search Result for "${query}"`,
        url: `https://demo.wordpress.com/search-result-1/`,
        type: "post",
        subtype: "post",
      },
      {
        id: 2,
        title: `Another result for "${query}"`,
        url: `https://demo.wordpress.com/search-result-2/`,
        type: "post",
        subtype: "post",
      },
    ];
  }

  /**
   * Mock deletePost
   */
  async deletePost(id: number, force = false): Promise<{ deleted: boolean; previous?: WordPressPost }> {
    return {
      deleted: true,
      previous: {
        id,
        date: "2024-01-15T10:00:00",
        date_gmt: "2024-01-15T10:00:00",
        guid: { rendered: `https://demo.wordpress.com/?p=${id}` },
        modified: "2024-01-15T10:00:00",
        modified_gmt: "2024-01-15T10:00:00",
        slug: `deleted-post-${id}`,
        status: "trash",
        type: "post",
        link: `https://demo.wordpress.com/deleted-post-${id}/`,
        title: { rendered: `Deleted Post ${id}` },
        content: { rendered: `<p>This post was deleted.</p>` },
        excerpt: { rendered: `<p>This post was deleted.</p>` },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1],
        tags: [],
      },
    };
  }

  /**
   * Override getSiteUrl to return mock URL
   */
  getSiteUrl(): string {
    return "https://demo.wordpress.com";
  }
}
