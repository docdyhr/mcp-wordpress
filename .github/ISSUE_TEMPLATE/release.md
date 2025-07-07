---
name: 🚀 Release Request
about: Request a new release to NPM and Docker Hub
title: 'Release v[VERSION]'
labels: 'release'
assignees: 'docdyhr'
---

## Release Information

**Release Type:**

- [ ] Patch (bug fixes)
- [ ] Minor (new features, backward compatible)
- [ ] Major (breaking changes)

**Version:** vX.X.X

## Changes Included

### 🚀 Features

-

### 🐛 Bug Fixes

-

### ⚡ Performance Improvements

-

### 📚 Documentation

-

### 🏗️ Internal Changes

-

## Release Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md reviewed
- [ ] Version in package.json is correct
- [ ] Breaking changes documented (if major)

### Release Process

- [ ] Create release branch: `git checkout -b release/vX.X.X`
- [ ] Commit changes with conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `BREAKING CHANGE:` for major version bumps
- [ ] Push to main branch
- [ ] Semantic release will automatically:
  - [ ] Generate release notes
  - [ ] Create GitHub release
  - [ ] Publish to NPM
  - [ ] Build and push Docker images
  - [ ] Update CHANGELOG.md

### Post-Release

- [ ] Verify NPM package: <https://www.npmjs.com/package/mcp-wordpress>
- [ ] Verify Docker images: <https://hub.docker.com/r/docdyhr/mcp-wordpress>
- [ ] Test installation: `npm install mcp-wordpress@latest`
- [ ] Test Docker image: `docker run docdyhr/mcp-wordpress:latest`
- [ ] Update documentation if needed
- [ ] Announce release (if significant)

## Notes

<!-- Any additional information about this release -->

## Breaking Changes (Major Releases Only)

<!-- Document any breaking changes and migration steps -->

## Testing

<!-- Describe how this release has been tested -->

---

**Automation:** This release will be automatically published to NPM and Docker Hub when merged to main with conventional commit messages.
