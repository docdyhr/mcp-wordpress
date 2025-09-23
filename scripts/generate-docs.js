#!/usr/bin/env node

/**
 * API Documentation Generation Script
 * Automatically generates comprehensive documentation for all MCP tools
 */

import { DocumentationGenerator } from "../dist/docs/DocumentationGenerator.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDocumentation() {
  console.log("🚀 WordPress MCP Server - Documentation Generator");
  console.log("==============================================");

  try {
    // Initialize documentation generator
    const generator = new DocumentationGenerator({
      outputDir: path.join(__dirname, "..", "docs", "api"),
      includeExamples: true,
      includeWordPressMapping: true,
      generateOpenAPI: true,
      generateInteractiveHtml: false, // Disable for now
      validateExamples: false,
    });

    console.log("📊 Analyzing codebase and extracting tool documentation...");

    // Generate full documentation
    const startTime = Date.now();
    const output = await generator.generateFullDocumentation();
    const endTime = Date.now();

    // Display results
    console.log("\n✅ Documentation generation completed successfully!");
    console.log("================================================");
    console.log(`📁 Output directory: docs/api/`);
    console.log(`⏱️  Generation time: ${endTime - startTime}ms`);
    console.log("\n📊 Documentation Summary:");
    console.log(`   🔧 Tools documented: ${output.summary.totalTools}`);
    console.log(`   📂 Categories: ${output.summary.totalCategories}`);
    console.log(`   📝 Type definitions: ${output.summary.totalTypes}`);
    console.log(`   📖 Tools with examples: ${output.summary.coverage.toolsWithExamples}`);
    console.log(`   🔗 WordPress API mappings: ${output.summary.coverage.toolsWithWordPressMapping}`);

    console.log("\n📄 Generated Files:");
    console.log("   📖 docs/api/README.md - Main API documentation");
    console.log("   🔧 docs/api/tools/ - Individual tool documentation");
    console.log("   📂 docs/api/categories/ - Category documentation");
    console.log("   📝 docs/api/types/ - Type documentation");
    console.log("   🌐 docs/api/openapi.json - OpenAPI specification");
    console.log("   📊 docs/api/summary.json - Documentation summary");

    console.log("\n🎯 Next Steps:");
    console.log("   1. Review generated documentation in docs/api/");
    console.log("   2. Commit documentation files to version control");
    console.log("   3. Set up automated regeneration on code changes");
    console.log("   4. Consider hosting interactive documentation");

    console.log("\n🎉 API documentation is now ready for use!");
  } catch (error) {
    console.error("❌ Documentation generation failed:", error);
    process.exit(1);
  }
}

// Run the script
generateDocumentation().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
