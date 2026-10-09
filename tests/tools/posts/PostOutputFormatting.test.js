/**
 * Output-formatting regressions for the post tools: entity handling in titles/excerpts, word counts,
 * date labels, the "Changes Made" summary and list pagination wording.
 */
import { vi } from "vitest";
import {
  handleListPosts,
  handleGetPost,
  handleUpdatePost,
  handleCreatePost,
  handleDeletePost,
  handleGetPostRevisions,
} from "../../../dist/tools/posts/PostHandlers.js";
import { listPostsTool } from "../../../dist/tools/posts/PostToolDefinitions.js";

function makePost(overrides = {}) {
  return {
    id: 1,
    title: { rendered: "Test Post" },
    content: { rendered: "<p>Body</p>" },
    excerpt: { rendered: "" },
    date: "2024-01-01T00:00:00",
    modified: "2024-01-02T00:00:00",
    status: "publish",
    link: "https://test.example.com/test-post",
    author: 1,
    categories: [],
    tags: [],
    ...overrides,
  };
}

function makeClient(overrides = {}) {
  return {
    getSiteUrl: vi.fn().mockReturnValue("https://test.example.com"),
    getPosts: vi.fn(),
    getPost: vi.fn(),
    updatePost: vi.fn(),
    getUser: vi.fn().mockResolvedValue({ name: "Author" }),
    getCategory: vi.fn().mockResolvedValue({ name: "Cat" }),
    getTag: vi.fn().mockResolvedValue({ name: "Tag" }),
    createPost: vi.fn(),
    deletePost: vi.fn(),
    getPostRevisions: vi.fn(),
    ...overrides,
  };
}

describe("wp_list_posts output", () => {
  it("decodes entities in titles and strips markup from excerpts once (no '&amp;#8217;')", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([
      makePost({
        title: { rendered: "Q&#038;A &amp; Tips" },
        excerpt: { rendered: "<p>Don&#8217;t miss &#8220;this&#8221; &amp; that [&hellip;]</p>\n" },
      }),
    ]);

    const text = await handleListPosts(client, {});

    expect(text).toContain("**Q&A & Tips**");
    expect(text).toContain("Excerpt: Don’t miss “this” & that […]");
    expect(text).not.toMatch(/&amp;|&#\d+;|&hellip;|<p>/);
  });

  it("shows a placeholder instead of empty bold markers for a post without a title", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([makePost({ title: { rendered: "" } })]);

    const text = await handleListPosts(client, {});

    expect(text).toContain("(untitled)");
    expect(text).not.toContain("****");
  });

  it("does not append an ellipsis to a short excerpt, and does to a truncated one", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([
      makePost({ id: 1, excerpt: { rendered: "<p>Short one</p>" } }),
      makePost({ id: 2, excerpt: { rendered: `<p>${"x".repeat(200)}</p>` } }),
    ]);

    const text = await handleListPosts(client, {});

    expect(text).toContain("Excerpt: Short one\n");
    expect(text).toContain(`Excerpt: ${"x".repeat(80)}…`);
  });

  // Regression: the header said "N total" but N was only the size of the current page.
  it("labels the count as this page's size, not the site total", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([makePost({ id: 1 }), makePost({ id: 2 })]);

    const text = await handleListPosts(client, { per_page: 10 });

    expect(text).toContain("2 on this page");
    expect(text).not.toMatch(/\b2 total\b/);
  });

  // Regression: the >50-post streaming path returned before the pagination note was added.
  it("keeps the next-page note on the streaming path (more than 50 posts)", async () => {
    const client = makeClient();
    const posts = Array.from({ length: 60 }, (_, i) => makePost({ id: i + 1 }));
    client.getPosts.mockResolvedValue(posts);

    const full = await handleListPosts(client, { per_page: 60, page: 2 });
    const notFull = await handleListPosts(client, { per_page: 100 });

    expect(full).toContain("`page=3`");
    expect(notFull).not.toContain("**Pagination**");
  });

  it("points at the next page when the page is full", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([makePost({ id: 1 }), makePost({ id: 2 })]);

    const text = await handleListPosts(client, { per_page: 2, page: 3 });

    expect(client.getPosts).toHaveBeenCalledWith(expect.objectContaining({ page: 3, per_page: 2 }));
    expect(text).toContain("page 3");
    expect(text).toContain("`page=4`");
  });

  it("does not call a draft's date 'Published'", async () => {
    const client = makeClient();
    client.getPosts.mockResolvedValue([
      makePost({ id: 1, status: "publish" }),
      makePost({ id: 2, status: "draft" }),
      makePost({ id: 3, status: "future" }),
    ]);

    const text = await handleListPosts(client, {});

    expect(text.match(/Published:/g)).toHaveLength(1);
    expect(text).toContain("Created:");
    expect(text).toContain("Scheduled:");
  });

  it("advertises a `page` parameter, as its usage examples promise", () => {
    expect(listPostsTool.inputSchema.properties.page).toMatchObject({ type: "number" });
  });
});

