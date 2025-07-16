# 🔒 Security Guide

**Comprehensive security guide for MCP WordPress Server deployment and operation.**

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication Security](#authentication-security)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Security Testing](#security-testing)
- [Production Deployment](#secure-deployment)
- [Incident Response](#incident-response)

## Security Overview

The MCP WordPress Server is designed with security as a core principle. This guide covers security best practices,
threat mitigation, and compliance requirements.

### Security Posture

- **✅ 40/40 Security Tests Passing** - Comprehensive security validation
- **✅ Input Validation** - All inputs validated and sanitized with edge case handling
- **✅ XSS Protection** - Cross-site scripting prevention with content sanitization
- **✅ SQL Injection Prevention** - Database attack protection with parameterized queries
- **✅ Path Traversal Protection** - File system security with directory restrictions
- **✅ Rate Limiting** - DoS protection with configurable thresholds
- **✅ Credential Security** - Secure authentication handling with encryption

### Security Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Client     │    │   MCP Server    │    │   WordPress     │
│   (Claude)      │◄──►│   (This App)    │◄──►│   REST API      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Security Layer  │
                    │ - Validation    │
                    │ - Sanitization  │
                    │ - Rate Limiting │
                    │ - Audit Log     │
                    └─────────────────┘
```

### Threat Model

**Protected Against:**

- ✅ **Injection Attacks** - SQL, NoSQL, Command injection
- ✅ **Cross-Site Scripting (XSS)** - Reflected, stored, DOM-based
- ✅ **Path Traversal** - Directory traversal, file inclusion
- ✅ **Authentication Bypass** - Session hijacking, credential stuffing
- ✅ **Denial of Service** - Request flooding, resource exhaustion
- ✅ **Data Exposure** - Sensitive information leakage
- ✅ **Authorization Flaws** - Privilege escalation, access control bypass

## Authentication Security

### WordPress Application Passwords (Recommended)

**Benefits:**

- ✅ Revocable without changing main password
- ✅ Scoped to specific applications
- ✅ Audit trail and access logging
- ✅ WordPress native security features

**Security Implementation:**

```bash
# Create dedicated MCP user with minimal permissions
# Use unique application password name
# Regenerate passwords regularly
```

**Best Practices:**

1. **Dedicated User Account**: Create specific user for MCP access
2. **Minimal Permissions**: Grant only required WordPress capabilities
3. **Regular Rotation**: Change passwords every 90 days
4. **Unique Names**: Use descriptive application password names
5. **Monitor Access**: Review authentication logs regularly

### Authentication Methods Comparison

| Method | Security Level | Production Ready | Use Case |
|--------|----------------|------------------|----------|
| **Application Password** | 🟢 High | ✅ Yes | Recommended for all environments |
| **JWT** | 🟡 Medium | ⚠️ With proper setup | API-heavy applications |
| **Basic Auth** | 🔴 Low | ❌ No | Development only |
| **API Key** | 🟡 Medium | ⚠️ Plugin dependent | Plugin-based authentication |

## Input Validation & Sanitization

### Enhanced Validation System

The MCP WordPress Server implements **multi-layer validation** with comprehensive edge case handling:

#### 1. Type & Format Validation

```typescript
// Enhanced ID validation with edge cases
validateId(id, "post ID");
// Handles: null, undefined, strings, decimals, negatives, overflow

// URL validation with security checks
validateUrl(url, "site URL");
// Validates: protocol, hostname, port, localhost restrictions

// Username validation with security filtering
validateUsername(username);
// Checks: length, characters, reserved names, consecutive spaces
```

#### 2. Content Sanitization

```typescript
// HTML content sanitization
sanitizeHtml(content);
// Removes: <script>, event handlers, javascript:, dangerous patterns

// Search query sanitization
validateSearchQuery(query);
// Filters: SQL patterns, XSS attempts, control characters
```

#### 3. Complex Parameter Validation

```typescript
// Post creation with contextual validation
validatePostParams({
  title: "My Post",           // Required, sanitized
  content: "<p>Safe HTML</p>", // XSS protection
  status: "future",           // Valid status
  date: "2024-01-01T10:00:00", // Required for future posts
  categories: [1, 2, 3]       // Valid category IDs
});

// Pagination with conflict detection
validatePaginationParams({
  page: 1,
  per_page: 10,
  offset: 20  // ERROR: Cannot use page and offset together
});
```

#### 4. Security Patterns Protection

**XSS Prevention:**

```typescript
// Content filtering
const dangerousPatterns = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi  // Event handlers
];
```

**SQL Injection Prevention:**

```typescript
// Query sanitization
sanitized = sanitized.replace(
  /(\b(union|select|insert|update|delete|drop|create)\b)/gi,
  ""
);
```

**Path Traversal Prevention:**

```typescript
// File path validation
if (path.includes("..") || path.includes("~")) {
  throw new Error("Directory traversal not allowed");
}
```

### Content Security Policies

#### WordPress Content Validation

- HTML content sanitization
- Media file type validation
- URL format verification
- Email address validation
- WordPress ID validation

#### File Upload Security

- Extension whitelist enforcement
- MIME type validation
- File size limitations
- Virus scanning integration points

## Network Security

### HTTPS Requirements

**Production Deployment:**

```bash
# Always use HTTPS in production
WORDPRESS_SITE_URL=https://your-site.com  # ✅ Secure
WORDPRESS_SITE_URL=http://your-site.com   # ❌ Insecure
```

**Development Exceptions:**

```bash
# HTTP acceptable for localhost only
WORDPRESS_SITE_URL=http://localhost:8080  # ✅ OK for development
```

### Rate Limiting

**Default Protection:**

```bash
# Built-in rate limiting
RATE_LIMIT_REQUESTS=1000    # 1000 requests
RATE_LIMIT_WINDOW=60000     # per minute (60 seconds)
```

**Aggressive Protection:**

```bash
# High-security environments
RATE_LIMIT_REQUESTS=100     # 100 requests
RATE_LIMIT_WINDOW=60000     # per minute
```

### Network Access Control

#### Docker Deployment

```yaml
# Restrict network access
services:
  mcp-wordpress:
    networks:
      - internal-network
    # Don't expose ports directly to host
```

#### Firewall Configuration

```bash
# Allow only necessary ports
# Port 80/443 for WordPress API access
# Internal ports for MCP communication only
```

## Credential Management

### Environment Variables Security

**✅ Secure Practices:**

```bash
# Use environment variables for credentials
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Never hardcode credentials in code
# Use .env files for development
# Use secrets management for production
```

**❌ Insecure Practices:**

```javascript
// Never do this
const password = "my-password";
const config = { password: "hardcoded-password" };
```

### File Permissions

**Configuration Files:**

```bash
# Secure file permissions
chmod 600 .env
chmod 600 mcp-wordpress.config.json
chown app:app .env

# Verify permissions
ls -la .env
# Should show: -rw------- 1 app app
```

### Git Security

**Exclude Sensitive Files:**

```gitignore
# .gitignore - Always exclude
.env
.env.*
mcp-wordpress.config.json
claude_desktop_config.json
```

**Credential Scanning:**

```bash
# Use tools to scan for committed secrets
git-secrets --scan
truffleHog --regex --entropy=False .
```

## Docker Security

### Container Security

**Base Image Security:**

```dockerfile
# Use official, minimal base images
FROM node:18-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

**Runtime Security:**

```bash
# Run container with security restrictions
docker run \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  docdyhr/mcp-wordpress:latest
```

### Secrets Management

**Docker Secrets:**

```yaml
# docker-compose.yml
services:
  mcp-wordpress:
    secrets:
      - wordpress_password
secrets:
  wordpress_password:
    external: true
```

**Environment Variables:**

```bash
# Use external secret management
docker run \
  --env-file <(vault kv get -field=env secret/mcp-wordpress) \
  docdyhr/mcp-wordpress:latest
```

## Security Monitoring

### Audit Logging

**Enable Comprehensive Logging:**

```bash
# Production logging configuration
NODE_ENV=production
LOG_LEVEL=warn
AUDIT_LOG_ENABLED=true
SECURITY_LOG_ENABLED=true
```

**Log Analysis:**

```bash
# Monitor authentication failures
grep "Authentication failed" /var/log/mcp-wordpress.log

# Monitor rate limiting
grep "Rate limit exceeded" /var/log/mcp-wordpress.log

# Monitor security validation failures
grep "Security validation failed" /var/log/mcp-wordpress.log
```

### Security Metrics

**Key Metrics to Monitor:**

- Authentication failure rate
- Rate limiting triggers
- Invalid input attempts
- Error response patterns
- Connection source analysis

### Alerting

**Critical Security Events:**

```bash
# Set up alerts for:
# - Multiple authentication failures
# - Rate limiting exceeded
# - Security validation failures
# - Unusual access patterns
# - Error rate spikes
```

## Incident Response

### Security Incident Checklist

1. **Immediate Response**
   - Disable affected accounts
   - Rotate compromised credentials
   - Enable additional logging
   - Document incident timeline

2. **Investigation**
   - Analyze access logs
   - Check WordPress audit logs
   - Review security monitoring
   - Identify attack vectors

3. **Remediation**
   - Patch vulnerabilities
   - Update credentials
   - Strengthen security controls
   - Update monitoring rules

4. **Recovery**
   - Verify system integrity
   - Test security controls
   - Update documentation
   - Conduct lessons learned

### Emergency Procedures

**Credential Compromise:**

```bash
# 1. Immediately revoke WordPress application passwords
# 2. Generate new application passwords
# 3. Update MCP server configuration
# 4. Restart MCP server
# 5. Monitor for continued unauthorized access
```

**System Compromise:**

```bash
# 1. Isolate affected systems
# 2. Preserve evidence
# 3. Analyze attack vectors
# 4. Rebuild from clean backups
# 5. Implement additional security controls
```

## Secure Deployment

### Production Checklist

**Pre-Deployment:**

- [ ] All credentials use Application Passwords
- [ ] HTTPS configured and enforced
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Security logging enabled
- [ ] File permissions configured
- [ ] Network access restricted

**WordPress Security:**

- [ ] WordPress core updated
- [ ] Security plugins installed
- [ ] User permissions audited
- [ ] Application passwords rotated
- [ ] Admin accounts secured
- [ ] REST API access controlled

**Infrastructure Security:**

- [ ] Firewall configured
- [ ] SSL certificates valid
- [ ] Docker containers hardened
- [ ] Secrets management deployed
- [ ] Monitoring configured
- [ ] Backup system secured

### Security Updates

**Update Schedule:**

- **Critical Security Updates**: Immediate
- **Security Patches**: Within 7 days
- **Regular Updates**: Monthly
- **Dependency Updates**: Bi-weekly

**Update Process:**

1. Review security advisories
2. Test updates in staging
3. Schedule maintenance window
4. Deploy with rollback plan
5. Verify security controls
6. Update documentation

## Compliance

### Security Standards

**Supported Standards:**

- OWASP Top 10 compliance
- WordPress security best practices
- Docker security benchmarks
- Node.js security guidelines

### Data Protection

**WordPress Data Handling:**

- Minimal data collection
- Encrypted data transmission
- Secure credential storage
- Access logging
- Data retention policies

### Privacy Considerations

**User Data:**

- Authentication data encrypted
- No persistent storage of credentials
- Audit trail maintained
- Access controls enforced

## Security Testing

### Automated Testing

**Test Suite Coverage:**

```bash
# Run security tests
npm run test:security

# Specific security validations
npm run test:security:validation
npm run test:security:penetration

# Results: 40/40 security tests passing
```

### Manual Testing

**Security Validation:**

1. **Authentication Testing**
   - Invalid credential handling
   - Brute force protection
   - Session management

2. **Input Validation Testing**
   - XSS prevention
   - SQL injection protection
   - Path traversal prevention

3. **Network Security Testing**
   - HTTPS enforcement
   - Rate limiting effectiveness
   - Access control validation

### Penetration Testing

**Regular Security Assessments:**

- Quarterly penetration testing
- Annual security audits
- Continuous vulnerability scanning
- Bug bounty program consideration

## Security Support

### Reporting Security Issues

**Security Contact:**

- Email: [Create security email]
- GPG Key: [Provide GPG key for encrypted communication]
- Response Time: 24 hours for critical issues

**Disclosure Policy:**

- Responsible disclosure encouraged
- 90-day disclosure timeline
- Security credit provided
- Bug bounty consideration

### Security Resources

- **[OWASP WordPress Security](https://owasp.org/www-project-wordpress-security/)**
- **[WordPress Security Handbook](https://developer.wordpress.org/plugins/security/)**
- **[Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)**
- **[Docker Security](https://docs.docker.com/engine/security/)**

---

**Security Concern?** [Report a security issue](mailto:security@example.com) or
[open a confidential issue](https://github.com/docdyhr/mcp-wordpress/security/advisories/new).
