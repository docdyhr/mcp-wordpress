/**
 * Performance Monitoring MCP Tools for WordPress Server
 *
 * This module has been refactored into a modular structure.
 * The implementation is now in ./performance/ directory:
 * - PerformanceTools.ts: Main tool class with 6 MCP tools
 * - PerformanceHelpers.ts: Extracted helper/utility functions
 *
 * This file re-exports for backward compatibility.
 *
 * @module tools/performance
 */

export { default } from "./performance/index.js";
export { PerformanceTools } from "./performance/index.js";
export * from "./performance/PerformanceHelpers.js";
