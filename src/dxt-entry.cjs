#!/usr/bin/env node
/* eslint-disable */
/**
 * CommonJS entry point for DXT package - ensures compatibility with Claude Desktop
 */

// Load AJV patch before any other modules
try {
    require('./ajv-patch.js');
} catch (error) {
    console.error("DEBUG: AJV patch failed to load:", error.message);
}

console.error("DEBUG: DXT CommonJS entry point starting...");
console.error(`DEBUG: Current working directory: ${process.cwd()}`);
console.error(`DEBUG: __dirname: ${__dirname}`);
console.error(`DEBUG: Node version: ${process.version}`);

console.error("DEBUG: Environment variables passed from DXT:");
console.error(`  WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? 'SET' : 'NOT SET'}`);
console.error(`  WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? 'SET' : 'NOT SET'}`);
console.error(`  WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? 'SET' : 'NOT SET'}`);

// Import and run the main server using dynamic import
async function startDXTServer() {
    try {
        console.error("DEBUG: Attempting to import ES module...");
        const { MCPWordPressServer } = await import("./index.js");
        
        console.error("DEBUG: Creating MCPWordPressServer instance from DXT entry point...");
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
        console.error(`FATAL: DXT server failed to start: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`FATAL: Stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        process.exit(1);
    }
}

// Always run when loaded as DXT entry point
console.error("DEBUG: Calling startDXTServer...");
startDXTServer();