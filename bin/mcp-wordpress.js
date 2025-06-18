#!/usr/bin/env node

// NPX wrapper for MCP WordPress Server
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import and run the main module from dist
const mainModule = path.join(__dirname, '..', 'dist', 'index.js');
import(mainModule);