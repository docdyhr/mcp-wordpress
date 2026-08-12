#!/usr/bin/env node

/**
 * Check publishing status for NPM and Docker Hub
 * Usage: node scripts/check-publish-status.js [version]
 */

import { execSync, execFileSync } from "child_process";
// Use native fetch in Node.js 18+

const PACKAGE_NAME = "mcp-wordpress";
const DOCKER_IMAGE = "docdyhr/mcp-wordpress";

async function checkNPM(version) {
  console.log("\n📦 Checking NPM Publishing Status...\n");

  try {
    // Get latest version from NPM
    const npmVersion = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: "utf-8",
    }).trim();
    console.log(`✅ Latest NPM version: ${npmVersion}`);

    // Check specific version if provided
    if (version) {
      try {
        execFileSync("npm", ["view", PACKAGE_NAME + "@" + version, "version"], {
          encoding: "utf-8",
        });
        console.log("✅ Version " + version + " exists on NPM");
      } catch {
        console.log("❌ Version " + version + " NOT found on NPM");
        return false;
      }
    }

    // Get publish time
    const publishTime = execFileSync("npm", ["view", PACKAGE_NAME, "time." + (version || npmVersion)], {
      encoding: "utf-8",
    }).trim();
    console.log("📅 Published at: " + new Date(publishTime).toLocaleString());

    console.log(`🔗 NPM URL: https://www.npmjs.com/package/${PACKAGE_NAME}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to check NPM:", error.message);
    return false;
  }
}

async function checkDockerHub(version) {
  console.log("\n🐳 Checking Docker Hub Publishing Status...\n");

  try {
    // Fetch tags from Docker Hub API
    const response = await fetch(`https://hub.docker.com/v2/repositories/${DOCKER_IMAGE}/tags?page_size=50`);
    const data = await response.json();

    if (!data.results) {
      throw new Error("No tags found");
    }

    // Get latest tag info
    const latestTag = data.results.find((tag) => tag.name === "latest");
    if (latestTag) {
      console.log("✅ Latest tag updated: " + new Date(latestTag.last_updated).toLocaleString());
    }

    // Check specific version if provided
    if (version) {
      const versionTag = data.results.find((tag) => tag.name === version || tag.name === "v" + version);
      if (versionTag) {
        console.log("✅ Version " + versionTag.name + " exists on Docker Hub");
        console.log("📅 Published at: " + new Date(versionTag.last_updated).toLocaleString());
      } else {
        console.log("❌ Version " + version + " NOT found on Docker Hub");
        return false;
      }
    }

    // List all available tags
    console.log("\n📋 Available Docker tags:");
    data.results.slice(0, 10).forEach((tag) => {
      console.log("  - " + tag.name + " (" + new Date(tag.last_updated).toLocaleDateString() + ")");
    });

    console.log(`\n🔗 Docker Hub URL: https://hub.docker.com/r/${DOCKER_IMAGE}/tags`);
    return true;
  } catch (error) {
    console.error("❌ Failed to check Docker Hub:", error.message);
    return false;
  }
}

async function checkGitHubRelease(version) {
  console.log("\n🚀 Checking GitHub Release Status...\n");

  try {
    const releases = execSync("gh release list --limit=5", {
      encoding: "utf-8",
    });
    console.log("📋 Recent GitHub releases:");
    console.log(releases);

    if (version) {
      try {
        const releaseInfo = execFileSync("gh", ["release", "view", "v" + version, "--json", "tagName,publishedAt,url"], {
          encoding: "utf-8",
        });
        const release = JSON.parse(releaseInfo);
        console.log("✅ GitHub release v" + version + " exists");
        console.log("📅 Published at: " + new Date(release.publishedAt).toLocaleString());
        console.log("🔗 Release URL: " + release.url);
      } catch {
        console.log("❌ GitHub release v" + version + " NOT found");
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("❌ Failed to check GitHub releases:", error.message);
    return false;
  }
}

async function main() {
  const version = process.argv[2];

  if (version && !/^[a-zA-Z0-9._+-]+$/.test(version)) {
    console.error("❌ Invalid version format");
    process.exit(1);
  }

  console.log("🔍 MCP WordPress Publishing Status Check");
  console.log("========================================");

  if (version) {
    console.log(`\nChecking for version: ${version}`);
  }

  const npmOk = await checkNPM(version);
  const dockerOk = await checkDockerHub(version);
  const githubOk = await checkGitHubRelease(version);

  console.log("\n📊 Summary\n" + "=".repeat(40));
  console.log(`NPM Publishing:    ${npmOk ? "✅ Success" : "❌ Failed"}`);
  console.log(`Docker Hub:        ${dockerOk ? "✅ Success" : "❌ Failed"}`);
  console.log(`GitHub Release:    ${githubOk ? "✅ Success" : "❌ Failed"}`);

  if (!npmOk || !dockerOk) {
    console.log("\n⚠️  Some publishing targets failed!");
    process.exit(1);
  } else {
    console.log("\n✅ All publishing targets successful!");
  }
}

main().catch(console.error);
