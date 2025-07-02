#!/usr/bin/env node

/**
 * Quick test script to verify multi-site configuration
 */

import { WordPressClient } from '../dist/client/api.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(dirname(__dirname), 'mcp-wordpress.config.json');

console.log('🌐 Testing Multi-Site Configuration\n');

if (!existsSync(configPath)) {
  console.error('❌ mcp-wordpress.config.json not found!');
  console.log('\nCreate a multi-site configuration file with your WordPress sites.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf-8'));

async function testSite(site) {
  console.log(`\n📍 Testing ${site.name} (${site.id})`);
  console.log('─'.repeat(40));
  
  try {
    const client = new WordPressClient({
      baseUrl: site.config.WORDPRESS_SITE_URL,
      auth: {
        method: site.config.WORDPRESS_AUTH_METHOD || 'app-password',
        username: site.config.WORDPRESS_USERNAME,
        appPassword: site.config.WORDPRESS_APP_PASSWORD,
        password: site.config.WORDPRESS_PASSWORD,
        secret: site.config.WORDPRESS_JWT_SECRET
      }
    });

    // Test API connectivity
    process.stdout.write('  🔌 API Connection... ');
    const apiInfo = await client.get('/');
    console.log('✅');

    // Test authentication
    process.stdout.write('  🔐 Authentication... ');
    const user = await client.get('/users/me');
    console.log(`✅ (${user.name})`);

    // Test content access
    process.stdout.write('  📝 Content Access... ');
    const posts = await client.get('/posts', { per_page: 1 });
    console.log(`✅ (${posts.length} posts)`);

    console.log(`  ✅ All tests passed for ${site.id}!`);
    return true;
  } catch (error) {
    console.log(`\n  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!config.sites || config.sites.length === 0) {
    console.error('❌ No sites configured in mcp-wordpress.config.json');
    process.exit(1);
  }

  console.log(`Found ${config.sites.length} sites in configuration:`);
  config.sites.forEach(site => {
    console.log(`  • ${site.name} (${site.id}): ${site.config.WORDPRESS_SITE_URL}`);
  });

  let passed = 0;
  let failed = 0;

  for (const site of config.sites) {
    const success = await testSite(site);
    if (success) passed++;
    else failed++;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success Rate: ${Math.round((passed / config.sites.length) * 100)}%`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some sites failed. Check your configuration and credentials.');
    process.exit(1);
  } else {
    console.log('\n🎉 All sites are working correctly!');
  }
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});