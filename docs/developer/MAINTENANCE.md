# Maintenance Guide - MCP WordPress

## Overview

This document outlines automated and manual processes to keep the project secure, up-to-date, and well-maintained.

## Automated Maintenance

### NPM Package Configuration

#### `.npmignore` File Maintenance

The `.npmignore` file is automatically checked before each publication:

```bash
# Runs automatically before npm publish
npm run prepublishOnly

# Manual check
npm run check:ignore
```

**What it checks:**

- ✅ **Security files** are excluded (`.env`, `.npmrc`, `*.pem`, `*.key`, credentials)
- ✅ **Test files** are excluded (`tests/`, `*.test.js`, `coverage/`)
- ✅ **Development files** are excluded (`src/`, config files, IDE settings)
- ✅ **CI/CD files** are excluded (`.github/`, various CI configs)
- ✅ **Logs and temporary files** are excluded
- ✅ **Documentation** is selectively included (README, LICENSE, CHANGELOG only)

#### Files Excluded from NPM Package

The following are **never** published to NPM:

**Security & Secrets:**

- `.env*` files
- `.npmrc` (contains auth tokens)
- `*.pem`, `*.key`, `*.cert` (certificates/keys)
- `credentials/`, `secrets/`, `auth/` directories
- `*.token`, `*.credentials` files

**Development Files:**

- `src/` (source TypeScript - only `dist/` is published)
- `tests/`, `coverage/`, test configuration files
- `tsconfig.json`, `eslint.config.js`
- `.vscode/`, `.idea/` (IDE settings)

**CI/CD & Git:**

- `.git/`, `.github/`
- `.gitignore`, `.gitattributes`
- CI configuration files (`.travis.yml`, `.circleci/`, etc.)

**Logs & Temporary:**

- `logs/`, `*.log`, `debug/`
- `tmp/`, `temp/`, `*.tmp`
- `test-results/`, `test-reports/`

**Documentation (Selective):**

- ❌ Development docs: `TODO.md`, `REFACTORING.md`, `MIGRATION_GUIDE.md`
- ❌ Release docs: `COMMUNITY_ANNOUNCEMENT_*.md`, `RELEASE_NOTES_*.md`
- ❌ Setup docs: `NPM_AUTH_SETUP.md`, `CLAUDE_DESKTOP_SETUP.md`
- ✅ User docs: `README.md`, `LICENSE`, `CHANGELOG.md`

### Scripts for Maintenance

#### Ignore Files Sync (`scripts/sync-ignore-files.js`)

Ensures `.gitignore` and `.npmignore` stay synchronized and secure:

```bash
# Check ignore files manually
npm run check:ignore

# Automatically runs before publish
npm run prepublishOnly
```

**Features:**

- Verifies security patterns are in place
- Checks for missing patterns in both files
- Validates that sensitive files are properly excluded
- Reports summary statistics

#### Pre-commit Hooks

Automated checks before each commit:

```bash
# Runs automatically on git commit
npm run pre-commit

# Manual run
npx lint-staged
```

**What runs:**

- ESLint fixes on TypeScript/JavaScript
- Prettier formatting
- Markdown linting
- Package.json sorting

### Package.json Scripts Integration

The following scripts help maintain file integrity:

```json
{
  "scripts": {
    "check:ignore": "node scripts/sync-ignore-files.js",
    "prepublishOnly": "npm run build && npm run check:ignore",
    "pre-commit": "lint-staged"
  }
}
```

## Manual Maintenance Tasks

### Weekly Tasks

1. **Dependency Updates**

   ```bash
   npm audit
   npm audit fix
   npm outdated
   ```

2. **Security Review**

   ```bash
   npm run check:ignore
   git status # Ensure no sensitive files are staged
   ```

3. **Test Coverage Review**

   ```bash
   npm run test:coverage
   npm run health
   ```

### Monthly Tasks

1. **Comprehensive Security Review**
   - Check `.gitignore` and `.npmignore` for new patterns
   - Review npm audit results
   - Verify no credentials in commit history

2. **Documentation Updates**
   - Update README.md with new features
   - Review and update CLAUDE.md
   - Check all markdown files for accuracy

3. **Dependency Major Updates**

   ```bash
   npm update
   npm run test
   npm run build
   ```

### Before Each Release

1. **Pre-publication Checklist**

   ```bash
   # 1. Build and test everything
   npm run build
   npm test
   npm run test:tools
   npm run health

   # 2. Check ignore files
   npm run check:ignore

   # 3. Verify no sensitive data
   npm publish --dry-run

   # 4. Check package contents
   npx pkgfiles
   ```

2. **Security Verification**
   - Verify `.npmrc` is not in the package
   - Check that no `.env` files are included
   - Ensure no credential files are packaged
   - Review the file list from `npm publish --dry-run`

## Security Best Practices

### File Exclusion Patterns

**Always exclude from NPM:**

```text
.env*
.npmrc
*.pem
*.key
*.cert
credentials/
secrets/
*.token
```

**Always exclude from Git:**

```text
.env
.npmrc
mcp-wordpress.config.json
*.log
node_modules/
```

### Credential Management

1. **Local Development:**
   - Store tokens in `~/.npmrc` or environment variables
   - Never commit `.npmrc` to version control
   - Use separate tokens for development vs. CI/CD

2. **CI/CD:**
   - Use GitHub Secrets for `NPM_TOKEN`
   - Use automation tokens (not personal tokens)
   - Rotate tokens regularly

### Emergency Procedures

**If credentials are accidentally published:**

1. **Immediate Response:**

   ```bash
   npm unpublish mcp-wordpress@version
   # Or deprecate if unpublish is not allowed
   npm deprecate mcp-wordpress@version "Security issue - use newer version"
   ```

2. **Credential Rotation:**
   - Revoke compromised NPM tokens
   - Rotate any exposed API keys
   - Update GitHub secrets
   - Regenerate any exposed credentials

3. **Republish:**

   ```bash
   npm version patch
   npm publish
   ```

## Monitoring and Alerts

### Automated Checks

The following run automatically:

- `prepublishOnly` before each npm publish
- `pre-commit` before each git commit
- CI/CD tests on every push/PR

### Manual Verification

Regular checks to perform:

```bash
# Check what would be published
npm publish --dry-run

# Verify ignore files are current
npm run check:ignore

# Check for sensitive files in working directory
git status --ignored

# Review recent commits for sensitive data
git log --oneline -10
```

## Tools and Dependencies

### Core Tools

- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Git hooks management
- **lint-staged**: Run linters on staged files
- **Jest**: Testing framework

### Security Tools

- **npm audit**: Vulnerability scanning
- **Custom scripts**: File exclusion verification
- **Git hooks**: Pre-commit security checks

### Maintenance Commands Summary

```bash
# Daily development
npm run dev
npm test
npm run lint

# Before commit
npm run pre-commit  # (runs automatically)

# Before release
npm run build
npm run check:ignore
npm publish --dry-run
npm publish

# Security checks
npm audit
npm run check:ignore
git status --ignored
```

This maintenance approach ensures:

- 🔒 **Security**: No sensitive files ever published
- 📦 **Optimization**: Minimal package size
- 🔄 **Automation**: Critical checks run automatically
- 📋 **Consistency**: Standardized maintenance procedures
