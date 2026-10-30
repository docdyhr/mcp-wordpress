/**
 * Guards the semantic-release plugins that release.yml installs apart from package.json.
 *
 * The release job runs cycjimmy/semantic-release-action with `extra_plugins` pinned to exact versions, so a
 * release runs those versions, not the ones in package.json. Dependabot bumps only package.json and the
 * lockfile, so without this check a plugin bump leaves the release on the old version while local runs and
 * these tests use the new one.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workflow = parse(readFileSync(join(root, ".github/workflows/release.yml"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));

const extraPlugins = Object.values(workflow.jobs)
  .flatMap((job) => job.steps ?? [])
  .filter((step) => String(step.uses ?? "").startsWith("cycjimmy/semantic-release-action@"))
  .flatMap((step) => String(step.with?.extra_plugins ?? "").split("\n"))
  .map((line) => line.trim())
  .filter(Boolean)
  .map((spec) => {
    const at = spec.lastIndexOf("@");
    return { name: spec.slice(0, at), version: spec.slice(at + 1) };
  });

describe("release.yml extra_plugins", () => {
  it("pins the changelog and git plugins", () => {
    expect(extraPlugins.map((plugin) => plugin.name)).toEqual(
      expect.arrayContaining(["@semantic-release/changelog", "@semantic-release/git"]),
    );
  });

  it.each(extraPlugins)("pins $name at the version package-lock.json installs", ({ name, version }) => {
    expect(pkg.devDependencies).toHaveProperty([name]);
    expect(version).toBe(lock.packages[`node_modules/${name}`]?.version);
  });
});
