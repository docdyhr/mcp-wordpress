import { PostTools } from '../dist/tools/posts.js';
import { PageTools } from '../dist/tools/pages.js';
import { MediaTools } from '../dist/tools/media.js';

describe('Tool Validation', () => {
  describe('Tool registration', () => {
    test('PostTools should register all expected tools', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for required tool properties
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });

    test('PageTools should register all expected tools', () => {
      const pageTools = new PageTools();
      const tools = pageTools.getTools();
      
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });

    test('MediaTools should register all expected tools', () => {
      const mediaTools = new MediaTools();
      const tools = mediaTools.getTools();
      
      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('Tool schema validation', () => {
    test('should have valid JSON schema for post tools', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      const createPostTool = tools.find(tool => tool.name === 'wp_create_post');
      expect(createPostTool).toBeDefined();
      expect(createPostTool.inputSchema).toHaveProperty('type', 'object');
      expect(createPostTool.inputSchema).toHaveProperty('properties');
      expect(createPostTool.inputSchema.properties).toHaveProperty('title');
      expect(createPostTool.inputSchema.properties).toHaveProperty('content');
    });

    test('should include site parameter in multi-site schemas', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      tools.forEach(tool => {
        expect(tool.inputSchema.properties).toHaveProperty('site');
        expect(tool.inputSchema.properties.site).toHaveProperty('type', 'string');
        expect(tool.inputSchema.properties.site).toHaveProperty('description');
      });
    });

    test('should have required fields properly marked', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      const createPostTool = tools.find(tool => tool.name === 'wp_create_post');
      expect(createPostTool.inputSchema).toHaveProperty('required');
      expect(createPostTool.inputSchema.required).toContain('title');
      expect(createPostTool.inputSchema.required).toContain('content');
    });
  });

  describe('Tool naming conventions', () => {
    test('all tools should follow wp_ naming convention', () => {
      const allToolClasses = [PostTools, PageTools, MediaTools];
      
      allToolClasses.forEach(ToolClass => {
        const toolInstance = new ToolClass();
        const tools = toolInstance.getTools();
        
        tools.forEach(tool => {
          expect(tool.name).toMatch(/^wp_/);
        });
      });
    });

    test('tool names should be descriptive and consistent', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      const expectedPatterns = [
        /^wp_(create|get|update|delete|list|search)_/,
        /^wp_\w+_(post|page|media|user|comment|category|tag)/
      ];
      
      tools.forEach(tool => {
        const matchesPattern = expectedPatterns.some(pattern => pattern.test(tool.name));
        expect(matchesPattern).toBe(true);
      });
    });
  });

  describe('Tool descriptions', () => {
    test('all tools should have meaningful descriptions', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      tools.forEach(tool => {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description).toMatch(/[.!]$/); // Should end with punctuation
      });
    });

    test('descriptions should mention site parameter for multi-site support', () => {
      const postTools = new PostTools();
      const tools = postTools.getTools();
      
      tools.forEach(tool => {
        expect(tool.description.toLowerCase()).toMatch(/site|wordpress/);
      });
    });
  });
});
