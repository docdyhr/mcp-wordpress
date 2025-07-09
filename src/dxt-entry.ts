#!/usr/bin/env node

/**
 * Entry point for DXT package - ensures proper initialization when run through Claude Desktop
 */

console.error("DEBUG: DXT entry point starting...");
console.error(`DEBUG: Current working directory: ${process.cwd()}`);
console.error(`DEBUG: __dirname equivalent: ${import.meta.url}`);
console.error("DEBUG: Environment variables passed from DXT:");
console.error(
  `  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? "SET" : "NOT SET"}`,
);
console.error(
  `  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? "SET" : "NOT SET"}`,
);
console.error(
  `  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? "SET" : "NOT SET"}`,
);

// Import and run the main server
import { MCPWordPressServer } from "./index.js";

async function startDXTServer() {
  try {
    console.error(
      "DEBUG: Creating MCPWordPressServer instance from DXT entry point...",
    );
    const server = new MCPWordPressServer();
    console.error("DEBUG: Starting server...");
    await server.run();

    // Handle graceful shutdown
    const shutdown = async () => {
      console.error("DEBUG: Received shutdown signal in DXT entry point");
      await server.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(
      `FATAL: DXT server failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      `FATAL: Stack trace: ${error instanceof Error ? error.stack : "No stack trace available"}`,
    );
    process.exit(1);
  }
}

// Always run when loaded as DXT entry point
console.error("DEBUG: Calling startDXTServer...");
startDXTServer();
