# Security Guidelines for MCP WordPress

## 🔒 Security Overview

This document provides comprehensive security guidelines for the MCP WordPress server, covering configuration,
deployment, and best practices for maintaining a secure WordPress management environment.

## 🚨 Critical Security Requirements

### 1. **Credential Management**

**NEVER store real credentials in:**

- Configuration files (even if git-ignored)
- Source code
- Test files
- Documentation or examples

**Instead, use:**

- Environment variables for single-site deployments
- Secure credential management systems (HashiCorp Vault, AWS Secrets Manager)
- System keychains for local development
- Encrypted configuration files with separate key management

### 2. **Configuration Security**

#### Secure Configuration Example

```json
{
  "sites": [
    {
      "id": "production",
      "name": "Production Site",
      "config": {
        "WORDPRESS_SITE_URL": "${PROD_WP_URL}",
        "WORDPRESS_USERNAME": "${PROD_WP_USER}",
        "WORDPRESS_APP_PASSWORD": "${PROD_WP_APP_PASSWORD}"
      }
    }
  ]
}
```

#### Environment Variables

```bash
# Use a .env file for local development only
# Never commit this file to version control
export WORDPRESS_SITE_URL="https://your-site.com"
export WORDPRESS_USERNAME="your-username"
export WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
```

## 🛡️ Security Best Practices

### Authentication Security

1. **Use Application Passwords** (Recommended)
   - WordPress 5.6+ built-in feature
   - Separate passwords for each application
   - Easy to revoke without affecting main account

2. **Rotate Credentials Regularly**
   - Set up automated rotation for production environments
   - Use different credentials for development/staging/production
   - Immediately revoke compromised credentials

3. **Implement Rate Limiting**
   - Default: 60 requests/minute
   - Configure based on your usage patterns
   - Consider implementing progressive delays for failed auth attempts

### Input Validation

All user inputs should be validated before processing:

```typescript
// Example validation pattern
const validatePostId = (id: string): boolean => {
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId > 0;
};

// Path traversal prevention
const safePath = path.normalize(userPath);
if (!safePath.startsWith(allowedBasePath)) {
  throw new Error("Invalid path");
}
```

### API Security

1. **Error Handling**
   - Never expose internal error details
   - Log errors server-side for debugging
   - Return generic error messages to clients

2. **Request Limits**
   - Implement request size limits
   - Set appropriate timeouts
   - Validate Content-Type headers

3. **HTTPS Only**
   - Always use HTTPS for WordPress sites
   - Validate SSL certificates
   - Reject insecure connections

## 🔍 Security Checklist

### Before Deployment

- [ ] All credentials are stored in environment variables
- [ ] No real credentials in configuration files
- [ ] Input validation implemented for all parameters
- [ ] Rate limiting configured appropriately
- [ ] Error messages don't expose sensitive information
- [ ] File upload restrictions in place
- [ ] Path traversal prevention implemented
- [ ] Dependencies are up-to-date (`npm audit`)
- [ ] Security headers configured
- [ ] Logging doesn't include sensitive data

### Regular Security Tasks

- [ ] Weekly: Run `npm audit` and update dependencies
- [ ] Monthly: Rotate application passwords
- [ ] Monthly: Review access logs for anomalies
- [ ] Quarterly: Security audit of codebase
- [ ] Annually: Penetration testing (for production deployments)

## 🚫 Common Security Mistakes to Avoid

1. **Hardcoding Credentials**

   ```javascript
   // ❌ NEVER DO THIS
   const password = "actual-password-here";

   // ✅ DO THIS INSTEAD
   const password = process.env.WORDPRESS_APP_PASSWORD;
   ```

2. **Logging Sensitive Data**

   ```javascript
   // ❌ NEVER DO THIS
   console.log(`Authenticating with password: ${password}`);

   // ✅ DO THIS INSTEAD
   console.log("Authenticating user...");
   ```

3. **Exposing Internal Errors**

   ```javascript
   // ❌ NEVER DO THIS
   catch (error) {
     return { error: error.stack };
   }

   // ✅ DO THIS INSTEAD
   catch (error) {
     logger.error('Internal error:', error);
     return { error: 'An error occurred processing your request' };
   }
   ```

## 🛠️ Security Tools Integration

### 1. **Automated Security Scanning**

Add to your CI/CD pipeline:

```yaml
- name: Security Audit
  run: |
    npm audit --production
    npm run lint
    # Add additional security scanners as needed
```

### 2. **Pre-commit Hooks**

Prevent accidental credential commits:

```bash
#!/bin/bash
# .husky/pre-commit

# Check for potential secrets
if git diff --cached --name-only | xargs grep -E "(password|secret|token|key).*=.*['\"].*['\"]" 2>/dev/null; then
  echo "⚠️  Potential secret detected in staged files!"
  echo "Please review and remove any real credentials before committing."
  exit 1
fi
```

### 3. **Dependency Monitoring**

```json
{
  "scripts": {
    "security-check": "npm audit --production && npm outdated",
    "security-fix": "npm audit fix"
  }
}
```

## 🔐 Secure Deployment

### Docker Security

```dockerfile
# Run as non-root user
USER node

# Don't expose unnecessary ports
EXPOSE 3000

# Use specific versions, not latest
FROM node:18-alpine@sha256:specific-hash

# Scan images for vulnerabilities
# docker scan mcp-wordpress:latest
```

