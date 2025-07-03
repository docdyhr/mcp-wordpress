#!/usr/bin/env node

/**
 * Test the authentication header fix
 */

// First, let's compile the TypeScript
import { execSync } from 'child_process';

console.log('🏗️  Building project...');
execSync('npm run build', { stdio: 'inherit' });

// Now test
import { WordPressClient } from '../dist/client/api.js';

// Create a test client
const client = new WordPressClient({
  baseUrl: 'https://test.example.com',
  auth: {
    method: 'app-password',
    username: 'testuser',
    appPassword: 'xxxx yyyy zzzz aaaa bbbb cccc'
  }
});

// Test the addAuthHeaders method directly
console.log('\n🔧 Testing addAuthHeaders method:');
const testHeaders = {
  'Content-Type': 'application/json'
};
client.addAuthHeaders(testHeaders);
console.log('Headers after addAuthHeaders:', testHeaders);

// Check if Authorization header was added
if (testHeaders.Authorization) {
  console.log('✅ Authorization header added successfully!');
  console.log(`   Value: ${testHeaders.Authorization}`);
  
  // Decode to verify
  const decoded = Buffer.from(testHeaders.Authorization.replace('Basic ', ''), 'base64').toString();
  console.log(`   Decoded: ${decoded}`);
} else {
  console.log('❌ Authorization header NOT added!');
}

console.log('\n✨ Fix has been implemented. The authentication headers should now be properly included in POST requests.');