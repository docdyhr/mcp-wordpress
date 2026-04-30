/**
 * Tests for AuthManager
 */

import { describe, it, expect, vi } from "vitest";
import { AuthManager } from "@/client/managers/AuthManager.js";

function makeClient(postResponse = {}) {
  return {
    post: vi.fn().mockResolvedValue(postResponse),
    get: vi.fn(),
    delete: vi.fn(),
  };
}

function makeConfig(method, extras = {}) {
  return { method, ...extras };
}

describe("AuthManager", () => {
  describe("authenticate()", () => {
    it("returns true for app-password with valid credentials", async () => {
      const client = makeClient();
      const manager = new AuthManager(
        client,
        makeConfig("app-password", { username: "admin", appPassword: "pass xxxx" }),
      );
      expect(await manager.authenticate()).toBe(true);
    });

    it("throws for app-password when missing username", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("app-password", { appPassword: "pass" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("throws for app-password when missing appPassword", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("app-password", { username: "admin" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("returns true for basic with valid credentials", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("basic", { username: "admin", password: "secret" }));
      expect(await manager.authenticate()).toBe(true);
    });

    it("throws for basic when missing username", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("basic", { password: "secret" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("throws for basic when missing password", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("basic", { username: "admin" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("returns true for api-key with valid apiKey", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("api-key", { apiKey: "my-key-12345" }));
      expect(await manager.authenticate()).toBe(true);
    });

    it("throws for api-key when missing apiKey", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("api-key"));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("throws for cookie auth (not implemented)", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("cookie"));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("performs JWT auth successfully", async () => {
      const client = makeClient({
        token: "jwt-token-abc",
        user_email: "user@example.com",
        user_nicename: "admin",
        user_display_name: "Admin User",
      });
      const manager = new AuthManager(client, makeConfig("jwt", { username: "admin", password: "secret" }));
      expect(await manager.authenticate()).toBe(true);
    });

    it("throws for JWT when no token returned", async () => {
      const client = makeClient({ user_email: "user@example.com" }); // no token
      const manager = new AuthManager(client, makeConfig("jwt", { username: "admin", password: "secret" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("throws for JWT when missing username", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("jwt", { password: "secret" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("throws for JWT when missing password", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("jwt", { username: "admin" }));
      await expect(manager.authenticate()).rejects.toThrow();
    });

    it("re-throws JWT network errors as AuthenticationError", async () => {
      const client = makeClient();
      client.post.mockRejectedValue(new Error("Network error"));
      const manager = new AuthManager(client, makeConfig("jwt", { username: "admin", password: "secret" }));
      await expect(manager.authenticate()).rejects.toThrow("JWT authentication failed: Network error");
    });

    it("throws for unsupported auth method", async () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("unknown-method"));
      await expect(manager.authenticate()).rejects.toThrow("Unsupported authentication method");
    });
  });

  describe("getAuthHeaders()", () => {
    it("returns Basic Authorization header for app-password", () => {
      const client = makeClient();
      const manager = new AuthManager(
        client,
        makeConfig("app-password", { username: "admin", appPassword: "mypassword" }),
      );
      const headers = manager.getAuthHeaders();
      expect(headers.Authorization).toMatch(/^Basic /);
    });

    it("returns Basic Authorization header for basic auth", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("basic", { username: "admin", appPassword: "mypassword" }));
      const headers = manager.getAuthHeaders();
      expect(headers.Authorization).toMatch(/^Basic /);
    });

    it("returns empty headers for app-password without credentials", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("app-password"));
      expect(manager.getAuthHeaders()).toEqual({});
    });

    it("returns X-API-Key header for api-key auth", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("api-key", { apiKey: "my-api-key" }));
      expect(manager.getAuthHeaders()["X-API-Key"]).toBe("my-api-key");
    });

    it("returns empty headers for api-key without apiKey", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("api-key"));
      expect(manager.getAuthHeaders()).toEqual({});
    });

    it("returns empty headers for cookie auth", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("cookie"));
      expect(manager.getAuthHeaders()).toEqual({});
    });

    it("returns empty headers for JWT before authentication", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("jwt"));
      expect(manager.getAuthHeaders()).toEqual({});
    });

    it("returns Bearer token after successful JWT auth", async () => {
      const client = makeClient({
        token: "my-jwt-token",
        user_email: "u@e.com",
        user_nicename: "user",
        user_display_name: "User",
      });
      const manager = new AuthManager(client, makeConfig("jwt", { username: "u", password: "p" }));
      await manager.authenticate();
      const headers = manager.getAuthHeaders();
      expect(headers.Authorization).toBe("Bearer my-jwt-token");
    });
  });

  describe("getAuthMethod()", () => {
    it("returns the configured auth method", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("app-password"));
      expect(manager.getAuthMethod()).toBe("app-password");
    });

    it("returns jwt for jwt config", () => {
      const client = makeClient();
      const manager = new AuthManager(client, makeConfig("jwt"));
      expect(manager.getAuthMethod()).toBe("jwt");
    });
  });
});
