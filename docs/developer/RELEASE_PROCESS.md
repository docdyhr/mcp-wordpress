# Release Process Guide

Complete guide to the automated release pipeline, semantic versioning, and deployment process for the MCP WordPress Server.

## 🚀 Release Pipeline Overview

The project uses a fully automated release system based on conventional commits and semantic versioning.

### Release Workflow

```text
Feature Development → Pull Request → Main Branch → Automated Release
                   ↓               ↓             ↓
                Code Review    CI/CD Tests   Publishing
```

## 📋 Semantic Versioning

We follow [Semantic Versioning](https://semver.org/) strictly:

### Version Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (`1.0.0 → 2.0.0`): Breaking changes
- **MINOR** (`1.0.0 → 1.1.0`): New features (backward compatible)
- **PATCH** (`1.0.0 → 1.0.1`): Bug fixes (backward compatible)

### Pre-release Versions

- **Alpha** (`1.0.0-alpha.1`): Early development
- **Beta** (`1.0.0-beta.1`): Feature complete, testing
- **Release Candidate** (`1.0.0-rc.1`): Production ready, final testing

## 🔄 Conventional Commits

Our automated release system reads commit messages to determine version bumps.

### Commit Message Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

```bash
# PATCH version bump
fix: resolve authentication header issue in POST requests
fix(auth): handle JWT token expiration gracefully
fix(cache): fix cache invalidation for multi-site setups

# MINOR version bump  
feat: add new WordPress plugin management tool
feat(tools): add bulk comment moderation functionality
feat(api): add support for custom post types

# MAJOR version bump (breaking change)
feat!: redesign authentication system API
fix!: change client configuration interface
feat(api)!: remove deprecated methods

# No version bump
docs: update API documentation for media tools
style: fix code formatting with Prettier
test: add performance tests for cache system
chore: update dependencies to latest versions
ci: improve GitHub Actions workflow
refactor: improve error handling in request manager
```

### Breaking Changes

```bash
# Using exclamation mark
feat!: change authentication configuration format

# Using footer
feat: add new authentication method

BREAKING CHANGE: The authentication configuration format has changed.
See MIGRATION.md for upgrade instructions.
```

## 🏭 Automated Release System

### Release Triggers

**Automatic Release**:

- Push to `main` branch with conventional commits
- Creates version bump based on commit types
- Publishes to NPM and Docker Hub automatically

**Manual Release**:

- Workflow dispatch with manual version override
- Emergency releases and hotfixes
- Pre-release versions

### Release Workflow (`.github/workflows/release.yml`)

```yaml
name: 🚀 Release & Publish

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release_type:
        description: 'Release type'
        required: true
        default: 'patch'
        type: choice
        options: ['patch', 'minor', 'major', 'prerelease']

jobs:
  release:
    name: 🚀 Semantic Release
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 📦 Install Dependencies
        run: npm ci
      
      - name: 🧪 Run Tests
        run: npm test
      
      - name: 🔒 Security Audit
        run: npm audit --audit-level=high
      
      - name: 🏗️ Build Project
        run: npm run build
      
      - name: 🚀 Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: npx semantic-release
```

## 📦 Publishing Targets

### NPM Package

**Registry**: [npmjs.com/package/mcp-wordpress](https://www.npmjs.com/package/mcp-wordpress)

**Publishing Process**:

1. Semantic release determines version
2. Package built and tested
3. Published to NPM registry
4. Provenance generated for security

**Package Configuration**:

```json
{
  "name": "mcp-wordpress",
  "version": "0.0.0-development",
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

### Docker Images

**Registry**: [hub.docker.com/r/docdyhr/mcp-wordpress](https://hub.docker.com/r/docdyhr/mcp-wordpress)

**Multi-Architecture Support**:

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple Silicon)

**Image Tags**:

- `latest` - Latest stable release
- `1.3.1` - Specific version
- `v1.3.1` - Version with v prefix

### GitHub Releases

**Automatic Release Notes**:

- Generated from conventional commits
- Categorized by change type
- Breaking changes highlighted
- Contributors automatically credited

## 🔧 Release Configuration

### Semantic Release Configuration (`.releaserc.json`)

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    [
      "@semantic-release/exec",
      {
        "publishCmd": "docker buildx build --platform linux/amd64,linux/arm64 --tag docdyhr/mcp-wordpress:${nextRelease.version} --tag docdyhr/mcp-wordpress:latest --push ."
      }
    ],
    [
      "@semantic-release/github",
      {
        "assets": [
          {
            "path": "dist/**",
            "label": "Distribution files"
          }
        ]
      }
    ]
  ]
}
```

### Commit Analysis Configuration

```json
{
  "preset": "conventionalcommits",
  "releaseRules": [
    {"type": "feat", "release": "minor"},
    {"type": "fix", "release": "patch"},
    {"type": "perf", "release": "patch"},
    {"type": "docs", "release": false},
    {"type": "style", "release": false},
    {"type": "refactor", "release": "patch"},
    {"type": "test", "release": false},
    {"type": "build", "release": "patch"},
    {"type": "ci", "release": false},
    {"type": "chore", "release": false},
    {"breaking": true, "release": "major"}
  ]
}
```

## 🔍 Release Verification

### Automated Verification (`verify-release.yml`)

**Post-Release Verification**:

1. **NPM Verification**: Check package availability
2. **Docker Verification**: Verify image publishing
3. **GitHub Release**: Confirm release creation
4. **Integration Test**: Basic functionality test

**Verification Process**:

```yaml
- name: 📦 Verify NPM Publishing
  run: |
    VERSION=$(node -p "require('./package.json').version")
    if npm view mcp-wordpress@$VERSION version; then
      echo "✅ NPM package published successfully"
    else
      echo "❌ NPM package not found"
      exit 1
    fi

- name: 🐳 Verify Docker Publishing
  run: |
    VERSION=$(node -p "require('./package.json').version")
    if curl -s https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags | jq -e ".results[] | select(.name == \"$VERSION\")"; then
      echo "✅ Docker image published successfully"
    else
      echo "❌ Docker image not found"
      exit 1
    fi
```

### Manual Verification

```bash
# Check NPM package
npm view mcp-wordpress@latest

# Test NPM installation
npm install -g mcp-wordpress@latest
mcp-wordpress --version

# Test Docker image
docker pull docdyhr/mcp-wordpress:latest
docker run --rm docdyhr/mcp-wordpress:latest --version

# Verify GitHub release
gh release view --repo docdyhr/mcp-wordpress
```

## 🐛 Hotfix Process

### Emergency Releases

For critical bugs requiring immediate fixes:

1. **Create Hotfix Branch**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-auth-fix
   ```

2. **Implement Fix**:

   ```bash
   # Make minimal changes
   git add .
   git commit -m "fix: resolve critical authentication vulnerability"
   ```

3. **Create Pull Request**:
   - Target: `main` branch
   - Label: `hotfix`, `critical`
   - Skip normal review process if approved

4. **Fast-Track Release**:

   ```bash
   # Merge and release immediately
   git checkout main
   git merge hotfix/critical-auth-fix
   git push origin main
   ```

### Hotfix Guidelines

- **Minimal Changes**: Only fix the critical issue
- **No Feature Additions**: Hotfixes should not include new features
- **Comprehensive Testing**: Even expedited, must pass all tests
- **Documentation**: Update if user-facing changes

## 📊 Release Metrics

### Release Health Dashboard

**Key Metrics**:

- **Release Frequency**: ~2-3 releases per month
- **Lead Time**: Feature to production < 1 week
- **Success Rate**: 95%+ successful releases
- **Rollback Rate**: < 5% require rollbacks

### Monitoring

```bash
# Release frequency
gh release list --limit 10

# Download statistics
npm view mcp-wordpress --json | jq '.downloads'

# Docker pulls
curl -s https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/ | jq '.pull_count'
```

## 🔄 Rollback Process

### Automatic Rollback Triggers

- **Critical Test Failures**: Automated rollback on CI failure
- **Publishing Failures**: Rollback if NPM/Docker publishing fails
- **Integration Failures**: Rollback on post-release verification failure

### Manual Rollback Process

```bash
# Identify last known good version
gh release list

# Revert to previous version
git checkout main
git revert <commit-hash>
git commit -m "revert: rollback to v1.2.3 due to critical issue"
git push origin main

# Emergency NPM rollback
npm deprecate mcp-wordpress@1.2.4 "Critical issue, use 1.2.3"
npm dist-tag add mcp-wordpress@1.2.3 latest
```

## 📚 Release Documentation

### Changelog Generation

**Automatic Changelog**:

- Generated from conventional commits
- Categorized by change type
- Links to issues and PRs
- Breaking changes highlighted

**Changelog Format**:

```markdown
# [1.3.0](https://github.com/docdyhr/mcp-wordpress/compare/v1.2.0...v1.3.0) (2024-01-15)

### Features
* add new WordPress plugin management tool ([abc123](https://github.com/docdyhr/mcp-wordpress/commit/abc123))
* improve authentication system ([def456](https://github.com/docdyhr/mcp-wordpress/commit/def456))

### Bug Fixes
* resolve cache invalidation issue ([ghi789](https://github.com/docdyhr/mcp-wordpress/commit/ghi789))

### BREAKING CHANGES
* authentication configuration format has changed
```

### Migration Guides

For breaking changes, create migration guides in `docs/developer/MIGRATION_GUIDE.md`:

```markdown
## Migrating from v1.x to v2.x

### Authentication Configuration Changes

**Before (v1.x)**:
```javascript
{
  auth: {
    username: 'admin',
    password: 'password'
  }
}
```

**After (v2.x)**:

```javascript
{
  authentication: {
    method: 'app-password',
    username: 'admin',
    appPassword: 'xxxx xxxx xxxx xxxx xxxx xxxx'
  }
}
```

## 🔒 Security Considerations

### Release Security

**Supply Chain Security**:

- NPM provenance enabled
- Signed commits required
- Dependency scanning
- SLSA compliance

**Secret Management**:

- Publishing tokens in GitHub Secrets
- No secrets in source code
- Automated secret rotation

**Vulnerability Response**:

- Security patches prioritized
- CVE disclosure process
- Automated dependency updates

## 📈 Release Planning

### Release Schedule

**Regular Releases**:

- **Minor Releases**: Monthly (new features)
- **Patch Releases**: Bi-weekly (bug fixes)
- **Major Releases**: Quarterly (breaking changes)

**Special Releases**:

- **Security Releases**: As needed (immediate)
- **Hotfixes**: As needed (critical bugs)
- **Pre-releases**: Before major versions

### Feature Planning

**Release Branches Strategy**:

- `main`: Latest stable release
- `develop`: Next minor version development
- `feature/*`: Individual feature development
- `hotfix/*`: Critical bug fixes

## 📚 Further Reading

- **[Build System](BUILD_SYSTEM.md)** - TypeScript compilation and build process
- **[CI/CD Pipeline](CI_CD_PIPELINE.md)** - GitHub Actions workflows
- **[Migration Guide](MIGRATION_GUIDE.md)** - Breaking changes and migration paths
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute

---

**Planning a release?** This automated system ensures consistent, reliable releases while maintaining high
quality standards. Every release is tested, verified, and documented automatically.
