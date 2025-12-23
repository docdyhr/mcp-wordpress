#!/usr/bin/env node
/**
 * Migrate relative imports to path aliases
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

// Map directory depths to path aliases
const aliasMap = {
  'client/': '@/client/',
  'server/': '@/server/',
  'tools/': '@/tools/',
  'utils/': '@/utils/',
  'config/': '@/config/',
  'cache/': '@/cache/',
  'security/': '@/security/',
  'performance/': '@/performance/',
  'types/': '@/types/',
};

function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function migrateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Match imports like: from "../client/api.js" or from "../../utils/logger.js"
  const importRegex = /from\s+["'](\.\.[\/][^"']+)["']/g;
  
  content = content.replace(importRegex, (match, importPath) => {
    // Resolve the import path relative to src
    const fileDir = path.dirname(filePath);
    const absoluteImportPath = path.resolve(fileDir, importPath);
    const relativeTosrc = path.relative(srcDir, absoluteImportPath);
    
    // Find matching alias
    for (const [prefix, alias] of Object.entries(aliasMap)) {
      if (relativeTosrc.startsWith(prefix)) {
        const newPath = relativeTosrc.replace(prefix, alias);
        modified = true;
        return `from "${newPath}"`;
      }
    }
    
    // If no alias matches but starts with known directory, use @/
    const firstDir = relativeTosrc.split('/')[0];
    if (['client', 'server', 'tools', 'utils', 'config', 'cache', 'security', 'performance', 'types'].includes(firstDir)) {
      modified = true;
      return `from "@/${relativeTosrc}"`;
    }
    
    return match; // Keep original if no match
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Run migration
const files = getAllTsFiles(srcDir);
let migratedCount = 0;

for (const file of files) {
  if (migrateImports(file)) {
    console.log(`Migrated: ${path.relative(srcDir, file)}`);
    migratedCount++;
  }
}

console.log(`\nMigrated ${migratedCount} files`);
