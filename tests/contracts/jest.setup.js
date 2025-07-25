/**
 * Jest setup for contract tests
 */

// Set timeout for contract tests
jest.setTimeout(30000);

// Ensure required directories exist
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create required directories
const dirs = [join(__dirname, "../logs"), join(__dirname, "../pacts")];

dirs.forEach((dir) => {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (_err) {
    // Directory already exists
  }
});

// Set up environment for contract tests
process.env.NODE_ENV = process.env.NODE_ENV || "test";
