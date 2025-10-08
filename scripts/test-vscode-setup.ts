#!/usr/bin/env tsx

/**
 * VS Code Setup Verification Script
 * Run this to test that all VS Code configurations are working properly
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
}

class VSCodeSetupTester {
  private results: TestResult[] = [];

  private addResult(name: string, status: "pass" | "fail" | "warning", message: string): void {
    this.results.push({ name, status, message });
  }

  async testExtensions(): Promise<void> {
    console.log("🔍 Testing VS Code Extensions...\n");

    const requiredExtensions = [
      "ms-vscode.vscode-typescript-next",
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "vitest.explorer",
      "eamodio.gitlens",
      "bradlc.vscode-tailwindcss",
      "ms-python.python",
      "ms-vscode.hexeditor",
    ];

    try {
      const installedExtensions = execSync("code --list-extensions", { encoding: "utf8" });
      const installedList = installedExtensions.split("\n");

      for (const ext of requiredExtensions) {
        if (installedList.includes(ext)) {
          this.addResult(`Extension: ${ext}`, "pass", "Installed and available");
        } else {
          this.addResult(`Extension: ${ext}`, "fail", `Not installed - run: code --install-extension ${ext}`);
        }
      }
    } catch {
      this.addResult("Extension Check", "fail", "Could not check extensions - VS Code CLI not available");
    }
  }

  testVSCodeConfiguration(): void {
    console.log("⚙️ Testing VS Code Configuration...\n");

    // Test settings.json
    const settingsPath = ".vscode/settings.json";
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, "utf8"));

        // Test Vitest configuration
        if (settings["vitest.enable"]) {
          this.addResult("Vitest Integration", "pass", "Vitest is enabled in VS Code");
        } else {
          this.addResult("Vitest Integration", "warning", "Vitest not explicitly enabled");
        }

        // Test TypeScript configuration
        if (settings["typescript.preferences.includePackageJsonAutoImports"]) {
          this.addResult("TypeScript Auto-imports", "pass", "Auto-imports configured");
        } else {
          this.addResult("TypeScript Auto-imports", "warning", "Auto-imports not configured");
        }

        // Test Prettier configuration
        if (settings["editor.defaultFormatter"] === "esbenp.prettier-vscode") {
          this.addResult("Prettier Default Formatter", "pass", "Prettier set as default formatter");
        } else {
          this.addResult("Prettier Default Formatter", "warning", "Prettier not set as default formatter");
        }

        // Test format on save
        if (settings["editor.formatOnSave"]) {
          this.addResult("Format on Save", "pass", "Format on save is enabled");
        } else {
          this.addResult("Format on Save", "warning", "Format on save is disabled");
        }
      } catch {
        this.addResult("VS Code Settings", "fail", "Invalid JSON in settings.json");
      }
    } else {
      this.addResult("VS Code Settings", "fail", "settings.json not found");
    }

    // Test extensions.json
    const extensionsPath = ".vscode/extensions.json";
    if (existsSync(extensionsPath)) {
      this.addResult("Extension Recommendations", "pass", "Extension recommendations configured");
    } else {
      this.addResult("Extension Recommendations", "warning", "No extension recommendations found");
    }
  }

  testProjectIntegration(): void {
    console.log("🔗 Testing Project Integration...\n");

    // Test TypeScript configuration
    if (existsSync("tsconfig.json")) {
      this.addResult("TypeScript Config", "pass", "tsconfig.json found");
    } else {
      this.addResult("TypeScript Config", "fail", "tsconfig.json missing");
    }

    // Test Vitest configuration
    if (existsSync("vitest.config.ts")) {
      this.addResult("Vitest Config", "pass", "vitest.config.ts found");
    } else {
      this.addResult("Vitest Config", "fail", "vitest.config.ts missing");
    }

    // Test ESLint configuration
    if (existsSync(".eslintrc.js") || existsSync("eslint.config.js")) {
      this.addResult("ESLint Config", "pass", "ESLint configuration found");
    } else {
      this.addResult("ESLint Config", "warning", "ESLint configuration not found");
    }

    // Test Prettier configuration
    if (existsSync(".prettierrc.json")) {
      this.addResult("Prettier Config", "pass", "Prettier configuration found");
    } else {
      this.addResult("Prettier Config", "warning", "Prettier configuration not found");
    }
  }

  generateReport(): void {
    console.log("\n📊 VS Code Setup Test Report\n");
    console.log("=".repeat(50));

    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const warnings = this.results.filter((r) => r.status === "warning").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.results.length}\n`);

    // Group results by status
    const failedTests = this.results.filter((r) => r.status === "fail");
    const warningTests = this.results.filter((r) => r.status === "warning");

    if (failedTests.length > 0) {
      console.log("❌ Failed Tests:");
      failedTests.forEach((test) => {
        console.log(`  • ${test.name}: ${test.message}`);
      });
      console.log("");
    }

    if (warningTests.length > 0) {
      console.log("⚠️  Warnings:");
      warningTests.forEach((test) => {
        console.log(`  • ${test.name}: ${test.message}`);
      });
      console.log("");
    }

    // Provide recommendations
    this.generateRecommendations();
  }

  private generateRecommendations(): void {
    console.log("💡 Recommendations:\n");

    const failedExtensions = this.results
      .filter((r) => r.name.startsWith("Extension:") && r.status === "fail")
      .map((r) => r.message.split("code --install-extension ")[1])
      .filter(Boolean);

    if (failedExtensions.length > 0) {
      console.log("📦 Install missing extensions:");
      failedExtensions.forEach((ext) => {
        console.log(`  code --install-extension ${ext}`);
      });
      console.log("");
    }

    console.log("🔄 After installing extensions:");
    console.log("  1. Restart VS Code completely");
    console.log("  2. Open a TypeScript file and verify IntelliSense");
    console.log('  3. Run tests using Cmd+Shift+P > "Test: Run All Tests"');
    console.log("  4. Try formatting a file with Cmd+Shift+F");
    console.log("");
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting VS Code Setup Verification...\n");

    await this.testExtensions();
    this.testVSCodeConfiguration();
    this.testProjectIntegration();
    this.generateReport();
  }
}

// Run the tests
const tester = new VSCodeSetupTester();
tester.runAllTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
