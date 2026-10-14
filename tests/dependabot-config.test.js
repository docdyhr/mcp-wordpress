/**
 * Guards .github/dependabot.yml against values GitHub rejects or silently ignores.
 *
 * GitHub validates the whole file and rejects it on one invalid value. Dependabot
 * then keeps using the last valid version. This file was never valid on main from
 * 2025-07 to 2026-10 (a group `update-types` of "security-update"), so no
 * scheduled version update ran for any ecosystem. The only trace was a failing
 * `.github/dependabot.yml` check run on the commits that changed the file.
 *
 * Allowed keys and values follow the SchemaStore dependabot-2.0 schema and
 * GitHub's Dependabot options reference.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "../.github/dependabot.yml");

const UPDATE_KEYS = new Set([
  "allow",
  "assignees",
  "commit-message",
  "cooldown",
  "directories",
  "directory",
  "exclude-paths",
  "groups",
  "ignore",
  "insecure-external-code-execution",
  "labels",
  "milestone",
  "multi-ecosystem-group",
  "name",
  "open-pull-requests-limit",
  "package-ecosystem",
  "patterns",
  "pull-request-branch-name",
  "rebase-strategy",
  "registries",
  "schedule",
  "target-branch",
  "vendor",
  "versioning-strategy",
]);
const GROUP_KEYS = new Set([
  "applies-to",
  "dependency-type",
  "exclude-patterns",
  "group-by",
  "patterns",
  "update-types",
]);
const GROUP_UPDATE_TYPES = new Set(["major", "minor", "patch"]);
const GROUP_APPLIES_TO = new Set(["version-updates", "security-updates"]);
const INSECURE_EXEC_ECOSYSTEMS = new Set(["bundler", "mix", "pip"]);
// PR titles become squash-merge commits that semantic-release analyses (release.config.js)
const CONVENTIONAL_TYPES = new Set([
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
]);

const config = parse(readFileSync(CONFIG_PATH, "utf8"));
const updates = config.updates ?? [];
const groupsOf = (update) => Object.entries(update.groups ?? {});

describe("Dependabot configuration", () => {
  it("is a version 2 config with at least one update entry", () => {
    expect(config.version).toBe(2);
    expect(updates.length).toBeGreaterThan(0);
  });

  it("uses only update options Dependabot supports", () => {
    // `reviewers` was retired in May 2025 in favour of CODEOWNERS
    const unknown = updates.flatMap((u) =>
      Object.keys(u)
        .filter((key) => !UPDATE_KEYS.has(key))
        .map((key) => `${u["package-ecosystem"]}: ${key}`),
    );
    expect(unknown).toEqual([]);
  });

  it("uses only supported group options", () => {
    const unknown = updates.flatMap((u) =>
      groupsOf(u).flatMap(([name, group]) =>
        Object.keys(group)
          .filter((key) => !GROUP_KEYS.has(key))
          .map((key) => `${u["package-ecosystem"]}/${name}: ${key}`),
      ),
    );
    expect(unknown).toEqual([]);
  });

  it("limits group update-types to major, minor and patch", () => {
    const invalid = updates.flatMap((u) =>
      groupsOf(u).flatMap(([name, group]) =>
        (group["update-types"] ?? [])
          .filter((type) => !GROUP_UPDATE_TYPES.has(type))
          .map((type) => `${u["package-ecosystem"]}/${name}: ${type}`),
      ),
    );
    expect(invalid).toEqual([]);
  });

  it("uses a valid applies-to on every group that sets one", () => {
    const invalid = updates.flatMap((u) =>
      groupsOf(u)
        .filter(([, group]) => group["applies-to"] !== undefined && !GROUP_APPLIES_TO.has(group["applies-to"]))
        .map(([name, group]) => `${u["package-ecosystem"]}/${name}: ${group["applies-to"]}`),
    );
    expect(invalid).toEqual([]);
  });

  it("sets insecure-external-code-execution only on ecosystems that support it", () => {
    const invalid = updates
      .filter((u) => "insecure-external-code-execution" in u && !INSECURE_EXEC_ECOSYSTEMS.has(u["package-ecosystem"]))
      .map((u) => u["package-ecosystem"]);
    expect(invalid).toEqual([]);
  });

  it("does not disable a security-updates group with target-branch", () => {
    // With target-branch set, the entry's options stop applying to security updates
    const disabled = updates
      .filter((u) => "target-branch" in u && groupsOf(u).some(([, g]) => g["applies-to"] === "security-updates"))
      .map((u) => u["package-ecosystem"]);
    expect(disabled).toEqual([]);
  });

  it("uses conventional-commit types as commit-message prefixes", () => {
    const invalid = updates.flatMap((u) =>
      ["prefix", "prefix-development"]
        .map((key) => u["commit-message"]?.[key])
        .filter((prefix) => prefix !== undefined && !CONVENTIONAL_TYPES.has(prefix))
        .map((prefix) => `${u["package-ecosystem"]}: ${prefix}`),
    );
    expect(invalid).toEqual([]);
  });
});
