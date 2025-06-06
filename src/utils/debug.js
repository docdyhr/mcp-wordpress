/**
 * Debug Utility for MCP Server
 * 
 * This module provides debug logging that only outputs when DEBUG mode is enabled.
 * This prevents console.log from interfering with MCP STDIO communication.
 */

const DEBUG_MODE = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

/**
 * Debug logger that only outputs in debug mode
 */
export const debug = {
  log: (...args) => {
    if (DEBUG_MODE) {
      console.error('[DEBUG]', ...args); // Use stderr for debug to avoid STDIO interference
    }
  },
  
  warn: (...args) => {
    if (DEBUG_MODE) {
      console.error('[WARN]', ...args);
    }
  },
  
  error: (...args) => {
    if (DEBUG_MODE) {
      console.error('[ERROR]', ...args);
    }
  },
  
  info: (...args) => {
    if (DEBUG_MODE) {
      console.error('[INFO]', ...args);
    }
  }
};

/**
 * Silent logger for production use
 */
export const silent = {
  log: () => {},
  warn: () => {},
  error: () => {},
  info: () => {}
};

/**
 * Get appropriate logger based on environment
 */
export const logger = DEBUG_MODE ? debug : silent;
