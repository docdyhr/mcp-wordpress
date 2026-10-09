import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";
import { mkdtempSync, rmSync, cpSync, symlinkSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Claude Desktop probes every extension with a `server/discover` request BEFORE `initialize` (its "era probe",
 * logged as "Era probe verdict: legacy"). A server that exited or closed stdio on that unknown method would make
 * the host log "Couldn't start for Cowork and Code sessions … the connection closed during the server/discover
 * probe". Pin the behaviour the host needs: a JSON-RPC "Method not found" error, the process stays up, and the
 * normal initialize → tools/list handshake still works afterwards.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const distPath = join(repoRoot, "dist");

describe("dxt-entry.js: server/discover before initialize", () => {
  let sandboxDir;

  beforeAll(() => {
    if (!existsSync(distPath)) {
      throw new Error("dist/ not built — run `npm run build` before this test");
    }
    // Same isolation as mcp-wordpress-entry.test.js: a real copy of dist/ (a symlink would resolve back to the
    // repo root and its real config) and HOME pointed at the sandbox (~ can hold a real multi-site config).
    sandboxDir = mkdtempSync(join(tmpdir(), "mcp-wordpress-discover-test-"));
    cpSync(distPath, join(sandboxDir, "dist"), { recursive: true });
    symlinkSync(join(repoRoot, "node_modules"), join(sandboxDir, "node_modules"), "dir");
    writeFileSync(join(sandboxDir, "package.json"), JSON.stringify({ type: "module" }));
  });

  afterAll(() => {
    rmSync(sandboxDir, { recursive: true, force: true });
  });

  function startServer() {
    const env = { ...process.env, HOME: sandboxDir, USERPROFILE: sandboxDir };
    delete env.MCP_WORDPRESS_CONFIG;
    delete env.MCP_WORDPRESS_ALLOW_MULTI_SITE;
    for (const key of Object.keys(env)) {
      if (key.startsWith("WORDPRESS_")) delete env[key];
    }
    // Dummy single-site credentials: the handshake never contacts the site.
    Object.assign(env, {
      WORDPRESS_SITE_URL: "https://example.invalid",
      WORDPRESS_USERNAME: "probe",
      WORDPRESS_APP_PASSWORD: "aaaa bbbb cccc dddd",
    });

    const child = spawn(process.execPath, [join(sandboxDir, "dist/dxt-entry.js")], {
      cwd: sandboxDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const pending = new Map();
    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const message = JSON.parse(line);
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      }
    });

    // Fail fast with the exit code instead of waiting for the timeout if the server dies mid-handshake.
    const failures = new Set();
    child.on("exit", (code) => failures.forEach((fail) => fail(new Error(`server exited with code ${code}`))));

    const request = (id, method, params = {}) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no response to ${method} within 15s`)), 15000);
        failures.add(reject);
        pending.set(id, (message) => {
          clearTimeout(timer);
          failures.delete(reject);
          resolve(message);
        });
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      });

    return { child, request };
  }

  it("answers Method not found, stays up, and still completes the handshake", async () => {
    const { child, request } = startServer();

    try {
      const discover = await request(1, "server/discover");
      expect(discover.error).toMatchObject({ code: -32601 });

      const init = await request(2, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "discover-probe-test", version: "0" },
      });
      expect(init.result?.serverInfo).toBeDefined();
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

      const list = await request(3, "tools/list");
      expect(list.result.tools.length).toBeGreaterThan(0);
      expect(child.exitCode).toBeNull(); // still running
    } finally {
      child.kill();
    }
  }, 30000);
});
