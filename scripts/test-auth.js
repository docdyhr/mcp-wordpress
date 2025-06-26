#!/usr/bin/env node

/**
 * WordPress MCP Server - Authentication Test Script
 * Tests all authentication methods supported by the WordPress MCP server
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Import dependencies
import { WordPressClient } from "../dist/client/api.js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

config({ path: join(projectRoot, ".env") });

// Simple console logging with colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = (message, type = "info") => {
  const prefix = {
    info: `${colors.blue}ℹ️${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`,
    test: `${colors.cyan}🧪${colors.reset}`,
  }[type];
  console.log(`${prefix} ${message}`);
};

const runAuthTest = async (config, testName) => {
  log(`Testing ${testName}...`, "test");

  try {
    // Add longer timeout for authentication tests
    const clientConfig = {
      ...config,
      timeout: 60000, // 60 seconds
      maxRetries: 2, // Reduce retries for faster feedback
    };

    const client = new WordPressClient(clientConfig);

    // Test connection by getting current user with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Authentication test timeout after 60 seconds")),
        60000,
      ),
    );

    const user = await Promise.race([client.getCurrentUser(), timeoutPromise]);

    if (user && user.id) {
      log(`${testName}: Authentication successful`, "success");
      log(`  User: ${user.name || "Unknown"} (${user.username || "N/A"})`);
      log(`  ID: ${user.id}`);
      log(`  Email: ${user.email || "N/A"}`);
      log(`  Site: ${config.baseUrl}`);
      return true;
    } else {
      log(`${testName}: Invalid user response`, "error");
      return false;
    }
  } catch (error) {
    // Provide more detailed error information
    if (error.message.includes("timeout")) {
      log(
        `${testName}: Connection timeout - check network or server status`,
        "error",
      );
    } else if (error.message.includes("401") || error.message.includes("403")) {
      log(`${testName}: Authentication failed - check credentials`, "error");
    } else {
      log(`${testName}: Authentication failed - ${error.message}`, "error");
    }
    return false;
  }
};

const main = async () => {
  console.log(
    `${colors.bright}${colors.blue}\n🔐 WordPress MCP Server - Authentication Test Suite${colors.reset}`,
  );
  console.log("=".repeat(60));

  const siteUrl = process.env.WORDPRESS_SITE_URL;
  const username = process.env.WORDPRESS_USERNAME;

  if (!siteUrl) {
    log("WORDPRESS_SITE_URL is not configured", "error");
    process.exit(1);
  }

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Application Passwords (Primary method)
  if (process.env.WORDPRESS_APP_PASSWORD && username) {
    totalTests++;
    const config = {
      baseUrl: siteUrl,
      auth: {
        method: "app-password",
        username,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
      },
    };

    if (await runAuthTest(config, "Application Passwords")) {
      passedTests++;
    }
  } else {
    log(
      "Application Passwords: Skipped (credentials not configured)",
      "warning",
    );
  }

  // Test 2: JWT Authentication
  if (
    process.env.WORDPRESS_JWT_SECRET &&
    username &&
    process.env.WORDPRESS_PASSWORD
  ) {
    totalTests++;
    const config = {
      baseUrl: siteUrl,
      auth: {
        method: "jwt",
        username,
        password: process.env.WORDPRESS_PASSWORD,
        secret: process.env.WORDPRESS_JWT_SECRET,
      },
    };

    if (await runAuthTest(config, "JWT Authentication")) {
      passedTests++;
    }
  } else {
    log("JWT Authentication: Skipped (credentials not configured)", "warning");
  }

  // Test 3: Basic Authentication (Development only)
  if (process.env.WORDPRESS_PASSWORD && username) {
    totalTests++;
    const config = {
      baseUrl: siteUrl,
      auth: {
        method: "basic",
        username,
        password: process.env.WORDPRESS_PASSWORD,
      },
    };

    if (await runAuthTest(config, "Basic Authentication")) {
      passedTests++;
    }
  } else {
    log(
      "Basic Authentication: Skipped (credentials not configured)",
      "warning",
    );
  }

  // Test 4: API Key Authentication
  if (process.env.WORDPRESS_API_KEY) {
    totalTests++;
    const config = {
      baseUrl: siteUrl,
      auth: {
        method: "api-key",
        apiKey: process.env.WORDPRESS_API_KEY,
      },
    };

    if (await runAuthTest(config, "API Key Authentication")) {
      passedTests++;
    }
  } else {
    log(
      "API Key Authentication: Skipped (credentials not configured)",
      "warning",
    );
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`${colors.bright}📊 Authentication Test Summary${colors.reset}`);
  console.log("=".repeat(60));

  if (totalTests === 0) {
    log("No authentication methods configured for testing", "warning");
    log(
      "Please configure at least one authentication method in your .env file:",
      "info",
    );
    log("  - WORDPRESS_APP_PASSWORD (recommended)");
    log("  - WORDPRESS_JWT_SECRET + WORDPRESS_PASSWORD");
    log("  - WORDPRESS_PASSWORD (for basic auth)");
    log("  - WORDPRESS_API_KEY");
  } else {
    const successRate = Math.round((passedTests / totalTests) * 100);

    log(
      `Tests Passed: ${passedTests}/${totalTests}`,
      passedTests === totalTests ? "success" : "warning",
    );
    log(
      `Success Rate: ${successRate}%`,
      successRate === 100 ? "success" : "warning",
    );

    if (passedTests === totalTests) {
      log("All configured authentication methods are working!", "success");
    } else {
      log(
        "Some authentication methods failed. Check your configuration.",
        "warning",
      );
    }
  }

  console.log(
    `\n${colors.cyan}Tip: Use Application Passwords for the most secure and reliable authentication.${colors.reset}`,
  );
  console.log(
    `${colors.cyan}Generate them in WordPress Admin → Users → Your Profile → Application Passwords${colors.reset}`,
  );

  if (failureCount > 0) {
    console.log(
      `\n${colors.yellow}Troubleshooting failed tests:${colors.reset}`,
    );
    console.log(
      `${colors.cyan}• Check network connectivity to WordPress site${colors.reset}`,
    );
    console.log(
      `${colors.cyan}• Verify authentication credentials are correct${colors.reset}`,
    );
    console.log(
      `${colors.cyan}• Run ./scripts/wp-auth-check.sh for quick verification${colors.reset}`,
    );
    console.log(
      `${colors.cyan}• Increase timeout if tests are timing out${colors.reset}\n`,
    );
  } else {
    console.log("");
  }

  process.exit(passedTests === totalTests ? 0 : 1);
};

main().catch((error) => {
  log(`Fatal error: ${error.message}`, "error");
  console.error(error.stack);
  process.exit(1);
});
