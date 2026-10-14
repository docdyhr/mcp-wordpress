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

// Option -> allowed value types, from the schema. A key with nothing under it
// parses as null, and GitHub rejects that: the first version of this file
// had `ignore:` with only comments below it.
const UPDATE_OPTIONS = {
  allow: ["array"],
  assignees: ["array"],
  "commit-message": ["object"],
  cooldown: ["object"],
  directories: ["array"],
  directory: ["string"],
  "exclude-paths": ["array"],
  groups: ["object"],
  ignore: ["array"],
  "insecure-external-code-execution": ["string"],
  labels: ["array"],
  milestone: ["integer"],
  "multi-ecosystem-group": ["string"],
  name: ["string"],
  "open-pull-requests-limit": ["integer"],
  "package-ecosystem": ["string"],
  patterns: ["array"],
  "pull-request-branch-name": ["object"],
  "rebase-strategy": ["string"],
  registries: ["array", "string"],
  schedule: ["object"],
  "target-branch": ["string"],
  vendor: ["boolean"],
  "versioning-strategy": ["string"],
};
const GROUP_OPTIONS = {
  "applies-to": ["string"],
  "dependency-type": ["string"],
  "exclude-patterns": ["array"],
  "group-by": ["string"],
  patterns: ["array"],
  "update-types": ["array"],
};
const typeOf = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
};
// "<where>: <key>" for each key the schema lacks, "<where>: <key> is <type>" for each wrong type
const optionProblems = (where, entry, options) =>
  Object.entries(entry).flatMap(([key, value]) => {
    if (!(key in options)) return [`${where}: ${key}`];
    const actual = typeOf(value);
    return options[key].includes(actual) ? [] : [`${where}: ${key} is ${actual}`];
  });
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

  it("uses only update options Dependabot supports, each with a value of the right type", () => {
    // `reviewers` was retired in May 2025 in favour of CODEOWNERS
    const problems = updates.flatMap((u) => optionProblems(u["package-ecosystem"], u, UPDATE_OPTIONS));
    expect(problems).toEqual([]);
  });

  it("uses only supported group options, each with a value of the right type", () => {
    const problems = updates.flatMap((u) =>
      groupsOf(u).flatMap(([name, group]) => {
        const where = `${u["package-ecosystem"]}/${name}`;
        return typeOf(group) === "object"
          ? optionProblems(where, group, GROUP_OPTIONS)
          : [`${where} is ${typeOf(group)}`];
      }),
    );
    expect(problems).toEqual([]);
  });

  it("limits group update-types to major, minor and patch", () => {
    const invalid = updates.flatMap((u) =>
      groupsOf(u).flatMap(([name, group]) =>
        [group?.["update-types"] ?? []]
          .flat()
          .filter((type) => !GROUP_UPDATE_TYPES.has(type))
          .map((type) => `${u["package-ecosystem"]}/${name}: ${type}`),
      ),
    );
    expect(invalid).toEqual([]);
  });

  it("uses a valid applies-to on every group that sets one", () => {
    const invalid = updates.flatMap((u) =>
      groupsOf(u)
        .filter(([, group]) => group?.["applies-to"] !== undefined && !GROUP_APPLIES_TO.has(group["applies-to"]))
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
      .filter((u) => "target-branch" in u && groupsOf(u).some(([, g]) => g?.["applies-to"] === "security-updates"))
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
