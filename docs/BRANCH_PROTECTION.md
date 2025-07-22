# Branch Protection Configuration Guide

## 🛡️ Overview

This guide provides step-by-step instructions for setting up GitHub branch protection rules for the `main` branch
of the mcp-wordpress project, following security best practices.

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the automated setup script
./scripts/setup-branch-protection.sh
```

### Option 2: Manual Setup

Navigate to: [Repository Settings → Branches](https://github.com/docdyhr/mcp-wordpress/settings/branches)

## 📋 Required Configuration

### Branch Protection Rule Settings

**Branch name pattern:** `main`

#### ✅ Required Status Checks

Configure these status checks to be required before merging:

```text
🧪 Test Matrix (typescript)
🧪 Test Matrix (security)
🧪 Test Matrix (config)
🧹 Code Quality
🔍 Secret Scanning
🛡️ Security Audit
📊 CodeQL Analysis
🔍 Dependency Review
```

#### ✅ Pull Request Requirements

- **Require a pull request before merging**: ✅
- **Required number of reviewers**: `1` (minimum)
- **Dismiss stale reviews when new commits are pushed**: ✅
- **Require review from code owners**: ✅
- **Require approval of the most recent reviewable push**: ❌

#### ✅ Additional Restrictions

- **Require status checks to pass before merging**: ✅
- **Require branches to be up to date before merging**: ✅
- **Require conversation resolution before merging**: ✅
- **Require signed commits**: ✅ (recommended)
- **Require linear history**: ✅
- **Include administrators**: ✅
- **Allow force pushes**: ❌
- **Allow deletions**: ❌

#### 🚫 Path-based Restrictions

Add these patterns to prevent sensitive files from being committed:

```text
*.env
*.env.*
.env*
**/secrets/**
**/*key*
**/*password*
**/*credential*
**/config/local.*
**/config/production.*
```

## 🔐 Security Features Explained

### Required Status Checks

| Check | Purpose | Source Workflow |
|-------|---------|-----------------|
| Test Matrix (typescript) | Ensures TypeScript compilation and tests pass | ci.yml |
| Test Matrix (security) | Runs security-focused tests | ci.yml |
| Test Matrix (config) | Validates configuration handling | ci.yml |
| Code Quality | ESLint, Prettier, and code quality metrics | quality-assurance.yml |
| Secret Scanning | Detects accidentally committed secrets | security-monitoring.yml |
| Security Audit | Dependency vulnerability scanning | security-monitoring.yml |
| CodeQL Analysis | Static code analysis for security issues | codeql-analysis.yml |
| Dependency Review | Reviews new dependencies for security | dependency-review.yml |

### Code Owners Protection

The `.github/CODEOWNERS` file ensures that:

- Security-related files require owner review
- Configuration changes are reviewed
- CI/CD modifications are approved
- Core source code changes are validated

### Linear History

Enforces a clean, linear git history by:

- Preventing merge commits
- Requiring rebase or squash-and-merge
- Making it easier to track changes and revert if needed

## 🔧 Advanced Configuration

### Signed Commits

Enable signed commits for additional security:

1. Generate a GPG key: `gpg --gen-key`
2. Add to GitHub: Settings → SSH and GPG keys
3. Configure git: `git config --global user.signingkey [key-id]`
4. Enable auto-signing: `git config --global commit.gpgsign true`

### Branch Protection API

For automated setups or CI/CD integration:

```bash
# Using GitHub CLI
gh api repos/docdyhr/mcp-wordpress/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["🧪 Test Matrix"]}' \
  --field enforce_admins=true
```

## 🚨 Security Considerations

### Critical Files Protected

The branch protection rules specifically protect:

- **Credentials**: Prevents `.env` files and credential storage
- **Security configs**: Requires review for security-related changes
- **Dependencies**: Reviews new packages for vulnerabilities
- **CI/CD**: Protects workflow modifications
- **Source code**: Ensures all changes are tested and reviewed

### Review Requirements

- **Minimum 1 reviewer** for all changes
- **Code owner approval** for sensitive files
- **Conversation resolution** prevents merge with unresolved discussions
- **Administrator inclusion** ensures even repo owners follow rules

## 🔍 Monitoring and Maintenance

### Regular Reviews

- **Weekly**: Review failed status checks and resolve blockers
- **Monthly**: Audit and update required status checks
- **Quarterly**: Review and update path restrictions
- **Annually**: Evaluate and update security policies

### Status Check Failures

Common causes and solutions:

1. **Test failures**: Fix failing tests before merge
2. **Security issues**: Resolve vulnerabilities or false positives
3. **Code quality**: Address linting and formatting issues
4. **Dependencies**: Update or replace vulnerable packages

## 📚 Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Code Owners Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Signed Commits Guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

## 🎯 Best Practices Summary

1. **Start strict, relax carefully**: Begin with comprehensive protection, only remove restrictions after careful consideration
2. **Regular updates**: Keep status checks aligned with your CI/CD pipeline
3. **Monitor effectiveness**: Track protection rule violations and adjust accordingly
4. **Document exceptions**: If you need to bypass protection, document why and when
5. **Team alignment**: Ensure all contributors understand and follow the protection rules

---

*This configuration ensures the main branch maintains high quality, security, and stability standards for the
MCP WordPress project.*
