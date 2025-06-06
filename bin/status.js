#!/usr/bin/env node

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class WordPressStatus {
  constructor() {
    this.envPath = join(rootDir, '.env');
    this.loadConfig();
  }

  loadConfig() {
    if (existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }
  }

  async run() {
    console.log('🔍 WordPress MCP Server Status');
    console.log('==============================\n');

    await this.checkConfiguration();
    await this.checkWordPressConnection();
    await this.checkMCPServer();
    await this.showSummary();
  }

  async checkConfiguration() {
    console.log('📋 Configuration Check');
    console.log('----------------------');

    const requiredVars = ['WORDPRESS_SITE_URL'];
    const missingVars = [];

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: ${this.maskSensitive(varName, process.env[varName])}`);
      } else {
        console.log(`❌ ${varName}: Missing`);
        missingVars.push(varName);
      }
    }

    // Check auth credentials (at least one method should be configured)
    const authMethods = [
      { name: 'Application Password', vars: ['WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD'] },
      { name: 'JWT', vars: ['WORDPRESS_JWT_SECRET', 'WORDPRESS_JWT_USERNAME', 'WORDPRESS_JWT_PASSWORD'] },
      { name: 'OAuth', vars: ['WORDPRESS_OAUTH_CLIENT_ID', 'WORDPRESS_OAUTH_CLIENT_SECRET'] },
      { name: 'Cookie', vars: ['WORDPRESS_COOKIE_NONCE'] }
    ];

    let authConfigured = false;
    for (const method of authMethods) {
      const hasAllVars = method.vars.every(varName => process.env[varName]);
      if (hasAllVars) {
        console.log(`✅ ${method.name} Authentication: Configured`);
        authConfigured = true;
        method.vars.forEach(varName => {
          console.log(`   ${varName}: ${this.maskSensitive(varName, process.env[varName])}`);
        });
        break;
      }
    }

    if (!authConfigured) {
      console.log('❌ Authentication: No valid authentication method configured');
      missingVars.push('Authentication credentials');
    }

    // Optional variables
    const optionalVars = ['DEBUG', 'WORDPRESS_DEBUG', 'CACHE_ENABLED', 'WORDPRESS_TIMEOUT'];
    for (const varName of optionalVars) {
      if (process.env[varName]) {
        console.log(`ℹ️  ${varName}: ${process.env[varName]}`);
      }
    }

    if (missingVars.length > 0) {
      console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
      console.log('Run: npm run setup');
      return false;
    }

    console.log('\n✅ Configuration is complete');
    return true;
  }

  getAuthVars(authMethod) {
    switch (authMethod) {
      case 'application_password':
        return ['USERNAME', 'APPLICATION_PASSWORD'];
      case 'basic':
        return ['USERNAME', 'PASSWORD'];
      case 'jwt':
        return ['USERNAME', 'PASSWORD', 'JWT_SECRET'];
      case 'api_key':
        return ['API_KEY'];
      default:
        return [];
    }
  }

  maskSensitive(varName, value) {
    const sensitiveVars = ['PASSWORD', 'APPLICATION_PASSWORD', 'JWT_SECRET', 'API_KEY', 'API_SECRET'];
    if (sensitiveVars.includes(varName)) {
      return value.length > 4 ? value.substring(0, 4) + '...' : '***';
    }
    return value;
  }

  async checkWordPressConnection() {
    console.log('\n🌐 WordPress Connection Check');
    console.log('-----------------------------');

    if (!process.env.WORDPRESS_SITE_URL) {
      console.log('❌ Cannot test connection - WORDPRESS_SITE_URL not configured');
      return false;
    }

    try {
      const { WordPressClient } = await import('../src/client/api.js');
      const client = new WordPressClient({
        baseUrl: process.env.WORDPRESS_SITE_URL,
        auth: this.getAuthConfig()
      });

      // Test basic connectivity
      console.log('🔄 Testing basic connectivity...');
      const response = await fetch(process.env.WORDPRESS_SITE_URL);
      if (response.ok) {
        console.log('✅ WordPress site is reachable');
      } else {
        console.log(`❌ WordPress site returned status: ${response.status}`);
      }

      // Test REST API
      console.log('🔄 Testing REST API...');
      const apiResponse = await fetch(`${process.env.WORDPRESS_SITE_URL}/wp-json/wp/v2/`);
      if (apiResponse.ok) {
        console.log('✅ WordPress REST API is available');
      } else {
        console.log(`❌ WordPress REST API returned status: ${apiResponse.status}`);
      }

      // Test authentication
      console.log('🔄 Testing authentication...');
      await client.authenticate();
      console.log('✅ Authentication successful');

      // Test basic API call
      console.log('🔄 Testing API access...');
      const posts = await client.get('posts', { per_page: 1 });
      console.log(`✅ API access successful (found ${posts.length} posts)`);

      // Test permissions
      console.log('🔄 Testing permissions...');
      try {
        await client.get('users/me');
        console.log('✅ User permissions verified');
      } catch (error) {
        console.log(`⚠️  Limited permissions: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      return false;
    }
  }

  getAuthConfig() {
    // Try Application Password first
    if (process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
      return {
        method: 'application_password',
        username: process.env.WORDPRESS_USERNAME,
        password: process.env.WORDPRESS_APP_PASSWORD
      };
    }
    
    // Try JWT
    if (process.env.WORDPRESS_JWT_SECRET && process.env.WORDPRESS_JWT_USERNAME && process.env.WORDPRESS_JWT_PASSWORD) {
      return {
        method: 'jwt',
        secret: process.env.WORDPRESS_JWT_SECRET,
        username: process.env.WORDPRESS_JWT_USERNAME,
        password: process.env.WORDPRESS_JWT_PASSWORD
      };
    }
    
    // Try OAuth
    if (process.env.WORDPRESS_OAUTH_CLIENT_ID && process.env.WORDPRESS_OAUTH_CLIENT_SECRET) {
      return {
        method: 'oauth',
        clientId: process.env.WORDPRESS_OAUTH_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_OAUTH_CLIENT_SECRET
      };
    }
    
    // Try Cookie
    if (process.env.WORDPRESS_COOKIE_NONCE) {
      return {
        method: 'cookie',
        nonce: process.env.WORDPRESS_COOKIE_NONCE
      };
    }
    
    return null;
  }

  async checkMCPServer() {
    console.log('\n🔧 MCP Server Check');
    console.log('-------------------');

    try {
      // Check if main server file exists
      const serverPath = join(rootDir, 'src/index.js');
      if (existsSync(serverPath)) {
        console.log('✅ Main server file exists');
      } else {
        console.log('❌ Main server file missing');
        return false;
      }

      // Check tool files
      const toolFiles = [
        'src/tools/posts.js',
        'src/tools/pages.js',
        'src/tools/media.js',
        'src/tools/users.js',
        'src/tools/comments.js',
        'src/tools/taxonomies.js',
        'src/tools/site.js',
        'src/tools/auth.js'
      ];

      let missingTools = 0;
      for (const toolFile of toolFiles) {
        if (existsSync(join(rootDir, toolFile))) {
          console.log(`✅ ${toolFile}`);
        } else {
          console.log(`❌ ${toolFile} missing`);
          missingTools++;
        }
      }

      if (missingTools > 0) {
        console.log(`❌ ${missingTools} tool files missing`);
        return false;
      }

      // Try to import and count tools
      console.log('🔄 Checking tool definitions...');
      const toolCounts = {};
      let totalTools = 0;

      for (const toolFile of toolFiles) {
        try {
          const module = await import(`../${toolFile}`);
          const toolNames = Object.keys(module).filter(name => 
            !name.startsWith('handle') && typeof module[name] === 'object'
          );
          toolCounts[toolFile] = toolNames.length;
          totalTools += toolNames.length;
        } catch (error) {
          console.log(`❌ Error loading ${toolFile}: ${error.message}`);
          return false;
        }
      }

      console.log(`✅ ${totalTools} tools loaded successfully`);
      for (const [file, count] of Object.entries(toolCounts)) {
        console.log(`   ${file}: ${count} tools`);
      }

      return true;

    } catch (error) {
      console.log(`❌ MCP server check failed: ${error.message}`);
      return false;
    }
  }

  async showSummary() {
    console.log('\n📊 Status Summary');
    console.log('=================');

    const checks = [
      await this.checkConfiguration(),
      await this.checkWordPressConnection(),
      await this.checkMCPServer()
    ];

    const passed = checks.filter(Boolean).length;
    const total = checks.length;

    if (passed === total) {
      console.log('🎉 All systems operational!');
      console.log('\nReady to use with Claude Desktop or other MCP clients.');
      console.log('\nUseful commands:');
      console.log('• npm start          - Start the MCP server');
      console.log('• npm test           - Run integration tests');
      console.log('• npm run setup      - Reconfigure settings');
    } else {
      console.log(`❌ ${total - passed} of ${total} checks failed`);
      console.log('\nPlease fix the issues above before using the server.');
      console.log('\nHelp:');
      console.log('• npm run setup      - Run setup wizard');
      console.log('• npm run status     - Check status again');
    }
  }
}

// Run status check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const status = new WordPressStatus();
  status.run().catch(error => {
    console.error('Status check failed:', error);
    process.exit(1);
  });
}

export { WordPressStatus };
