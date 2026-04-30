/**
 * Tests for src/client/auth.ts
 * Covers WordPressAuth, auth providers, and the createAuthProvider factory.
 */

import { describe, it, expect, vi } from "vitest";
import {
  WordPressAuth,
  AppPasswordAuthProvider,
  JWTAuthProvider,
  BasicAuthProvider,
  APIKeyAuthProvider,
  CookieAuthProvider,
  createAuthProvider,
} from "../../dist/client/auth.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeClient = (authOverrides = {}) => ({
  config: {
    baseUrl: "https://example.com",
    auth: {
      method: "app-password",
      username: "admin",
      appPassword: "pass xxxx",
      password: "plainpass",
      secret: "jwt-secret",
      apiKey: "api-key-value",
      nonce: "wp-nonce-value",
      token: "jwt-token-value",
      clientId: "oauth-client-id",
      ...authOverrides,
    },
  },
  getCurrentUser: vi.fn().mockResolvedValue({ name: "Admin", username: "admin" }),
  getSiteInfo: vi.fn().mockResolvedValue({ name: "Test Site" }),
});

// ---------------------------------------------------------------------------
// WordPressAuth — authenticate()
// ---------------------------------------------------------------------------

describe("WordPressAuth.authenticate()", () => {
  it("succeeds with app-password when credentials are present", async () => {
    const client = makeClient({ method: "app-password" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
    expect(client.getCurrentUser).toHaveBeenCalled();
  });

  it("throws when app-password username/appPassword missing", async () => {
    const client = makeClient({ method: "app-password", username: undefined, appPassword: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Application Password");
  });

  it("throws descriptive message when app-password API call fails", async () => {
    const client = makeClient({ method: "app-password" });
    client.getCurrentUser.mockRejectedValue(new Error("401 Unauthorized"));
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Application Password authentication failed");
  });

  it("succeeds with basic auth when credentials present", async () => {
    const client = makeClient({ method: "basic" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
  });

  it("throws when basic auth username/password missing", async () => {
    const client = makeClient({ method: "basic", username: undefined, password: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Basic authentication requires");
  });

  it("throws descriptive message when basic auth API call fails", async () => {
    const client = makeClient({ method: "basic" });
    client.getCurrentUser.mockRejectedValue(new Error("401"));
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Basic authentication failed");
  });

  it("succeeds with jwt when credentials present", async () => {
    const client = makeClient({ method: "jwt" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
  });

  it("throws when jwt credentials missing", async () => {
    const client = makeClient({ method: "jwt", username: undefined, password: undefined, secret: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("JWT authentication requires");
  });

  it("throws descriptive message when jwt API call fails", async () => {
    const client = makeClient({ method: "jwt" });
    client.getCurrentUser.mockRejectedValue(new Error("plugin not found"));
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("JWT authentication failed");
  });

  it("succeeds with api-key when key present", async () => {
    const client = makeClient({ method: "api-key" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
    expect(client.getSiteInfo).toHaveBeenCalled();
  });

  it("throws when api-key is missing", async () => {
    const client = makeClient({ method: "api-key", apiKey: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("WORDPRESS_API_KEY");
  });

  it("throws descriptive message when api-key API call fails", async () => {
    const client = makeClient({ method: "api-key" });
    client.getSiteInfo.mockRejectedValue(new Error("403"));
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("API Key authentication failed");
  });

  it("succeeds with cookie auth (uses getSiteInfo)", async () => {
    const client = makeClient({ method: "cookie" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
    expect(client.getSiteInfo).toHaveBeenCalled();
  });

  it("succeeds with cookie auth even when nonce is missing", async () => {
    const client = makeClient({ method: "cookie", nonce: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).resolves.toBe(true);
  });

  it("throws descriptive message when cookie API call fails", async () => {
    const client = makeClient({ method: "cookie" });
    client.getSiteInfo.mockRejectedValue(new Error("network error"));
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Cookie authentication failed");
  });

  it("throws for unsupported authentication type", async () => {
    const client = makeClient({ method: "unsupported" });
    const auth = new WordPressAuth(client);
    await expect(auth.authenticate()).rejects.toThrow("Unsupported authentication type");
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — refreshAuth()
// ---------------------------------------------------------------------------

describe("WordPressAuth.refreshAuth()", () => {
  it("re-authenticates for jwt method", async () => {
    const client = makeClient({ method: "jwt" });
    const auth = new WordPressAuth(client);
    await expect(auth.refreshAuth()).resolves.toBe(true);
    expect(client.getCurrentUser).toHaveBeenCalled();
  });

  it("returns true immediately for non-jwt methods", async () => {
    const client = makeClient({ method: "app-password" });
    const auth = new WordPressAuth(client);
    await expect(auth.refreshAuth()).resolves.toBe(true);
    expect(client.getCurrentUser).not.toHaveBeenCalled();
  });

  it("returns false when jwt refresh fails", async () => {
    const client = makeClient({ method: "jwt" });
    client.getCurrentUser.mockRejectedValue(new Error("token expired"));
    const auth = new WordPressAuth(client);
    await expect(auth.refreshAuth()).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — validateAuth()
// ---------------------------------------------------------------------------

describe("WordPressAuth.validateAuth()", () => {
  it("returns true when getCurrentUser succeeds", async () => {
    const client = makeClient();
    const auth = new WordPressAuth(client);
    await expect(auth.validateAuth()).resolves.toBe(true);
  });

  it("returns false when getCurrentUser throws", async () => {
    const client = makeClient();
    client.getCurrentUser.mockRejectedValue(new Error("invalid token"));
    const auth = new WordPressAuth(client);
    await expect(auth.validateAuth()).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — getAuthStatus()
// ---------------------------------------------------------------------------

describe("WordPressAuth.getAuthStatus()", () => {
  it("returns authenticated status with user when login succeeds", async () => {
    const client = makeClient({ method: "app-password" });
    const auth = new WordPressAuth(client);
    const status = await auth.getAuthStatus();
    expect(status.authenticated).toBe(true);
    expect(status.method).toBe("app-password");
    expect(status.user).toEqual({ name: "Admin", username: "admin" });
    expect(status.error).toBeUndefined();
  });

  it("returns unauthenticated status with error when login fails", async () => {
    const client = makeClient();
    client.getCurrentUser.mockRejectedValue(new Error("session expired"));
    const auth = new WordPressAuth(client);
    const status = await auth.getAuthStatus();
    expect(status.authenticated).toBe(false);
    expect(status.error).toBe("session expired");
    expect(status.user).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — switchAuthMethod()
// ---------------------------------------------------------------------------

describe("WordPressAuth.switchAuthMethod()", () => {
  it("updates config and re-authenticates with new method", async () => {
    const client = makeClient({ method: "app-password" });
    const auth = new WordPressAuth(client);

    const newConfig = {
      method: "basic",
      username: "admin",
      password: "newpass",
    };

    await expect(auth.switchAuthMethod(newConfig)).resolves.toBe(true);
    expect(client.config.auth.method).toBe("basic");
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — startOAuthFlow()
// ---------------------------------------------------------------------------

describe("WordPressAuth.startOAuthFlow()", () => {
  it("returns authUrl and state when clientId is set", async () => {
    const client = makeClient({ method: "app-password", clientId: "my-client" });
    const auth = new WordPressAuth(client);
    const result = await auth.startOAuthFlow();
    expect(result.authUrl).toContain("my-client");
    expect(result.state).toBeTruthy();
    expect(result.state.length).toBe(32);
  });

  it("throws when clientId is missing", async () => {
    const client = makeClient({ method: "app-password", clientId: undefined });
    const auth = new WordPressAuth(client);
    await expect(auth.startOAuthFlow()).rejects.toThrow("OAuth requires client ID");
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — completeOAuthFlow()
// ---------------------------------------------------------------------------

describe("WordPressAuth.completeOAuthFlow()", () => {
  it("throws not-implemented error", async () => {
    const client = makeClient();
    const auth = new WordPressAuth(client);
    await expect(auth.completeOAuthFlow("code", "state")).rejects.toThrow("not yet implemented");
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — getAuthHeaders()
// ---------------------------------------------------------------------------

describe("WordPressAuth.getAuthHeaders()", () => {
  it("returns Basic Authorization header for app-password", () => {
    const client = makeClient({ method: "app-password" });
    const auth = new WordPressAuth(client);
    const headers = auth.getAuthHeaders();
    expect(headers["Authorization"]).toMatch(/^Basic /);
    const decoded = Buffer.from(headers["Authorization"].replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("admin:pass xxxx");
  });

  it("returns Basic Authorization header for basic auth", () => {
    const client = makeClient({ method: "basic" });
    const auth = new WordPressAuth(client);
    const headers = auth.getAuthHeaders();
    expect(headers["Authorization"]).toMatch(/^Basic /);
    const decoded = Buffer.from(headers["Authorization"].replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("admin:plainpass");
  });

  it("returns Bearer Authorization header for jwt", () => {
    const client = makeClient({ method: "jwt" });
    const auth = new WordPressAuth(client);
    const headers = auth.getAuthHeaders();
    expect(headers["Authorization"]).toBe("Bearer jwt-token-value");
  });

  it("returns X-API-Key header for api-key", () => {
    const client = makeClient({ method: "api-key" });
    const auth = new WordPressAuth(client);
    const headers = auth.getAuthHeaders();
    expect(headers["X-API-Key"]).toBe("api-key-value");
  });

  it("returns X-WP-Nonce header for cookie", () => {
    const client = makeClient({ method: "cookie" });
    const auth = new WordPressAuth(client);
    const headers = auth.getAuthHeaders();
    expect(headers["X-WP-Nonce"]).toBe("wp-nonce-value");
  });

  it("returns empty headers when credentials are absent", () => {
    const client = makeClient({ method: "app-password", username: undefined, appPassword: undefined });
    const auth = new WordPressAuth(client);
    expect(auth.getAuthHeaders()).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — requiresSetup()
// ---------------------------------------------------------------------------

describe("WordPressAuth.requiresSetup()", () => {
  it("returns false for app-password with full credentials", () => {
    const client = makeClient({ method: "app-password" });
    expect(new WordPressAuth(client).requiresSetup()).toBe(false);
  });

  it("returns true for app-password when credentials missing", () => {
    const client = makeClient({ method: "app-password", username: undefined });
    expect(new WordPressAuth(client).requiresSetup()).toBe(true);
  });

  it("returns false for basic with full credentials", () => {
    const client = makeClient({ method: "basic" });
    expect(new WordPressAuth(client).requiresSetup()).toBe(false);
  });

  it("returns true for basic when password missing", () => {
    const client = makeClient({ method: "basic", password: undefined });
    expect(new WordPressAuth(client).requiresSetup()).toBe(true);
  });

  it("returns true for jwt when secret missing", () => {
    const client = makeClient({ method: "jwt", secret: undefined });
    expect(new WordPressAuth(client).requiresSetup()).toBe(true);
  });

  it("returns false for jwt with all credentials", () => {
    const client = makeClient({ method: "jwt" });
    expect(new WordPressAuth(client).requiresSetup()).toBe(false);
  });

  it("returns true for api-key when key missing", () => {
    const client = makeClient({ method: "api-key", apiKey: undefined });
    expect(new WordPressAuth(client).requiresSetup()).toBe(true);
  });

  it("returns false for cookie (no mandatory setup)", () => {
    const client = makeClient({ method: "cookie" });
    expect(new WordPressAuth(client).requiresSetup()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WordPressAuth — getSetupInstructions()
// ---------------------------------------------------------------------------

describe("WordPressAuth.getSetupInstructions()", () => {
  const methods = ["app-password", "jwt", "api-key", "basic", "cookie"];

  methods.forEach((method) => {
    it(`returns a non-empty string for ${method}`, () => {
      const client = makeClient({ method });
      const instructions = new WordPressAuth(client).getSetupInstructions();
      expect(typeof instructions).toBe("string");
      expect(instructions.length).toBeGreaterThan(10);
    });
  });

  it("returns fallback text for unknown method", () => {
    const client = makeClient({ method: "unknown" });
    const instructions = new WordPressAuth(client).getSetupInstructions();
    expect(instructions).toContain("No setup instructions");
  });
});

// ---------------------------------------------------------------------------
// createAuthProvider factory
// ---------------------------------------------------------------------------

describe("createAuthProvider()", () => {
  const cases = [
    ["app-password", AppPasswordAuthProvider],
    ["jwt", JWTAuthProvider],
    ["basic", BasicAuthProvider],
    ["api-key", APIKeyAuthProvider],
    ["cookie", CookieAuthProvider],
  ];

  cases.forEach(([method, ProviderClass]) => {
    it(`creates ${method} provider with correct method property`, () => {
      const provider = createAuthProvider(method);
      expect(provider).toBeInstanceOf(ProviderClass);
      expect(provider.method).toBe(method);
    });
  });

  it("throws for unsupported method", () => {
    expect(() => createAuthProvider("unsupported")).toThrow("Unsupported authentication method");
  });
});

// ---------------------------------------------------------------------------
// Auth providers — delegate to WordPressAuth
// ---------------------------------------------------------------------------

describe("Auth providers authenticate()", () => {
  it("AppPasswordAuthProvider delegates to WordPressAuth", async () => {
    const client = makeClient({ method: "app-password" });
    const provider = new AppPasswordAuthProvider();
    await expect(provider.authenticate(client)).resolves.toBe(true);
  });

  it("JWTAuthProvider delegates to WordPressAuth", async () => {
    const client = makeClient({ method: "jwt" });
    const provider = new JWTAuthProvider();
    await expect(provider.authenticate(client)).resolves.toBe(true);
  });

  it("BasicAuthProvider delegates to WordPressAuth", async () => {
    const client = makeClient({ method: "basic" });
    const provider = new BasicAuthProvider();
    await expect(provider.authenticate(client)).resolves.toBe(true);
  });

  it("APIKeyAuthProvider delegates to WordPressAuth", async () => {
    const client = makeClient({ method: "api-key" });
    const provider = new APIKeyAuthProvider();
    await expect(provider.authenticate(client)).resolves.toBe(true);
  });

  it("CookieAuthProvider delegates to WordPressAuth", async () => {
    const client = makeClient({ method: "cookie" });
    const provider = new CookieAuthProvider();
    await expect(provider.authenticate(client)).resolves.toBe(true);
  });

  it("JWTAuthProvider refreshAuth returns true", async () => {
    const provider = new JWTAuthProvider();
    await expect(provider.refreshAuth()).resolves.toBe(true);
  });
});
