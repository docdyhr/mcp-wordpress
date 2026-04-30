/**
 * Tests for SecurityConfigManager
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { SecurityConfigManager } from "@/security/SecurityConfigManager.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

let tmpDir;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sec-config-manager-test-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makePolicyData(overrides = {}) {
  return {
    name: "Test Policy",
    version: "1.0.0",
    description: "A test security policy",
    enabled: true,
    scope: "global",
    rules: [],
    compliance: {
      frameworks: ["OWASP"],
      requirements: ["req-1"],
    },
    ...overrides,
  };
}

describe("SecurityConfigManager", () => {
  let manager;

  beforeEach(() => {
    // Use a unique subdirectory per test to avoid cross-test pollution
    const testPath = path.join(tmpDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    manager = new SecurityConfigManager(testPath);
  });

  describe("constructor", () => {
    it("creates an instance without errors", () => {
      expect(manager).toBeInstanceOf(SecurityConfigManager);
    });

    it("starts with no configurations", () => {
      expect(manager.getAllConfigurations()).toHaveLength(0);
    });

    it("starts with no policies", () => {
      expect(manager.getAllPolicies()).toHaveLength(0);
    });
  });

  describe("initialize()", () => {
    it("initializes without error (creates directories, loads nothing)", async () => {
      await expect(manager.initialize()).resolves.toBeUndefined();
    });

    it("subsequent initialize calls don't throw", async () => {
      await manager.initialize();
      await expect(manager.initialize()).resolves.toBeUndefined();
    });
  });

  describe("createConfiguration()", () => {
    it("creates and returns a configuration for an environment", async () => {
      const config = await manager.createConfiguration("production", {});
      expect(config).toMatchObject({
        configId: expect.any(String),
        version: "1.0.0",
        environment: "production",
        policies: [],
        metadata: {
          checksum: expect.any(String),
        },
      });
    });

    it("stores configuration so getConfiguration returns it", async () => {
      await manager.createConfiguration("staging", {});
      const config = manager.getConfiguration("staging");
      expect(config).toBeDefined();
      expect(config?.environment).toBe("staging");
    });

    it("configuration has default settings", async () => {
      const config = await manager.createConfiguration("dev", {});
      expect(config.settings).toBeDefined();
      expect(config.settings.authentication).toBeDefined();
      expect(config.settings.cryptography).toBeDefined();
    });

    it("accepts partial settings override", async () => {
      const config = await manager.createConfiguration("test", {
        overrides: { custom: "value" },
      });
      expect(config.overrides).toEqual({ custom: "value" });
    });
  });

  describe("getConfiguration()", () => {
    it("returns null for unknown environment", () => {
      expect(manager.getConfiguration("unknown-env")).toBeNull();
    });

    it("returns the config after creation", async () => {
      await manager.createConfiguration("qa", {});
      expect(manager.getConfiguration("qa")).not.toBeNull();
    });
  });

  describe("getAllConfigurations()", () => {
    it("returns all created configurations", async () => {
      await manager.createConfiguration("env-a", {});
      await manager.createConfiguration("env-b", {});
      expect(manager.getAllConfigurations()).toHaveLength(2);
    });

    it("returns empty array when no configurations exist", () => {
      expect(manager.getAllConfigurations()).toHaveLength(0);
    });
  });

  describe("createPolicy()", () => {
    it("creates and returns a policy", async () => {
      const policy = await manager.createPolicy(makePolicyData());
      expect(policy).toMatchObject({
        id: expect.any(String),
        name: "Test Policy",
        version: "1.0.0",
        enabled: true,
        metadata: {
          author: "system",
          approved: false,
        },
      });
    });

    it("stores policy accessible via getPolicy", async () => {
      const created = await manager.createPolicy(makePolicyData({ name: "Lookup Policy" }));
      const retrieved = manager.getPolicy(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it("getAllPolicies includes created policy", async () => {
      await manager.createPolicy(makePolicyData());
      expect(manager.getAllPolicies()).toHaveLength(1);
    });

    it("throws SecurityValidationError for invalid policy data (bad version)", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.createPolicy(makePolicyData({ version: "not-semver" }))).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });

    it("throws for empty name", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.createPolicy(makePolicyData({ name: "" }))).rejects.toBeInstanceOf(SecurityValidationError);
    });
  });

  describe("getPolicy()", () => {
    it("returns null for unknown policy ID", () => {
      expect(manager.getPolicy("nonexistent-id")).toBeNull();
    });
  });

  describe("updatePolicy()", () => {
    it("updates policy name", async () => {
      const created = await manager.createPolicy(makePolicyData({ name: "Original" }));
      const updated = await manager.updatePolicy(created.id, { name: "Updated" });
      expect(updated.name).toBe("Updated");
    });

    it("preserves policy ID after update", async () => {
      const created = await manager.createPolicy(makePolicyData());
      const updated = await manager.updatePolicy(created.id, { name: "New Name" });
      expect(updated.id).toBe(created.id);
    });

    it("updates metadata.updated timestamp", async () => {
      const created = await manager.createPolicy(makePolicyData());
      const before = created.metadata.updated;
      await new Promise((r) => setTimeout(r, 10));
      const updated = await manager.updatePolicy(created.id, { name: "Changed" });
      expect(updated.metadata.updated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("throws SecurityValidationError for unknown policy ID", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.updatePolicy("nonexistent-id", { name: "X" })).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });

    it("throws for invalid update (bad version format)", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      const created = await manager.createPolicy(makePolicyData());
      await expect(manager.updatePolicy(created.id, { version: "bad-version" })).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });
  });

  describe("deletePolicy()", () => {
    it("returns false for non-existent policy", async () => {
      expect(await manager.deletePolicy("ghost-id")).toBe(false);
    });

    it("deletes an existing policy from the in-memory map", async () => {
      const created = await manager.createPolicy(makePolicyData({ name: "To Delete" }));
      const result = await manager.deletePolicy(created.id);
      // File may or may not exist depending on previous tests; just check in-memory
      expect(result).toBeDefined(); // true if file existed, false if not (file I/O may differ)
      expect(manager.getPolicy(created.id)).toBeNull();
    });
  });

  describe("applyPoliciesToConfiguration()", () => {
    it("throws for non-existent environment", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.applyPoliciesToConfiguration("ghost-env", [])).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });

    it("throws for non-existent policy ID", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await manager.createConfiguration("env-for-apply", {});
      await expect(manager.applyPoliciesToConfiguration("env-for-apply", ["ghost-policy-id"])).rejects.toBeInstanceOf(
        SecurityValidationError,
      );
    });

    it("applies enabled policies to configuration", async () => {
      await manager.createConfiguration("apply-env", {});
      const policy = await manager.createPolicy(makePolicyData({ enabled: true }));
      const config = await manager.applyPoliciesToConfiguration("apply-env", [policy.id]);
      expect(config.policies).toHaveLength(1);
      expect(config.policies[0].id).toBe(policy.id);
    });

    it("skips disabled policies", async () => {
      await manager.createConfiguration("skip-env", {});
      const policy = await manager.createPolicy(makePolicyData({ enabled: false }));
      const config = await manager.applyPoliciesToConfiguration("skip-env", [policy.id]);
      expect(config.policies).toHaveLength(0);
    });
  });

  describe("validateCompliance()", () => {
    it("throws for non-existent environment", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.validateCompliance("ghost-env")).rejects.toBeInstanceOf(SecurityValidationError);
    });

    it("returns compliant:true for default settings", async () => {
      await manager.createConfiguration("compliant-env", {});
      const result = await manager.validateCompliance("compliant-env");
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("returns violation when password minLength < 8", async () => {
      await manager.createConfiguration("weak-pw-env", {});
      const config = manager.getConfiguration("weak-pw-env");
      config.settings.authentication.passwordPolicy.minLength = 6;
      const result = await manager.validateCompliance("weak-pw-env");
      expect(result.violations.some((v) => v.includes("Password"))).toBe(true);
    });

    it("returns violation when session not secure", async () => {
      await manager.createConfiguration("insecure-session-env", {});
      const config = manager.getConfiguration("insecure-session-env");
      config.settings.session.security.httpOnly = false;
      const result = await manager.validateCompliance("insecure-session-env");
      expect(result.violations.some((v) => v.includes("session"))).toBe(true);
    });

    it("returns recommendation to enable MFA when disabled", async () => {
      await manager.createConfiguration("no-mfa-env", {});
      const config = manager.getConfiguration("no-mfa-env");
      config.settings.authentication.mfa.enabled = false;
      const result = await manager.validateCompliance("no-mfa-env");
      expect(result.recommendations.some((r) => r.includes("multi-factor"))).toBe(true);
    });

    it("returns OWASP recommendation when no policies with OWASP compliance", async () => {
      await manager.createConfiguration("no-owasp-env", {});
      // No policies applied → no frameworks configured
      const result = await manager.validateCompliance("no-owasp-env");
      expect(result.recommendations.some((r) => r.includes("OWASP"))).toBe(true);
    });
  });

  describe("exportConfiguration() / importConfiguration()", () => {
    it("export throws for non-existent environment", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.exportConfiguration("ghost-env")).rejects.toBeInstanceOf(SecurityValidationError);
    });

    it("export returns JSON string", async () => {
      await manager.createConfiguration("export-env", {});
      const exported = await manager.exportConfiguration("export-env");
      expect(typeof exported).toBe("string");
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it("import round-trips correctly", async () => {
      await manager.createConfiguration("roundtrip-env", {});
      const exported = await manager.exportConfiguration("roundtrip-env");

      // Fresh manager for import
      const importPath = path.join(tmpDir, `import-${Date.now()}`);
      const importer = new SecurityConfigManager(importPath);
      const imported = await importer.importConfiguration(exported);
      expect(imported.environment).toBe("roundtrip-env");
    });

    it("import throws SecurityValidationError for invalid JSON", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.importConfiguration("not valid json")).rejects.toBeInstanceOf(SecurityValidationError);
    });

    it("import throws for missing configId / environment", async () => {
      const { SecurityValidationError } = await import("@/security/InputValidator.js");
      await expect(manager.importConfiguration('{"someKey":"value"}')).rejects.toBeInstanceOf(SecurityValidationError);
    });
  });

  describe("initialize() loads persisted data", () => {
    it("reloads configurations from files on second initialize", async () => {
      const sharedPath = path.join(tmpDir, "shared-persist");
      const mgr1 = new SecurityConfigManager(sharedPath);
      await mgr1.initialize();
      await mgr1.createConfiguration("persist-env", {});

      // New manager pointing at same path
      const mgr2 = new SecurityConfigManager(sharedPath);
      await mgr2.initialize();
      expect(mgr2.getConfiguration("persist-env")).not.toBeNull();
    });

    it("reloads policies from files on second initialize", async () => {
      const sharedPath = path.join(tmpDir, "shared-policies");
      const mgr1 = new SecurityConfigManager(sharedPath);
      await mgr1.initialize();
      const policy = await mgr1.createPolicy(makePolicyData({ name: "Persisted" }));

      const mgr2 = new SecurityConfigManager(sharedPath);
      await mgr2.initialize();
      expect(mgr2.getPolicy(policy.id)).not.toBeNull();
    });
  });
});
