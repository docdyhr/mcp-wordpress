import { describe, test, expect, beforeEach } from "@jest/globals";

describe("Tool Validation", () => {
  let PostTools, PageTools, MediaTools;

  beforeEach(async () => {
    // Dynamic imports
    const postsModule = await import("../dist/tools/posts.js");
    const pagesModule = await import("../dist/tools/pages.js");
    const mediaModule = await import("../dist/tools/media.js");

    PostTools = postsModule.PostTools;
    PageTools = pagesModule.PageTools;
    MediaTools = mediaModule.MediaTools;
  });

  describe("Tool registration", () => {
    test("PostTools should register all expected tools", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      // Check for required tool properties
      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(Array.isArray(tool.parameters)).toBe(true);
      });
    });

    test("PageTools should register all expected tools", () => {
      const pageTools = new PageTools();
      const tools = pageTools.getTools();

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
      });
    });

    test("MediaTools should register all expected tools", () => {
      const mediaTools = new MediaTools();
      const tools = mediaTools.getTools();

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);

      tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("parameters");
      });
    });
  });

  describe("Tool schema validation", () => {
    test("should have valid parameters for post tools", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      const createPostTool = tools.find((tool) => tool.name === "wp_create_post");
      expect(createPostTool).toBeDefined();
      expect(Array.isArray(createPostTool.parameters)).toBe(true);
      expect(createPostTool.parameters.length).toBeGreaterThan(0);

      // Check for title and content parameters
      const hasTitle = createPostTool.parameters.some((p) => p.name === "title");
      const hasContent = createPostTool.parameters.some((p) => p.name === "content");
      expect(hasTitle).toBe(true);
      expect(hasContent).toBe(true);
    });

    test("should have parameters array for all tools", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        expect(Array.isArray(tool.parameters)).toBe(true);
        // Each parameter should have name, type, and description
        tool.parameters.forEach((param) => {
          expect(param).toHaveProperty("name");
          expect(param).toHaveProperty("type");
          expect(param).toHaveProperty("description");
        });
      });
    });

    test("should have required fields properly defined", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      const createPostTool = tools.find((tool) => tool.name === "wp_create_post");
      expect(createPostTool).toBeDefined();

      // Check that required parameters exist
      const titleParam = createPostTool.parameters.find((p) => p.name === "title");
      const contentParam = createPostTool.parameters.find((p) => p.name === "content");
      expect(titleParam).toBeDefined();
      expect(contentParam).toBeDefined();
    });
  });

  describe("Tool naming conventions", () => {
    test("all tools should follow wp_ naming convention", () => {
      const allToolClasses = [PostTools, PageTools, MediaTools];

      allToolClasses.forEach((ToolClass) => {
        const toolInstance = new ToolClass();
        const tools = toolInstance.getTools();

        tools.forEach((tool) => {
          expect(tool.name).toMatch(/^wp_/);
        });
      });
    });

    test("tool names should be descriptive and consistent", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      const expectedPatterns = [
        /^wp_(create|get|update|delete|list|search)_/,
        /^wp_\w+_(post|page|media|user|comment|category|tag)/,
      ];

      tools.forEach((tool) => {
        const matchesPattern = expectedPatterns.some((pattern) => pattern.test(tool.name));
        expect(matchesPattern).toBe(true);
      });
    });
  });

  describe("Tool descriptions", () => {
    test("all tools should have meaningful descriptions", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(10);
        // Allow descriptions with or without ending punctuation
        expect(tool.description.trim()).toBeTruthy();
      });
    });

    test("descriptions should be informative", () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();

      tools.forEach((tool) => {
        // Description should mention what the tool does
        expect(tool.description.toLowerCase()).toMatch(/post|create|update|delete|list|get|retrieve/);
      });
    });
  });
});
