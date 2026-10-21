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
    getPosts: vi.fn().mockResolvedValue([]),
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

  it("keeps the standard post route when post_type is explicitly set to post", async () => {
    const client = createClient();

    await tools.handleListPosts(client, { post_type: "post" });

    expect(client.getPosts).toHaveBeenCalledWith({ per_page: 10 });
    expect(client.get).not.toHaveBeenCalled();
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

describe("PostTools custom post types against real WordPress response shapes", () => {
  const tools = new PostTools();
  const { title: _title, ...untitled } = post;
  const types = {
    post: { rest_base: "posts", rest_namespace: "wp/v2" },
    attachment: { rest_base: "media", rest_namespace: "wp/v2" },
    wp_block: { rest_base: "blocks", rest_namespace: "wp/v2" },
    page: { rest_base: "pages", rest_namespace: "wp/v2" },
    event: { rest_base: "events", rest_namespace: "wp/v2" },
    note: { rest_base: "note", rest_namespace: "wp/v2" },
    ns_item: { rest_base: "ns_item", rest_namespace: "custom/v1" },
  };

  it("bounds post_type in every schema to a WordPress post type key", () => {
    for (const name of ["wp_list_posts", "wp_get_post", "wp_create_post", "wp_update_post", "wp_delete_post"]) {
      const schema = tools.getTools().find((tool) => tool.name === name).inputSchema.properties.post_type;
      expect(schema).toMatchObject({ type: "string", default: "post", pattern: "^[a-z0-9_-]+$", maxLength: 20 });
    }
  });

  it.each(["Event", "a".repeat(21), "event/1", "event?status=draft"])(
    "rejects post_type %j before any request",
    async (postType) => {
      const client = createClient();
      await expect(tools.handleListPosts(client, { post_type: postType })).rejects.toThrow("post_type");
      expect(client.get).not.toHaveBeenCalled();
    },
  );

  it("names the available types when a post type is not exposed to the REST API", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce(types);

    // The message itself carries the alternatives (tool errors show only the message); internal core types and
    // types under another namespace are left out.
    await expect(tools.handleListPosts(client, { post_type: "hidden_item" })).rejects.toThrow(
      'Post type "hidden_item" is not registered or not exposed to the REST API (show_in_rest). Available post types: post, page, event, note.',
    );
    expect(client.get).toHaveBeenCalledTimes(1);

    client.get.mockResolvedValueOnce(types);
    const error = await tools.handleGetPost(client, { id: 1, post_type: "hidden_item" }).catch((e) => e);
    expect(error.message).toContain("hidden_item");
  });

  it("refuses post types registered under another REST namespace instead of requesting a wp/v2 route", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce(types);

    await expect(tools.handleListPosts(client, { post_type: "ns_item" })).rejects.toThrow(
      'is served under the "custom/v1" REST namespace',
    );
    expect(client.get).toHaveBeenCalledTimes(1);
  });

  it("lists, gets and creates items of a post type without title support", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce(types).mockResolvedValueOnce([untitled]);
    await expect(tools.handleListPosts(client, { post_type: "note" })).resolves.toContain("**(untitled)**");

    const { author: _author, ...authorless } = untitled;
    client.get.mockResolvedValueOnce(types).mockResolvedValueOnce(authorless);
    const single = await tools.handleGetPost(client, { id: 12, post_type: "note" });
    expect(single).toContain("# (untitled)");
    expect(single).toContain("**Author**: Unknown Author");

    client.get.mockResolvedValueOnce(types);
    client.post.mockResolvedValueOnce(untitled);
    await expect(tools.handleCreatePost(client, { title: "ignored", post_type: "note" })).resolves.toContain(
      "**Title**: (untitled)",
    );
  });

  it("reports a trash as success: WordPress returns the trashed post, not { deleted }", async () => {
    const trashed = { ...post, id: 14, status: "trash", title: { rendered: "Probe" } };

    const client = createClient();
    client.deletePost = vi.fn().mockResolvedValueOnce(trashed);
    const regular = await tools.handleDeletePost(client, { id: 14 });
    expect(regular).toContain("Post moved to trash successfully");
    expect(regular).toContain("**ID**: 14");
    expect(client.deletePost).toHaveBeenCalledWith(14, undefined);

    client.get.mockResolvedValueOnce(types);
    client.delete.mockResolvedValueOnce(trashed);
    const custom = await tools.handleDeletePost(client, { id: 14, post_type: "event" });
    expect(client.delete).toHaveBeenCalledWith("events/14?force=false");
    expect(custom).toContain("Post moved to trash successfully");
    expect(custom).toContain("**Title**: Probe");
  });

  it("still reports a permanent delete from { deleted, previous } and a refusal as failure", async () => {
    const client = createClient();
    client.get.mockResolvedValueOnce(types);
    client.delete.mockResolvedValueOnce({ deleted: true, previous: { ...post, id: 15 } });
    await expect(tools.handleDeletePost(client, { id: 15, post_type: "event", force: true })).resolves.toContain(
      "Post permanently deleted successfully",
    );

    client.deletePost = vi.fn().mockResolvedValueOnce({ ...post, id: 16, status: "publish" });
    await expect(tools.handleDeletePost(client, { id: 16 })).resolves.toContain("Failed to delete post with ID 16");
  });
});
