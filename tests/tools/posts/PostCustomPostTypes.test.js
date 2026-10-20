import { describe, expect, it, vi } from "vitest";
import { PostTools } from "../../../dist/tools/posts/index.js";

const post = {
  id: 12,
  date: "2026-01-01T00:00:00",
  modified: "2026-01-02T00:00:00",
  status: "draft",
  link: "https://example.com/product",
  title: { rendered: "Product" },
  content: { rendered: "<p>Product details</p>" },
  excerpt: { rendered: "" },
  author: 0,
  categories: [],
  tags: [],
};

function createClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getSiteUrl: vi.fn().mockReturnValue("https://example.com"),
  };
}

describe("PostTools custom post types", () => {
  const tools = new PostTools();

  it("exposes post_type as an optional parameter on the five CRUD tools", () => {
    const definitions = tools.getTools();
    for (const name of ["wp_list_posts", "wp_get_post", "wp_create_post", "wp_update_post", "wp_delete_post"]) {
      expect(definitions.find((tool) => tool.name === name).inputSchema.properties.post_type).toBeDefined();
    }
  });

  it("lists CPT entries using a discovered REST base and preserves query parameters", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce({ product: { rest_base: "products" } }).mockResolvedValueOnce([post]);

    await tools.handleListPosts(client, { post_type: "product", per_page: 5, search: "bike" });

    expect(client.get).toHaveBeenNthCalledWith(1, "types");
    expect(client.get).toHaveBeenNthCalledWith(2, "products?per_page=5&search=bike");
  });

  it("falls back to the post type slug when types cannot be discovered", async () => {
    const client = createClient();
    client.get.mockRejectedValueOnce(new Error("types unavailable")).mockResolvedValueOnce([post]);

    await tools.handleListPosts(client, { post_type: "event" });

    expect(client.get).toHaveBeenNthCalledWith(2, "event?per_page=10");
  });

  it("uses the discovered REST base for get, create, update, and delete", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce({ product: { rest_base: "products" } }).mockResolvedValueOnce(post);
    await tools.handleGetPost(client, { id: 12, post_type: "product", include_content: false });
    expect(client.get).toHaveBeenNthCalledWith(2, "products/12?context=view");

    client.get.mockResolvedValueOnce({ product: { rest_base: "products" } });
    client.post.mockResolvedValueOnce(post);
    await tools.handleCreatePost(client, { title: "Product", post_type: "product" });
    expect(client.post).toHaveBeenCalledWith("products", { title: "Product" });

    client.get.mockResolvedValueOnce({ product: { rest_base: "products" } });
    client.put.mockResolvedValueOnce(post);
    await tools.handleUpdatePost(client, { id: 12, title: "Updated", post_type: "product" });
    expect(client.put).toHaveBeenCalledWith("products/12", { title: "Updated" });

    client.get.mockResolvedValueOnce({ product: { rest_base: "products" } });
    client.delete.mockResolvedValueOnce({ deleted: true });
    await tools.handleDeletePost(client, { id: 12, post_type: "product" });
    expect(client.delete).toHaveBeenCalledWith("products/12?force=false");
  });

  it("rejects post type values that could alter the REST route", async () => {
    const client = createClient();

    await expect(tools.handleListPosts(client, { post_type: "../plugins" })).rejects.toThrow("post_type");
    expect(client.get).not.toHaveBeenCalled();
  });
});
