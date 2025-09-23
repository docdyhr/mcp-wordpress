#!/usr/bin/env node

/**
 * Debug authentication headers in WordPress API client
 */

import { WordPressClient } from "../dist/client/api.js";

// Import node-fetch and monkey patch it
import fetch from "node-fetch";

// Store original fetch
const originalFetch = fetch;

// Create a wrapper that logs headers
const loggingFetch = async (url, options) => {
  console.log("\n📡 HTTP Request:");
  console.log(`   URL: ${url}`);
  console.log(`   Method: ${options?.method || "GET"}`);
  console.log("   Headers:", JSON.stringify(options?.headers || {}, null, 2));

  // Check for Authorization header
  const authHeader = options?.headers?.["Authorization"];
  if (authHeader) {
    console.log(`   ✅ Authorization header present: ${authHeader.substring(0, 20)}...`);
  } else {
    console.log("   ❌ No Authorization header found!");
  }

  // Don't actually make the request for this test
  throw new Error("Test complete - not making actual request");
};

async function debugAuth() {
  const config = {
    baseUrl: "https://example.com", // Use a dummy URL for testing
    auth: {
      method: "app-password",
      username: "testuser",
      appPassword: "xxxx yyyy zzzz aaaa bbbb cccc",
    },
  };

  console.log("🔧 WordPress Client Configuration:");
  console.log(JSON.stringify(config, null, 2));

  const client = new WordPressClient(config);

  // Check if addAuthHeaders method is working
  const headers = {};
  client.addAuthHeaders(headers);

  console.log("\n🔑 Generated Auth Headers:");
  console.log(JSON.stringify(headers, null, 2));

  // Calculate expected header
  const expectedAuth = Buffer.from(`${config.auth.username}:${config.auth.appPassword}`).toString("base64");
  console.log(`\n📊 Expected Authorization: Basic ${expectedAuth}`);

  // Try a request (will fail but we'll see the headers)
  try {
    console.log("\n🧪 Testing actual request...");
    await client.getPosts({ per_page: 1 });
  } catch (error) {
    console.log("\n⚠️  Request failed (expected with dummy URL)");
  }
}

debugAuth().catch(console.error);