### Docker Environment Variables

```bash
# Production deployment
docker run -d \
  -e WORDPRESS_SITE_URL="${PROD_URL}" \
  -e WORDPRESS_USERNAME="${PROD_USER}" \
  -e WORDPRESS_APP_PASSWORD="${PROD_PASSWORD}" \
  --read-only \
  --security-opt no-new-privileges \
  mcp-wordpress:latest
```

## 📚 Additional Resources

- [WordPress Security Best Practices](https://wordpress.org/support/article/hardening-wordpress/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

## 🚨 Security Incident Response

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Do NOT** share details publicly
3. **Do** create a security advisory on GitHub or contact the maintainer through repository issues
4. **Do** provide detailed steps to reproduce
5. **Do** suggest fixes if possible

## 🤖 Automated Security Workflows

### Security Scanning Workflows

The repository includes comprehensive automated security workflows:

1. **CodeQL Analysis** (`.github/workflows/codeql-analysis.yml`)
   - Static code analysis for vulnerabilities
   - Daily scheduled scans
   - Custom security queries

2. **Dependency Review** (`.github/workflows/dependency-review.yml`)
   - PR-based dependency security analysis
   - License compliance checking
   - Supply chain security validation

3. **Secret Scanning** (`.github/workflows/secret-scanning.yml`)
   - TruffleHog and GitLeaks integration
   - Custom pattern detection
   - Environment file analysis

4. **Dependabot** (`.github/dependabot.yml`)
   - Automated dependency updates
   - Security-first update prioritization
   - Grouped updates by category

### Security Badge Status

![Security Badge](https://img.shields.io/badge/security-monitored-green)
![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-green)
![Vulnerabilities](https://img.shields.io/badge/vulnerabilities-1%20reviewed%20exception-yellow)

## 🔍 Known Security Issues

### Production Dependencies

**@hono/node-server Path Traversal (GHSA-frvp-7c67-39w9)**

- **Severity:** Moderate (CVSS 5.9)
- **Location:** `@modelcontextprotocol/sdk` → `@hono/node-server@<2.0.5`
- **Impact:** Path traversal in Hono's `serve-static` feature on Windows via an encoded backslash (`%5C`)
- **Status:** Reviewed, accepted exception — tracked in [`security-exceptions.json`](./security-exceptions.json),
  enforced by [`scripts/security-audit-gate.js`](./scripts/security-audit-gate.js) (`npm run security:scan`), which
  fails the build once the exception's `reviewBy` date passes
- **Mitigation:**
  - This server only ever constructs a `StdioServerTransport` (see `src/index.ts`) — it never starts an HTTP listener,
    so Hono's static-file-serving code path is never reached
  - The fix (`@hono/node-server >=2.0.5`) is only resolvable by upgrading `@modelcontextprotocol/sdk`, which
    `npm audit fix --force` reports as a breaking downgrade to `1.24.3` — not worth forcing for a code path this project
    never executes (see `package.json`'s `overrides` and commit `b899959`)
  - Re-reviewed on every CI run and pre-push; the exception itself expires and must be consciously renewed

### Development Dependencies (Non-Production)

**jsondiffpatch XSS Vulnerability (CVE-2024-XXXXX)**

- **Severity:** Moderate (CVSS 4.7)
- **Location:** Transitive dependency: `mcp-evals` → `ai` → `jsondiffpatch@<0.7.2`
- **Impact:** Development/testing environment only
- **Status:** No fix available (awaiting upstream update from mcp-evals)
- **Mitigation:**
  - Vulnerability is in devDependencies only (not in production)
  - HTML formatting functionality (affected by XSS) is not used by this project
  - mcp-evals is only used for evaluation testing, not in production runtime
  - Production dependencies: **0 vulnerabilities** ✅

**Why This Is Acceptable:**

1. Not shipped to production builds (devDependency only)
2. XSS requires specific HTML diff rendering feature not used in our codebase
3. Evaluation tooling (mcp-evals) only runs in controlled development/CI environments
4. Monitoring for upstream fixes

## 📋 Security Audit Log

| Date       | Auditor   | Findings                                                                                                                | Actions Taken                                                                                                                                 |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-26 | Claude AI | Security gates non-enforcing (npm audit swallowed in package.json, main-ci.yml, dependency-review.yml, .husky/pre-push) | Added security-audit-gate.js + security-exceptions.json as one real, blocking, time-boxed exception mechanism; wired into all four call sites |
| 2025-10-02 | Claude AI | 3 moderate dev vulnerabilities                                                                                          | Documented jsondiffpatch XSS as dev-only                                                                                                      |
| 2025-07-19 | Claude AI | Enhanced security workflows                                                                                             | Added CodeQL, Dependabot, Secret Scanning                                                                                                     |
| 2025-06-29 | Claude AI | Exposed credentials in config                                                                                           | Documentation created                                                                                                                         |
| -          | -         | Input validation gaps                                                                                                   | Recommendations provided                                                                                                                      |
| -          | -         | 0 production vulnerabilities                                                                                            | ✅ Maintained clean production deps                                                                                                           |

---

**Remember**: Security is not a one-time task but an ongoing process. Stay vigilant, keep dependencies updated, and
follow these guidelines to maintain a secure WordPress management environment.
