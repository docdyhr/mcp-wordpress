#!/usr/bin/env node

/**
 * Test Script for all MCP WordPress Tools
 * Tests all available tools via MCP JSON-RPC interface
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Default site to use for tests (from multi-site config)
const DEFAULT_SITE = 'site1';

// Test cases for all tools
const testCases = [
  // Authentication Tools
  {
    name: 'wp_test_auth',
    description: 'Test WordPress authentication',
    arguments: { site: DEFAULT_SITE }
  },
  {
    name: 'wp_get_auth_status',
    description: 'Get authentication status',
    arguments: { site: DEFAULT_SITE }
  },

  // Site Management Tools
  {
    name: 'wp_get_site_settings',
    description: 'Get site settings',
    arguments: { site: DEFAULT_SITE }
  },

  // Posts Tools
  {
    name: 'wp_list_posts',
    description: 'List posts (limited to 2)',
    arguments: { site: DEFAULT_SITE, per_page: 2 }
  },
  {
    name: 'wp_get_post',
    description: 'Get specific post',
    arguments: { site: DEFAULT_SITE, id: 1571 } // Use valid post ID from site
  },

  // Pages Tools
  {
    name: 'wp_list_pages',
    description: 'List pages (limited to 2)',
    arguments: { site: DEFAULT_SITE, per_page: 2 }
  },

  // Users Tools
  {
    name: 'wp_list_users',
    description: 'List users (limited to 2)',
    arguments: { site: DEFAULT_SITE, per_page: 2 }
  },
  {
    name: 'wp_get_current_user',
    description: 'Get current user',
    arguments: { site: DEFAULT_SITE }
  },

  // Media Tools
  {
    name: 'wp_list_media',
    description: 'List media files (limited to 2)',
    arguments: { site: DEFAULT_SITE, per_page: 2 }
  },

  // Comments Tools
  {
    name: 'wp_list_comments',
    description: 'List comments (limited to 2)',
    arguments: { site: DEFAULT_SITE, per_page: 2 }
  },

  // Taxonomies Tools
  {
    name: 'wp_list_categories',
    description: 'List categories',
    arguments: { site: DEFAULT_SITE }
  },
  {
    name: 'wp_list_tags',
    description: 'List tags',
    arguments: { site: DEFAULT_SITE }
  },

  // Application Passwords
  {
    name: 'wp_get_application_passwords',
    description: 'Get application passwords',
    arguments: { site: DEFAULT_SITE, user_id: 3 } // Use known user ID
  },

  // Search
  {
    name: 'wp_search_site',
    description: 'Search site content',
    arguments: { site: DEFAULT_SITE, term: 'wordpress' }
  }
];

/**
 * Start MCP server and return process
 */
async function startMCPServer() {
  const serverProcess = spawn('node', [join(rootDir, 'dist/index.js')], {
    cwd: rootDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  // Wait for server to be ready
  await new Promise((resolve) => {
    const rl = readline.createInterface({
      input: serverProcess.stderr,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (line.includes('Server started and connected')) {
        rl.close();
        resolve();
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      rl.close();
      resolve();
    }, 5000);
  });

  return serverProcess;
}

/**
 * Execute a single MCP tool test
 */
async function executeTest(serverProcess, testCase) {
  return new Promise((resolve) => {
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'tools/call',
      params: {
        name: testCase.name,
        arguments: testCase.arguments
      }
    };

    let response = null;
    let responseBuffer = '';

    // Set up response listener
    const rl = readline.createInterface({
      input: serverProcess.stdout,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      responseBuffer += line;
      try {
        response = JSON.parse(responseBuffer);
        rl.close();
        resolve({
          testCase,
          response,
          exitCode: 0
        });
      } catch (e) {
        // Keep accumulating until we have valid JSON
      }
    });

    // Send the request
    serverProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');

    // Timeout after 10 seconds
    setTimeout(() => {
      rl.close();
      if (!response) {
        resolve({
          testCase,
          response: { error: 'Timeout after 10 seconds' },
          exitCode: -1
        });
      }
    }, 10000);
  });
}

/**
 * Format test result for console output
 */
function formatResult(result) {
  const { testCase, response } = result;

  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ${testCase.name}: ${testCase.description}`);
  console.log('='.repeat(80));

  if (response?.result) {
    if (response.result.isError) {
      console.log('❌ FAILED:');
      console.log(response.result.content?.[0]?.text || 'Unknown error');
    } else {
      console.log('✅ SUCCESS:');
      const content = response.result.content?.[0]?.text;
      if (content) {
        // Truncate long responses
        const truncated =
          content.length > 500
            ? content.substring(0, 500) + '...\n[TRUNCATED]'
            : content;
        console.log(truncated);
      }
    }
  } else if (response?.error) {
    console.log('❌ ERROR:');
    console.log(response.error);
  } else {
    console.log('❓ UNKNOWN RESPONSE:');
    console.log(JSON.stringify(response, null, 2));
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🚀 WordPress MCP Server - Tool Test Suite');
  console.log(`📁 Testing from: ${rootDir}`);
  console.log(`🔧 Total tests: ${testCases.length}`);

  // Start MCP server
  console.log('\n🚀 Starting MCP server...');
  const serverProcess = await startMCPServer();
  console.log('✅ MCP server started');

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(
      `\n⏳ Running test ${i + 1}/${testCases.length}: ${testCase.name}...`
    );

    const result = await executeTest(serverProcess, testCase);
    results.push(result);

    formatResult(result);

    // Count success/failure
    if (result.response?.result && !result.response.result.isError) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // Kill server
  serverProcess.kill();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(
    `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%`
  );

  if (failureCount > 0) {
    console.log('\n❌ Failed Tests:');
    results.forEach((result) => {
      if (result.response?.result?.isError || result.response?.error) {
        console.log(
          `   - ${result.testCase.name}: ${result.testCase.description}`
        );
      }
    });
  }

  console.log('\n🎉 Test run completed!');
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});