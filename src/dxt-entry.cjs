#!/usr/bin/env node
/* eslint-disable */
/**
 * CommonJS entry point for DXT package - ensures compatibility with Claude Desktop
 */

// Load AJV patch before any other modules
try {
    require('./ajv-patch.js');
} catch (error) {
    // Use stderr to avoid interfering with STDIO
    process.stderr.write(`[DXT] AJV patch failed to load: ${error.message}\n`);
}

// Use stderr for debug output to avoid interfering with STDIO
const debug = (message) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        process.stderr.write(`[DXT] ${message}\n`);
    }
};

debug("CommonJS entry point starting...");
debug(`Current working directory: ${process.cwd()}`);
debug(`__dirname: ${__dirname}`);
debug(`Node version: ${process.version}`);

// Set DXT mode environment variable
process.env.NODE_ENV = "dxt";

debug("Environment variables passed from DXT:");
debug(`  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? 'SET' : 'NOT SET'}`);
debug(`  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? 'SET' : 'NOT SET'}`);
debug(`  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? 'SET' : 'NOT SET'}`);

// Import and run the main server using dynamic import
async function startDXTServer() {
    try {
        debug("Attempting to import ES module...");
        const { MCPWordPressServer } = await import("./index.js");
        
        debug("Creating MCPWordPressServer instance from DXT entry point...");
        const server = new MCPWordPressServer();
        
        debug("Starting server (DXT mode - fast startup)...");
        await server.run();
        
        // Handle graceful shutdown
        const shutdown = async () => {
            debug("Received shutdown signal in DXT entry point");
            await server.shutdown();
            process.exit(0);
        };
        
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        
    } catch (error) {
        process.stderr.write(`[DXT] FATAL: Server failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
        if (error instanceof Error && error.stack) {
            process.stderr.write(`[DXT] Stack trace: ${error.stack}\n`);
        }
        process.exit(1);
    }
}

// Always run when loaded as DXT entry point
debug("Calling startDXTServer...");
startDXTServer();