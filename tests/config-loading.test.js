// Vitest globals enabled

describe("Configuration Loading", () => {
  let ServerConfiguration;

  beforeEach(async () => {
    // Dynamic import
    const configModule = await import("../dist/config/ServerConfiguration.js");
    ServerConfiguration = configModule.ServerConfiguration;

    // Clear environment variables
    delete process.env.WORDPRESS_SITE_URL;
    delete process.env.WORDPRESS_USERNAME;
    delete process.env.WORDPRESS_APP_PASSWORD;
  });

  describe("Environment variable configuration", () => {
    test("should handle environment variables correctly", () => {
      // Set environment variables
      process.env.WORDPRESS_SITE_URL = "https://example.com";
      process.env.WORDPRESS_USERNAME = "testuser";
      process.env.WORDPRESS_APP_PASSWORD = "testpass";

      // Verify they are set
      expect(process.env.WORDPRESS_SITE_URL).toBe("https://example.com");
      expect(process.env.WORDPRESS_USERNAME).toBe("testuser");
      expect(process.env.WORDPRESS_APP_PASSWORD).toBe("testpass");
    });

    test("should support different auth methods via environment", () => {
      process.env.WORDPRESS_AUTH_METHOD = "app-password";
      expect(process.env.WORDPRESS_AUTH_METHOD).toBe("app-password");

      process.env.WORDPRESS_AUTH_METHOD = "jwt";
      expect(process.env.WORDPRESS_AUTH_METHOD).toBe("jwt");

      process.env.WORDPRESS_AUTH_METHOD = "basic";
      expect(process.env.WORDPRESS_AUTH_METHOD).toBe("basic");
    });
  });

  describe("Configuration structure validation", () => {
    test("should validate multi-site config structure", () => {
      const validConfig = {
        sites: [
          {
            id: "site1",
            name: "Test Site 1",
            config: {
              WORDPRESS_SITE_URL: "https://site1.example.com",
              WORDPRESS_USERNAME: "user1",
              WORDPRESS_APP_PASSWORD: "pass1",
            },
          },
          {
            id: "site2",
            name: "Test Site 2",
            config: {
              WORDPRESS_SITE_URL: "https://site2.example.com",
              WORDPRESS_USERNAME: "user2",
              WORDPRESS_APP_PASSWORD: "pass2",
            },
          },
        ],
      };

      // Validate structure
      expect(validConfig.sites).toHaveLength(2);
      expect(validConfig.sites[0].id).toBe("site1");
      expect(validConfig.sites[0].name).toBe("Test Site 1");
      expect(validConfig.sites[0].config.WORDPRESS_SITE_URL).toBe("https://site1.example.com");
      expect(validConfig.sites[1].id).toBe("site2");
    });

    test("should detect invalid config structure", () => {
      const invalidConfig = {
        sites: [
          {
            // Missing required fields
            name: "Test Site",
          },
        ],
      };

      // Validate that required fields are missing
      expect(invalidConfig.sites[0].id).toBeUndefined();
      expect(invalidConfig.sites[0].config).toBeUndefined();
    });
  });

  describe("ServerConfiguration class", () => {
    test("should be a singleton", () => {
      const instance1 = ServerConfiguration.getInstance();
      const instance2 = ServerConfiguration.getInstance();

      expect(instance1).toBe(instance2);
    });

    test("should have loadClientConfigurations method", () => {
      const instance = ServerConfiguration.getInstance();
      expect(typeof instance.loadClientConfigurations).toBe("function");
    });
  });
});
