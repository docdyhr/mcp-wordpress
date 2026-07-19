#!/usr/bin/env node

// NPX/npm-bin wrapper for MCP WordPress Server.
//
// Dispatches explicitly instead of a bare `import(mainModule)` relying on
// dist/index.js's own "is this the entry point" self-check: when invoked
// through npm's generated bin shim (node_modules/.bin/mcp-wordpress, or its
// .cmd/.ps1 equivalents on Windows) or via npx, process.argv[1] is that shim's
// path, which doesn't end in ".js" — so a filename-based self-check in the
// imported module could never recognize this as its entry point, and the
// server would silently do nothing (exit 0, no output).
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainModule = path.join(__dirname, "..", "dist", "index.js");
const { main, runHealthCheck } = await import(mainModule);

if (process.argv.includes("--health-check")) {
  await runHealthCheck();
} else {
  main().catch((error) => {
    process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
