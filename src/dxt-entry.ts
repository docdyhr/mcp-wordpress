#!/usr/bin/env node

/**
 * Entry point for DXT package - ensures proper initialization when run through Claude Desktop
 */

import { LoggerFactory } from "./utils/logger.js";
import { MCPWordPressServer } from "./index.js";

const logger = LoggerFactory.server();

logger.debug("DXT entry point starting...");
logger.debug(`Current working directory: ${process.cwd()}`);
logger.debug(`__dirname equivalent: ${import.meta.url}`);
logger.debug("Environment variables passed from DXT:");
logger.debug(`  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? "SET" : "NOT SET"}`);
logger.debug(`  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? "SET" : "NOT SET"}`);
logger.debug(`  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? "SET" : "NOT SET"}`);

async function startDXTServer() {
  try {
    logger.debug("Creating MCPWordPressServer instance from DXT entry point...");
    const server = new MCPWordPressServer();
    logger.debug("Starting server...");
    await server.run();

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.debug("Received shutdown signal in DXT entry point");
      await server.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.fatal(`DXT server failed to start: ${error instanceof Error ? error.message : String(error)}`);
    logger.fatal(`Stack trace: ${error instanceof Error ? error.stack : "No stack trace available"}`);
    process.exit(1);
  }
}

// Always run when loaded as DXT entry point
logger.debug("Calling startDXTServer...");
startDXTServer();
