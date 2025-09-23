#!/usr/bin/env node

/**
 * Comprehensive Security Testing Script
 * Runs all security tests and validates the security framework
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

console.log("🔒 MCP WordPress Server - Security Testing Suite");
console.log("================================================");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

/**
 * Execute a command and capture results
 */
function runCommand(command, description) {
  console.log(`\n🧪 ${description}`);
  console.log("─".repeat(50));

  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 300000, // 5 minute timeout
    });

    console.log("✅ PASSED");
    passedTests++;
    results.push({ test: description, status: "PASSED", output });
    return true;
  } catch (error) {
    console.log("❌ FAILED");
    console.log(`Error: ${error.message}`);
    if (error.stdout) {
      console.log("STDOUT:", error.stdout.toString());
    }
    if (error.stderr) {
      console.log("STDERR:", error.stderr.toString());
    }
    failedTests++;
    results.push({
      test: description,
      status: "FAILED",
      error: error.message,
      stdout: error.stdout?.toString(),
      stderr: error.stderr?.toString(),
    });
    return false;
  } finally {
    totalTests++;
  }
}

/**
 * Check if security files exist
 */
function checkSecurityFiles() {
  console.log("\n📁 Checking Security Framework Files");
  console.log("─".repeat(50));

  const requiredFiles = [
    "src/security/InputValidator.ts",
    "tests/security/security-validation.test.js",
    "tests/security/penetration-tests.test.js",
    "docs/SECURITY_TESTING.md",
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

/**
 * Validate security configuration
 */
function validateSecurityConfig() {
  console.log("\n⚙️ Validating Security Configuration");
  console.log("─".repeat(50));

  try {
    // Check if security imports are available
    const packageJsonPath = join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    // Check for zod dependency (required for validation)
    if (packageJson.dependencies && packageJson.dependencies.zod) {
      console.log("✅ Zod validation library installed");
    } else {
      console.log("❌ Zod validation library missing");
      return false;
    }

    // Check for security test scripts
    const securityScripts = ["test:security", "test:security:validation", "test:security:penetration"];

    let hasSecurityScripts = true;
    for (const script of securityScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`✅ ${script} script configured`);
      } else {
        console.log(`❌ ${script} script missing`);
        hasSecurityScripts = false;
      }
    }

    return hasSecurityScripts;
  } catch (error) {
    console.log(`❌ Configuration validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Run security audit
 */
function runSecurityAudit() {
  return runCommand("npm audit --audit-level moderate", "NPM Security Audit (checking for known vulnerabilities)");
}

/**
 * Run input validation tests
 */
function runValidationTests() {
  return runCommand("npm run test:security:validation", "Input Validation Security Tests");
}

/**
 * Run penetration tests
 */
function runPenetrationTests() {
  return runCommand("npm run test:security:penetration", "Penetration Testing Suite");
}

/**
 * Run all security tests
 */
function runAllSecurityTests() {
  return runCommand("npm run test:security", "Complete Security Test Suite");
}

/**
 * Test build with security modules
 */
function testSecurityBuild() {
  return runCommand("npm run build", "TypeScript Build (including security modules)");
}

/**
 * Run linting for security issues
 */
function runSecurityLinting() {
  return runCommand("npm run lint", "ESLint Security Checks");
}

/**
 * Generate security test report
 */
function generateSecurityReport() {
  console.log("\n📊 Security Testing Report");
  console.log("=".repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => r.status === "FAILED")
      .forEach((result) => {
        console.log(`  • ${result.test}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
  }

  console.log("\n🏆 Security Testing Summary:");
  if (failedTests === 0) {
    console.log("🟢 All security tests passed! Your application is well-protected.");
  } else if (failedTests < totalTests * 0.2) {
    console.log("🟡 Most security tests passed, but some issues need attention.");
  } else {
    console.log("🔴 Multiple security tests failed. Immediate attention required!");
  }

  return failedTests === 0;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log("Starting comprehensive security testing...\n");

    // 1. Check security framework files
    const filesExist = checkSecurityFiles();
    if (!filesExist) {
      console.log("\n❌ Critical security files are missing!");
      process.exit(1);
    }

    // 2. Validate security configuration
    const configValid = validateSecurityConfig();
    if (!configValid) {
      console.log("\n❌ Security configuration is invalid!");
      process.exit(1);
    }

    // 3. Test TypeScript build
    testSecurityBuild();

    // 4. Run security audit
    runSecurityAudit();

    // 5. Run linting for security issues
    runSecurityLinting();

    // 6. Run input validation tests
    runValidationTests();

    // 7. Run penetration tests
    runPenetrationTests();

    // 8. Run complete security test suite
    runAllSecurityTests();

    // 9. Generate final report
    const allTestsPassed = generateSecurityReport();

    if (allTestsPassed) {
      console.log("\n🎉 Security testing completed successfully!");
      console.log("Your MCP WordPress Server is secure and ready for production.");
      process.exit(0);
    } else {
      console.log("\n⚠️ Security testing completed with issues.");
      console.log("Please review and fix the failed tests before deploying.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 Security testing failed with error:", error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.log("\n\n⚠️ Security testing interrupted by user");
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️ Security testing terminated");
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
