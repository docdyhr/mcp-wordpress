/**
 * Tests for src/tools/version.ts — wp_check_version handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleCheckVersion } from "../../dist/tools/version.js";

const mockRelease = (tag, body = "") => ({
  tag_name: tag,
  name: `Release ${tag}`,
  html_url: `https://github.com/docdyhr/mcp-wordpress/releases/tag/${tag}`,
  published_at: "2026-01-01T00:00:00Z",
  body,
});

describe("handleCheckVersion", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports up to date when versions match", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockRelease("v1.0.0"),
    });

    const result = await handleCheckVersion({ current_version: "1.0.0" });

    expect(result).toContain("up to date");
    expect(result).toContain("v1.0.0");
  });

  it("reports update available when latest is newer", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockRelease("v2.0.0"),
    });

    const result = await handleCheckVersion({ current_version: "1.0.0" });

    expect(result).toContain("Update Available");
    expect(result).toContain("v1.0.0");
    expect(result).toContain("v2.0.0");
    expect(result).toContain("mcp-wordpress.dxt");
  });

  it("reports pre-release when current is ahead of latest", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockRelease("v1.0.0"),
    });

    const result = await handleCheckVersion({ current_version: "2.0.0" });

    expect(result).toContain("pre-release");
    expect(result).toContain("v2.0.0");
  });

  it("falls back gracefully when GitHub API is unavailable", async () => {
    fetch.mockRejectedValue(new Error("network failure"));

    const result = await handleCheckVersion({ current_version: "1.0.0" });

    expect(result).toContain("Unable to check for updates");
    expect(result).toContain("1.0.0");
  });

  it("falls back when GitHub returns non-OK status", async () => {
    fetch.mockResolvedValue({ ok: false });

    const result = await handleCheckVersion({ current_version: "1.0.0" });

    expect(result).toContain("Unable to check for updates");
  });

  it("includes truncated release notes when update is available and body is long", async () => {
    const longBody = "A".repeat(600);
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockRelease("v9.9.9", longBody),
    });

    const result = await handleCheckVersion({ current_version: "1.0.0" });

    expect(result).toContain("What's New");
    expect(result).toContain("...");
  });

  it("returns validation error for invalid args", async () => {
    const result = await handleCheckVersion({ current_version: 123 });
    expect(result).toContain("Invalid arguments");
  });

  it("strips leading v from tag_name for comparison", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockRelease("v1.2.3"),
    });

    const result = await handleCheckVersion({ current_version: "1.2.3" });
    expect(result).toContain("up to date");
  });
});
