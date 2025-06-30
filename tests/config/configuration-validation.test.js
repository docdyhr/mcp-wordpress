import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigurationValidator } from '../../dist/config/ConfigurationSchema.js';

describe('Configuration Validation Tests', () => {
  describe('Multi-Site Configuration Validation', () => {
    it('should validate a correct multi-site configuration', () => {
      const validConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site 1',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'test-password-123',
              WORDPRESS_AUTH_METHOD: 'app-password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(validConfig)).not.toThrow();
    });

    it('should reject configuration with missing sites array', () => {
      const invalidConfig = {};

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/sites: Required/);
    });

    it('should reject configuration with duplicate site IDs', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'duplicate',
            name: 'Site 1',
            config: {
              WORDPRESS_SITE_URL: 'https://example1.com',
              WORDPRESS_USERNAME: 'user1',
              WORDPRESS_APP_PASSWORD: 'password1'
            }
          },
          {
            id: 'duplicate',
            name: 'Site 2',
            config: {
              WORDPRESS_SITE_URL: 'https://example2.com',
              WORDPRESS_USERNAME: 'user2',
              WORDPRESS_APP_PASSWORD: 'password2'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Site IDs must be unique/);
    });

    it('should reject configuration with duplicate site URLs', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Site 1',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'user1',
              WORDPRESS_APP_PASSWORD: 'password1'
            }
          },
          {
            id: 'site2',
            name: 'Site 2',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'user2',
              WORDPRESS_APP_PASSWORD: 'password2'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Site URLs must be unique/);
    });

    it('should reject invalid URLs', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'not-a-url',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Invalid URL/);
    });

    it('should reject invalid authentication methods', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password',
              WORDPRESS_AUTH_METHOD: 'invalid-method'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow();
    });

    it('should validate all supported authentication methods', () => {
      const authMethods = ['app-password', 'jwt', 'basic', 'api-key', 'cookie'];

      authMethods.forEach(method => {
        const config = {
          sites: [
            {
              id: 'site1',
              name: 'Test Site',
              config: {
                WORDPRESS_SITE_URL: 'https://example.com',
                WORDPRESS_USERNAME: 'testuser',
                WORDPRESS_APP_PASSWORD: 'password',
                WORDPRESS_AUTH_METHOD: method
              }
            }
          ]
        };

        expect(() => ConfigurationValidator.validateMultiSiteConfig(config)).not.toThrow();
      });
    });

    it('should use default auth method when not specified', () => {
      const config = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      const validated = ConfigurationValidator.validateMultiSiteConfig(config);
      expect(validated.sites[0].config.WORDPRESS_AUTH_METHOD).toBe('app-password');
    });

    it('should reject site IDs with invalid characters', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site@1!',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Site ID can only contain/);
    });

    it('should reject usernames with invalid characters', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'test user!',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Username contains invalid characters/);
    });

    it('should reject passwords that are too short', () => {
      const invalidConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'short'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(invalidConfig))
        .toThrow(/Password must be at least 8 characters/);
    });
  });

  describe('Environment Configuration Validation', () => {
    it('should validate correct environment configuration', () => {
      const validEnv = {
        WORDPRESS_SITE_URL: 'https://example.com',
        WORDPRESS_USERNAME: 'testuser',
        WORDPRESS_APP_PASSWORD: 'test-password-123'
      };

      expect(() => ConfigurationValidator.validateEnvironmentConfig(validEnv)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidEnv = {
        WORDPRESS_USERNAME: 'testuser'
      };

      expect(() => ConfigurationValidator.validateEnvironmentConfig(invalidEnv))
        .toThrow();
    });

    it('should use default auth method for environment config', () => {
      const env = {
        WORDPRESS_SITE_URL: 'https://example.com',
        WORDPRESS_USERNAME: 'testuser',
        WORDPRESS_APP_PASSWORD: 'password'
      };

      const validated = ConfigurationValidator.validateEnvironmentConfig(env);
      expect(validated.WORDPRESS_AUTH_METHOD).toBe('app-password');
    });

    it('should validate optional environment variables', () => {
      const env = {
        WORDPRESS_SITE_URL: 'https://example.com',
        WORDPRESS_USERNAME: 'testuser',
        WORDPRESS_APP_PASSWORD: 'password',
        NODE_ENV: 'development',
        DEBUG: 'true',
        DISABLE_CACHE: 'false',
        LOG_LEVEL: 'info'
      };

      expect(() => ConfigurationValidator.validateEnvironmentConfig(env)).not.toThrow();
    });

    it('should reject invalid LOG_LEVEL values', () => {
      const env = {
        WORDPRESS_SITE_URL: 'https://example.com',
        WORDPRESS_USERNAME: 'testuser',
        WORDPRESS_APP_PASSWORD: 'password',
        LOG_LEVEL: 'invalid-level'
      };

      expect(() => ConfigurationValidator.validateEnvironmentConfig(env))
        .toThrow();
    });
  });

  describe('MCP Configuration Validation', () => {
    it('should validate correct MCP configuration', () => {
      const validMcp = {
        wordpressSiteUrl: 'https://example.com',
        wordpressUsername: 'testuser',
        wordpressAppPassword: 'password',
        wordpressAuthMethod: 'jwt'
      };

      expect(() => ConfigurationValidator.validateMcpConfig(validMcp)).not.toThrow();
    });

    it('should allow undefined MCP configuration', () => {
      expect(() => ConfigurationValidator.validateMcpConfig(undefined)).not.toThrow();
    });

    it('should allow partial MCP configuration', () => {
      const partialMcp = {
        wordpressSiteUrl: 'https://example.com'
      };

      expect(() => ConfigurationValidator.validateMcpConfig(partialMcp)).not.toThrow();
    });
  });

  describe('Validation Utility Methods', () => {
    it('should check validity without throwing', () => {
      const validConfig = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(ConfigurationValidator.isValidMultiSiteConfig(validConfig)).toBe(true);

      const invalidConfig = {};
      expect(ConfigurationValidator.isValidMultiSiteConfig(invalidConfig)).toBe(false);
    });

    it('should return validation errors without throwing', () => {
      const invalidConfig = {};

      const errors = ConfigurationValidator.getValidationErrors(
        { safeParse: (data) => ({ success: false, error: { errors: [{ path: ['sites'], message: 'Required' }] } }) },
        invalidConfig
      );

      expect(errors).toContain('sites: Required');
    });
  });

  describe('URL Protocol Validation', () => {
    it('should accept https URLs', () => {
      const config = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config)).not.toThrow();
    });

    it('should accept http URLs', () => {
      const config = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'http://localhost:8080',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config)).not.toThrow();
    });

    it('should reject other protocols', () => {
      const config = {
        sites: [
          {
            id: 'site1',
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'ftp://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config))
        .toThrow(/URL must use http or https protocol/);
    });
  });

  describe('Boundary Testing', () => {
    it('should enforce maximum number of sites', () => {
      const sites = Array.from({ length: 51 }, (_, i) => ({
        id: `site${i}`,
        name: `Site ${i}`,
        config: {
          WORDPRESS_SITE_URL: `https://example${i}.com`,
          WORDPRESS_USERNAME: `user${i}`,
          WORDPRESS_APP_PASSWORD: 'password123'
        }
      }));

      const config = { sites };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config))
        .toThrow(/Maximum of 50 sites supported/);
    });

    it('should enforce minimum number of sites', () => {
      const config = { sites: [] };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config))
        .toThrow(/At least one site must be configured/);
    });

    it('should enforce maximum string lengths', () => {
      const config = {
        sites: [
          {
            id: 'a'.repeat(51),
            name: 'Test Site',
            config: {
              WORDPRESS_SITE_URL: 'https://example.com',
              WORDPRESS_USERNAME: 'testuser',
              WORDPRESS_APP_PASSWORD: 'password'
            }
          }
        ]
      };

      expect(() => ConfigurationValidator.validateMultiSiteConfig(config))
        .toThrow(/Site ID must be 50 characters or less/);
    });
  });
});