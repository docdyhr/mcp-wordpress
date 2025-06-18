#!/usr/bin/env node

import { writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class WordPressSetup {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.config = {};
    this.envPath = join(rootDir, '.env');
  }

  async run() {
    try {
      console.log('🔧 WordPress MCP Server Setup');
      console.log('==============================\n');

      await this.detectExistingConfig();
      await this.gatherConfiguration();
      await this.testConnection();
      await this.saveConfiguration();
      await this.showNextSteps();

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async detectExistingConfig() {
    if (existsSync(this.envPath)) {
      const answer = await this.rl.question('⚠️  Existing configuration found. Overwrite? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }
  }

  async gatherConfiguration() {
    console.log('📝 WordPress Site Configuration\n');

    // WordPress URL
    this.config.WORDPRESS_URL = await this.rl.question('WordPress Site URL (e.g., https://example.com): ');
    if (!this.config.WORDPRESS_URL.startsWith('http')) {
      this.config.WORDPRESS_URL = 'https://' + this.config.WORDPRESS_URL;
    }
    this.config.WORDPRESS_URL = this.config.WORDPRESS_URL.replace(/\/$/, '');

    // Authentication method
    console.log('\n🔐 Authentication Method:');
    console.log('1. Application Password (Recommended)');
    console.log('2. Basic Authentication (Username/Password)');
    console.log('3. JWT Token');
    console.log('4. API Key');

    const authChoice = await this.rl.question('Choose authentication method (1-4): ');

    switch (authChoice) {
    case '1':
      await this.setupApplicationPassword();
      break;
    case '2':
      await this.setupBasicAuth();
      break;
    case '3':
      await this.setupJWT();
      break;
    case '4':
      await this.setupAPIKey();
      break;
    default:
      console.log('Invalid choice, defaulting to Application Password');
      await this.setupApplicationPassword();
    }

    // Optional settings
    console.log('\n⚙️  Optional Settings:');
    
    const debugAnswer = await this.rl.question('Enable debug logging? (y/N): ');
    this.config.DEBUG = debugAnswer.toLowerCase() === 'y' ? 'true' : 'false';

    const cacheAnswer = await this.rl.question('Enable caching? (Y/n): ');
    this.config.ENABLE_CACHE = cacheAnswer.toLowerCase() === 'n' ? 'false' : 'true';

    const rateLimit = await this.rl.question('Rate limit (requests per minute, default 60): ');
    this.config.RATE_LIMIT = rateLimit || '60';
  }

  async setupApplicationPassword() {
    this.config.AUTH_METHOD = 'app-password';
    this.config.USERNAME = await this.rl.question('WordPress Username: ');
    
    console.log('\n📱 Application Password Setup:');
    console.log('1. Go to your WordPress admin dashboard');
    console.log('2. Navigate to Users > Profile');
    console.log('3. Scroll to "Application Passwords"');
    console.log('4. Enter "MCP WordPress Server" as the name');
    console.log('5. Click "Add New Application Password"');
    console.log('6. Copy the generated password (it will only be shown once)');
    
    const openBrowser = await this.rl.question('\nOpen WordPress admin in browser? (Y/n): ');
    if (openBrowser.toLowerCase() !== 'n') {
      try {
        await open(`${this.config.WORDPRESS_URL}/wp-admin/profile.php#application-passwords-section`);
      } catch {
        console.log('Could not open browser automatically');
      }
    }

    this.config.APPLICATION_PASSWORD = await this.rl.question('\nPaste Application Password: ');
  }

  async setupBasicAuth() {
    this.config.AUTH_METHOD = 'basic';
    this.config.USERNAME = await this.rl.question('WordPress Username: ');
    this.config.PASSWORD = await this.rl.question('WordPress Password: ');
    
    console.log('\n⚠️  Note: Basic authentication may require additional plugin setup');
  }

  async setupJWT() {
    this.config.AUTH_METHOD = 'jwt';
    this.config.JWT_SECRET = await this.rl.question('JWT Secret Key: ');
    this.config.USERNAME = await this.rl.question('WordPress Username: ');
    this.config.PASSWORD = await this.rl.question('WordPress Password: ');
    
    console.log('\n⚠️  Note: JWT authentication requires JWT Authentication plugin');
  }

  async setupAPIKey() {
    this.config.AUTH_METHOD = 'api-key';
    this.config.API_KEY = await this.rl.question('API Key: ');
    this.config.API_SECRET = await this.rl.question('API Secret (if required): ');
  }

  async ensureBuild() {
    console.log('🔨 Building TypeScript project...');
    try {
      execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
      console.log('✅ Build successful!');
    } catch (error) {
      throw new Error('TypeScript build failed. Please run "npm run build" manually.');
    }
  }

  async testConnection() {
    console.log('\n🔄 Testing WordPress connection...');
    
    // Ensure TypeScript is compiled
    await this.ensureBuild();
    
    try {
      // Create a temporary client to test connection
      const { WordPressClient } = await import('../dist/client/api.js');
      const client = new WordPressClient({
        baseUrl: this.config.WORDPRESS_URL,
        auth: this.getAuthConfig()
      });

      await client.authenticate();
      const sites = await client.get('/wp/v2/');
      
      console.log('✅ Connection successful!');
      console.log(`   Site: ${sites.name || 'WordPress Site'}`);
      console.log(`   URL: ${this.config.WORDPRESS_URL}`);
      
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      const retry = await this.rl.question('Retry with different settings? (y/N): ');
      if (retry.toLowerCase() === 'y') {
        await this.gatherConfiguration();
        return this.testConnection();
      }
      throw error;
    }
  }

  getAuthConfig() {
    switch (this.config.AUTH_METHOD) {
    case 'app-password':
      return {
        method: 'app-password',
        username: this.config.USERNAME,
        appPassword: this.config.APPLICATION_PASSWORD
      };
    case 'basic':
      return {
        method: 'basic',
        username: this.config.USERNAME,
        password: this.config.PASSWORD
      };
    case 'jwt':
      return {
        method: 'jwt',
        secret: this.config.JWT_SECRET,
        username: this.config.USERNAME,
        password: this.config.PASSWORD
      };
    case 'api-key':
      return {
        method: 'api-key',
        apiKey: this.config.API_KEY,
        secret: this.config.API_SECRET
      };
    default:
      throw new Error('Invalid authentication method');
    }
  }

  async saveConfiguration() {
    console.log('\n💾 Saving configuration...');

    // Map config keys to environment variable names
    const envVars = {
      'WORDPRESS_SITE_URL': this.config.WORDPRESS_URL,
      'WORDPRESS_USERNAME': this.config.USERNAME,
      'WORDPRESS_AUTH_METHOD': this.config.AUTH_METHOD
    };

    if (this.config.APPLICATION_PASSWORD) {
      envVars['WORDPRESS_APP_PASSWORD'] = this.config.APPLICATION_PASSWORD;
    }
    if (this.config.PASSWORD) {
      envVars['WORDPRESS_PASSWORD'] = this.config.PASSWORD;
    }
    if (this.config.JWT_SECRET) {
      envVars['WORDPRESS_JWT_SECRET'] = this.config.JWT_SECRET;
    }
    if (this.config.API_KEY) {
      envVars['WORDPRESS_API_KEY'] = this.config.API_KEY;
    }
    if (this.config.API_SECRET) {
      envVars['WORDPRESS_API_SECRET'] = this.config.API_SECRET;
    }

    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    writeFileSync(this.envPath, envContent);
    console.log('✅ Configuration saved to .env file');
  }

  async showNextSteps() {
    console.log('\n🎉 Setup Complete!');
    console.log('==================');
    console.log('\nNext steps:');
    console.log('1. Test the server: npm run status');
    console.log('2. Run integration tests: npm test');
    console.log('3. Start the MCP server: npm start');
    console.log('\nFor Claude Desktop integration:');
    console.log('Add this to your Claude Desktop MCP settings:');
    console.log(`
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["${join(rootDir, 'dist/index.js')}"],
      "env": {
        "WORDPRESS_SITE_URL": "${this.config.WORDPRESS_URL}",
        "WORDPRESS_AUTH_METHOD": "${this.config.AUTH_METHOD}",
        ${this.getEnvVarsForClaudeConfig()}
      }
    }
  }
}
    `);
  }

  getEnvVarsForClaudeConfig() {
    const envVars = [];
    if (this.config.USERNAME) envVars.push(`"WORDPRESS_USERNAME": "${this.config.USERNAME}"`);
    if (this.config.APPLICATION_PASSWORD) envVars.push(`"WORDPRESS_APP_PASSWORD": "${this.config.APPLICATION_PASSWORD}"`);
    if (this.config.PASSWORD) envVars.push(`"WORDPRESS_PASSWORD": "${this.config.PASSWORD}"`);
    if (this.config.JWT_SECRET) envVars.push(`"WORDPRESS_JWT_SECRET": "${this.config.JWT_SECRET}"`);
    if (this.config.API_KEY) envVars.push(`"WORDPRESS_API_KEY": "${this.config.API_KEY}"`);
    if (this.config.API_SECRET) envVars.push(`"WORDPRESS_API_SECRET": "${this.config.API_SECRET}"`);
    return envVars.join(',\n        ');
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new WordPressSetup();
  setup.run();
}

export { WordPressSetup };
