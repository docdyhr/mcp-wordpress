#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable no-console */

/**
 * CI/CD Configuration Validator
 * Validates GitHub Actions workflows for common issues
 */

const { readFileSync, existsSync, readdirSync } = require('fs');
const { join, basename } = require('path');

console.log('🔍 CI/CD Configuration Validator');
console.log('================================\n');

const workflowsDir = join(process.cwd(), '.github', 'workflows');
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

if (!existsSync(workflowsDir)) {
  console.error('❌ No .github/workflows directory found');
  process.exit(1);
}

const issues = [];
const warnings = [];

// Get all workflow files
const workflowFiles = readdirSync(workflowsDir)
  .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map(file => join(workflowsDir, file));

console.log(`📄 Found ${workflowFiles.length} workflow files`);

// Check each workflow
workflowFiles.forEach(file => {
  console.log(`\n📋 Checking ${basename(file)}...`);

  try {
    const content = readFileSync(file, 'utf8');

    // Check 1: Node.js version consistency
    const engineNodeVersion = packageJson.engines?.node;
    if (engineNodeVersion) {
      const nodeVersionMatches = content.match(/node-version:\s*['"]?(\d+)['"]?/g);
      if (nodeVersionMatches) {
        nodeVersionMatches.forEach(match => {
          const version = match.match(/\d+/)[0];
          const minVersion = engineNodeVersion.match(/\d+/)?.[0];
          if (minVersion && parseInt(version) < parseInt(minVersion)) {
            issues.push(`${file}: Node version ${version} is below minimum ${minVersion}`);
          }
        });
      }
    }

    // Check 2: Outdated actions
    const outdatedActions = [
      { pattern: /actions\/checkout@v3/, suggestion: 'actions/checkout@v4' },
      { pattern: /actions\/setup-node@v3/, suggestion: 'actions/setup-node@v4' },
      { pattern: /actions\/upload-artifact@v3/, suggestion: 'actions/upload-artifact@v4' },
      { pattern: /actions\/cache@v3/, suggestion: 'actions/cache@v4' }
    ];

    outdatedActions.forEach(({ pattern, suggestion }) => {
      if (pattern.test(content)) {
        warnings.push(`${file}: Consider updating to ${suggestion}`);
      }
    });

    // Check 3: Missing error handling for critical steps
    const criticalSteps = ['npm publish', 'docker push', 'gh release create'];
    criticalSteps.forEach(step => {
      if (content.includes(step)) {
        const stepContext = content.substring(
          Math.max(0, content.indexOf(step) - 200),
          content.indexOf(step) + 200
        );

        if (!stepContext.includes('continue-on-error') &&
            !stepContext.includes('if:') &&
            !stepContext.includes('|| true')) {
          warnings.push(`${file}: Critical step "${step}" lacks error handling`);
        }
      }
    });

    // Check 4: Missing timeouts (simple check for timeout-minutes presence)
    if (content.includes('runs-on:') && !content.includes('timeout-minutes:')) {
      warnings.push(`${file}: Consider adding timeout-minutes for jobs`);
    }

    // Check 5: Security best practices
    if (content.includes('secrets.') && content.includes('echo')) {
      const secretLines = content.split('\n').filter(line =>
        line.includes('secrets.') && line.includes('echo') &&
        !line.includes('$GITHUB_STEP_SUMMARY')
      );
      if (secretLines.length > 0) {
        issues.push(`${file}: Potential secret exposure in echo statement`);
      }
    }

    console.log(`  ✅ ${basename(file)} validated`);

  } catch (error) {
    issues.push(`${file}: Reading error - ${error.message}`);
    console.log(`  ❌ ${basename(file)} failed validation`);
  }
});

// Report results
console.log('\n📊 Validation Results');
console.log('====================');

if (issues.length === 0 && warnings.length === 0) {
  console.log('🎉 All workflows are healthy!');
} else {
  if (issues.length > 0) {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(`  • ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }
}

// Check package.json scripts for CI compatibility
console.log('\n🔍 Package.json CI Scripts Check');
console.log('=================================');

const requiredScripts = ['build', 'test', 'lint', 'typecheck'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

if (missingScripts.length > 0) {
  console.log('⚠️ Missing recommended CI scripts:');
  missingScripts.forEach(script => console.log(`  • ${script}`));
} else {
  console.log('✅ All recommended CI scripts are present');
}

// Exit with appropriate code
const exitCode = issues.length > 0 ? 1 : 0;
console.log(`\n${exitCode === 0 ? '✅' : '❌'} Validation ${exitCode === 0 ? 'passed' : 'failed'}`);
process.exit(exitCode);
