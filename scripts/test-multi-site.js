#!/usr/bin/env node

/**
 * Multi-Site Integration Test
 * Tests the multi-site functionality of the MCP WordPress server
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function testMultiSiteConfiguration() {
  log(`\n${colors.bold}${colors.cyan}🌐 Multi-Site Configuration Test${colors.reset}`);
  log('============================================================');

  try {
    // Check if config file exists
    const configPath = path.resolve(rootDir, 'mcp-wordpress.config.json');
    if (!fs.existsSync(configPath)) {
      error('mcp-wordpress.config.json not found');
      return false;
    }
    success('Configuration file found');

    // Parse config
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (!config.sites || !Array.isArray(config.sites)) {
      error('Invalid configuration: sites array missing');
      return false;
    }
    success(`Found ${config.sites.length} site configurations`);

    // Validate each site
    for (const site of config.sites) {
      if (!site.id || !site.name || !site.config) {
        error(`Invalid site configuration: ${JSON.stringify(site)}`);
        return false;
      }
      
      if (!site.config.WORDPRESS_SITE_URL || !site.config.WORDPRESS_USERNAME || !site.config.WORDPRESS_APP_PASSWORD) {
        error(`Missing required configuration for site ${site.id}`);
        return false;
      }
      
      success(`Site ${site.id} (${site.name}) configuration valid`);
      info(`  URL: ${site.config.WORDPRESS_SITE_URL}`);
      info(`  Username: ${site.config.WORDPRESS_USERNAME}`);
      info(`  Auth Method: ${site.config.WORDPRESS_AUTH_METHOD || 'app-password'}`);
    }

    return true;
  } catch (err) {
    error(`Configuration test failed: ${err.message}`);
    return false;
  }
}

async function testServerInitialization() {
  log(`\n${colors.bold}${colors.cyan}🚀 Server Initialization Test${colors.reset}`);
  log('============================================================');

  try {
    // Import the server class
    const { default: MCPWordPressServer } = await import('../dist/index.js');
    
    // Create server instance
    info('Creating server instance...');
    const server = new MCPWordPressServer();
    success('Server instance created successfully');
    
    // Test that server has the expected properties
    if (typeof server.run !== 'function') {
      error('Server missing run method');
      return false;
    }
    
    if (typeof server.shutdown !== 'function') {
      error('Server missing shutdown method');
      return false;
    }
    
    success('Server has required methods');
    return true;
  } catch (err) {
    error(`Server initialization failed: ${err.message}`);
    return false;
  }
}

async function testClientConnections() {
  log(`\n${colors.bold}${colors.cyan}🔌 Client Connection Test${colors.reset}`);
  log('============================================================');

  try {
    // Import client and config
    const { WordPressClient } = await import('../dist/client/api.js');
    const configPath = path.resolve(rootDir, 'mcp-wordpress.config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    let successCount = 0;
    let totalSites = config.sites.length;

    for (const site of config.sites) {
      info(`Testing connection to ${site.name} (${site.id})...`);
      
      try {
        const clientConfig = {
          baseUrl: site.config.WORDPRESS_SITE_URL,
          auth: {
            method: site.config.WORDPRESS_AUTH_METHOD || 'app-password',
            username: site.config.WORDPRESS_USERNAME,
            appPassword: site.config.WORDPRESS_APP_PASSWORD,
          },
        };

        const client = new WordPressClient(clientConfig);
        
        // Test connection
        await client.ping();
        success(`${site.name}: Connection successful`);
        
        // Test authentication by getting current user
        const user = await client.getCurrentUser();
        info(`  Authenticated as: ${user.name} (${user.username})`);
        
        successCount++;
      } catch (err) {
        error(`${site.name}: Connection failed - ${err.message}`);
      }
    }

    log('\n' + '='.repeat(60));
    if (successCount === totalSites) {
      success(`All ${totalSites} sites connected successfully`);
      return true;
    } else {
      warning(`${successCount}/${totalSites} sites connected successfully`);
      return false;
    }
  } catch (err) {
    error(`Connection test failed: ${err.message}`);
    return false;
  }
}

async function main() {
  log(`${colors.bold}${colors.magenta}\n🧪 MCP WordPress Multi-Site Integration Test${colors.reset}`);
  log('============================================================');
  
  const tests = [
    { name: 'Multi-Site Configuration', fn: testMultiSiteConfiguration },
    { name: 'Server Initialization', fn: testServerInitialization },
    { name: 'Client Connections', fn: testClientConnections }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    const passed = await test.fn();
    if (passed) {
      passedTests++;
    }
  }

  // Summary
  log(`\n${colors.bold}📊 Test Summary${colors.reset}`);
  log('============================================================');
  log(`Tests Passed: ${passedTests}/${totalTests}`);
  log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    success('🎉 All multi-site integration tests passed!');
    process.exit(0);
  } else {
    error('❌ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Run the tests
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});