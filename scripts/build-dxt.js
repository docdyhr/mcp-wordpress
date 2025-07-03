#!/usr/bin/env node

/**
 * Build script for creating MCP WordPress DXT package
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';

const BUILD_DIR = 'dxt-build';
const DXT_DIR = 'dxt';
const PACKAGE_NAME = 'mcp-wordpress.dxt';

async function buildDXT() {
  console.log('🏗️  Building MCP WordPress DXT package...\n');

  try {
    // Clean previous build
    if (fs.existsSync(BUILD_DIR)) {
      console.log('🧹 Cleaning previous build...');
      fs.rmSync(BUILD_DIR, { recursive: true });
    }

    // Create build directory
    fs.mkdirSync(BUILD_DIR);
    console.log('📁 Created build directory');

    // Build TypeScript
    console.log('🔨 Building TypeScript...');
    execSync('npm run build', { stdio: 'inherit' });

    // Copy manifest
    console.log('📋 Copying manifest...');
    fs.copyFileSync(path.join(DXT_DIR, 'manifest.json'), path.join(BUILD_DIR, 'manifest.json'));

    // Copy icon
    console.log('🖼️  Copying icon...');
    fs.copyFileSync(path.join(DXT_DIR, 'icon.png'), path.join(BUILD_DIR, 'icon.png'));

    // Copy compiled JavaScript
    console.log('📦 Copying compiled code...');
    copyDirectory('dist', path.join(BUILD_DIR, 'dist'));

    // Copy package.json first for dependency installation
    console.log('📚 Copying package.json for dependencies...');
    fs.copyFileSync('package.json', path.join(BUILD_DIR, 'package.json'));
    fs.copyFileSync('package-lock.json', path.join(BUILD_DIR, 'package-lock.json'));
    
    // Install production dependencies
    console.log('📦 Installing production dependencies...');
    execSync('npm ci --omit=dev', { cwd: BUILD_DIR, stdio: 'inherit' });

    // Update package.json to production-only version
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const productionPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: packageJson.main,
      dependencies: packageJson.dependencies,
      engines: packageJson.engines
    };
    fs.writeFileSync(
      path.join(BUILD_DIR, 'package.json'),
      JSON.stringify(productionPackageJson, null, 2)
    );
    
    // Remove package-lock.json as it's no longer needed after install
    fs.rmSync(path.join(BUILD_DIR, 'package-lock.json'));

    // Create README for DXT
    console.log('📝 Creating DXT README...');
    const dxtReadme = `# WordPress MCP Server Desktop Extension

This is a Desktop Extension (DXT) package for the WordPress MCP Server.

## Installation

1. Download the .dxt file
2. Open Claude Desktop
3. Install the extension through the Extensions menu

## Configuration

After installation, you'll be prompted to configure:

- WordPress Site URL
- Username
- Application Password
- Authentication Method (optional)
- Debug Mode (optional)

## Features

- 59 WordPress management tools
- Multi-site support
- Performance monitoring
- Intelligent caching
- Real-time analytics

For more information, visit: https://github.com/docdyhr/mcp-wordpress
`;

    fs.writeFileSync(path.join(BUILD_DIR, 'README.md'), dxtReadme);

    // Create the DXT package (ZIP file)
    console.log('📦 Creating DXT package...');
    const output = fs.createWriteStream(PACKAGE_NAME);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });

    console.log(`\n✅ DXT package created: ${PACKAGE_NAME}`);
    console.log(`📊 Package size: ${(fs.statSync(PACKAGE_NAME).size / 1024 / 1024).toFixed(2)} MB`);

    // Validate the package
    console.log('\n🔍 Validating DXT package...');
    const manifest = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'manifest.json'), 'utf8'));
    
    // Basic validation
    const requiredFields = ['dxt_version', 'name', 'version', 'description', 'author', 'server'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields in manifest:', missingFields);
      process.exit(1);
    }

    console.log('✅ Manifest validation passed');
    console.log(`📦 Extension: ${manifest.name} v${manifest.version}`);
    console.log(`🔧 Tools: ${manifest.tools ? manifest.tools.length : 0}`);
    console.log(`💬 Prompts: ${manifest.prompts ? manifest.prompts.length : 0}`);

    console.log('\n🎉 DXT package build completed successfully!');
    console.log(`\nTo test the package:`);
    console.log(`1. Install Claude Desktop Extensions CLI: npm install -g @anthropic/dxt`);
    console.log(`2. Validate package: dxt validate ${PACKAGE_NAME}`);
    console.log(`3. Install in Claude Desktop through the Extensions menu`);

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildDXT().catch(error => {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
});

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}