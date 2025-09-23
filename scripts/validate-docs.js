#!/usr/bin/env node

/**
 * Documentation Validation Script
 * Validates generated documentation for completeness and quality
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationValidator {
  constructor() {
    this.docsPath = path.join(__dirname, "..", "docs", "api");
    this.errors = [];
    this.warnings = [];
  }

  async validateDocumentation() {
    console.log("🔍 WordPress MCP Server - Documentation Validator");
    console.log("===============================================");

    try {
      // Check if docs directory exists
      if (!fs.existsSync(this.docsPath)) {
        this.addError("Documentation directory does not exist: docs/api/");
        return this.reportResults();
      }

      console.log("📁 Validating documentation structure...");
      await this.validateStructure();

      console.log("📄 Validating content quality...");
      await this.validateContent();

      console.log("🔗 Validating cross-references...");
      await this.validateCrossReferences();

      console.log("📊 Validating summary data...");
      await this.validateSummary();

      return this.reportResults();
    } catch (error) {
      this.addError(`Validation failed: ${error.message}`);
      return this.reportResults();
    }
  }

  async validateStructure() {
    const requiredFiles = ["README.md", "summary.json", "openapi.json"];

    const requiredDirs = ["tools", "categories", "types"];

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(this.docsPath, file);
      if (!fs.existsSync(filePath)) {
        this.addError(`Required file missing: ${file}`);
      } else {
        console.log(`  ✅ ${file}`);
      }
    }

    // Check required directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.docsPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.addError(`Required directory missing: ${dir}/`);
      } else {
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));
        console.log(`  ✅ ${dir}/ (${files.length} files)`);
      }
    }
  }

  async validateContent() {
    // Validate README.md
    await this.validateReadme();

    // Validate tool documentation
    await this.validateToolDocs();

    // Validate category documentation
    await this.validateCategoryDocs();

    // Validate OpenAPI specification
    await this.validateOpenAPI();
  }

  async validateReadme() {
    const readmePath = path.join(this.docsPath, "README.md");
    if (!fs.existsSync(readmePath)) return;

    const content = fs.readFileSync(readmePath, "utf8");

    // Check for required sections
    const requiredSections = [
      "# WordPress MCP Server - API Documentation",
      "## Overview",
      "## Quick Start",
      "## Tool Categories",
      "## Available Tools",
    ];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.addError(`README.md missing required section: ${section}`);
      }
    }

    // Check for badges
    if (!content.includes("![Version]")) {
      this.addWarning("README.md missing version badge");
    }

    console.log("  ✅ README.md content validation passed");
  }

  async validateToolDocs() {
    const toolsDir = path.join(this.docsPath, "tools");
    if (!fs.existsSync(toolsDir)) return;

    const toolFiles = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".md"));

    if (toolFiles.length === 0) {
      this.addError("No tool documentation files found");
      return;
    }

    let validatedCount = 0;
    const sampleSize = Math.min(5, toolFiles.length); // Validate sample

    for (let i = 0; i < sampleSize; i++) {
      const toolFile = toolFiles[i];
      const toolPath = path.join(toolsDir, toolFile);
      const content = fs.readFileSync(toolPath, "utf8");

      // Check required sections for tool docs
      const requiredSections = ["## Parameters", "## Examples", "## Response Format"];

      for (const section of requiredSections) {
        if (!content.includes(section)) {
          this.addWarning(`${toolFile} missing section: ${section}`);
        }
      }

      // Check for category badge
      if (!content.includes("![")) {
        this.addWarning(`${toolFile} missing category badge`);
      }

      validatedCount++;
    }

    console.log(`  ✅ Validated ${validatedCount}/${toolFiles.length} tool docs (sample)`);
  }

  async validateCategoryDocs() {
    const categoriesDir = path.join(this.docsPath, "categories");
    if (!fs.existsSync(categoriesDir)) return;

    const categoryFiles = fs.readdirSync(categoriesDir).filter((f) => f.endsWith(".md"));

    for (const categoryFile of categoryFiles) {
      const categoryPath = path.join(categoriesDir, categoryFile);
      const content = fs.readFileSync(categoryPath, "utf8");

      // Check for basic structure
      if (!content.includes("## Available Tools")) {
        this.addWarning(`${categoryFile} missing "Available Tools" section`);
      }
    }

    console.log(`  ✅ Validated ${categoryFiles.length} category docs`);
  }

  async validateOpenAPI() {
    const openApiPath = path.join(this.docsPath, "openapi.json");
    if (!fs.existsSync(openApiPath)) return;

    try {
      const spec = JSON.parse(fs.readFileSync(openApiPath, "utf8"));

      // Validate basic OpenAPI structure
      if (!spec.openapi) {
        this.addError("OpenAPI spec missing version field");
      }

      if (!spec.info || !spec.info.title) {
        this.addError("OpenAPI spec missing info.title");
      }

      if (!spec.paths || Object.keys(spec.paths).length === 0) {
        this.addError("OpenAPI spec has no paths defined");
      }

      const pathCount = Object.keys(spec.paths || {}).length;
      const schemaCount = Object.keys(spec.components?.schemas || {}).length;

      console.log(`  ✅ OpenAPI spec (${pathCount} paths, ${schemaCount} schemas)`);
    } catch (error) {
      this.addError(`Invalid OpenAPI JSON: ${error.message}`);
    }
  }

  async validateCrossReferences() {
    // Check that category pages link to existing tool docs
    const categoriesDir = path.join(this.docsPath, "categories");
    const toolsDir = path.join(this.docsPath, "tools");

    if (!fs.existsSync(categoriesDir) || !fs.existsSync(toolsDir)) return;

    const toolFiles = new Set(
      fs
        .readdirSync(toolsDir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", "")),
    );

    const categoryFiles = fs.readdirSync(categoriesDir).filter((f) => f.endsWith(".md"));

    for (const categoryFile of categoryFiles) {
      const categoryPath = path.join(categoriesDir, categoryFile);
      const content = fs.readFileSync(categoryPath, "utf8");

      // Find tool references in category docs
      const toolRefs = content.match(/\[`([^`]+)`\]/g) || [];

      for (const ref of toolRefs) {
        const toolName = ref.match(/\[`([^`]+)`\]/)?.[1];
        if (toolName && !toolFiles.has(toolName)) {
          this.addWarning(`Category ${categoryFile} references non-existent tool: ${toolName}`);
        }
      }
    }

    console.log("  ✅ Cross-reference validation completed");
  }

  async validateSummary() {
    const summaryPath = path.join(this.docsPath, "summary.json");
    if (!fs.existsSync(summaryPath)) return;

    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

      // Validate summary structure
      const requiredFields = ["totalTools", "totalCategories", "totalTypes", "lastUpdated", "version", "coverage"];

      for (const field of requiredFields) {
        if (!(field in summary)) {
          this.addError(`Summary missing required field: ${field}`);
        }
      }

      // Validate coverage object
      if (summary.coverage) {
        const coverageFields = ["toolsWithExamples", "toolsWithWordPressMapping", "typesDocumented"];
        for (const field of coverageFields) {
          if (!(field in summary.coverage)) {
            this.addWarning(`Summary coverage missing field: ${field}`);
          }
        }
      }

      // Cross-validate with actual files
      const toolsDir = path.join(this.docsPath, "tools");
      if (fs.existsSync(toolsDir)) {
        const actualToolCount = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".md")).length;
        if (summary.totalTools !== actualToolCount) {
          this.addError(`Summary tool count (${summary.totalTools}) doesn't match actual files (${actualToolCount})`);
        }
      }

      console.log(`  ✅ Summary validation passed (${summary.totalTools} tools)`);
    } catch (error) {
      this.addError(`Invalid summary JSON: ${error.message}`);
    }
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  reportResults() {
    console.log("\n📊 Documentation Validation Results");
    console.log("===================================");

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("🎉 All validation checks passed!");
      console.log("📚 Documentation is complete and ready for use.");
      return true;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error) => console.log(`   • ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning) => console.log(`   • ${warning}`));
    }

    console.log(`\n📋 Validation Summary:`);
    console.log(`   ❌ Errors: ${this.errors.length}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log("\n💡 Please fix the errors above before proceeding.");
      return false;
    } else {
      console.log("\n✅ No critical errors found. Warnings can be addressed optionally.");
      return true;
    }
  }
}

// Run validation
async function main() {
  const validator = new DocumentationValidator();
  const success = await validator.validateDocumentation();
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("💥 Validation script failed:", error);
  process.exit(1);
});
