#!/usr/bin/env node

/**
 * Test Script for all MCP WordPress Tools
 * Tests all available tools via MCP JSON-RPC interface
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Test cases for all tools
const testCases = [
  // Authentication Tools
  {
    name: "wp_test_auth",
    description: "Test WordPress authentication",
    arguments: {},
  },
  {
    name: "wp_get_auth_status",
    description: "Get authentication status",
    arguments: {},
  },

  // Site Management Tools
  {
    name: "wp_get_site_settings",
    description: "Get site settings",
    arguments: {},
  },
  {
    name: "wp_get_site_stats",
    description: "Get site statistics",
    arguments: {},
  },

  // Posts Tools
  {
    name: "wp_list_posts",
    description: "List posts (limited to 2)",
    arguments: { per_page: 2 },
  },
  {
    name: "wp_get_post",
    description: "Get specific post",
    arguments: { id: 1571 }, // Use valid post ID from site
  },

  // Pages Tools
  {
    name: "wp_list_pages",
    description: "List pages (limited to 2)",
    arguments: { per_page: 2 },
  },

  // Users Tools
  {
    name: "wp_list_users",
    description: "List users (limited to 2)",
    arguments: { per_page: 2 },
  },
  {
    name: "wp_get_user",
    description: "Get current user",
    arguments: { id: "me" },
  },

  // Media Tools
  {
    name: "wp_list_media",
    description: "List media files (limited to 2)",
    arguments: { per_page: 2 },
  },

  // Comments Tools
  {
    name: "wp_list_comments",
    description: "List comments (limited to 2)",
    arguments: { per_page: 2 },
  },

  // Taxonomies Tools
  {
    name: "wp_list_categories",
    description: "List categories",
    arguments: {},
  },
  {
    name: "wp_list_tags",
    description: "List tags",
    arguments: {},
  },

  // Application Passwords
  {
    name: "wp_get_application_passwords",
    description: "Get application passwords",
    arguments: {},
  },

  // Search
  {
    name: "wp_search_site",
    description: "Search site content",
    arguments: { query: "IT" },
  },
];

/**
 * Get first available post ID from the site
 */
async function getFirstPostId() {
  const listPostsTest = {
    name: "wp_list_posts",
    description: "Get posts to find valid ID",
    arguments: { per_page: 1 },
  };

  const result = await executeTest(listPostsTest);
  if (result.response?.result?.content?.[0]?.text) {
    const match = result.response.result.content[0].text.match(/\(ID: (\d+)\)/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 1571; // Fallback to known working ID
}

/**
 * Execute a single MCP tool test
 */
async function executeTest(testCase) {
  return new Promise((resolve) => {
    const mcpRequest = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 10000),
      method: "tools/call",
      params: {
        name: testCase.name,
        arguments: testCase.arguments,
      },
    };

    const serverProcess = spawn("node", [join(rootDir, "dist/index.js")], {
      cwd: rootDir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let response = null;

    serverProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    serverProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    serverProcess.on("close", (code) => {
      try {
        if (stdout.trim()) {
          response = JSON.parse(stdout.trim());
        }
      } catch (error) {
        response = { error: `Parse error: ${error.message}`, stdout, stderr };
      }

      resolve({
        testCase,
        response,
        stdout,
        stderr,
        exitCode: code,
      });
    });

    // Send the request
    serverProcess.stdin.write(JSON.stringify(mcpRequest) + "\n");
    serverProcess.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill();
        resolve({
          testCase,
          response: { error: "Timeout after 10 seconds" },
          stdout,
          stderr,
          exitCode: -1,
        });
      }
    }, 10000);
  });
}

/**
 * Format test result for console output
 */
function formatResult(result) {
  const { testCase, response } = result;

  console.log("\n" + "=".repeat(80));
  console.log(`🧪 ${testCase.name}: ${testCase.description}`);
  console.log("=".repeat(80));

  if (response?.result) {
    if (response.result.isError) {
      console.log("❌ FAILED:");
      console.log(response.result.content?.[0]?.text || "Unknown error");
    } else {
      console.log("✅ SUCCESS:");
      const content = response.result.content?.[0]?.text;
      if (content) {
        // Truncate long responses
        const truncated =
          content.length > 500
            ? content.substring(0, 500) + "...\n[TRUNCATED]"
            : content;
        console.log(truncated);
      }
    }
  } else if (response?.error) {
    console.log("❌ ERROR:");
    console.log(response.error);
    if (result.stderr) {
      console.log("STDERR:", result.stderr);
    }
  } else {
    console.log("❓ UNKNOWN RESPONSE:");
    console.log(JSON.stringify(response, null, 2));
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log("🚀 WordPress MCP Server - Tool Test Suite");
  console.log(`📁 Testing from: ${rootDir}`);
  console.log(`🔧 Total tests: ${testCases.length}`);

  // Get a valid post ID dynamically
  console.log("\n🔍 Finding valid post ID...");
  const validPostId = await getFirstPostId();
  console.log(`✅ Using post ID: ${validPostId}`);

  // Update the wp_get_post test with the valid ID
  const getPostTest = testCases.find((test) => test.name === "wp_get_post");
  if (getPostTest) {
    getPostTest.arguments.id = validPostId;
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(
      `\n⏳ Running test ${i + 1}/${testCases.length}: ${testCase.name}...`,
    );

    const result = await executeTest(testCase);
    results.push(result);

    formatResult(result);

    // Count success/failure
    if (result.response?.result && !result.response.result.isError) {
      successCount++;
    } else {
      failureCount++;
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(
    `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%`,
  );

  if (failureCount > 0) {
    console.log("\n❌ Failed Tests:");
    results.forEach((result) => {
      if (result.response?.result?.isError || result.response?.error) {
        console.log(
          `   - ${result.testCase.name}: ${result.testCase.description}`,
        );
      }
    });
  }

  console.log("\n🎉 Test run completed!");
  process.exit(failureCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error("❌ Test runner failed:", error);
  process.exit(1);
});
