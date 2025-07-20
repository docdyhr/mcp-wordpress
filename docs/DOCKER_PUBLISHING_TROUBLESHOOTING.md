# Docker Publishing Troubleshooting Guide

This guide helps resolve Docker Hub publishing failures and provides tools for manual intervention when the automated release process encounters issues.

## 🚨 Common Issues

### Missing Docker Hub Versions

**Symptoms:**
- NPM publishing succeeds but Docker Hub fails
- Verification workflow reports missing versions
- GitHub releases exist but corresponding Docker images are absent

**Root Causes:**
- Docker Hub API rate limiting
- Network timeouts during multi-platform builds
- Docker registry authentication issues
- Temporary Docker Hub service disruptions

## 🔧 Resolution Tools

### 1. Quick Fix Script

For immediate resolution of publishing failures:

```bash
# Fix specific v2.0.4 issue (automatic)
./scripts/fix-docker-publishing.sh fix-2.0.4

# Check any version status
./scripts/fix-docker-publishing.sh check 2.1.0

# Trigger manual republish
./scripts/fix-docker-publishing.sh republish 2.0.4

# Check status of recent versions
./scripts/fix-docker-publishing.sh status
```

### 2. Manual Docker Publishing Script

For detailed control over the publishing process:

```bash
# Requires Docker credentials in environment
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-token"

# Publish missing version
./scripts/manual-docker-publish.sh 2.0.4

# Publish for specific platforms only
./scripts/manual-docker-publish.sh 2.0.4 linux/amd64
```

### 3. GitHub Workflow Manual Trigger

Using GitHub CLI or web interface:

```bash
# Using GitHub CLI
gh workflow run manual-docker-republish.yml -f version=2.0.4

# Verify only (no publishing)
gh workflow run manual-docker-republish.yml -f version=2.0.4 -f verify_only=true

# Custom platforms
gh workflow run manual-docker-republish.yml -f version=2.0.4 -f platforms=linux/amd64
```

## 🔍 Verification Process

### Automated Verification

The improved verification workflow now includes:

1. **Docker Hub API Check** - Queries the registry API
2. **Docker Pull Verification** - Attempts to pull the image
3. **Enhanced Debugging** - Shows available tags and detailed logs
4. **Multiple Tag Format Support** - Checks both `v2.0.4` and `2.0.4` formats

### Manual Verification

```bash
# Check via Docker Hub API
curl -s https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags | \
  jq '.results[] | select(.name | test("2.0.4")) | {name: .name, last_updated: .last_updated}'

# Check via Docker pull
docker pull docdyhr/mcp-wordpress:2.0.4
docker pull docdyhr/mcp-wordpress:v2.0.4

# Verify image metadata
docker inspect docdyhr/mcp-wordpress:2.0.4 | jq '.[].Config.Labels'
```

## 🛠️ Workflow Improvements

### Enhanced Release Workflow

The release workflow now includes:

- **Retry Mechanism**: Automatic retry on Docker build failure
- **Immediate Verification**: Post-build image validation
- **Better Error Reporting**: Detailed failure notifications
- **Graceful Degradation**: Continue if NPM succeeds but Docker fails

### Improved Verification Workflow

- **Multi-Method Verification**: API + Docker pull validation
- **Enhanced Debugging**: Shows available tags and API responses
- **Better Issue Creation**: More detailed error reports with fix instructions
- **Retry Integration**: Automatic retry triggers for failed publishes

## 📋 Troubleshooting Checklist

### Before Manual Intervention

- [ ] Check if NPM version exists: `npm view mcp-wordpress@2.0.4`
- [ ] Verify GitHub tag exists: `git tag -l | grep v2.0.4`
- [ ] Check recent workflow runs for error patterns
- [ ] Verify Docker Hub credentials in repository secrets

### During Manual Fix

- [ ] Run verification first: `./scripts/fix-docker-publishing.sh check 2.0.4`
- [ ] Use appropriate script based on access level (local vs. GitHub Actions)
- [ ] Monitor workflow progress if using GitHub Actions
- [ ] Wait for Docker Hub propagation (30-60 seconds)

### After Resolution

- [ ] Verify via multiple methods (API, Docker pull)
- [ ] Run verification workflow: `gh workflow run verify-release.yml -f version=2.0.4`
- [ ] Update any dependent systems or documentation
- [ ] Close related GitHub issues

## 🔐 Security Considerations

### Credential Management

- **GitHub Actions**: Uses repository secrets (secure)
- **Local Scripts**: Requires environment variables (use with caution)
- **Docker Tokens**: Use Docker Hub access tokens, not passwords

### Image Integrity

All published images include:
- **Provenance**: Build attestation data
- **SBOM**: Software Bill of Materials
- **Signatures**: Cryptographic verification
- **Metadata**: Complete OCI labels

## 📈 Monitoring & Alerts

### Automated Monitoring

- **Verification Workflow**: Runs after every release
- **Issue Creation**: Automatic tickets for failures
- **Status Checks**: Integration with GitHub commit status

### Manual Monitoring

```bash
# Check recent publishing status
./scripts/fix-docker-publishing.sh status

# Monitor workflow runs
gh run list --workflow=release.yml --limit=5
gh run list --workflow=verify-release.yml --limit=5

# Check Docker Hub directly
curl -s https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags | \
  jq '.results[0:5] | .[] | {name: .name, last_updated: .last_updated}'
```

## 🆘 Emergency Recovery

If all automated methods fail:

1. **Manual Docker Build:**
   ```bash
   git checkout v2.0.4
   docker buildx build --platform linux/amd64,linux/arm64 \
     --tag docdyhr/mcp-wordpress:2.0.4 \
     --tag docdyhr/mcp-wordpress:v2.0.4 \
     --push .
   ```

2. **Contact Repository Maintainer:**
   - Create detailed issue with error logs
   - Include attempted resolution steps
   - Mention urgency level and impact

3. **Fallback Options:**
   - Use previous version temporarily
   - Build local image for immediate needs
   - Use GitHub Container Registry as alternative

## 📞 Support

- **GitHub Issues**: [Create Issue](https://github.com/docdyhr/mcp-wordpress/issues/new)
- **Workflow Logs**: Check Actions tab for detailed error information
- **Docker Hub Status**: [Docker Hub Status Page](https://status.docker.com/)