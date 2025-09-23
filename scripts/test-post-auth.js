#!/usr/bin/env node

/**
 * Test script to debug WordPress REST API POST authentication issues
 */

import fetch from "node-fetch";

// Configuration
const SITE_URL = process.env.WORDPRESS_SITE_URL || "http://localhost:8080";
const USERNAME = process.env.WORDPRESS_USERNAME || "test_user";
const APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD || "";

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAuth() {
  log("\n🔍 WordPress REST API POST Authentication Test", "blue");
  log("================================================", "blue");

  if (!APP_PASSWORD) {
    log("❌ Error: WORDPRESS_APP_PASSWORD not set", "red");
    process.exit(1);
  }

  // Create auth header
  const auth = Buffer.from(`${USERNAME}:${APP_PASSWORD}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    "User-Agent": "MCP-WordPress-Test/1.0.0",
  };

  log(`\n📋 Test Configuration:`, "yellow");
  log(`- Site URL: ${SITE_URL}`);
  log(`- Username: ${USERNAME}`);
  log(`- App Password: ${APP_PASSWORD.substring(0, 10)}... (${APP_PASSWORD.length} chars)`);
  log(`- Auth Header: Basic ${auth.substring(0, 20)}...`);

  // Test 1: GET request (should work)
  log("\n1️⃣ Testing GET request to /wp-json/wp/v2/posts", "yellow");
  try {
    const getResponse = await fetch(`${SITE_URL}/wp-json/wp/v2/posts?per_page=1`, {
      headers,
    });

    log(`Response Status: ${getResponse.status} ${getResponse.statusText}`, getResponse.ok ? "green" : "red");

    // Log response headers
    log("\nResponse Headers:");
    for (const [key, value] of getResponse.headers.entries()) {
      if (key.toLowerCase().includes("auth") || key.toLowerCase().includes("allow")) {
        log(`  ${key}: ${value}`);
      }
    }

    if (getResponse.ok) {
      const data = await getResponse.json();
      log(`✅ GET request successful - Found ${data.length} posts`, "green");
    } else {
      const error = await getResponse.text();
      log(`❌ GET request failed: ${error}`, "red");
    }
  } catch (error) {
    log(`❌ GET request error: ${error.message}`, "red");
  }

  // Test 2: Check current user (verify auth is working)
  log("\n2️⃣ Testing GET request to /wp-json/wp/v2/users/me", "yellow");
  try {
    const userResponse = await fetch(`${SITE_URL}/wp-json/wp/v2/users/me`, {
      headers,
    });

    log(`Response Status: ${userResponse.status} ${userResponse.statusText}`, userResponse.ok ? "green" : "red");

    if (userResponse.ok) {
      const user = await userResponse.json();
      log(`✅ Authentication verified - User: ${user.name} (ID: ${user.id})`, "green");
      log(`   Capabilities: ${Object.keys(user.capabilities || {}).join(", ")}`);
    } else {
      const error = await userResponse.text();
      log(`❌ User verification failed: ${error}`, "red");
    }
  } catch (error) {
    log(`❌ User verification error: ${error.message}`, "red");
  }

  // Test 3: POST request (this usually fails)
  log("\n3️⃣ Testing POST request to /wp-json/wp/v2/posts", "yellow");
  const postData = {
    title: "Test Post - Authentication Debug",
    content: "This is a test post to debug authentication issues",
    status: "draft",
  };

  try {
    log("Request Body:", "blue");
    log(JSON.stringify(postData, null, 2));

    const postResponse = await fetch(`${SITE_URL}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    log(`\nResponse Status: ${postResponse.status} ${postResponse.statusText}`, postResponse.ok ? "green" : "red");

    // Log all response headers for debugging
    log("\nResponse Headers:");
    for (const [key, value] of postResponse.headers.entries()) {
      log(`  ${key}: ${value}`);
    }

    const responseBody = await postResponse.text();

    if (postResponse.ok) {
      const post = JSON.parse(responseBody);
      log(`✅ POST request successful - Created post ID: ${post.id}`, "green");

      // Clean up test post
      log("\n🧹 Cleaning up test post...", "yellow");
      const deleteResponse = await fetch(`${SITE_URL}/wp-json/wp/v2/posts/${post.id}?force=true`, {
        method: "DELETE",
        headers,
      });

      if (deleteResponse.ok) {
        log("✅ Test post deleted", "green");
      }
    } else {
      log(`\n❌ POST request failed:`, "red");
      try {
        const error = JSON.parse(responseBody);
        log(`Code: ${error.code}`, "red");
        log(`Message: ${error.message}`, "red");
        if (error.data) {
          log(`Data: ${JSON.stringify(error.data)}`, "red");
        }
      } catch {
        log(responseBody, "red");
      }
    }
  } catch (error) {
    log(`❌ POST request error: ${error.message}`, "red");
  }

  // Test 4: Try alternative auth methods
  log("\n4️⃣ Testing alternative authentication headers", "yellow");

  // Try with X-WP-Nonce if available
  try {
    // First, try to get a nonce
    const nonceResponse = await fetch(`${SITE_URL}/wp-json/`, {
      headers,
    });

    const wpHeaders = nonceResponse.headers.get("x-wp-nonce");
    if (wpHeaders) {
      log(`Found X-WP-Nonce: ${wpHeaders}`, "green");
    }
  } catch (error) {
    log("Could not retrieve nonce", "yellow");
  }

  // Summary
  log("\n📊 Summary", "blue");
  log("==========", "blue");
  log("- Check if your .htaccess includes Authorization header preservation");
  log('- Verify WP_ENVIRONMENT_TYPE is set to "local" for Docker environments');
  log("- Ensure application password was generated from user profile page");
  log("- Check for security plugins that might block REST API");

  log("\n💡 Quick Fix Command:", "yellow");
  log("npm run fix:rest-auth", "green");
}

// Run the test
testAuth().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  process.exit(1);
});
