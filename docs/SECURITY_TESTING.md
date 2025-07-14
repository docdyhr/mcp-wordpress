# Security Testing Guide

![Security](https://img.shields.io/badge/security-hardened-brightgreen)
![Testing](https://img.shields.io/badge/testing-comprehensive-blue)
![Validation](https://img.shields.io/badge/validation-strict-orange)

This guide covers the comprehensive security testing and validation framework implemented in the MCP WordPress Server.

## 🔒 Security Framework Overview

### Core Security Components

1. **Input Validation** (`src/security/InputValidator.ts`)
   - Zod-based schema validation
   - XSS protection patterns
   - SQL injection prevention
   - Path traversal protection

2. **Rate Limiting** (`SecurityLimiter` class)
   - Request throttling per user/IP
   - DoS attack prevention
   - Automatic cleanup of expired entries

3. **Input Sanitization** (`InputSanitizer` class)
   - HTML content sanitization
   - Search query cleaning
   - File path normalization
   - Output encoding for safe display

4. **Security Testing** (`tests/security/`)
   - Comprehensive vulnerability tests
   - Penetration testing scenarios
   - Edge case validation

## 🛡️ Validation Schemas

### Core Security Schemas

```typescript
// Safe string validation (XSS protection)
SecuritySchemas.safeString
  .max(10000)
  .refine((val) => !SCRIPT_PATTERN.test(val))
  .refine((val) => !val.includes("javascript:"));

// URL validation
SecuritySchemas.url
  .url()
  .regex(URL_PATTERN)
  .refine((val) => !val.includes("javascript:"));

// Search query validation (SQL injection protection)
SecuritySchemas.searchQuery
  .max(500)
  .refine((val) => !SQL_INJECTION_PATTERN.test(val))
  .refine((val) => !val.includes("--"));
```

### Tool-Specific Schemas

```typescript
// Post creation validation
ToolSchemas.postData = z.object({
  site: SecuritySchemas.siteId.optional(),
  title: SecuritySchemas.safeString.optional(),
  content: SecuritySchemas.wpContent.optional(),
  status: z.enum(["publish", "draft", "private", "pending"]).optional(),
});

// User management validation
ToolSchemas.userData = z.object({
  username: SecuritySchemas.slug,
  email: SecuritySchemas.email,
  password: SecuritySchemas.safeString.optional(),
});
```

## 🧪 Security Tests

### 1. XSS Protection Tests

```bash
npm test tests/security/security-validation.test.js -- --grep "XSS"
```

**Covered Attack Vectors:**

- Script tag injection
- Event handler injection
- JavaScript URL schemes
- Data URL schemes
- HTML entity encoding

**Example Test:**

```javascript
test("should reject script tags in safe strings", () => {
  const maliciousInput = 'Hello <script>alert("XSS")</script> World';
  expect(() => SecuritySchemas.safeString.parse(maliciousInput)).toThrow();
});
```

### 2. SQL Injection Protection Tests

```bash
npm test tests/security/security-validation.test.js -- --grep "SQL"
```

**Covered Attack Vectors:**

- Union-based injection
- Boolean-based blind injection
- Time-based blind injection
- Error-based injection
- Comment-based injection

**Example Test:**

```javascript
test("should reject SQL injection patterns", () => {
  const maliciousQueries = ["'; DROP TABLE wp_posts; --", "1' OR '1'='1", "admin'--"];

  maliciousQueries.forEach((query) => {
    expect(() => SecuritySchemas.searchQuery.parse(query)).toThrow();
  });
});
```

### 3. Path Traversal Protection Tests

```bash
npm test tests/security/security-validation.test.js -- --grep "Path"
```

**Covered Attack Vectors:**

- Directory traversal (../)
- Encoded path traversal
- Windows path traversal (..\\)
- Absolute path injection

### 4. Penetration Testing Suite

```bash
npm test tests/security/penetration-tests.test.js
```

**Comprehensive Attack Simulation:**

- Command injection attempts
- Authentication bypass
- Header injection
- Rate limiting bypass
- Large payload attacks

## 🔧 Implementation Guide

### Adding Security to New Tools

1. **Import Security Framework:**

```typescript
import { validateSecurity, ToolSchemas } from "../security/InputValidator.js";
```

1. **Apply Validation Decorator:**

```typescript
export class MyTools {
  @validateSecurity(ToolSchemas.postData)
  async createPost(params: any): Promise<any> {
    // Tool implementation
  }
}
```

1. **Custom Validation Schema:**

```typescript
const customSchema = z.object({
  customField: SecuritySchemas.safeString,
  numericField: SecuritySchemas.wpId
});

@validateSecurity(customSchema)
async customTool(params: any) {
  // Implementation
}
```

### Manual Input Sanitization

```typescript
import { InputSanitizer } from "../security/InputValidator.js";

// Sanitize HTML content
const safeHtml = InputSanitizer.sanitizeHtml(userInput);

// Sanitize search queries
const safeQuery = InputSanitizer.sanitizeSearchQuery(searchInput);

// Encode output for display
const safeOutput = InputSanitizer.encodeOutput(userContent);
```

### Rate Limiting Integration

```typescript
import { SecurityLimiter } from "../security/InputValidator.js";

async function toolMethod(params: any) {
  const userId = params.userId || "anonymous";

  if (!SecurityLimiter.checkRateLimit(userId)) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  // Continue with tool logic
}
```

## 🚨 Security Testing Commands

### Run All Security Tests

```bash
npm run test:security
```

### Run Specific Security Test Categories

```bash
# Input validation tests
npm test tests/security/security-validation.test.js

# Penetration testing
npm test tests/security/penetration-tests.test.js

# XSS protection only
npm test -- --grep "XSS"

# SQL injection protection only
npm test -- --grep "SQL"
```

### Security Test Coverage

```bash
npm run test:coverage -- tests/security/
```

## 📊 Security Monitoring

### Error Logging

Security validation errors are automatically logged:

```typescript
{
  timestamp: "2024-01-01T00:00:00.000Z",
  level: "error",
  method: "wp_create_post",
  error: "Security validation failed",
  details: {
    field: "title",
    violation: "Script tags not allowed"
  }
}
```

### Rate Limiting Monitoring

```typescript
{
  timestamp: "2024-01-01T00:00:00.000Z",
  level: "warning",
  event: "rate_limit_exceeded",
  userId: "user123",
  requestCount: 1001,
  windowMs: 60000
}
```

## 🔍 Security Audit Checklist

### ✅ Input Validation

- [ ] All user inputs validated with Zod schemas
- [ ] XSS protection on all text fields
- [ ] SQL injection protection on search/query fields
- [ ] Path traversal protection on file operations
- [ ] Length limits enforced on all inputs

### ✅ Output Encoding

- [ ] HTML entities encoded in output
- [ ] JSON responses properly escaped
- [ ] Error messages sanitized
- [ ] Log entries do not contain sensitive data

### ✅ Authentication & Authorization

- [ ] Rate limiting implemented
- [ ] Secure password handling
- [ ] Session management (if applicable)
- [ ] Permission checks on all operations

### ✅ Error Handling

- [ ] Sensitive information not exposed in errors
- [ ] Consistent error response format
- [ ] Proper logging without data leakage
- [ ] Graceful handling of edge cases

### ✅ File Operations

- [ ] Upload restrictions enforced
- [ ] File type validation
- [ ] Size limits implemented
- [ ] Path sanitization applied

## 🛠️ Security Tools Integration

### ESLint Security Rules

```javascript
{
  "extends": ["plugin:security/recommended"],
  "rules": {
    "security/detect-sql-injection": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error"
  }
}
```

### Automated Security Scanning

```bash
# Add to package.json
{
  "scripts": {
    "security:audit": "npm audit --production",
    "security:scan": "node scripts/security-check.js",
    "security:fix": "npm audit fix"
  }
}
```

### CI/CD Security Pipeline

```yaml
# GitHub Actions workflow
- name: Security Audit
  run: |
    npm audit --audit-level moderate
    npm run test:security
    npm run security:scan
```

## 📚 Best Practices

### Input Validation Best Practices

1. **Validate Early**: Check inputs at the entry point
2. **Use Allow Lists**: Define what is allowed, not what is blocked
3. **Sanitize and Validate**: Both sanitize and validate inputs
4. **Fail Securely**: Default to rejecting invalid input

### Error Handling Best Practices

1. **Generic Error Messages**: Don't expose implementation details
2. **Log Detailed Errors**: Log full details for debugging (securely)
3. **Rate Limit Errors**: Prevent information gathering
4. **Sanitize Stack Traces**: Remove sensitive information

### Security Testing Best Practices

1. **Test All Input Vectors**: Every parameter that accepts user input
2. **Use Real Attack Payloads**: Test with actual malicious inputs
3. **Automate Security Tests**: Include in CI/CD pipeline
4. **Regular Security Reviews**: Periodic manual code reviews

## 🚀 Continuous Security

### Regular Security Updates

- Monthly dependency audits
- Quarterly penetration testing
- Annual security architecture review
- Continuous monitoring and alerting

### Security Metrics

- Number of blocked malicious requests
- Rate limiting effectiveness
- Input validation error rates
- Security test coverage percentage

## 📞 Security Incident Response

### If You Discover a Vulnerability

1. **Do Not** create a public issue
2. **Do** email security concerns privately
3. **Include** steps to reproduce
4. **Provide** impact assessment if possible

### Response Timeline

- **24 hours**: Initial acknowledgment
- **72 hours**: Preliminary assessment
- **7 days**: Fix development and testing
- **14 days**: Patched release and disclosure

---

**🔒 Security is a shared responsibility - implement, test, and monitor continuously!**
