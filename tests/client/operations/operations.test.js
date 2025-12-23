/**
 * Tests for Client Operations Modules
 *
 * Tests the modular operation classes extracted from api.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostsOperations } from "../../../dist/client/operations/posts.js";
import { PagesOperations } from "../../../dist/client/operations/pages.js";
import { UsersOperations } from "../../../dist/client/operations/users.js";
import { CommentsOperations } from "../../../dist/client/operations/comments.js";
import { TaxonomiesOperations } from "../../../dist/client/operations/taxonomies.js";
import { SiteOperations } from "../../../dist/client/operations/site.js";

// Mock client factory
const createMockClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

describe("Operations Modules", () => {
  describe("PostsOperations", () => {
    let mockClient;
    let postsOps;

    beforeEach(() => {
      mockClient = createMockClient();
      postsOps = new PostsOperations(mockClient);
    });

    describe("getPosts", () => {
      it("should get posts without params", async () => {
        const mockPosts = [{ id: 1, title: { rendered: "Test Post" } }];
        mockClient.get.mockResolvedValue(mockPosts);

        const result = await postsOps.getPosts();

        expect(mockClient.get).toHaveBeenCalledWith("posts");
        expect(result).toEqual(mockPosts);
      });

      it("should get posts with query params", async () => {
        const mockPosts = [{ id: 1 }];
        mockClient.get.mockResolvedValue(mockPosts);

        await postsOps.getPosts({ per_page: "10", status: "publish" });

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("posts?"));
        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("per_page=10"));
      });
    });

    describe("getPost", () => {
      it("should get a single post by ID", async () => {
        const mockPost = { id: 1, title: { rendered: "Test" } };
        mockClient.get.mockResolvedValue(mockPost);

        const result = await postsOps.getPost(1);

        expect(mockClient.get).toHaveBeenCalledWith("posts/1?context=view");
        expect(result).toEqual(mockPost);
      });

      it("should get post with edit context", async () => {
        mockClient.get.mockResolvedValue({});

        await postsOps.getPost(1, "edit");

        expect(mockClient.get).toHaveBeenCalledWith("posts/1?context=edit");
      });
    });

    describe("createPost", () => {
      it("should create a new post", async () => {
        const newPost = { title: "New Post", content: "Content", status: "draft" };
        const createdPost = { id: 1, ...newPost };
        mockClient.post.mockResolvedValue(createdPost);

        const result = await postsOps.createPost(newPost);

        expect(mockClient.post).toHaveBeenCalledWith("posts", newPost);
        expect(result).toEqual(createdPost);
      });
    });

    describe("updatePost", () => {
      it("should update an existing post", async () => {
        const updateData = { id: 1, title: "Updated Title" };
        mockClient.put.mockResolvedValue({ id: 1, title: { rendered: "Updated Title" } });

        await postsOps.updatePost(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("posts/1", { title: "Updated Title" });
      });
    });

    describe("deletePost", () => {
      it("should delete a post", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        const result = await postsOps.deletePost(1);

        expect(mockClient.delete).toHaveBeenCalledWith("posts/1?force=false");
        expect(result.deleted).toBe(true);
      });

      it("should force delete a post", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await postsOps.deletePost(1, true);

        expect(mockClient.delete).toHaveBeenCalledWith("posts/1?force=true");
      });
    });

    describe("getPostRevisions", () => {
      it("should get post revisions", async () => {
        const revisions = [{ id: 10 }, { id: 9 }];
        mockClient.get.mockResolvedValue(revisions);

        const result = await postsOps.getPostRevisions(1);

        expect(mockClient.get).toHaveBeenCalledWith("posts/1/revisions");
        expect(result).toEqual(revisions);
      });
    });
  });

  describe("PagesOperations", () => {
    let mockClient;
    let pagesOps;

    beforeEach(() => {
      mockClient = createMockClient();
      pagesOps = new PagesOperations(mockClient);
    });

    describe("getPages", () => {
      it("should get pages without params", async () => {
        const mockPages = [{ id: 1, title: { rendered: "Test Page" } }];
        mockClient.get.mockResolvedValue(mockPages);

        const result = await pagesOps.getPages();

        expect(mockClient.get).toHaveBeenCalledWith("pages");
        expect(result).toEqual(mockPages);
      });

      it("should get pages with query params", async () => {
        mockClient.get.mockResolvedValue([]);

        await pagesOps.getPages({ parent: "0", per_page: "5" });

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("pages?"));
      });
    });

    describe("getPage", () => {
      it("should get a single page by ID", async () => {
        const mockPage = { id: 1, title: { rendered: "About" } };
        mockClient.get.mockResolvedValue(mockPage);

        const result = await pagesOps.getPage(1);

        expect(mockClient.get).toHaveBeenCalledWith("pages/1?context=view");
        expect(result).toEqual(mockPage);
      });
    });

    describe("createPage", () => {
      it("should create a new page", async () => {
        const newPage = { title: "New Page", content: "Content" };
        mockClient.post.mockResolvedValue({ id: 1, ...newPage });

        await pagesOps.createPage(newPage);

        expect(mockClient.post).toHaveBeenCalledWith("pages", newPage);
      });
    });

    describe("updatePage", () => {
      it("should update an existing page", async () => {
        const updateData = { id: 1, title: "Updated" };
        mockClient.put.mockResolvedValue({});

        await pagesOps.updatePage(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("pages/1", { title: "Updated" });
      });
    });

    describe("deletePage", () => {
      it("should delete a page", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await pagesOps.deletePage(1);

        expect(mockClient.delete).toHaveBeenCalledWith("pages/1?force=false");
      });
    });
  });

  describe("UsersOperations", () => {
    let mockClient;
    let usersOps;

    beforeEach(() => {
      mockClient = createMockClient();
      usersOps = new UsersOperations(mockClient);
    });

    describe("getUsers", () => {
      it("should get users", async () => {
        const mockUsers = [{ id: 1, name: "Admin" }];
        mockClient.get.mockResolvedValue(mockUsers);

        const result = await usersOps.getUsers();

        expect(mockClient.get).toHaveBeenCalledWith("users");
        expect(result).toEqual(mockUsers);
      });

      it("should get users with query params", async () => {
        mockClient.get.mockResolvedValue([]);

        await usersOps.getUsers({ roles: "administrator", per_page: "50" });

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("users?"));
        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("roles=administrator"));
      });
    });

    describe("getUser", () => {
      it("should get a user by ID", async () => {
        const mockUser = { id: 1, name: "Test User" };
        mockClient.get.mockResolvedValue(mockUser);

        const result = await usersOps.getUser(1);

        expect(mockClient.get).toHaveBeenCalledWith("users/1?context=view");
        expect(result).toEqual(mockUser);
      });
    });

    describe("getCurrentUser", () => {
      it("should get the current user", async () => {
        const mockUser = { id: 1, name: "Current User" };
        mockClient.get.mockResolvedValue(mockUser);

        const result = await usersOps.getCurrentUser();

        expect(mockClient.get).toHaveBeenCalledWith("users/me?context=edit");
        expect(result).toEqual(mockUser);
      });
    });

    describe("createUser", () => {
      it("should create a new user", async () => {
        const newUser = { username: "newuser", email: "test@test.com", password: "password123" };
        mockClient.post.mockResolvedValue({ id: 2, ...newUser });

        await usersOps.createUser(newUser);

        expect(mockClient.post).toHaveBeenCalledWith("users", newUser);
      });
    });

    describe("updateUser", () => {
      it("should update a user", async () => {
        const updateData = { id: 1, first_name: "Updated" };
        mockClient.put.mockResolvedValue({});

        await usersOps.updateUser(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("users/1", { first_name: "Updated" });
      });
    });

    describe("deleteUser", () => {
      it("should delete a user and reassign content", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await usersOps.deleteUser(2, 1);

        expect(mockClient.delete).toHaveBeenCalledWith("users/2?reassign=1&force=true");
      });
    });
  });

  describe("CommentsOperations", () => {
    let mockClient;
    let commentsOps;

    beforeEach(() => {
      mockClient = createMockClient();
      commentsOps = new CommentsOperations(mockClient);
    });

    describe("getComments", () => {
      it("should get comments", async () => {
        const mockComments = [{ id: 1, content: { rendered: "Test" } }];
        mockClient.get.mockResolvedValue(mockComments);

        const result = await commentsOps.getComments();

        expect(mockClient.get).toHaveBeenCalledWith("comments");
        expect(result).toEqual(mockComments);
      });

      it("should get comments with query params", async () => {
        mockClient.get.mockResolvedValue([]);

        await commentsOps.getComments({ post: "1", status: "approved" });

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("comments?"));
      });
    });

    describe("getComment", () => {
      it("should get a single comment", async () => {
        mockClient.get.mockResolvedValue({ id: 1 });

        await commentsOps.getComment(1);

        expect(mockClient.get).toHaveBeenCalledWith("comments/1?context=view");
      });
    });

    describe("createComment", () => {
      it("should create a comment", async () => {
        const newComment = { post: 1, content: "Great post!" };
        mockClient.post.mockResolvedValue({ id: 1, ...newComment });

        await commentsOps.createComment(newComment);

        expect(mockClient.post).toHaveBeenCalledWith("comments", newComment);
      });
    });

    describe("updateComment", () => {
      it("should update a comment", async () => {
        const updateData = { id: 1, content: "Updated comment" };
        mockClient.put.mockResolvedValue({});

        await commentsOps.updateComment(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("comments/1", { content: "Updated comment" });
      });
    });

    describe("deleteComment", () => {
      it("should delete a comment", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await commentsOps.deleteComment(1);

        expect(mockClient.delete).toHaveBeenCalledWith("comments/1?force=false");
      });
    });
  });

  describe("TaxonomiesOperations", () => {
    let mockClient;
    let taxonomiesOps;

    beforeEach(() => {
      mockClient = createMockClient();
      taxonomiesOps = new TaxonomiesOperations(mockClient);
    });

    describe("getCategories", () => {
      it("should get categories", async () => {
        const mockCategories = [{ id: 1, name: "Uncategorized" }];
        mockClient.get.mockResolvedValue(mockCategories);

        const result = await taxonomiesOps.getCategories();

        expect(mockClient.get).toHaveBeenCalledWith("categories");
        expect(result).toEqual(mockCategories);
      });
    });

    describe("getCategory", () => {
      it("should get a category by ID", async () => {
        mockClient.get.mockResolvedValue({ id: 1 });

        await taxonomiesOps.getCategory(1);

        expect(mockClient.get).toHaveBeenCalledWith("categories/1");
      });
    });

    describe("createCategory", () => {
      it("should create a category", async () => {
        const newCat = { name: "News", slug: "news" };
        mockClient.post.mockResolvedValue({ id: 2, ...newCat });

        await taxonomiesOps.createCategory(newCat);

        expect(mockClient.post).toHaveBeenCalledWith("categories", newCat);
      });
    });

    describe("updateCategory", () => {
      it("should update a category", async () => {
        const updateData = { id: 1, name: "Updated" };
        mockClient.put.mockResolvedValue({});

        await taxonomiesOps.updateCategory(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("categories/1", { name: "Updated" });
      });
    });

    describe("deleteCategory", () => {
      it("should delete a category", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await taxonomiesOps.deleteCategory(1);

        expect(mockClient.delete).toHaveBeenCalledWith("categories/1?force=false");
      });

      it("should force delete a category", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await taxonomiesOps.deleteCategory(1, true);

        expect(mockClient.delete).toHaveBeenCalledWith("categories/1?force=true");
      });
    });

    describe("getTags", () => {
      it("should get tags", async () => {
        mockClient.get.mockResolvedValue([{ id: 1, name: "Tag1" }]);

        await taxonomiesOps.getTags();

        expect(mockClient.get).toHaveBeenCalledWith("tags");
      });
    });

    describe("getTag", () => {
      it("should get a tag by ID", async () => {
        mockClient.get.mockResolvedValue({ id: 1 });

        await taxonomiesOps.getTag(1);

        expect(mockClient.get).toHaveBeenCalledWith("tags/1");
      });
    });

    describe("createTag", () => {
      it("should create a tag", async () => {
        const newTag = { name: "JavaScript" };
        mockClient.post.mockResolvedValue({ id: 1, ...newTag });

        await taxonomiesOps.createTag(newTag);

        expect(mockClient.post).toHaveBeenCalledWith("tags", newTag);
      });
    });

    describe("updateTag", () => {
      it("should update a tag", async () => {
        const updateData = { id: 1, name: "TypeScript" };
        mockClient.put.mockResolvedValue({});

        await taxonomiesOps.updateTag(updateData);

        expect(mockClient.put).toHaveBeenCalledWith("tags/1", { name: "TypeScript" });
      });
    });

    describe("deleteTag", () => {
      it("should delete a tag", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await taxonomiesOps.deleteTag(1);

        expect(mockClient.delete).toHaveBeenCalledWith("tags/1?force=false");
      });

      it("should force delete a tag", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        await taxonomiesOps.deleteTag(1, true);

        expect(mockClient.delete).toHaveBeenCalledWith("tags/1?force=true");
      });
    });
  });

  describe("SiteOperations", () => {
    let mockClient;
    let siteOps;

    beforeEach(() => {
      mockClient = createMockClient();
      siteOps = new SiteOperations(mockClient);
    });

    describe("getSiteSettings", () => {
      it("should get site settings", async () => {
        const settings = { title: "My Site", description: "A WordPress Site" };
        mockClient.get.mockResolvedValue(settings);

        const result = await siteOps.getSiteSettings();

        expect(mockClient.get).toHaveBeenCalledWith("settings");
        expect(result).toEqual(settings);
      });
    });

    describe("updateSiteSettings", () => {
      it("should update site settings", async () => {
        const updates = { title: "New Title" };
        mockClient.post.mockResolvedValue(updates);

        await siteOps.updateSiteSettings(updates);

        expect(mockClient.post).toHaveBeenCalledWith("settings", updates);
      });
    });

    describe("getSiteInfo", () => {
      it("should get site info", async () => {
        const info = { name: "My Site", url: "https://example.com" };
        mockClient.get.mockResolvedValue(info);

        const result = await siteOps.getSiteInfo();

        expect(mockClient.get).toHaveBeenCalledWith("");
        expect(result).toEqual(info);
      });
    });

    describe("getApplicationPasswords", () => {
      it("should get application passwords for current user", async () => {
        const passwords = [{ uuid: "abc123", name: "Test App" }];
        mockClient.get.mockResolvedValue(passwords);

        const result = await siteOps.getApplicationPasswords();

        expect(mockClient.get).toHaveBeenCalledWith("users/me/application-passwords");
        expect(result).toEqual(passwords);
      });

      it("should get application passwords for specific user", async () => {
        mockClient.get.mockResolvedValue([]);

        await siteOps.getApplicationPasswords(123);

        expect(mockClient.get).toHaveBeenCalledWith("users/123/application-passwords");
      });
    });

    describe("createApplicationPassword", () => {
      it("should create an application password", async () => {
        const newPassword = { uuid: "abc", name: "New App", password: "xxxx" };
        mockClient.post.mockResolvedValue(newPassword);

        const result = await siteOps.createApplicationPassword("me", "New App");

        expect(mockClient.post).toHaveBeenCalledWith("users/me/application-passwords", { name: "New App" });
        expect(result).toEqual(newPassword);
      });

      it("should create with app_id", async () => {
        mockClient.post.mockResolvedValue({});

        await siteOps.createApplicationPassword("me", "App", "my-app-id");

        expect(mockClient.post).toHaveBeenCalledWith("users/me/application-passwords", {
          name: "App",
          app_id: "my-app-id",
        });
      });
    });

    describe("deleteApplicationPassword", () => {
      it("should delete an application password", async () => {
        mockClient.delete.mockResolvedValue({ deleted: true });

        const result = await siteOps.deleteApplicationPassword("me", "uuid-123");

        expect(mockClient.delete).toHaveBeenCalledWith("users/me/application-passwords/uuid-123");
        expect(result.deleted).toBe(true);
      });
    });

    describe("search", () => {
      it("should search content", async () => {
        const results = [{ id: 1, title: "Found" }];
        mockClient.get.mockResolvedValue(results);

        const result = await siteOps.search("test");

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("search?"));
        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("search=test"));
        expect(result).toEqual(results);
      });

      it("should search with type filter", async () => {
        mockClient.get.mockResolvedValue([]);

        await siteOps.search("test", ["post", "page"]);

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("type=post"));
      });

      it("should search with subtype", async () => {
        mockClient.get.mockResolvedValue([]);

        await siteOps.search("test", undefined, "post");

        expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining("subtype=post"));
      });
    });

    describe("ping", () => {
      it("should return true when site is available", async () => {
        mockClient.get.mockResolvedValue({});

        const result = await siteOps.ping();

        expect(result).toBe(true);
      });

      it("should return false when site is unavailable", async () => {
        mockClient.get.mockRejectedValue(new Error("Connection failed"));

        const result = await siteOps.ping();

        expect(result).toBe(false);
      });
    });

    describe("getServerInfo", () => {
      it("should get server info", async () => {
        const info = { name: "WordPress", version: "6.0" };
        mockClient.get.mockResolvedValue(info);

        const result = await siteOps.getServerInfo();

        expect(mockClient.get).toHaveBeenCalledWith("");
        expect(result).toEqual(info);
      });
    });
  });
});
