import { describe, it, expect } from '@jest/globals';
import { SecurityUtils } from '../../dist/security/SecurityConfig.js';

describe('SecurityUtils', () => {
  describe('redactSensitiveData', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'abc123'
      };

      const result = SecurityUtils.redactSensitiveData(data);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'test',
          password: 'secret'
        },
        config: {
          token: 'xyz789'
        }
      };

      const result = SecurityUtils.redactSensitiveData(data);

      expect(result.user.name).toBe('test');
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.config.token).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const data = [
        { username: 'user1', password: 'pass1' },
        { username: 'user2', secret: 'pass2' }
      ];

      const result = SecurityUtils.redactSensitiveData(data);

      expect(result[0].username).toBe('user1');
      expect(result[0].password).toBe('[REDACTED]');
      expect(result[1].username).toBe('user2');
      expect(result[1].secret).toBe('[REDACTED]');
    });
  });

  describe('redactString', () => {
    it('should redact password patterns', () => {
      const text = 'password="secret123" and token="abc456"';
      const result = SecurityUtils.redactString(text);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
      expect(result).not.toContain('abc456');
    });

    it('should preserve non-sensitive text', () => {
      const text = 'This is a normal message with no secrets';
      const result = SecurityUtils.redactString(text);

      expect(result).toBe(text);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of specified length', () => {
      const token16 = SecurityUtils.generateSecureToken(16);
      const token32 = SecurityUtils.generateSecureToken(32);

      expect(token16).toHaveLength(16);
      expect(token32).toHaveLength(32);
    });

    it('should generate unique tokens', () => {
      const token1 = SecurityUtils.generateSecureToken(16);
      const token2 = SecurityUtils.generateSecureToken(16);

      expect(token1).not.toBe(token2);
    });

    it('should only contain safe characters', () => {
      const token = SecurityUtils.generateSecureToken(100);
      const safePattern = /^[A-Za-z0-9]+$/;

      expect(safePattern.test(token)).toBe(true);
    });

    it('should use default length when no parameter provided', () => {
      const token = SecurityUtils.generateSecureToken();
      expect(token).toHaveLength(32);
    });
  });

  describe('isFileExtensionAllowed', () => {
    it('should allow safe file extensions', () => {
      expect(SecurityUtils.isFileExtensionAllowed('image.jpg')).toBe(true);
      expect(SecurityUtils.isFileExtensionAllowed('document.pdf')).toBe(true);
      expect(SecurityUtils.isFileExtensionAllowed('data.csv')).toBe(true);
    });

    it('should block dangerous file extensions', () => {
      expect(SecurityUtils.isFileExtensionAllowed('virus.exe')).toBe(false);
      expect(SecurityUtils.isFileExtensionAllowed('script.php')).toBe(false);
      expect(SecurityUtils.isFileExtensionAllowed('malware.bat')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(SecurityUtils.isFileExtensionAllowed('virus.EXE')).toBe(false);
      expect(SecurityUtils.isFileExtensionAllowed('image.JPG')).toBe(true);
    });
  });

  describe('sanitizeForLog', () => {
    it('should sanitize string data', () => {
      const logData = 'User login with password="secret123"';
      const result = SecurityUtils.sanitizeForLog(logData);

      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should sanitize object data', () => {
      const logData = {
        action: 'login',
        username: 'testuser',
        password: 'secret123'
      };

      const result = SecurityUtils.sanitizeForLog(logData);

      expect(result.action).toBe('login');
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
    });

    it('should return primitive values unchanged', () => {
      expect(SecurityUtils.sanitizeForLog(123)).toBe(123);
      expect(SecurityUtils.sanitizeForLog(true)).toBe(true);
      expect(SecurityUtils.sanitizeForLog(null)).toBe(null);
    });
  });
});
