/**
 * CommonJS Jest configuration for VS Code Test Explorer compatibility
 * This file makes Jest tests discoverable in VS Code Testing panel
 */

const baseConfig = require('./jest.typescript.config.json');

module.exports = {
  ...baseConfig,
  // Remove invalid options for clean config
  preset: undefined,
  transform: undefined,
  // Use simpler test patterns for VS Code discovery
  testMatch: [
    "<rootDir>/tests/**/*.test.js"
  ],
  // Ensure VS Code can find tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/"
  ]
};
