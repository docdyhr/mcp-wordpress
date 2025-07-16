/**
 * Jest teardown to ensure proper cleanup of resources
 * This helps prevent worker processes from hanging
 */

// Force garbage collection if available
if (global.gc) {
  global.gc();
}

// Clear all timers and intervals
if (typeof global.clearImmediate === "function") {
  global.clearImmediate();
}

// Set a process exit handler to ensure clean exit
process.on("exit", (code) => {
  if (code !== 0) {
    console.log(`Process exiting with code ${code}`);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, _promise) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});
