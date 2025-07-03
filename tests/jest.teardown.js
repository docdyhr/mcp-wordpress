/**
 * Jest teardown to ensure proper cleanup of resources
 * This helps prevent worker processes from hanging
 */

// Force garbage collection if available
if (global.gc) {
  global.gc();
}