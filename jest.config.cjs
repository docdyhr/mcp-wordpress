/**
 * CommonJS Jest configuration for VS Code Test Explorer compatibility
 * This file makes Jest tests discoverable in VS Code Testing panel
 */

const baseConfig = require('./jest.typescript.config.json');

module.exports = {
  // Keep ALL the working configuration from base
  ...baseConfig,
  
  // Only override test discovery patterns for VS Code
  testMatch: [
    "<rootDir>/tests/**/*.test.js",
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/src/**/__tests__/**/*.test.js",
    "<rootDir>/src/**/__tests__/**/*.test.ts"
  ],
  
  // Keep test path ignores
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/"
  ]
  
  // DO NOT override preset, transform, or other working config!
  // The base config has the correct TypeScript setup
};
