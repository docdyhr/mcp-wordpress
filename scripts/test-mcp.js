#!/usr/bin/env node

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class MCPTester {
  constructor() {
    this.envPath = join(rootDir, '.env');
    this.loadConfig();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  loadConfig() {
    if (existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }
  }

  async run() {
    console.log('🧪 MCP WordPress Server Integration Tests');
    console.log('==========================================\n');

    // Check prerequisites
    if (!await this.checkPrerequisites()) {
      console.log('❌ Prerequisites not met. Run setup first.');
      process.exit(1);
    }

    // Run tests
    await this.testServerStartup();
    await this.testToolListing();
    await this.testAuthenticationTools();
    await this.testPostTools();
    await this.testPageTools();
    await this.testMediaTools();
    await this.testUserTools();
    await this.testCommentTools();
    await this.testTaxonomyTools();
    await this.testSiteTools();
    await this.testErrorHandling();

    // Show results
    this.showResults();
  }

  async checkPrerequisites() {
    const required = ['WORDPRESS_URL', 'AUTH_METHOD'];
    return required.every(varName => process.env[varName]);
  }

  async testServerStartup() {
    await this.runTest('Server Startup', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      // Test server creation
      if (!server.wordpressClient) {
        throw new Error('WordPress client not initialized');
      }

      // Test tool loading
      const toolsResult = await server.handle_list_tools();
      if (!toolsResult.tools || toolsResult.tools.length === 0) {
        throw new Error('No tools loaded');
      }

      console.log(`   ✅ ${toolsResult.tools.length} tools loaded`);
      return true;
    });
  }

  async testToolListing() {
    await this.runTest('Tool Listing', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_list_tools();
      
      // Check tool categories
      const expectedCategories = [
        'wp_list_posts', 'wp_test_auth', 'wp_list_pages',
        'wp_list_media', 'wp_list_users', 'wp_list_comments',
        'wp_list_categories', 'wp_get_site_info'
      ];

      const toolNames = result.tools.map(tool => tool.name);
      const missingTools = expectedCategories.filter(name => !toolNames.includes(name));

      if (missingTools.length > 0) {
        throw new Error(`Missing tools: ${missingTools.join(', ')}`);
      }

      console.log(`   ✅ All ${expectedCategories.length} core tools available`);
      return true;
    });
  }

  async testAuthenticationTools() {
    await this.runTest('Authentication Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      // Test wp_test_auth
      const authResult = await server.handle_call_tool({
        name: 'wp_test_auth',
        arguments: {}
      });

      if (authResult.isError) {
        throw new Error(`Auth test failed: ${authResult.content[0].text}`);
      }

      console.log('   ✅ Authentication successful');
      return true;
    });
  }

  async testPostTools() {
    await this.runTest('Post Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      // Test listing posts
      const listResult = await server.handle_call_tool({
        name: 'wp_list_posts',
        arguments: { per_page: 5 }
      });

      if (listResult.isError) {
        throw new Error(`List posts failed: ${listResult.content[0].text}`);
      }

      console.log('   ✅ Post listing works');

      // Test getting a specific post if posts exist
      const posts = JSON.parse(listResult.content[0].text);
      if (posts.length > 0) {
        const getResult = await server.handle_call_tool({
          name: 'wp_get_post',
          arguments: { id: posts[0].id }
        });

        if (getResult.isError) {
          throw new Error(`Get post failed: ${getResult.content[0].text}`);
        }

        console.log('   ✅ Post retrieval works');
      }

      return true;
    });
  }

  async testPageTools() {
    await this.runTest('Page Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_call_tool({
        name: 'wp_list_pages',
        arguments: { per_page: 5 }
      });

      if (result.isError) {
        throw new Error(`List pages failed: ${result.content[0].text}`);
      }

      console.log('   ✅ Page listing works');
      return true;
    });
  }

  async testMediaTools() {
    await this.runTest('Media Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_call_tool({
        name: 'wp_list_media',
        arguments: { per_page: 5 }
      });

      if (result.isError) {
        throw new Error(`List media failed: ${result.content[0].text}`);
      }

      console.log('   ✅ Media listing works');
      return true;
    });
  }

  async testUserTools() {
    await this.runTest('User Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_call_tool({
        name: 'wp_list_users',
        arguments: { per_page: 5 }
      });

      if (result.isError) {
        throw new Error(`List users failed: ${result.content[0].text}`);
      }

      console.log('   ✅ User listing works');
      return true;
    });
  }

  async testCommentTools() {
    await this.runTest('Comment Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_call_tool({
        name: 'wp_list_comments',
        arguments: { per_page: 5 }
      });

      if (result.isError) {
        throw new Error(`List comments failed: ${result.content[0].text}`);
      }

      console.log('   ✅ Comment listing works');
      return true;
    });
  }

  async testTaxonomyTools() {
    await this.runTest('Taxonomy Management Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      // Test categories
      const catResult = await server.handle_call_tool({
        name: 'wp_list_categories',
        arguments: { per_page: 5 }
      });

      if (catResult.isError) {
        throw new Error(`List categories failed: ${catResult.content[0].text}`);
      }

      console.log('   ✅ Category listing works');

      // Test tags
      const tagResult = await server.handle_call_tool({
        name: 'wp_list_tags',
        arguments: { per_page: 5 }
      });

      if (tagResult.isError) {
        throw new Error(`List tags failed: ${tagResult.content[0].text}`);
      }

      console.log('   ✅ Tag listing works');
      return true;
    });
  }

  async testSiteTools() {
    await this.runTest('Site Information Tools', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      const result = await server.handle_call_tool({
        name: 'wp_get_site_info',
        arguments: {}
      });

      if (result.isError) {
        throw new Error(`Get site info failed: ${result.content[0].text}`);
      }

      console.log('   ✅ Site info retrieval works');
      return true;
    });
  }

  async testErrorHandling() {
    await this.runTest('Error Handling', async () => {
      const { WordPressMCPServer } = await import('../src/index.js');
      const server = new WordPressMCPServer();
      
      // Test invalid tool name
      const invalidResult = await server.handle_call_tool({
        name: 'wp_invalid_tool',
        arguments: {}
      });

      if (!invalidResult.isError) {
        throw new Error('Expected error for invalid tool name');
      }

      console.log('   ✅ Invalid tool name handled correctly');

      // Test invalid post ID
      const invalidPostResult = await server.handle_call_tool({
        name: 'wp_get_post',
        arguments: { id: 999999 }
      });

      if (!invalidPostResult.isError) {
        throw new Error('Expected error for invalid post ID');
      }

      console.log('   ✅ Invalid post ID handled correctly');
      return true;
    });
  }

  async runTest(name, testFn) {
    try {
      console.log(`🔄 ${name}...`);
      await testFn();
      console.log(`✅ ${name} passed\n`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed' });
    } catch (error) {
      console.log(`❌ ${name} failed: ${error.message}\n`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  showResults() {
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📋 Total:  ${this.results.passed + this.results.failed}`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Your MCP WordPress server is ready to use.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check your configuration and WordPress setup.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPTester();
  tester.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { MCPTester };
