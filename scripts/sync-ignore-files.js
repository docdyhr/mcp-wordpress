#!/usr/bin/env node

/**
 * Sync ignore files - Ensures .gitignore and .npmignore stay up to date
 * This script checks for common patterns that should be in both files
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patterns that should always be in .npmignore
const npmIgnoreRequired = [
  // Security files
  '.env*',
  '*.pem',
  '*.key',
  '*.cert',
  '.secrets/',
  'credentials/',
  '*.token',
  '.npmrc',
  
  // Test files
  'tests/',
  '*.test.js',
  '*.test.ts',
  'coverage/',
  'test-results/',
  
  // Logs
  '*.log',
  'logs/',
  
  // Git/CI files
  '.git/',
  '.github/',
  '.gitignore',
  '.gitattributes',
  
  // Development files
  'src/', // Since dist/ contains compiled code
  'tsconfig.json',
  'eslint.config.js',
  '.vscode/',
  '.idea/'
];

// Patterns that should be in both .gitignore and .npmignore
const bothIgnoreRequired = [
  '.env',
  '.env.local',
  '*.log',
  'node_modules/',
  '.DS_Store',
  '*.swp',
  '*.swo',
  'tmp/',
  'temp/',
  '*.tmp',
  '.npmrc',
  'mcp-wordpress.config.json'
];

async function readIgnoreFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function checkIgnoreFiles() {
  const gitignorePath = join(__dirname, '..', '.gitignore');
  const npmignorePath = join(__dirname, '..', '.npmignore');
  
  const [gitignorePatterns, npmignorePatterns] = await Promise.all([
    readIgnoreFile(gitignorePath),
    readIgnoreFile(npmignorePath)
  ]);
  
  console.log('🔍 Checking ignore files...\n');
  
  // Check .npmignore for required patterns
  console.log('📦 Checking .npmignore for required patterns:');
  const missingInNpmIgnore = [];
  
  for (const pattern of npmIgnoreRequired) {
    const found = npmignorePatterns.some(p => 
      p === pattern || p.startsWith(pattern) || p.includes(pattern.replace('*', ''))
    );
    if (!found) {
      missingInNpmIgnore.push(pattern);
      console.log(`  ❌ Missing: ${pattern}`);
    }
  }
  
  if (missingInNpmIgnore.length === 0) {
    console.log('  ✅ All required patterns present');
  }
  
  // Check patterns that should be in both files
  console.log('\n🔄 Checking patterns that should be in both files:');
  const missingInGitignore = [];
  const missingInBothNpmIgnore = [];
  
  for (const pattern of bothIgnoreRequired) {
    const inGitignore = gitignorePatterns.some(p => 
      p === pattern || p.startsWith(pattern) || p.includes(pattern.replace('*', ''))
    );
    const inNpmignore = npmignorePatterns.some(p => 
      p === pattern || p.startsWith(pattern) || p.includes(pattern.replace('*', ''))
    );
    
    if (!inGitignore) {
      missingInGitignore.push(pattern);
      console.log(`  ❌ Missing in .gitignore: ${pattern}`);
    }
    if (!inNpmignore) {
      missingInBothNpmIgnore.push(pattern);
      console.log(`  ❌ Missing in .npmignore: ${pattern}`);
    }
  }
  
  if (missingInGitignore.length === 0 && missingInBothNpmIgnore.length === 0) {
    console.log('  ✅ All shared patterns present in both files');
  }
  
  // Security check - files that should NEVER be in npm package
  console.log('\n🔒 Security check - ensuring sensitive files are excluded:');
  const securityPatterns = ['.env', '.npmrc', '*.pem', '*.key', 'credentials', 'secrets'];
  const securityOk = securityPatterns.every(pattern => 
    npmignorePatterns.some(p => p === pattern || p.includes(pattern.replace('*', '')))
  );
  
  if (securityOk) {
    console.log('  ✅ All sensitive file patterns are properly excluded');
  } else {
    console.log('  ⚠️  WARNING: Some sensitive file patterns may not be excluded!');
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`  .gitignore patterns: ${gitignorePatterns.length}`);
  console.log(`  .npmignore patterns: ${npmignorePatterns.length}`);
  
  if (missingInNpmIgnore.length > 0 || missingInGitignore.length > 0) {
    console.log('\n⚠️  Action required: Some patterns are missing from ignore files');
    process.exit(1);
  } else {
    console.log('\n✅ All ignore files are properly configured');
  }
}

// Run the check
checkIgnoreFiles().catch(console.error);
