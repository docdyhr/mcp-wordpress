/**
 * The OpenAPI spec dropped a schema's numeric bounds, and took enums from a table keyed by parameter name instead of
 * the schema: wp_seo_site_audit's maxPages had no minimum/maximum although the MCP schema enforces 1–100.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { DocumentationGenerator } from "../../dist/docs/DocumentationGenerator.js";

describe("DocumentationGenerator OpenAPI parameters", () => {
  let spec;
  let outputDir;

  beforeAll(async () => {
    // It writes its files: never into the repository's docs/api.
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcpwp-docs-"));
    const generator = new DocumentationGenerator({
      outputDir,
      generateOpenAPI: true,
      generateInteractiveHtml: false,
      validateExamples: false,
    });
    ({ openApiSpec: spec } = await generator.generateFullDocumentation());
  }, 60_000);

  afterAll(() => fs.rmSync(outputDir, { recursive: true, force: true }));

  const properties = (tool) =>
    spec.paths[`/tools/${tool}`].post.requestBody.content["application/json"].schema.properties;

  it("keeps a schema's minimum and maximum", () => {
    expect(properties("wp_seo_site_audit").maxPages).toMatchObject({ type: "number", minimum: 1, maximum: 100 });
  });

  // The name tables gave every "status" the post statuses and default "publish" — comments' status included.
  it("never emits a default outside the parameter's own enum", () => {
    const bad = [];
    for (const [route, item] of Object.entries(spec.paths)) {
      const props = item.post?.requestBody?.content?.["application/json"]?.schema?.properties ?? {};
      for (const [name, p] of Object.entries(props)) {
        if (p.enum && p.default !== undefined && !p.enum.includes(p.default)) bad.push(`${route} ${name}=${p.default}`);
      }
    }
    expect(bad).toEqual([]);
    expect(properties("wp_list_comments").status.enum).toEqual(["hold", "approve", "spam", "trash"]);
  });

  it("takes a parameter's enum from its schema", () => {
    expect(properties("wp_seo_analyze_content").analysisType.enum).toEqual([
      "readability",
      "keywords",
      "structure",
      "full",
    ]);
  });
});
