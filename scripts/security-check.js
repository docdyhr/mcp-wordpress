#!/usr/bin/env node

/**
 * Security check script for MCP WordPress
 * Performs various security checks and generates a report
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

// Security check results
const results = {
  passed: [],
  warnings: [],
  failures: [],
};

/**
 * Log helper functions
 */
function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
  results.passed.push(message);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  results.warnings.push(message);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  results.failures.push(message);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Check for exposed secrets in files
 */
async function checkForSecrets() {
  logInfo('Checking for exposed secrets...');
  
  const patterns = [
    /password\s*[:=]\s*["'](?!your-|example|test|placeholder|xxxx|npm_X)[\w\s]+["']/gi,
    /api[_-]?key\s*[:=]\s*["'](?!your-|example|test|placeholder|npm_X)[\w-]+["']/gi,
    /secret\s*[:=]\s*["'](?!your-|example|test|placeholder|npm_X)[\w-]+["']/gi,
    /token\s*[:=]\s*["'](?!your-|example|test|placeholder|npm_X)[\w-]+["']/gi,
  ];
  
  const filesToCheck = [
    'src/**/*.ts',
    'src/**/*.js',
    'tests/**/*.js',
    'scripts/**/*.js',
    '*.json',
    '*.md',
  ];
  
  let secretsFound = false;
  
  // Check each file pattern
  for (const pattern of filesToCheck) {
    try {
      const { stdout } = await execAsync(`find ${rootDir} -name "${pattern}" -type f | grep -v node_modules | grep -v dist | head -20`);
      const files = stdout.split('\n').filter(f => f);
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          for (const regex of patterns) {
            if (regex.test(content)) {
              logError(`Potential secret found in ${path.relative(rootDir, file)}`);
              secretsFound = true;
            }
          }
        } catch (err) {
          // Skip files that can't be read
        }
      }
    } catch (err) {
      // Pattern didn't match any files
    }
  }
  
  if (!secretsFound) {
    logSuccess('No exposed secrets found in source files');
  }
}

/**
 * Check npm audit for vulnerabilities
 */
async function checkDependencies() {
  logInfo('Checking dependencies for vulnerabilities...');
  
  try {
    const { stdout } = await execAsync('npm audit --json', { cwd: rootDir });
    const audit = JSON.parse(stdout);
    
    if (audit.metadata.vulnerabilities.total === 0) {
      logSuccess('No known vulnerabilities in dependencies');
    } else {
      const { high, critical } = audit.metadata.vulnerabilities;
      if (critical > 0) {
        logError(`${critical} critical vulnerabilities found in dependencies`);
      }
      if (high > 0) {
        logWarning(`${high} high severity vulnerabilities found in dependencies`);
      }
      logInfo('Run "npm audit fix" to resolve vulnerabilities');
    }
  } catch (err) {
    logWarning('Could not run npm audit');
  }
}

/**
 * Check for secure configuration files
 */
async function checkConfigSecurity() {
  logInfo('Checking configuration security...');
  
  // Check .gitignore
  try {
    const gitignore = await fs.readFile(path.join(rootDir, '.gitignore'), 'utf-8');
    const requiredEntries = ['.env', 'mcp-wordpress.config.json', '*.log'];
    
    for (const entry of requiredEntries) {
      if (gitignore.includes(entry)) {
        logSuccess(`${entry} is properly excluded from git`);
      } else {
        logError(`${entry} should be added to .gitignore`);
      }
    }
  } catch (err) {
    logError('.gitignore file not found');
  }
  
  // Check for config files with real credentials
  const configFiles = ['mcp-wordpress.config.json', '.env'];
  for (const file of configFiles) {
    const filePath = path.join(rootDir, file);
    try {
      await fs.access(filePath);
      logWarning(`${file} exists - ensure it doesn't contain real credentials`);
    } catch {
      // File doesn't exist, which is good for security
    }
  }
}

/**
 * Check file permissions
 */
async function checkFilePermissions() {
  logInfo('Checking file permissions...');
  
  const sensitivePaths = ['.env', 'mcp-wordpress.config.json'];
  
  for (const file of sensitivePaths) {
    const filePath = path.join(rootDir, file);
    try {
      const stats = await fs.stat(filePath);
      const mode = stats.mode & parseInt('777', 8);
      
      if (mode > parseInt('600', 8)) {
        logWarning(`${file} has permissive permissions (${mode.toString(8)})`);
      } else {
        logSuccess(`${file} has restrictive permissions`);
      }
    } catch {
      // File doesn't exist
    }
  }
}

/**
 * Check for security headers in code
 */
async function checkSecurityPatterns() {
  logInfo('Checking security patterns in code...');
  
  // Check for input validation
  try {
    const { stdout: validationFiles } = await execAsync(`grep -r "validate" ${rootDir}/src --include="*.ts" --include="*.js" | wc -l`);
    const validationCount = parseInt(validationFiles.trim());
    
    if (validationCount > 10) {
      logSuccess(`Found ${validationCount} validation references in code`);
    } else {
      logWarning('Limited input validation found in code');
    }
  } catch {
    logWarning('Could not check for validation patterns');
  }
  
  // Check for rate limiting
  try {
    const { stdout: rateLimitFiles } = await execAsync(`grep -r "rate.*limit" ${rootDir}/src --include="*.ts" --include="*.js" -i | wc -l`);
    const rateLimitCount = parseInt(rateLimitFiles.trim());
    
    if (rateLimitCount > 0) {
      logSuccess('Rate limiting implementation found');
    } else {
      logWarning('No rate limiting implementation found');
    }
  } catch {
    logWarning('Could not check for rate limiting');
  }
}

/**
 * Generate security report
 */
function generateReport() {
  console.log('\n' + '='.repeat(50));
  console.log('Security Check Summary');
  console.log('='.repeat(50));
  
  console.log(`\n${colors.green}Passed:${colors.reset} ${results.passed.length}`);
  results.passed.forEach(msg => console.log(`  ✓ ${msg}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset} ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log(`  ⚠ ${msg}`));
  }
  
  if (results.failures.length > 0) {
    console.log(`\n${colors.red}Failures:${colors.reset} ${results.failures.length}`);
    results.failures.forEach(msg => console.log(`  ✗ ${msg}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (results.failures.length === 0) {
    console.log(`${colors.green}✓ Security check passed with ${results.warnings.length} warnings${colors.reset}`);
    return 0;
  } else {
    console.log(`${colors.red}✗ Security check failed with ${results.failures.length} issues${colors.reset}`);
    return 1;
  }
}

/**
 * Main security check function
 */
async function main() {
  console.log('🔒 MCP WordPress Security Check\n');
  
  try {
    await checkForSecrets();
    await checkDependencies();
    await checkConfigSecurity();
    await checkFilePermissions();
    await checkSecurityPatterns();
    
    const exitCode = generateReport();
    process.exit(exitCode);
  } catch (error) {
    console.error('Error running security check:', error);
    process.exit(1);
  }
}

// Run the security check
main();