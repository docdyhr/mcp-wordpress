/**
 * CommonJS Jest configuration for VS Code Test Explorer compatibility
 * This file makes Jest tests discoverable in VS Code Testing panel
 */

const baseConfig = require('./jest.typescript.config.json');

module.exports = {
  // Use the EXACT base configuration
  ...baseConfig,
  
  // Add explicit exclusion for disabled tests
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/_disabled/"
  ],
  
  // The base config already has the correct setup
};
