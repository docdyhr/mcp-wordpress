# Publishing Troubleshooting Guide

## Overview

This guide helps troubleshoot and resolve publishing issues for the MCP WordPress project. The project publishes
to two main targets:

1. **NPM Registry** - Node.js package
2. **Docker Hub** - Container images

## Automated Publishing Process

### Normal Flow

1. **Push to main branch** → triggers semantic-release
2. **Semantic-release** → creates release, publishes to NPM, creates GitHub release
3. **GitHub release created** → triggers Docker publishing
4. **Verification workflow** → checks both NPM and Docker Hub
5. **Success** → all done, or **Failure** → creates issue and triggers retry

### Workflow Files

- `.github/workflows/release.yml` - Main release workflow
- `.github/workflows/docker-publish.yml` - Manual/fallback Docker publishing
- `.github/workflows/verify-release.yml` - Verification and retry logic

## Common Issues and Solutions

### 1. Docker Publishing Failed (NPM Succeeded)

**Symptoms:**

- NPM has the new version
- Docker Hub is missing the version
- Verification workflow creates an issue

**Causes:**

- Docker Hub credentials expired
- Docker build failure (platform issues, Dockerfile errors)
- Network timeouts
- Docker Hub rate limiting

**Solutions:**

#### Option A: Automatic Retry (Recommended)

The verification workflow should automatically trigger a retry. Check the workflow run logs.

#### Option B: Manual Workflow Trigger

```bash
# Replace v2.3.0 with your version
gh workflow run docker-publish.yml -f tag=v2.3.0 -f push=true
```

#### Option C: Local Manual Build (Emergency)

```bash
# Use the provided script
./scripts/manual-docker-publish.sh 2.3.0

# Or manually:
docker build --platform linux/amd64,linux/arm64 \
  --tag docdyhr/mcp-wordpress:2.3.0 \
  --tag docdyhr/mcp-wordpress:latest \
  --push .
```

### 2. NPM Publishing Failed

**Symptoms:**

- GitHub release created but NPM doesn't have the version
- Semantic-release logs show NPM errors

**Causes:**

- NPM_TOKEN expired or invalid
- Package.json issues
- NPM registry issues

**Solutions:**

```bash
# Verify you're logged in
npm whoami

# Manual publish
npm publish

# Or with explicit registry
npm publish --registry https://registry.npmjs.org
```

### 3. Both NPM and Docker Failed

**Causes:**

- GitHub secrets issues (NPM_TOKEN, DOCKER_USERNAME, DOCKER_PASSWORD)
- Semantic-release configuration problems
- Build/test failures

**Solutions:**

1. **Check secrets in GitHub repository settings**
2. **Verify semantic-release configuration**
3. **Run release dry-run locally:**

   ```bash
   npm run release:dry
   ```

### 4. Version Already Exists

**Symptoms:**

- "Version 2.3.0 already exists" errors

**Solutions:**

For NPM:

```bash
# You cannot overwrite existing versions
# You need to bump the version and release again
npm version patch  # or minor/major
```

For Docker:

```bash
# You can overwrite Docker tags
docker build --platform linux/amd64,linux/arm64 \
  --tag docdyhr/mcp-wordpress:2.3.0 --push .
```

## Verification

### Check NPM Publication

```bash
# Check if version exists
npm view mcp-wordpress@2.3.0

# Check latest version
npm view mcp-wordpress version

# View all versions
npm view mcp-wordpress versions --json
```

### Check Docker Hub Publication

```bash
# Pull the image
docker pull docdyhr/mcp-wordpress:2.3.0

# Check manifest
docker manifest inspect docdyhr/mcp-wordpress:2.3.0

# API check
curl -s https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags | jq '.results[] | select(.name == "2.3.0")'
```

## Emergency Manual Release Process

If all automated processes fail:

1. **Prepare the release:**

   ```bash
   git checkout main
   git pull origin main
   npm ci
   npm run build
   npm test
   ```

2. **Manual NPM publish:**

   ```bash
   npm publish
   ```

3. **Manual Docker publish:**

   ```bash
   ./scripts/manual-docker-publish.sh
   ```

4. **Create GitHub release:**

   ```bash
   gh release create v2.3.0 --title "v2.3.0" --notes "Manual release"
   ```

## Prevention

### Regular Maintenance

1. **Rotate secrets annually:**
   - NPM_TOKEN
   - DOCKER_USERNAME/DOCKER_PASSWORD

2. **Test publishing process:**

   ```bash
   npm run release:dry
   ```

3. **Monitor workflow success rates**

### Monitoring

- **GitHub Actions** - Check workflow success rates
- **NPM** - Monitor download stats for version gaps
- **Docker Hub** - Check pull statistics
- **Verification workflow** - Reviews automated issue creation

## Contact

For persistent issues:

1. Check existing GitHub issues with label `publishing-failure`
2. Create new issue with publishing logs
3. Contact maintainers if critical
