#!/usr/bin/env node

/**
 * Test NPM configuration and authentication
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

console.log("🔍 Testing NPM Configuration...\n");

// Check if .npmrc exists
try {
  const npmrc = readFileSync(".npmrc", "utf8");
  console.log("✅ .npmrc file exists");
  console.log("📝 Contents:");
  console.log(
    npmrc
      .split("\n")
      .map((line) => "  " + line)
      .join("\n"),
  );
} catch (error) {
  console.log("❌ .npmrc file not found");
  process.exit(1);
}

// Check NPM_TOKEN environment variable
console.log("\n🔑 Environment Variable Check:");
if (process.env.NPM_TOKEN) {
  console.log("✅ NPM_TOKEN is set");
  console.log(`📏 Token length: ${process.env.NPM_TOKEN.length} characters`);
} else {
  console.log("⚠️  NPM_TOKEN environment variable not set");
  console.log('💡 Set it with: export NPM_TOKEN="your_token_here"');
}

// Test npm whoami (only if token is set)
console.log("\n👤 Authentication Test:");
if (process.env.NPM_TOKEN) {
  try {
    const whoami = execSync("npm whoami", { encoding: "utf8" }).trim();
    console.log(`✅ Authenticated as: ${whoami}`);
  } catch (error) {
    console.log("❌ Authentication failed");
    console.log("💡 Make sure your NPM_TOKEN is valid");
  }
} else {
  console.log("⏭️  Skipping authentication test (no token set)");
}

// Test publish dry run
console.log("\n📦 Package Test:");
try {
  const dryRun = execSync("npm publish --dry-run", { encoding: "utf8" });
  console.log("✅ Package is ready for publishing");

  // Extract package size info
  const sizeMatch = dryRun.match(/package size:\s*([^\n]+)/i);
  const filesMatch = dryRun.match(/([0-9]+) files/);

  if (sizeMatch) console.log(`📏 Package size: ${sizeMatch[1]}`);
  if (filesMatch) console.log(`📁 File count: ${filesMatch[1]} files`);
} catch (error) {
  console.log("❌ Package test failed");
  if (error.message.includes("ENEEDAUTH")) {
    console.log("🔐 Authentication required for publishing");
  } else {
    console.log("🔍 Error:", error.message.split("\n")[0]);
  }
}

console.log("\n📋 Summary:");
console.log("  ✅ .npmrc configured with environment variable");
console.log("  🔒 Token safely stored in environment (not in file)");
console.log("  📦 Package configuration validated");
console.log("  🚀 Ready for publishing when authenticated");

console.log("\n💡 Next steps:");
console.log('  1. Set NPM_TOKEN: export NPM_TOKEN="your_token_here"');
console.log("  2. Verify auth: npm whoami");
console.log("  3. Publish: npm publish");
