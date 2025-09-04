/**
 * Version Management Utility
 *
 * Provides centralized version management following best practices:
 * - Single source of truth (package.json)
 * - Semantic versioning support
 * - Build metadata integration
 * - Version comparison utilities
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * Version information interface
 */
export interface VersionInfo {
  /** Full version string (e.g., "2.7.0") */
  version: string;
  /** Major version number */
  major: number;
  /** Minor version number */
  minor: number;
  /** Patch version number */
  patch: number;
  /** Pre-release identifier (e.g., "beta.1") */
  prerelease?: string;
  /** Build metadata (e.g., git commit hash) */
  build?: string;
  /** Human-readable version string with metadata */
  full: string;
}

/**
 * Package.json structure for version reading
 */
interface PackageJson {
  name: string;
  version: string;
  description?: string;
}

/**
 * Version Manager Class
 * Singleton pattern for consistent version management
 */
export class VersionManager {
  private static instance: VersionManager;
  private versionInfo: VersionInfo | null = null;
  private packageJson: PackageJson | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  /**
   * Initialize version manager with async file loading
   * Call this early in application startup for optimal performance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.packageJson = await this.loadPackageJson();
      this.versionInfo = this.loadVersionFromPackage(this.packageJson);
      this.isInitialized = true;
    } catch (_error) {
      // Fall back to sync loading if async fails
      this.packageJson = await this.loadPackageJson(); // This will use fallback
      this.versionInfo = this.loadVersionFromPackage(this.packageJson);
      this.isInitialized = true;
    }
  }

  /**
   * Get version information
   * Uses cached version if available, loads synchronously with fallback if needed
   */
  getVersion(): VersionInfo {
    if (!this.versionInfo) {
      // If not initialized, load synchronously with fallback
      this.versionInfo = this.loadVersionSync();
    }
    return this.versionInfo;
  }

  /**
   * Get package information
   * Uses cached package if available, loads synchronously with fallback if needed
   */
  getPackageInfo(): PackageJson {
    if (!this.packageJson) {
      // Return fallback package info if not loaded
      this.packageJson = {
        name: "mcp-wordpress",
        version: "2.7.0", // Fallback version
        description: "MCP WordPress Server",
      };
    }
    return this.packageJson;
  }

  /**
   * Load version synchronously (with fallback)
   * @deprecated Use initialize() followed by getVersion() for better performance
   */
  private loadVersionSync(): VersionInfo {
    const pkg = this.getPackageInfo(); // Uses fallback if needed
    return this.loadVersionFromPackage(pkg);
  }

  /**
   * Load version from package data
   */
  private loadVersionFromPackage(pkg: PackageJson): VersionInfo {
    const parsed = this.parseSemanticVersion(pkg.version);

    // Add build metadata if available
    const buildMetadata = this.getBuildMetadata();

    const result: VersionInfo = {
      ...parsed,
      full: this.formatFullVersion(parsed, buildMetadata),
    };

    if (buildMetadata !== undefined) {
      result.build = buildMetadata;
    }

    return result;
  }

  /**
   * Load package.json
   */
  private async loadPackageJson(): Promise<PackageJson> {
    try {
      // Get the project root directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const projectRoot = join(__dirname, "..", "..");
      const packagePath = join(projectRoot, "package.json");

      const packageContent = await readFile(packagePath, "utf-8");
      return JSON.parse(packageContent) as PackageJson;
    } catch (_error) {
      // Fallback for runtime environments where package.json might not be available
      // Note: Using fallback version - should match package.json
      return {
        name: "mcp-wordpress",
        version: "2.7.0", // Fallback version - should match package.json
        description: "MCP WordPress Server",
      };
    }
  }

  /**
   * Parse semantic version string
   * Supports format: major.minor.patch[-prerelease][+build]
   */
  private parseSemanticVersion(version: string): Omit<VersionInfo, "build" | "full"> {
    // Regular expression for semantic versioning
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    const match = version.match(semverRegex);

    if (!match) {
      // Fallback for non-standard versions
      return {
        version,
        major: 0,
        minor: 0,
        patch: 0,
      };
    }

    const result: Omit<VersionInfo, "build" | "full"> = {
      version: `${match[1]}.${match[2]}.${match[3]}`,
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };

    if (match[4]) {
      result.prerelease = match[4];
    }

    return result;
  }

  /**
   * Get build metadata (git commit hash, timestamp, etc.)
   */
  private getBuildMetadata(): string | undefined {
    // In production, this could be injected during build process
    // For now, we'll use environment variables if available
    if (process.env.BUILD_NUMBER) {
      return process.env.BUILD_NUMBER;
    }

    if (process.env.GIT_COMMIT) {
      return process.env.GIT_COMMIT.substring(0, 7); // Short hash
    }

    // For development, optionally include timestamp
    if (process.env.NODE_ENV === "development") {
      return `dev.${Date.now()}`;
    }

    return undefined;
  }

