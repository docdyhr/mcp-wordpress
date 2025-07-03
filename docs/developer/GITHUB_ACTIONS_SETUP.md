# GitHub Actions Setup Guide

## Overview

The MCP WordPress project includes comprehensive GitHub Actions workflows for automated testing, quality assurance, and NPM publishing.

## Workflows

### 1. NPM Publish Workflow (`.github/workflows/npm-publish.yml`)

**Trigger**: When a GitHub release is created  
**Purpose**: Automatically publish the package to NPM

**Features**:

- ✅ Checkout code with latest actions
- ✅ Setup Node.js 18 with NPM registry
- ✅ Install dependencies with `npm ci`
- ✅ Run complete test suite
- ✅ Verify ignore file configurations
- ✅ Dry-run package contents verification
- ✅ Publish to NPM with authentication

**Required Secret**: `NPM_TOKEN`

**Usage**:

```bash
# Create a GitHub release to trigger publishing
gh release create v1.1.3 --title "Release v1.1.3" --notes "Release notes here"
```

### 2. CI Workflow (`.github/workflows/ci.yml`)

**Triggers**:

- Push to `main` or `develop` branches
- Pull requests to `main`
- Scheduled nightly runs

**Features**:

- 🧪 **Test Matrix**: Multiple Node.js versions (18, 20, 22)
- 🔍 **Quality Checks**: Linting, type checking, coverage
- 📦 **Build Verification**: Package building and installation
- 🌍 **WordPress Compatibility**: Tests against multiple WordPress versions
- 🚨 **Security Scanning**: Vulnerability scanning with Trivy
- 📚 **Documentation**: Link checking and TypeDoc generation

### 3. Additional Workflows

- **`dependency-update.yml`**: Automated dependency updates
- **`quality-assurance.yml`**: Comprehensive quality checks

## Setup Instructions

### 1. Configure NPM Token

1. **Generate NPM Token**:
   - Log in to [npmjs.com](https://npmjs.com)
   - Go to Account Settings → Access Tokens
   - Create an "Automation" token

2. **Add to GitHub Secrets**:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your NPM automation token

### 2. Verify Workflow Configuration

Check that your workflows reference the correct package name and repository:

```yaml
# In npm-publish.yml
- name: Publish to NPM
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 3. Test the Workflows

1. **Test CI Workflow**:

   ```bash
   # Push to main branch triggers CI
   git push origin main
   ```

2. **Test NPM Publish**:

   ```bash
   # Create a release to trigger publishing
   git tag v1.1.3
   git push origin v1.1.3
   gh release create v1.1.3 --title "Release v1.1.3" --notes "Release notes"
   ```

## Workflow Details

### NPM Publish Process

1. **Trigger**: GitHub release created
2. **Environment**: Ubuntu latest, Node.js 18
3. **Steps**:
   - Checkout repository
   - Setup Node.js with NPM registry
   - Install dependencies (`npm ci`)
   - Run tests (`npm test`, `npm run test:tools`, `npm run health`)
   - Verify configurations (`npm run check:ignore`)
   - Dry-run verification (`npm publish --dry-run`)
   - Publish to NPM (`npm publish`)

### Security Features

- ✅ **Token Security**: NPM_TOKEN stored as GitHub secret
- ✅ **Scope Isolation**: Workflows only have necessary permissions
- ✅ **Vulnerability Scanning**: Automated security checks
- ✅ **File Verification**: Ensures no sensitive files are published

### Quality Assurance

- ✅ **Multi-Node Testing**: Compatibility across Node.js versions
- ✅ **Code Quality**: ESLint, TypeScript, coverage thresholds
- ✅ **WordPress Compatibility**: Tests against multiple WP versions
- ✅ **Documentation**: Automated link checking

## Troubleshooting

### NPM Publish Fails

1. **Check Token**: Ensure `NPM_TOKEN` secret is correctly set
2. **Verify Permissions**: Token must have publish permissions
3. **Version Conflicts**: Ensure version number is incremented

```bash
# Check if version already exists
npm view mcp-wordpress versions --json
```

### CI Failures

1. **Test Failures**: Check test output in Actions tab
2. **Dependency Issues**: Review package-lock.json changes
3. **Timeout Issues**: WordPress compatibility tests may timeout

### Security Scan Issues

1. **Vulnerability Alerts**: Review and update dependencies
2. **File Exclusion**: Ensure sensitive files are in `.npmignore`

## Best Practices

### Release Process

1. **Update Version**: Increment version in `package.json`
2. **Update Changelog**: Document changes
3. **Test Locally**: Run full test suite
4. **Create Release**: Use GitHub releases for publishing

```bash
# Recommended release flow
npm run test && npm run health && npm run check:ignore
git add . && git commit -m "release: v1.1.3"
git tag v1.1.3 && git push origin main --tags
gh release create v1.1.3 --title "Release v1.1.3" --notes-file RELEASE_NOTES_v1.1.3.md
```

### Monitoring

- **Actions Tab**: Monitor workflow runs
- **NPM Dashboard**: Check download stats
- **Security Alerts**: Review GitHub security advisories

## Maintenance

### Weekly Tasks

- Review workflow run status
- Check for dependency updates
- Monitor NPM package health

### Monthly Tasks

- Review and update workflow actions versions
- Audit security scan results
- Update documentation

## Example Release Creation

```bash
# Complete release process
npm version patch                    # Increment version
npm run test                        # Verify tests pass
git add package.json package-lock.json
git commit -m "release: v1.1.3"
git tag v1.1.3
git push origin main --tags
gh release create v1.1.3 \
  --title "Release v1.1.3" \
  --notes "Bug fixes and performance improvements" \
  --latest
```

This automatically triggers the NPM publish workflow and makes the new version available to users.

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
