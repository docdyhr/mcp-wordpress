import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";

/**
 * Inline semantic-release plugin ("Inline plugin" per semantic-release's own
 * plugin loader — see node_modules/semantic-release/lib/plugins/utils.js
 * parseConfig(), which accepts a bare object of lifecycle functions).
 *
 * Runs after @semantic-release/changelog writes the new CHANGELOG.md entry
 * and before @semantic-release/git commits it, so the release commit always
 * contains a Prettier-compliant CHANGELOG.md. Without this, semantic-release
 * writes raw conventional-changelog output (unwrapped lines, `*` bullets)
 * straight to disk, which fails `npm run format:check` on the very next
 * release — see AGENTS.md's CI/CD Pipeline section for the changelogTitle
 * invariant this complements.
 */
const formatChangelog = {
  async prepare(pluginConfig, { cwd, logger }) {
    const changelogPath = join(cwd, "CHANGELOG.md");
    if (!existsSync(changelogPath)) {
      return;
    }

    const raw = readFileSync(changelogPath, "utf8");
    const options = (await resolveConfig(changelogPath)) || {};
    const formatted = await format(raw, { ...options, filepath: changelogPath });

    if (formatted !== raw) {
      writeFileSync(changelogPath, formatted);
      logger.log("Reformatted CHANGELOG.md with Prettier");
    }
  },
};

export default {
  branches: ["main"],
  repositoryUrl: "https://github.com/docdyhr/mcp-wordpress.git",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "docs", release: false },
          { type: "style", release: false },
          { type: "refactor", release: "patch" },
          { type: "test", release: false },
          { type: "build", release: false },
          { type: "ci", release: false },
          { type: "chore", release: false },
          { type: "revert", release: "patch" },
          { breaking: true, release: "major" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "🚀 Features", hidden: false },
            { type: "fix", section: "🐛 Bug Fixes", hidden: false },
            { type: "perf", section: "⚡ Performance", hidden: false },
            { type: "refactor", section: "♻️ Refactoring", hidden: false },
            { type: "docs", section: "📚 Documentation", hidden: false },
            { type: "style", section: "💄 Styling", hidden: true },
            { type: "test", section: "🧪 Testing", hidden: true },
            { type: "build", section: "🏗️ Build", hidden: true },
            { type: "ci", section: "👷 CI/CD", hidden: true },
            { type: "chore", section: "🧹 Chores", hidden: true },
          ],
        },
      },
    ],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle:
          "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to\n[Semantic Versioning](https://semver.org/spec/v2.0.0.html).",
      },
    ],
    formatChangelog,
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
        tarballDir: ".",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "*.tgz",
            label: "NPM Package",
          },
        ],
        assignees: ["docdyhr"],
        releasedLabels: ["released"],
        addReleases: "bottom",
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "package-lock.json"],
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
};
