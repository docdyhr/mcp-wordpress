/**
 * Jest setup file for tests with environment
 */
/* eslint-env node */
const path = require("path");
const fs = require("fs");

// Load test environment variables if they exist
const envTestPath = path.join(__dirname, "..", ".env.test");
if (fs.existsSync(envTestPath)) {
  const dotenv = require("dotenv");
  dotenv.config({ path: envTestPath });
  console.log("✅ Loaded test environment variables");
} else {
  console.log("⚠️  No .env.test file found - using default test configuration");
}

// Set test defaults
if (!process.env.WORDPRESS_TEST_URL) {
  process.env.WORDPRESS_TEST_URL = "http://localhost:8081";
}

if (!process.env.WORDPRESS_USERNAME) {
  process.env.WORDPRESS_USERNAME = "testuser";
}

if (!process.env.WORDPRESS_AUTH_METHOD) {
  process.env.WORDPRESS_AUTH_METHOD = "app-password";
}

// Increase timeout for integration tests
jest.setTimeout(30000);