  /**
   * Format full version string with metadata
   */
  private formatFullVersion(version: Omit<VersionInfo, "build" | "full">, build?: string): string {
    let full = version.version;

    if (version.prerelease) {
      full += `-${version.prerelease}`;
    }

    if (build) {
      full += `+${build}`;
    }

    return full;
  }

  /**
   * Compare two version strings
   * Returns: -1 if v1 < v2, 0 if v1 = v2, 1 if v1 > v2
   */
  compareVersions(v1: string, v2: string): number {
    const version1 = this.parseSemanticVersion(v1);
    const version2 = this.parseSemanticVersion(v2);

    // Compare major
    if (version1.major !== version2.major) {
      return version1.major > version2.major ? 1 : -1;
    }

    // Compare minor
    if (version1.minor !== version2.minor) {
      return version1.minor > version2.minor ? 1 : -1;
    }

    // Compare patch
    if (version1.patch !== version2.patch) {
      return version1.patch > version2.patch ? 1 : -1;
    }

    // Compare prerelease (absence of prerelease is greater than presence)
    if (version1.prerelease && !version2.prerelease) return -1;
    if (!version1.prerelease && version2.prerelease) return 1;
    if (version1.prerelease && version2.prerelease) {
      return version1.prerelease.localeCompare(version2.prerelease);
    }

    return 0;
  }

  /**
   * Check if version satisfies a requirement
   */
  satisfiesVersion(version: string, requirement: string): boolean {
    // Simple implementation - can be extended with full semver range support
    if (requirement === "*") return true;

    if (requirement.startsWith("^")) {
      // Caret range: compatible with version
      const reqVersion = this.parseSemanticVersion(requirement.substring(1));
      const curVersion = this.parseSemanticVersion(version);

      return (
        curVersion.major === reqVersion.major &&
        (curVersion.minor > reqVersion.minor ||
          (curVersion.minor === reqVersion.minor && curVersion.patch >= reqVersion.patch))
      );
    }

    if (requirement.startsWith("~")) {
      // Tilde range: patch-level changes
      const reqVersion = this.parseSemanticVersion(requirement.substring(1));
      const curVersion = this.parseSemanticVersion(version);

      return (
        curVersion.major === reqVersion.major &&
        curVersion.minor === reqVersion.minor &&
        curVersion.patch >= reqVersion.patch
      );
    }

    // Exact match
    return this.compareVersions(version, requirement) === 0;
  }

  /**
   * Get user agent string for HTTP requests
   */
  getUserAgent(): string {
    const info = this.getVersion();
    const pkg = this.getPackageInfo();
    return `${pkg.name}/${info.full}`;
  }

  /**
   * Get version for display/logging
   */
  getDisplayVersion(): string {
    const info = this.getVersion();
    const pkg = this.getPackageInfo();

    if (process.env.NODE_ENV === "development") {
      return `${pkg.name} v${info.full} (development)`;
    }

    return `${pkg.name} v${info.version}`;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Check if running a prerelease version
   */
  isPrerelease(): boolean {
    const info = this.getVersion();
    return !!info.prerelease;
  }

  /**
   * Get version badge URL for documentation
   */
  getVersionBadgeUrl(): string {
    const info = this.getVersion();
    const color = info.prerelease ? "orange" : "blue";
    return `https://img.shields.io/badge/version-${info.version}-${color}`;
  }
}

/**
 * Singleton instance export for convenience
 */
export const versionManager = VersionManager.getInstance();

/**
 * Quick access functions
 */
export function getVersion(): string {
  return versionManager.getVersion().version;
}

export function getFullVersion(): string {
  return versionManager.getVersion().full;
}

export function getUserAgent(): string {
  return versionManager.getUserAgent();
}

export function getDisplayVersion(): string {
  return versionManager.getDisplayVersion();
}

/**
 * Semantic version comparison
 */
export function isVersionGreaterThan(v1: string, v2: string): boolean {
  return versionManager.compareVersions(v1, v2) > 0;
}

export function isVersionLessThan(v1: string, v2: string): boolean {
  return versionManager.compareVersions(v1, v2) < 0;
}

export function isVersionEqual(v1: string, v2: string): boolean {
  return versionManager.compareVersions(v1, v2) === 0;
}

/**
 * Version requirement checking
 */
export function satisfiesVersion(version: string, requirement: string): boolean {
  return versionManager.satisfiesVersion(version, requirement);
}
