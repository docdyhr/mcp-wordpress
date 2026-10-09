/**
 * Titles in tool output are plain text. WordPress returns `title.rendered` entity-encoded (`Q&#038;A`), and
 * the page and media tools printed it as-is; the post list/get/update tools already decoded it.
 */
import { vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PageTools } from "../../dist/tools/pages.js";
import { MediaTools } from "../../dist/tools/media.js";
import { displayTitle } from "../../dist/utils/htmlText.js";

const ENCODED = "Q&#038;A &amp; Tips &#8211; <em>Part</em> 2";
const DECODED = "Q&A & Tips – Part 2";
const NO_ENTITIES = /&amp;|&#\d+;|<em>/;

describe("displayTitle", () => {
  it("decodes entities and strips markup", () => {
    expect(displayTitle(ENCODED)).toBe(DECODED);
  });

  it.each([[""], ["  "], [undefined], [null]])("falls back to (untitled) for %j", (value) => {
    expect(displayTitle(value)).toBe("(untitled)");
  });
});

describe("page tool titles", () => {
  const tools = new PageTools();
  const page = {
    id: 7,
    title: { rendered: ENCODED },
    content: { rendered: "<p>Body</p>" },
    status: "draft",
    link: "https://example.com/?page_id=7",
    date: "2026-10-09T00:00:00",
  };

  it("wp_list_pages", async () => {
    const text = await tools.handleListPages({ getPages: vi.fn().mockResolvedValue([page]) }, {});
    expect(text).toContain(`**${DECODED}**`);
    expect(text).not.toMatch(NO_ENTITIES);
  });

  it("wp_get_page", async () => {
    const text = await tools.handleGetPage({ getPage: vi.fn().mockResolvedValue(page) }, { id: 7 });
    expect(text).toContain(`- **Title:** ${DECODED}`);
    expect(text).not.toMatch(NO_ENTITIES);
  });

  it("wp_create_page", async () => {
    const text = await tools.handleCreatePage(
      { createPage: vi.fn().mockResolvedValue(page) },
      { title: "Q&A & Tips", content: "<p>Body</p>" },
    );
    expect(text).toContain(`- Title: ${DECODED}`);
    expect(text).not.toMatch(NO_ENTITIES);
  });

  it("wp_delete_page", async () => {
    const client = { deletePage: vi.fn().mockResolvedValue({ deleted: true, previous: page }) };
    const text = await tools.handleDeletePage(client, { id: 7, force: true });
    expect(text).toContain(`Page "${DECODED}" has been permanently deleted`);
    expect(text).not.toMatch(NO_ENTITIES);
  });
});

describe("media tool titles", () => {
  const tools = new MediaTools();
  const item = {
    id: 9,
    title: { rendered: ENCODED },
    caption: { rendered: "<p>Sun &amp; sea</p>\n" },
    source_url: "https://example.com/wp-content/uploads/a.jpg",
    media_type: "image",
    mime_type: "image/jpeg",
    alt_text: "",
    date: "2026-10-09T00:00:00",
  };

  it("wp_list_media", async () => {
    const text = await tools.handleListMedia({ getMedia: vi.fn().mockResolvedValue([item]) }, {});
    expect(text).toContain(`**${DECODED}**`);
    expect(text).not.toMatch(NO_ENTITIES);
  });

  it("wp_get_media decodes the title and the caption", async () => {
    const text = await tools.handleGetMedia({ getMediaItem: vi.fn().mockResolvedValue(item) }, { id: 9 });
    expect(text).toContain(`- **Title:** ${DECODED}`);
    expect(text).toContain("- **Caption:** Sun & sea\n");
    expect(text).not.toMatch(/&amp;|<p>/);
  });

  describe("wp_upload_media", () => {
    let previousUploadBaseDir;
    let uploadDir;

    beforeEach(() => {
      previousUploadBaseDir = process.env.MCP_UPLOAD_BASE_DIR;
      uploadDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mcp-wp-title-test-")));
      process.env.MCP_UPLOAD_BASE_DIR = uploadDir;
    });

    afterEach(() => {
      if (previousUploadBaseDir === undefined) delete process.env.MCP_UPLOAD_BASE_DIR;
      else process.env.MCP_UPLOAD_BASE_DIR = previousUploadBaseDir;
      fs.rmSync(uploadDir, { recursive: true, force: true });
    });

    it("decodes the title", async () => {
      const filePath = path.join(uploadDir, "a.jpg");
      fs.writeFileSync(filePath, "x");
      const text = await tools.handleUploadMedia(
        { uploadMedia: vi.fn().mockResolvedValue(item) },
        { file_path: filePath },
      );
      expect(text).toContain(`- Title: ${DECODED}`);
      expect(text).not.toMatch(NO_ENTITIES);
    });
  });
});
