#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function buildCleanDXT() {
  console.log('🧹 Building clean DXT package...');

  const tempDir = path.join(__dirname, '..', 'temp-dxt-clean');
  const rootDir = path.join(__dirname, '..');

  try {
    // Clean up any existing temp directory
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    // Copy only the essential files
    console.log('📦 Copying essential files...');

    // Copy and update manifest with current package version
    const packageJson = await fs.readJson(path.join(rootDir, 'package.json'));
    const manifest = await fs.readJson(path.join(rootDir, 'dxt', 'manifest.json'));

    // Sync version with package.json
    manifest.version = packageJson.version;

    // Write updated manifest to temp directory
    await fs.writeJson(path.join(tempDir, 'manifest.json'), manifest, { spaces: 2 });
    console.log(`📝 Updated manifest version to ${packageJson.version}`);

    // Copy icon to root
    await fs.copy(path.join(rootDir, 'dxt', 'icon.png'), path.join(tempDir, 'icon.png'));

    // Copy dist directory
    await fs.copy(path.join(rootDir, 'dist'), path.join(tempDir, 'dist'));

    // Copy AJV schema files for DXT compatibility
    const ajvRefsDir = path.join(tempDir, 'dist', 'ajv-refs');
    await fs.ensureDir(ajvRefsDir);
    await fs.copy(path.join(rootDir, 'node_modules', 'ajv', 'lib', 'refs', 'json-schema-draft-07.json'),
                  path.join(ajvRefsDir, 'json-schema-draft-07.json'));
    await fs.copy(path.join(rootDir, 'node_modules', 'ajv', 'lib', 'refs', 'json-schema-draft-04.json'),
                  path.join(ajvRefsDir, 'json-schema-draft-04.json'));
    await fs.copy(path.join(rootDir, 'node_modules', 'ajv', 'lib', 'refs', 'json-schema-draft-06.json'),
                  path.join(ajvRefsDir, 'json-schema-draft-06.json'));
    await fs.copy(path.join(rootDir, 'node_modules', 'ajv', 'lib', 'refs', 'json-schema-secure.json'),
                  path.join(ajvRefsDir, 'json-schema-secure.json'));
    await fs.copy(path.join(rootDir, 'node_modules', 'ajv', 'lib', 'refs', 'data.json'),
                  path.join(ajvRefsDir, 'data.json'));

    // Copy essential config files
    await fs.copy(path.join(rootDir, 'package.json'), path.join(tempDir, 'package.json'));
    await fs.copy(path.join(rootDir, 'package-lock.json'), path.join(tempDir, 'package-lock.json'));
    await fs.copy(path.join(rootDir, 'LICENSE'), path.join(tempDir, 'LICENSE'));
    await fs.copy(path.join(rootDir, 'mcp-wordpress.config.json.example'), path.join(tempDir, 'mcp-wordpress.config.json.example'));

    // Copy essential non-dev files
    await fs.copy(path.join(rootDir, 'eslint.config.js'), path.join(tempDir, 'eslint.config.js'));
    await fs.copy(path.join(rootDir, 'vitest.config.ts'), path.join(tempDir, 'vitest.config.ts'));

    // Copy dxt directory (for icon and manifest references)
    await fs.copy(path.join(rootDir, 'dxt'), path.join(tempDir, 'dxt'));

    // Install production dependencies only
    console.log('📦 Installing production dependencies...');
    process.chdir(tempDir);
    execSync('npm ci --production', { stdio: 'inherit' });

    // Create the DXT package
    console.log('🎁 Creating DXT package...');
    execSync(`dxt pack . ${path.join(rootDir, 'mcp-wordpress.dxt')}`, { stdio: 'inherit' });

    // Clean up
    process.chdir(rootDir);
    await fs.remove(tempDir);

    console.log('✅ Official DXT package created: mcp-wordpress.dxt');

  } catch (error) {
    console.error('❌ Error building clean DXT:', error);
    process.chdir(rootDir);
    await fs.remove(tempDir);
    process.exit(1);
  }
}

buildCleanDXT();
