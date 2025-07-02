#!/usr/bin/env node

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class ClaudeIntegrationVerifier {
  constructor() {
    this.envPath = join(rootDir, '.env');
    this.loadConfig();
    this.claudeConfigPath = this.getClaudeConfigPath();
  }

  loadConfig() {
    if (existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }
  }

  getClaudeConfigPath() {
    const platform = process.platform;
    switch (platform) {
    case 'darwin': // macOS
      return join(homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
    case 'win32': // Windows
      return join(process.env.APPDATA || '', 'Claude/claude_desktop_config.json');
    case 'linux': // Linux
      return join(homedir(), '.config/Claude/claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async run() {
    console.log('🔍 Claude Desktop Integration Verification');
    console.log('==========================================\n');

    let allPassed = true;

    // 1. Check local MCP server health
    allPassed &= await this.checkLocalServerHealth();
    console.log('');

    // 2. Check Claude Desktop configuration
    allPassed &= await this.checkClaudeDesktopConfig();
    console.log('');

    // 3. Test MCP server startup
    allPassed &= await this.testMCPServerStartup();
    console.log('');

    // 4. Verify environment variables
    allPassed &= await this.verifyEnvironmentVariables();
    console.log('');

    // 5. Check file permissions
    allPassed &= await this.checkFilePermissions();
    console.log('');

    // Summary
    this.showSummary(allPassed);

    process.exit(allPassed ? 0 : 1);
  }

  async checkLocalServerHealth() {
    console.log('📋 1. Local MCP Server Health Check');
    console.log('-----------------------------------');

    try {
      // Check if dist/index.js exists and is executable
      const serverPath = join(rootDir, 'dist/index.js');
      if (!existsSync(serverPath)) {
        console.log('❌ Server file not found: dist/index.js');
        console.log('   Run: npm run build');
        return false;
      }
      console.log('✅ Server file exists: dist/index.js');

      // Test module import
      try {
        await import(join(rootDir, 'dist/index.js'));
        console.log('✅ Server module loads correctly');
      } catch (error) {
        console.log('❌ Server module failed to load:', error.message);
        return false;
      }

      // Check dependencies
      const nodeModulesPath = join(rootDir, 'node_modules');
      if (!existsSync(nodeModulesPath)) {
        console.log('❌ Dependencies not installed');
        console.log('   Run: npm install');
        return false;
      }
      console.log('✅ Dependencies installed');

      return true;
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      return false;
    }
  }

  async checkClaudeDesktopConfig() {
    console.log('⚙️  2. Claude Desktop Configuration Check');
    console.log('-----------------------------------------');

    try {
      // Check if Claude config file exists
      if (!existsSync(this.claudeConfigPath)) {
        console.log('❌ Claude Desktop config file not found:');
        console.log(`   Expected: ${this.claudeConfigPath}`);
        console.log('   Create the file and add MCP server configuration');
        return false;
      }
      console.log('✅ Claude Desktop config file exists');

      // Read and parse config
      const configContent = await readFile(this.claudeConfigPath, 'utf-8');
      let config;
      try {
        config = JSON.parse(configContent);
      } catch (error) {
        console.log('❌ Invalid JSON in Claude config file');
        return false;
      }
      console.log('✅ Claude config file is valid JSON');

      // Check for MCP servers section
      if (!config.mcpServers) {
        console.log('❌ No mcpServers section in Claude config');
        return false;
      }
      console.log('✅ mcpServers section found');

      // Check for WordPress MCP server
      const wpServer = config.mcpServers['mcp-wordpress'];
      if (!wpServer) {
        console.log('❌ WordPress MCP server not configured in Claude Desktop');
        console.log('   Add \'mcp-wordpress\' server configuration');
        return false;
      }
      console.log('✅ WordPress MCP server configured');

      // Validate server configuration
      const serverPath = join(rootDir, 'dist/index.js');
      if (wpServer.command === 'node' && wpServer.args && wpServer.args[0] === serverPath) {
        console.log('✅ Server path correctly configured');
      } else if (wpServer.command === 'npx' && wpServer.args && wpServer.args[0] === 'mcp-wordpress') {
        console.log('✅ NPX command correctly configured');
      } else {
        console.log('⚠️  Server configuration may need adjustment');
        console.log(`   Current: ${wpServer.command} ${wpServer.args ? wpServer.args.join(' ') : ''}`);
        console.log(`   Expected: node ${serverPath}`);
        console.log('   Or: npx mcp-wordpress');
      }

      return true;
    } catch (error) {
      console.log('❌ Claude Desktop config check failed:', error.message);
      return false;
    }
  }

  async testMCPServerStartup() {
    console.log('🚀 3. MCP Server Startup Test');
    console.log('-----------------------------');

    try {
      // Import and instantiate server
      const { default: MCPWordPressServer } = await import(join(rootDir, 'dist/index.js'));
      const server = new MCPWordPressServer();

      if (!server) {
        console.log('❌ Failed to create MCP server instance');
        return false;
      }
      console.log('✅ MCP server instance created');

      // Check if server has required methods
      if (typeof server.run !== 'function') {
        console.log('❌ Server missing run() method');
        return false;
      }
      console.log('✅ Server has required methods');

      return true;
    } catch (error) {
      console.log('❌ MCP server startup test failed:', error.message);
      return false;
    }
  }

  async verifyEnvironmentVariables() {
    console.log('🔐 4. Environment Variables Check');
    console.log('----------------------------------');

    const requiredVars = ['WORDPRESS_SITE_URL', 'WORDPRESS_USERNAME'];
    const authVars = ['WORDPRESS_APP_PASSWORD', 'WORDPRESS_JWT_PASSWORD', 'WORDPRESS_API_KEY'];

    let allSet = true;

    // Check required variables
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        console.log(`✅ ${varName} is set`);
      } else {
        console.log(`❌ ${varName} is not set`);
        allSet = false;
      }
    }

    // Check authentication variables (at least one should be set)
    const authSet = authVars.some(varName => process.env[varName]);
    if (authSet) {
      console.log('✅ Authentication credentials configured');
    } else {
      console.log('❌ No authentication credentials found');
      console.log('   Set one of: WORDPRESS_APP_PASSWORD, WORDPRESS_JWT_PASSWORD, or WORDPRESS_API_KEY');
      allSet = false;
    }

    // Check .env file
    if (existsSync(this.envPath)) {
      console.log('✅ .env file exists');
    } else {
      console.log('⚠️  .env file not found (using system environment variables)');
    }

    return allSet;
  }

  async checkFilePermissions() {
    console.log('🔒 5. File Permissions Check');
    console.log('-----------------------------');

    try {
      // Check server file permissions
      const serverPath = join(rootDir, 'dist/index.js');
      if (existsSync(serverPath)) {
        console.log('✅ Server file is accessible');
      } else {
        console.log('❌ Server file not accessible');
        return false;
      }

      // Check Claude config file permissions
      if (existsSync(this.claudeConfigPath)) {
        try {
          await readFile(this.claudeConfigPath, 'utf-8');
          console.log('✅ Claude config file is readable');
        } catch (error) {
          console.log('❌ Claude config file is not readable:', error.message);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.log('❌ File permissions check failed:', error.message);
      return false;
    }
  }

  showSummary(allPassed) {
    console.log('📊 Integration Verification Summary');
    console.log('==================================');

    if (allPassed) {
      console.log('🎉 ✅ All checks passed!');
      console.log('');
      console.log('Your WordPress MCP server is ready for Claude Desktop integration.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Restart Claude Desktop to pick up the new configuration');
      console.log('2. Open Claude Desktop and look for WordPress tools');
      console.log('3. Test a simple command like \'List my WordPress posts\'');
      console.log('');
      console.log('Available tools include:');
      console.log('• Post management (create, read, update, delete)');
      console.log('• Page management');
      console.log('• Media library access');
      console.log('• User management');
      console.log('• Comment moderation');
      console.log('• Category and tag management');
      console.log('• Site settings and statistics');
      console.log('• Authentication testing');
    } else {
      console.log('❌ Some checks failed.');
      console.log('');
      console.log('Please resolve the issues above before using with Claude Desktop.');
      console.log('');
      console.log('Common solutions:');
      console.log('• Run \'npm run build\' to compile TypeScript');
      console.log('• Run \'npm install\' to install dependencies');
      console.log('• Run \'npm run setup\' to configure environment');
      console.log('• Check Claude Desktop config file syntax');
      console.log('• Verify WordPress credentials are correct');
    }
  }
}

// Run the verifier
const verifier = new ClaudeIntegrationVerifier();
verifier.run().catch(error => {
  console.error('❌ Verification failed with error:', error.message);
  process.exit(1);
});
