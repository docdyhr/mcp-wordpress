import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  cpSync,
  copyFileSync,
  symlinkSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Regression coverage for a real bug: bin/mcp-wordpress.js used to dispatch by
 * importing dist/index.js and relying on that module's own "is this the entry
 * point" self-check (a process.argv[1] filename guess). npm's generated bin
 * shim (node_modules/.bin/mcp-wordpress, or its .cmd/.ps1 equivalents on
 * Windows) — and npx, which uses the same mechanism — invoke through a path
 * that doesn't end in ".js", so that self-check silently evaluated false: the
 * server exited 0 with zero output instead of starting, breaking the exact
 * `"command": "npx", "args": ["-y", "mcp-wordpress"]` setup this project's own
 * README documents as the standard Claude Desktop config. Confirmed via CI's
 * install-the-real-tarball-and-run-it smoke test (a scratch npm install
 * reproduces npm's real bin-shim naming); this test reproduces the same
 * .js-less invocation path without a full pack/install round trip, so it runs
 * as part of the normal suite instead of only in that separate CI job.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const distPath = join(repoRoot, "dist");

describe("bin/mcp-wordpress.js entry-point dispatch", () => {
  let sandboxDir;
  let sandboxBinDir;

  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error("dist/ not built — run `npm run build` before this test");
    }
    sandboxDir = mkdtempSync(join(tmpdir(), "mcp-wordpress-entry-test-"));
    // A real copy, not a symlink: Node resolves a symlinked module's
    // import.meta.url to its real (target) path, which would make
    // ServerConfiguration's rootDir resolve back to the actual repo root —
    // defeating the isolation. The sandbox must have no config file of its
    // own so the health check fails deterministically, regardless of what
    // config exists on the dev machine running this test.
    cpSync(distPath, join(sandboxDir, "dist"), { recursive: true });
    // node_modules can be symlinked safely (unlike dist/): resolving bare
    // specifiers just walks parent directories on disk and isn't sensitive
    // to symlink identity the way import.meta.url is. "type": "module" is
    // needed since the sandbox has no inherited package.json of its own.
    symlinkSync(join(repoRoot, "node_modules"), join(sandboxDir, "node_modules"), "dir");
    writeFileSync(join(sandboxDir, "package.json"), JSON.stringify({ type: "module" }));
    sandboxBinDir = join(sandboxDir, "bin");
    mkdirSync(sandboxBinDir);
    copyFileSync(join(repoRoot, "bin/mcp-wordpress.js"), join(sandboxBinDir, "mcp-wordpress.js"));
    // Simulate npm's generated bin shim, which is named after the package.json
    // "bin" key with no extension — the exact condition that broke the old
    // process.argv[1]-suffix self-check.
    copyFileSync(join(repoRoot, "bin/mcp-wordpress.js"), join(sandboxBinDir, "mcp-wordpress"));
  });

  afterAll(() => {
    rmSync(sandboxDir, { recursive: true, force: true });
  });

  function runEntry(entryFileName) {
    const cleanEnv = { ...process.env };
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith("WORDPRESS_")) delete cleanEnv[key];
    }
    return spawnSync("node", [join(sandboxBinDir, entryFileName), "--health-check"], {
      cwd: sandboxDir,
      env: cleanEnv,
      encoding: "utf8",
    });
  }

  it("runs the server when invoked through a path ending in .js", () => {
    const result = runEntry("mcp-wordpress.js");
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain("Health check failed: no WordPress sites configured");
  });

  it("regression: runs the server when invoked through a path with no extension (npm bin shim / npx)", () => {
    const result = runEntry("mcp-wordpress");
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain("Health check failed: no WordPress sites configured");
    // The old bug's signature: silently did nothing at all.
    expect(result.stdout + result.stderr).not.toBe("");
  });

  // Regression coverage for a second real bug (#221): the dispatch line handed
  // a bare OS path straight to import(). On POSIX that path starts with "/",
  // which the ESM loader accepts, so this was invisible on the Linux/macOS
  // runners CI actually runs on — this repo has no Windows CI job to catch it
  // at runtime. On Windows the path starts with a drive letter (e.g.
  // "C:\...\dist\index.js"), which the loader parses as an unsupported "c:"
  // URL scheme and throws ERR_UNSUPPORTED_ESM_URL_SCHEME before the server
  // ever starts. Since the failure mode can't be reproduced on this suite's
  // runners, this asserts the fix (pathToFileURL, a documented no-op on POSIX
  // paths) is actually in place, so a future refactor can't silently drop it.
  it("regression: converts the dist/index.js path to a file:// URL before import (Windows ERR_UNSUPPORTED_ESM_URL_SCHEME)", () => {
    const source = readFileSync(join(repoRoot, "bin/mcp-wordpress.js"), "utf8");
    // Asserts pathToFileURL's result specifically is what's passed to import(),
    // not just that both substrings appear somewhere in the file — and the
    // negative check blocks any `await import(mainModule)` call, not only the
    // exact prior spelling, so reformatting can't dodge either assertion.
    // Anchored on "await" so it doesn't false-match the explanatory comment
    // above (which quotes the old `import(mainModule)` form by name).
    expect(source).toMatch(/await\s+import\(\s*pathToFileURL\(mainModule\)\.href\s*\)/);
    expect(source).not.toMatch(/await\s+import\(\s*mainModule\s*\)/);
  });
});
