/**
 * The post handlers must rethrow a typed WordPressAPIError (status, code, data) with an operation prefix,
 * not flatten it into a plain Error — ToolRegistry's 401/403 classification depends on that metadata.
 * Before this, six handlers wrapped everything in `new Error(...)`, so a 403 from `wp_get_post` surfaced as
 * a raw "Failed to get post: ..." instead of the "Permission denied" guidance.
 */
import { vi } from "vitest";
import {
  handleListPosts,
  handleGetPost,
  handleCreatePost,
  handleUpdatePost,
  handleDeletePost,
  handleGetPostRevisions,
} from "../../../dist/tools/posts/PostHandlers.js";
import { WordPressAPIError } from "../../../dist/types/client.js";
import { ToolRegistry } from "../../../dist/server/ToolRegistry.js";

const CASES = [
  ["list posts", "getPosts", (client) => handleListPosts(client, {})],
  ["get post", "getPost", (client) => handleGetPost(client, { id: 1 })],
  ["create post", "createPost", (client) => handleCreatePost(client, { title: "T", content: "<p>c</p>" })],
  ["update post", "updatePost", (client) => handleUpdatePost(client, { id: 1, title: "T" })],
  ["delete post", "deletePost", (client) => handleDeletePost(client, { id: 1 })],
  ["get post revisions", "getPostRevisions", (client) => handleGetPostRevisions(client, { id: 1 })],
];

function makeClient(method, error) {
  return { getSiteUrl: () => "https://x.example", [method]: vi.fn().mockRejectedValue(error) };
}

describe("post handler error propagation", () => {
  it.each(CASES)("%s keeps a WordPressAPIError's status, code and data", async (label, method, run) => {
    const original = new WordPressAPIError("Sorry, you are not allowed to do that.", 403, "rest_forbidden", {
      status: 403,
    });

    const error = await run(makeClient(method, original)).catch((e) => e);

    expect(error).toBeInstanceOf(WordPressAPIError);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("rest_forbidden");
    expect(error.data).toEqual({ status: 403 });
    expect(error.message).toBe(`Failed to ${label}: Sorry, you are not allowed to do that.`);
  });

  it.each(CASES)("%s still wraps an ordinary Error with the operation prefix", async (label, method, run) => {
    const error = await run(makeClient(method, new Error("boom"))).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(WordPressAPIError);
    expect(error.message).toBe(`Failed to ${label}: boom`);
  });
});

describe("post tools through ToolRegistry", () => {
  function createRegistry(client) {
    const registered = new Map();
    const server = {
      tool: (name, description, schema, handler) => registered.set(name, handler),
      server: { setRequestHandler: () => {} },
    };
    const registry = new ToolRegistry(server, new Map([["default", client]]));
    registry.registerAllTools();
    return registered;
  }

  it("reports a 403 from wp_get_post as a permission denial, not a raw error", async () => {
    const client = {
      getSiteUrl: () => "https://x.example",
      getPost: vi.fn().mockRejectedValue(new WordPressAPIError("Sorry, you are not allowed.", 403, "rest_forbidden")),
    };

    const result = await createRegistry(client).get("wp_get_post")({ id: 1 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Permission denied");
    expect(result.content[0].text).toContain("rest_forbidden");
  });

  it("reports a 401 from wp_list_posts as an authentication failure", async () => {
    const client = {
      getSiteUrl: () => "https://x.example",
      getPosts: vi.fn().mockRejectedValue(new WordPressAPIError("Not logged in", 401, "rest_not_logged_in")),
    };

    const result = await createRegistry(client).get("wp_list_posts")({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Authentication failed");
  });

  it("keeps the plain 'Error: ...' form for a non-HTTP failure", async () => {
    const client = { getSiteUrl: () => "https://x.example", getPosts: vi.fn().mockRejectedValue(new Error("boom")) };

    const result = await createRegistry(client).get("wp_list_posts")({});

    expect(result.content[0].text).toBe("Error: Failed to list posts: boom");
  });
});
