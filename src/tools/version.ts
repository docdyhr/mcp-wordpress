/**
 * Version Check Tool
 *
 * Checks if a newer version of mcp-wordpress is available on GitHub
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const CheckVersionArgsSchema = z.object({
  current_version: z.string().optional().describe("Override current version for testing"),
});

export const CHECK_VERSION_TOOL: Tool = {
  name: "wp_check_version",
  description:
    "Check if a newer version of mcp-wordpress is available. Returns current version, latest version, and download URL if update is available.",
  inputSchema: {
    type: "object",
    properties: {
      current_version: {
        type: "string",
        description: "Override current version for testing (optional)",
      },
    },
  },
};

interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
}

/**
 * Get the current version from package.json
 */
function getCurrentVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (_error) {
    return "unknown";
  }
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, "");
  const clean2 = v2.replace(/^v/, "");

  const parts1 = clean1.split(".").map(Number);
  const parts2 = clean2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Fetch latest release from GitHub
 */
async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch("https://api.github.com/repos/docdyhr/mcp-wordpress/releases/latest", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "mcp-wordpress-server",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GitHubRelease;
  } catch (_error) {
    return null;
  }
}

/**
 * Handler for wp_check_version tool
 */
export async function handleCheckVersion(args: unknown): Promise<string> {
  try {
    const parsed = CheckVersionArgsSchema.parse(args);

    // Get current version
    const currentVersion = parsed.current_version || getCurrentVersion();

    if (currentVersion === "unknown") {
      return "❌ Unable to determine current version. Package.json not found.";
    }

    // Fetch latest release from GitHub
    const latestRelease = await getLatestRelease();

    if (!latestRelease) {
      return `ℹ️  Unable to check for updates (GitHub API unavailable).\n\nCurrent version: ${currentVersion}\n\nManually check: https://github.com/docdyhr/mcp-wordpress/releases`;
    }

    const latestVersion = latestRelease.tag_name.replace(/^v/, "");
    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison === 0) {
      return `✅ **You're up to date!**\n\nCurrent version: v${currentVersion}\nLatest version: v${latestVersion}\n\nNo update needed.`;
    }

    if (comparison > 0) {
      return `🔬 **You're running a pre-release version**\n\nCurrent version: v${currentVersion}\nLatest stable: v${latestVersion}\n\nYou're ahead of the latest stable release.`;
    }

    // Update available
    const dxtUrl = `https://github.com/docdyhr/mcp-wordpress/releases/download/v${latestVersion}/mcp-wordpress.dxt`;

    let releaseNotes = "";
    if (latestRelease.body) {
      // Extract first 500 characters of release notes
      const notes = latestRelease.body.substring(0, 500);
      releaseNotes = `\n\n**What's New:**\n${notes}${latestRelease.body.length > 500 ? "..." : ""}`;
    }

    return `🎉 **Update Available!**

**Current version:** v${currentVersion}
**Latest version:** v${latestVersion}
**Released:** ${new Date(latestRelease.published_at).toLocaleDateString()}

**Download Links:**
- DXT Package: ${dxtUrl}
- Release Page: ${latestRelease.html_url}

**Update Instructions:**
1. Backup your configuration (if using multi-site)
2. Uninstall current version from Claude Desktop
3. Download the new DXT package
4. Install in Claude Desktop → Extensions
5. Restore your configuration

**Documentation:** https://github.com/docdyhr/mcp-wordpress/blob/main/docs/DXT_UPDATE_GUIDE.md${releaseNotes}`;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return `❌ Invalid arguments: ${error.issues.map((e) => e.message).join(", ")}`;
    }
    return `❌ Error checking version: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
