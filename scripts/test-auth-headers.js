#!/usr/bin/env node

/**
 * Test WordPress API client authentication headers
 */

import { WordPressClient } from "../dist/client/api.js";

async function testAuthHeaders() {
  console.log("🔍 Testing WordPress API Client Authentication Headers\n");

  const client = new WordPressClient({
    baseUrl: process.env.WORDPRESS_SITE_URL || "http://localhost:8080",
    auth: {
      method: "app-password",
      username: process.env.WORDPRESS_USERNAME || "test_user",
      appPassword: process.env.WORDPRESS_APP_PASSWORD || "xxxx xxxx xxxx xxxx xxxx xxxx",
    },
  });

  // Test authentication
  try {
    console.log("1️⃣ Initializing client (testing authentication)...");
    await client.initialize();
    console.log("✅ Authentication successful\n");
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);
    return;
  }

  // Test GET request
  try {
    console.log("2️⃣ Testing GET request...");
    const posts = await client.getPosts({ per_page: 1 });
    console.log(`✅ GET request successful - Found ${posts.length} posts\n`);
  } catch (error) {
    console.error("❌ GET request failed:", error.message);
  }

  // Test POST request
  try {
    console.log("3️⃣ Testing POST request...");
    const newPost = await client.createPost({
      title: "Test Post - Auth Headers",
      content: "Testing authentication headers in POST request",
      status: "draft",
    });
    console.log(`✅ POST request successful - Created post ID: ${newPost.id}`);

    // Clean up
    await client.deletePost(newPost.id, true);
    console.log("✅ Test post cleaned up\n");
  } catch (error) {
    console.error("❌ POST request failed:", error.message);
    if (error.statusCode) {
      console.error(`   Status Code: ${error.statusCode}`);
    }
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
  }
}

testAuthHeaders().catch(console.error);