describe("wp_get_post output", () => {
  it("decodes the title and excerpt", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(
      makePost({
        title: { rendered: "Cafe &amp; Bar &#8211; Menu" },
        excerpt: { rendered: "<p>It&#8217;s &hellip;</p>" },
      }),
    );

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("# Cafe & Bar – Menu");
    expect(text).toContain("## Excerpt\nIt’s …");
    expect(text).not.toMatch(/&amp;|&#\d+;|&hellip;/);
  });

  it("counts CJK characters and ignores block-comment markup in the word count", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(
      makePost({
        content: {
          raw: "<!-- wp:paragraph --><p>中文测试</p><!-- /wp:paragraph -->",
          rendered: "<p>中文测试</p>",
        },
      }),
    );

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("**Word Count**: 4");
  });

  // wp_seo_analyze_content counts the rendered body; wp_get_post must count the same representation or the
  // two tools disagree whenever raw (block markup, shortcodes) and rendered differ.
  it("counts the rendered body when raw and rendered differ", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(
      makePost({
        content: {
          raw: "<!-- wp:shortcode -->[gallery ids=1,2,3]<!-- /wp:shortcode -->",
          rendered: "<p>one two three four</p>",
        },
      }),
    );

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("**Word Count**: 4");
  });

  // The rendered body is what wp_seo_analyze_content counts, even when it is empty.
  it("counts an empty rendered body as zero words even if raw has text", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(makePost({ content: { raw: "<p>some raw text</p>", rendered: "" } }));

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("**Word Count**: 0");
  });

  it("counts the words of ordinary markup, not its tags or attributes", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(
      makePost({
        content: { raw: '<p>One <a href="https://x.example/a" class="b c">two three</a></p>' },
      }),
    );

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("**Word Count**: 3");
  });

  it("does not call a draft's date 'Published'", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(makePost({ status: "draft" }));

    const text = await handleGetPost(client, { id: 1 });

    expect(text).not.toContain("**Published**");
    expect(text).toContain("**Created**:");
  });

  it("keeps 'Published' for a published post", async () => {
    const client = makeClient();
    client.getPost.mockResolvedValue(makePost({ status: "publish" }));

    const text = await handleGetPost(client, { id: 1 });

    expect(text).toContain("**Published**:");
  });
});

describe("wp_update_post output", () => {
  // Regression: tags + categories were applied, but "Changes Made" only listed "Content updated".
  it("lists every field that was part of the update", async () => {
    const client = makeClient();
    client.updatePost.mockResolvedValue(
      makePost({ title: { rendered: "New" }, status: "draft", modified: "2024-01-10T00:00:00" }),
    );

    const text = await handleUpdatePost(client, {
      id: 1,
      content: "<p>New body</p>",
      tags: [5, 6],
      categories: [2],
      featured_media: 9,
      date: "2026-12-01T10:00:00",
    });

    expect(text).toContain("- Content updated");
    expect(text).toContain("- Categories updated: 2");
    expect(text).toContain("- Tags updated: 5, 6");
    expect(text).toContain("- Featured image updated: 9");
    expect(text).toContain("- Date updated: 2026-12-01T10:00:00");
  });

  it("reports removing the featured image and clearing tags", async () => {
    const client = makeClient();
    client.updatePost.mockResolvedValue(makePost());

    const text = await handleUpdatePost(client, { id: 1, featured_media: 0, tags: [] });

    expect(text).toContain("- Featured image removed");
    expect(text).toContain("- Tags cleared");
  });

  it("does not list fields that were not sent", async () => {
    const client = makeClient();
    client.updatePost.mockResolvedValue(makePost());

    const text = await handleUpdatePost(client, { id: 1, title: "Only title" });

    expect(text).toContain("- Title:");
    expect(text).not.toMatch(/Tags|Categories|Featured|Date updated|Content updated/);
  });
});

// Regression (v4.0.9 re-test): list/get/update decoded titles, but create, delete and revisions still
// printed the raw `title.rendered`, so a title with "&" came back as "&#038;".
describe("wp_create_post / wp_delete_post / wp_get_post_revisions titles", () => {
  const ENCODED = { rendered: "Q&#038;A &#8220;Tips&#8221;" };

  it("wp_create_post decodes the title", async () => {
    const client = makeClient();
    client.createPost.mockResolvedValue(makePost({ title: ENCODED, status: "draft" }));

    const text = await handleCreatePost(client, { title: "Q&A \u201cTips\u201d", status: "draft" });

    expect(text).toContain("**Title**: Q&A \u201cTips\u201d\n");
    expect(text).not.toMatch(/&#\d+;/);
  });

  it("wp_delete_post decodes the title of the deleted post", async () => {
    const client = makeClient();
    client.deletePost.mockResolvedValue({ deleted: true, previous: makePost({ title: ENCODED }) });

    const text = await handleDeletePost(client, { id: 1, force: true });

    expect(text).toContain("**Title**: Q&A \u201cTips\u201d\n");
    expect(text).not.toMatch(/&#\d+;/);
  });

  it("wp_get_post_revisions decodes each revision title", async () => {
    const client = makeClient();
    client.getPostRevisions.mockResolvedValue([
      makePost({ id: 11, title: ENCODED }),
      makePost({ id: 12, title: { rendered: "" } }),
    ]);

    const text = await handleGetPostRevisions(client, { id: 1 });

    expect(text).toContain("- Title: Q&A \u201cTips\u201d\n");
    expect(text).toContain("- Title: (untitled)");
    expect(text).not.toMatch(/&#\d+;/);
  });
});
