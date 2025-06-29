#!/usr/bin/env node

/**
 * Integration tests for WordPress MCP Server
 * Tests actual API connectivity and multi-site functionality
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { WordPressClient } from '../dist/client/api.js';
import { debug } from '../dist/utils/debug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
config({ path: join(projectRoot, '.env') });

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Log helper with colors
 */
function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ️${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`
  };

  console.log(`${prefix[type] || ''} ${message}`);
}

/**
 * Run a single test
 */
async function runTest(name, testFn) {
  totalTests++;
  process.stdout.write(`🧪 ${name}... `);
  
  try {
    await testFn();
    passedTests++;
    console.log(`${colors.green}✅ PASSED${colors.reset}`);
    return true;
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}❌ FAILED${colors.reset}`);
    console.log(`   ${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test single-site configuration
 */
async function testSingleSiteConfig() {
  if (!process.env.WORDPRESS_SITE_URL) {
    log('Skipping single-site tests (no .env configuration)', 'warning');
    return;
  }

  console.log(`\n${colors.bright}📝 Single-Site Configuration Tests${colors.reset}`);
  console.log('='.repeat(50));

  await runTest('WordPress API connectivity', async () => {
    const client = new WordPressClient({
      baseUrl: process.env.WORDPRESS_SITE_URL,
      auth: {
        method: 'app-password',
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD
      }
    });

    const response = await client.get('/');
    if (!response.name) {
      throw new Error('Invalid API response');
    }
  });

  await runTest('Authenticated user access', async () => {
    const client = new WordPressClient({
      baseUrl: process.env.WORDPRESS_SITE_URL,
      auth: {
        method: 'app-password',
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD
      }
    });

    const user = await client.get('/users/me');
    if (!user.id) {
      throw new Error('Failed to get authenticated user');
    }
  });

  await runTest('List posts', async () => {
    const client = new WordPressClient({
      baseUrl: process.env.WORDPRESS_SITE_URL,
      auth: {
        method: 'app-password',
        username: process.env.WORDPRESS_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD
      }
    });

    const posts = await client.get('/posts', { per_page: 5 });
    if (!Array.isArray(posts)) {
      throw new Error('Expected array of posts');
    }
  });
}

/**
 * Test multi-site configuration
 */
async function testMultiSiteConfig() {
  const configPath = join(projectRoot, 'mcp-wordpress.config.json');
  
  if (!existsSync(configPath)) {
    log('Skipping multi-site tests (no config file)', 'warning');
    return;
  }

  console.log(`\n${colors.bright}🌐 Multi-Site Configuration Tests${colors.reset}`);
  console.log('='.repeat(50));

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  if (!config.sites || !Array.isArray(config.sites)) {
    log('Invalid multi-site configuration', 'error');
    return;
  }

  for (const site of config.sites) {
    console.log(`\n${colors.cyan}Testing site: ${site.name} (${site.id})${colors.reset}`);
    
    await runTest(`API connectivity for ${site.id}`, async () => {
      const authConfig = {
        method: site.config.WORDPRESS_AUTH_METHOD || 'app-password',
        username: site.config.WORDPRESS_USERNAME,
        appPassword: site.config.WORDPRESS_APP_PASSWORD,
        password: site.config.WORDPRESS_JWT_PASSWORD,
        secret: site.config.WORDPRESS_JWT_SECRET
      };

      const client = new WordPressClient({
        baseUrl: site.config.WORDPRESS_SITE_URL,
        auth: authConfig
      });

      const response = await client.get('/');
      if (!response.name) {
        throw new Error('Invalid API response');
      }
    });

    await runTest(`List posts for ${site.id}`, async () => {
      const authConfig = {
        method: site.config.WORDPRESS_AUTH_METHOD || 'app-password',
        username: site.config.WORDPRESS_USERNAME,
        appPassword: site.config.WORDPRESS_APP_PASSWORD,
        password: site.config.WORDPRESS_JWT_PASSWORD,
        secret: site.config.WORDPRESS_JWT_SECRET
      };

      const client = new WordPressClient({
        baseUrl: site.config.WORDPRESS_SITE_URL,
        auth: authConfig
      });

      const posts = await client.get('/posts', { per_page: 1 });
      if (!Array.isArray(posts)) {
        throw new Error('Expected array of posts');
      }
    });
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}🧪 WordPress MCP Server - Integration Tests${colors.reset}`);
  console.log('='.repeat(60));
  
  try {
    // Test single-site configuration
    await testSingleSiteConfig();
    
    // Test multi-site configuration
    await testMultiSiteConfig();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}📊 Test Summary${colors.reset}`);
    console.log('='.repeat(60));
    
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    log(`Total Tests: ${totalTests}`, 'info');
    log(`Passed: ${passedTests}`, passedTests > 0 ? 'success' : 'info');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
    log(`Success Rate: ${successRate}%`, successRate === 100 ? 'success' : 'warning');
    
    if (failedTests === 0 && totalTests > 0) {
      console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
    } else if (failedTests > 0) {
      console.log(`\n${colors.red}⚠️ Some tests failed. Check your configuration.${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    debug.error('Integration test error:', error);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
