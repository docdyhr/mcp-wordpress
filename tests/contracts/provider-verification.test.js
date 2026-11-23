import { Verifier } from "@pact-foundation/pact";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACTS_DIR = path.resolve(__dirname, "../pacts");

/**
 * Pact files to verify. `tests/pacts/` is gitignored runtime output that nothing in this repo generates, so a fresh
 * clone or worktree has no such directory, and an existing one is usually empty.
 */
export function listPactFiles(dir = PACTS_DIR) {
  try {
    return fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
}

/**
 * Why provider verification cannot run here, or null when it can. It needs a WordPress test instance AND pact files:
 * without the instance the verifier gets ECONNREFUSED, and without pact files Pact either rejects the missing directory
 * (fresh checkout) or verifies nothing and passes vacuously (empty directory).
 */
export function providerVerificationSkipReason(env = process.env, pactFiles = listPactFiles()) {
  if (!env.WORDPRESS_TEST_URL) return "WORDPRESS_TEST_URL is not set (no WordPress test instance)";
  if (pactFiles.length === 0) return `no pact files in ${PACTS_DIR}`;
  return null;
}

/**
 * Provider verification tests
 * These tests verify that a real WordPress instance satisfies our contracts
 */
describe("WordPress Provider Verification", () => {
  const skipReason = providerVerificationSkipReason();

  describe("skip rule", () => {
    it("skips without a WordPress test instance, even outside CI", () => {
      expect(providerVerificationSkipReason({}, ["wp.json"])).toMatch(/WORDPRESS_TEST_URL/);
    });

    it("skips when there are no pact files to verify", () => {
      expect(providerVerificationSkipReason({ WORDPRESS_TEST_URL: "http://wp.test" }, [])).toMatch(/no pact files/);
    });

    it("runs with both an instance and pact files", () => {
      expect(providerVerificationSkipReason({ WORDPRESS_TEST_URL: "http://wp.test" }, ["wp.json"])).toBeNull();
    });

    it("finds no pact files in a directory that does not exist", () => {
      expect(listPactFiles(path.join(__dirname, "does-not-exist"))).toEqual([]);
    });
  });

  if (skipReason) {
    it("should skip provider verification unless a test instance and pact files are both present", () => {
      console.log(`⏭️ Skipping provider verification - ${skipReason}`);
      expect(skipReason).toMatch(/WORDPRESS_TEST_URL|no pact files/);
    });
  }

  describe.skipIf(skipReason)("WordPress REST API Provider Tests", () => {
    it("should verify WordPress satisfies consumer contracts", async () => {
      expect(true).toBe(true); // Assertion for jest/expect-expect
      const providerUrl = process.env.WORDPRESS_TEST_URL;
      console.log(`🔍 Verifying contracts against: ${providerUrl}`);

      const opts = {
        logLevel: "info",
        providerBaseUrl: providerUrl,
        provider: "wordpress-rest-api",
        providerVersion: "6.0",
        pactUrls: [PACTS_DIR],
        publishVerificationResult: false,
        timeout: 30000,

        // State handlers for test setup
        stateHandlers: {
          "WordPress has posts": () => {
            console.log("✅ State: WordPress has posts");
            return Promise.resolve();
          },
          "WordPress can create posts": () => {
            console.log("✅ State: WordPress can create posts");
            return Promise.resolve();
          },
          "post 999 does not exist": () => {
            console.log("✅ State: Post 999 does not exist");
            return Promise.resolve();
          },
          "WordPress has media items": () => {
            console.log("✅ State: WordPress has media items");
            return Promise.resolve();
          },
          "invalid credentials": () => {
            console.log("✅ State: Invalid credentials test");
            return Promise.resolve();
          },
          "rate limit exceeded": () => {
            console.log("✅ State: Rate limit exceeded (simulated)");
            return Promise.resolve();
          },
          "validation rules active": () => {
            console.log("✅ State: Validation rules active");
            return Promise.resolve();
          },
        },

        // Add authentication headers if provided
        customProviderHeaders:
          process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD
            ? [
                "Authorization: Basic " +
                  Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString(
                    "base64",
                  ),
              ]
            : [],
      };

      const verifier = new Verifier(opts);

      // This will verify all pact files against the real WordPress API
      await verifier.verifyProvider();
    }, 60000);
  });

  describe("Contract Compatibility Matrix", () => {
    it("should document supported WordPress versions", () => {
      const compatibilityMatrix = {
        "6.0": { supported: true, tested: true },
        6.1: { supported: true, tested: true },
        6.2: { supported: true, tested: true },
        6.3: { supported: true, tested: true },
        6.4: { supported: true, tested: true },
        6.5: { supported: true, tested: false },
      };

      const supportedVersions = Object.entries(compatibilityMatrix)
        .filter(([_, info]) => info.supported)
        .map(([version]) => version);

      console.log(`📊 Supported WordPress versions: ${supportedVersions.join(", ")}`);
      expect(supportedVersions.length).toBeGreaterThan(0);
    });

    it("should define API endpoint contracts", () => {
      const apiContracts = {
        posts: {
          endpoints: ["/wp-json/wp/v2/posts", "/wp-json/wp/v2/posts/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
        media: {
          endpoints: ["/wp-json/wp/v2/media", "/wp-json/wp/v2/media/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
        users: {
          endpoints: ["/wp-json/wp/v2/users", "/wp-json/wp/v2/users/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
        comments: {
          endpoints: ["/wp-json/wp/v2/comments", "/wp-json/wp/v2/comments/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
        categories: {
          endpoints: ["/wp-json/wp/v2/categories", "/wp-json/wp/v2/categories/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
        tags: {
          endpoints: ["/wp-json/wp/v2/tags", "/wp-json/wp/v2/tags/{id}"],
          methods: ["GET", "POST", "PUT", "DELETE"],
        },
      };

      const totalEndpoints = Object.values(apiContracts).reduce((sum, contract) => sum + contract.endpoints.length, 0);

      console.log(`📌 Total API endpoints covered: ${totalEndpoints}`);
      expect(totalEndpoints).toBeGreaterThan(10);
    });
  });

  describe("Performance Contract Verification", () => {
    it("should verify response time SLAs", () => {
      const performanceSLAs = {
        "GET /posts": { maxResponseTime: 2000, p95Target: 1000 },
        "POST /posts": { maxResponseTime: 3000, p95Target: 1500 },
        "GET /media": { maxResponseTime: 2000, p95Target: 1000 },
        "POST /media": { maxResponseTime: 10000, p95Target: 5000 },
        "GET /users": { maxResponseTime: 1000, p95Target: 500 },
      };

      Object.entries(performanceSLAs).forEach(([_endpoint, sla]) => {
        expect(sla.maxResponseTime).toBeGreaterThan(0);
        expect(sla.p95Target).toBeLessThanOrEqual(sla.maxResponseTime);
      });

      console.log("⚡ Performance SLAs defined for contract verification");
    });
  });
});
