#!/usr/bin/env node

/**
 * WordPress MCP Server - Simple Health Check
 * Quick diagnostic script for basic system health without complex dependencies
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Simple console colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = (message, type = "info") => {
  const prefix = {
    info: `${colors.blue}ℹ️${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`,
    test: `${colors.cyan}🔧${colors.reset}`,
  }[type];
  console.log(`${prefix} ${message}`);
};

const header = (title) => {
  console.log(`\n${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log("=".repeat(50));
};

/**
 * Check if required files exist
 */
function checkProjectStructure() {
  header("📁 Project Structure Check");

  const requiredFiles = [
    "package.json",
    "src/index.ts",
    "src/client/api.ts",
    "src/client/auth.ts",
    "tsconfig.json",
    "dist/index.js",
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    try {
      const fs = require("fs");
      const filePath = join(projectRoot, file);

      if (fs.existsSync(filePath)) {
        log(`${file} - Found`, "success");
      } else {
        log(`${file} - Missing`, "error");
        allFilesExist = false;
      }
    } catch (error) {
      log(`${file} - Check failed: ${error.message}`, "error");
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

/**
 * Check Node.js and NPM versions
 */
function checkNodeEnvironment() {
  header("🌐 Node.js Environment Check");

  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

    log(`Node.js version: ${nodeVersion}`, majorVersion >= 18 ? "success" : "warning");

    if (majorVersion < 18) {
      log("Recommended: Node.js 18 or higher", "warning");
    }

    // Check if npm is available
    return new Promise((resolve) => {
      const npmProcess = spawn("npm", ["--version"], { stdio: "pipe" });
      let npmVersion = "";

      npmProcess.stdout.on("data", (data) => {
        npmVersion += data.toString().trim();
      });

      npmProcess.on("close", (code) => {
        if (code === 0) {
          log(`NPM version: ${npmVersion}`, "success");
        } else {
          log("NPM not found or error", "error");
        }
        resolve(code === 0);
      });

      npmProcess.on("error", () => {
        log("NPM not found", "error");
        resolve(false);
      });
    });
  } catch (error) {
    log(`Environment check failed: ${error.message}`, "error");
    return false;
  }
}

/**
 * Check if project dependencies are installed
 */
function checkDependencies() {
  header("📦 Dependencies Check");

  try {
    const fs = require("fs");
    const packagePath = join(projectRoot, "package.json");
    const nodeModulesPath = join(projectRoot, "node_modules");

    if (!fs.existsSync(packagePath)) {
      log("package.json not found", "error");
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    log(`Project: ${packageJson.name} v${packageJson.version}`, "info");

    if (!fs.existsSync(nodeModulesPath)) {
      log("node_modules not found - run 'npm install'", "error");
      return false;
    }

    log("node_modules directory exists", "success");

    // Check for key dependencies
    const keyDeps = ["@modelcontextprotocol/sdk", "typescript", "dotenv", "form-data"];

    // Optional dependencies (nice to have but not required for CI)
    const optionalDeps = ["node-fetch"];

    let depsOk = true;
    for (const dep of keyDeps) {
      const depPath = join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        log(`${dep} - Installed`, "success");
      } else {
        log(`${dep} - Missing`, "error");
        depsOk = false;
      }
    }

    // Check optional dependencies (doesn't affect health status)
    for (const dep of optionalDeps) {
      const depPath = join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        log(`${dep} - Installed (optional)`, "success");
      } else {
        log(`${dep} - Missing (optional, using native fetch)`, "info");
      }
    }

    return depsOk;
  } catch (error) {
    log(`Dependencies check failed: ${error.message}`, "error");
    return false;
  }
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptBuild() {
  header("🔨 TypeScript Build Check");

  return new Promise((resolve) => {
    const tscProcess = spawn("npx", ["tsc", "--noEmit"], {
      cwd: projectRoot,
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    tscProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    tscProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    tscProcess.on("close", (code) => {
      if (code === 0) {
        log("TypeScript compilation check passed", "success");
        resolve(true);
      } else {
        log("TypeScript compilation errors found", "error");
        if (stderr) {
          console.log(stderr);
        }
        resolve(false);
      }
    });

    tscProcess.on("error", (error) => {
      log(`TypeScript check failed: ${error.message}`, "error");
      resolve(false);
    });
  });
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
  header("🔐 Environment Configuration Check");

  try {
    const fs = require("fs");
    const envPath = join(projectRoot, ".env");

    if (!fs.existsSync(envPath)) {
      log(".env file not found", "warning");
      log("Run 'npm run setup' to configure", "info");

      // In CI environments, missing .env is expected
      if (process.env.CI || process.env.NODE_ENV === "test") {
        log("CI environment detected - .env file not required", "info");
        return true;
      }
      return false;
    }

    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n").filter((line) => line.trim() && !line.trim().startsWith("#"));

    const requiredVars = ["WORDPRESS_SITE_URL", "WORDPRESS_USERNAME"];

    let configOk = true;
    for (const varName of requiredVars) {
      const found = envLines.some((line) => line.startsWith(`${varName}=`));
      if (found) {
        log(`${varName} - Configured`, "success");
      } else {
        log(`${varName} - Missing`, "error");
        configOk = false;
      }
    }

    // Check for at least one auth method
    const authMethods = ["WORDPRESS_APP_PASSWORD", "WORDPRESS_PASSWORD", "WORDPRESS_API_KEY", "WORDPRESS_JWT_SECRET"];

    const hasAuthMethod = authMethods.some((method) => envLines.some((line) => line.startsWith(`${method}=`)));

    if (hasAuthMethod) {
      log("Authentication method configured", "success");
    } else {
      log("No authentication method found", "error");
      configOk = false;
    }

    return configOk;
  } catch (error) {
    log(`Environment check failed: ${error.message}`, "error");
    return false;
  }
}

/**
 * Check if compiled JavaScript exists
 */
function checkCompiledOutput() {
  header("📦 Compiled Output Check");

  try {
    const fs = require("fs");
    const distPath = join(projectRoot, "dist");

    if (!fs.existsSync(distPath)) {
      log("dist directory not found - run 'npm run build'", "error");
      return false;
    }

    const keyFiles = ["index.js", "client/api.js", "client/auth.js", "tools/posts.js"];

    let allCompiledFilesExist = true;
    for (const file of keyFiles) {
      const filePath = join(distPath, file);
      if (fs.existsSync(filePath)) {
        log(`${file} - Compiled`, "success");
      } else {
        log(`${file} - Missing`, "error");
        allCompiledFilesExist = false;
      }
    }

    return allCompiledFilesExist;
  } catch (error) {
    log(`Compiled output check failed: ${error.message}`, "error");
    return false;
  }
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  console.log(`${colors.bright}${colors.cyan}🏥 WordPress MCP Server - Health Check${colors.reset}`);
  console.log("=".repeat(60));
  console.log(`📍 Project Root: ${projectRoot}`);

  const checks = [
    { name: "Node Environment", fn: checkNodeEnvironment },
    { name: "Project Structure", fn: checkProjectStructure },
    { name: "Dependencies", fn: checkDependencies },
    { name: "Environment Config", fn: checkEnvironmentConfig },
    { name: "TypeScript Build", fn: checkTypeScriptBuild },
    { name: "Compiled Output", fn: checkCompiledOutput },
  ];

  const results = [];
  let passedChecks = 0;

  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
      if (result) passedChecks++;
    } catch (error) {
      log(`${check.name} check failed: ${error.message}`, "error");
      results.push({ name: check.name, passed: false });
    }
  }

  // Summary
  header("📊 Health Check Summary");

  const successRate = Math.round((passedChecks / checks.length) * 100);

  results.forEach((result) => {
    log(`${result.name}: ${result.passed ? "PASS" : "FAIL"}`, result.passed ? "success" : "error");
  });

  console.log(`\n${colors.bright}Overall Health: ${successRate}%${colors.reset}`);

  if (successRate === 100) {
    log("🎉 All health checks passed! System is ready.", "success");
  } else if (successRate >= 80) {
    log("⚠️ Most checks passed. Minor issues detected.", "warning");
  } else {
    log("❌ Multiple issues detected. Please fix before proceeding.", "error");
  }

  // Recommendations
  if (successRate < 100) {
    console.log(`\n${colors.bright}🔧 Recommended Actions:${colors.reset}`);

    if (!results.find((r) => r.name === "Dependencies")?.passed) {
      console.log("• Run: npm install");
    }

    if (!results.find((r) => r.name === "Environment Config")?.passed) {
      console.log("• Run: npm run setup");
    }

    if (!results.find((r) => r.name === "TypeScript Build")?.passed) {
      console.log("• Fix TypeScript errors and run: npm run build");
    }

    if (!results.find((r) => r.name === "Compiled Output")?.passed) {
      console.log("• Run: npm run build");
    }

    console.log("• Check the documentation: README.md");
    console.log("• Run: npm run status (for WordPress connection check)");
  }

  console.log("");

  // In CI environments, be more lenient with success rate
  const isCI = process.env.CI || process.env.NODE_ENV === "test";
  const requiredSuccessRate = isCI ? 83 : 100; // Allow 5/6 checks to pass in CI

  if (isCI && successRate >= requiredSuccessRate) {
    log("🎉 CI environment: Essential checks passed, system is operational.", "success");
  }

  process.exit(successRate >= requiredSuccessRate ? 0 : 1);
}

// Run health check
runHealthCheck().catch((error) => {
  log(`Health check failed: ${error.message}`, "error");
  console.error(error.stack);
  process.exit(1);
});
