/**
 * CommonJS Jest configuration for VS Code Test Explorer compatibility
 * This file makes Jest tests discoverable in VS Code Testing panel
 */

const baseConfig = require('./jest.typescript.config.json');

module.exports = {
  // Use the EXACT base configuration
  ...baseConfig,
  
  // Standard test exclusions
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    "/node_modules/",
    "/dist/",
    "/coverage/"
  ],
  
  // The base config already has the correct setup
};
