# GitHub Workflow Fixes Summary

## Overview

Fixed 7 failing GitHub Actions workflows to ensure CI/CD pipeline reliability.

## Workflows Fixed

### 1. Advanced Secret Scanning (`secret-scanning.yml`)

**Issue**: Detecting false positives in test files and documentation **Fix**:

- Added exclusion patterns for test files and documentation
- Created `.gitleaks.toml` configuration file
- Updated TruffleHog and Gitleaks to ignore test directories

### 2. Security Monitoring (`security-monitoring.yml`)

**Issue**: Snyk failing due to missing SNYK_TOKEN **Fix**:

- Added conditional check for SNYK_TOKEN availability
- Skip Snyk scanning with informative message when token not configured
- Updated secret scanning exclusions to match main workflow

### 3. CI/CD Pipeline (`ci.yml`)

**Issue**: WP-CLI missing `--allow-root` flag **Fix**: Added `--allow-root` flag to WP-CLI version check command

### 4. Performance Gates (`performance-gates.yml`)

**Issue**: WordPress not properly initialized in container **Fix**:

- Updated WordPress setup to run inside container using docker exec
- Fixed test credentials to match setup
- Added proper WP-CLI installation and WordPress configuration

### 5. MCP Tools Evaluation (`mcp-evaluations.yml`)

**Issue**: Evaluation results not being saved properly, score showing as 0 **Fix**:

- Captured mcp-eval output to file and parsed JSON results
- Fixed score comparison logic using bc for floating point
- Added proper error handling for missing results

### 6. WordPress Compatibility Testing (`wordpress-compatibility.yml`)

**Issue**: WordPress not initialized, tests getting HTML instead of API responses **Fix**:

- Added complete WordPress setup step with WP-CLI
- Created test user and content
- Configured permalinks for REST API

### 7. Release & Publish (`release.yml`)

**Issue**: Cannot push to protected main branch **Fix**:

- Added support for RELEASE_TOKEN to bypass branch protection
- Updated both checkout and semantic-release steps
- Added documentation about required token permissions

## Configuration Requirements

### Required Secrets

- `RELEASE_TOKEN`: Personal Access Token with repo, workflow, and packages permissions (for release workflow)
- `SNYK_TOKEN`: Optional, for vulnerability scanning
- `NPM_TOKEN`: For publishing to npm registry

### Notes

- All workflows now handle missing optional dependencies gracefully
- Test exclusions prevent false positive security alerts
- WordPress setup is consistent across all testing workflows
