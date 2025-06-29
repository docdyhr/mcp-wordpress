#!/usr/bin/env node

/**
 * Simple Documentation Server
 * Serves generated documentation locally for preview and development
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentationServer {
  constructor() {
    this.port = process.env.PORT || 3000;
    this.docsPath = path.join(__dirname, '..', 'docs', 'api');
    this.server = null;
  }

  async start() {
    console.log('📚 WordPress MCP Server - Documentation Server');
    console.log('============================================');

    // Check if documentation exists
    if (!fs.existsSync(this.docsPath)) {
      console.log('❌ Documentation not found. Please run: npm run docs:generate');
      process.exit(1);
    }

    // Create HTTP server
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Start server
    this.server.listen(this.port, () => {
      console.log(`🚀 Documentation server started!`);
      console.log(`📁 Serving: ${this.docsPath}`);
      console.log(`🌐 Local: http://localhost:${this.port}`);
      console.log('');
      console.log('📄 Available endpoints:');
      console.log(`   📖 Main docs: http://localhost:${this.port}/`);
      console.log(`   🔧 Tool docs: http://localhost:${this.port}/tools/`);
      console.log(`   📂 Categories: http://localhost:${this.port}/categories/`);
      console.log(`   🌐 OpenAPI: http://localhost:${this.port}/openapi.json`);
      console.log(`   📊 Summary: http://localhost:${this.port}/summary.json`);
      console.log('');
      console.log('🔄 Press Ctrl+C to stop the server');
    });

    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down documentation server...');
      this.server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });
  }

  handleRequest(req, res) {
    let urlPath = req.url || '/';
    
    // Remove query parameters
    const queryIndex = urlPath.indexOf('?');
    if (queryIndex !== -1) {
      urlPath = urlPath.substring(0, queryIndex);
    }

    // Handle root path
    if (urlPath === '/') {
      urlPath = '/README.md';
    }

    // Handle directory paths
    if (urlPath.endsWith('/') && urlPath !== '/') {
      return this.serveDirectoryListing(urlPath, res);
    }

    // Construct file path
    let filePath = path.join(this.docsPath, urlPath);

    // Security check - ensure path is within docs directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDocsPath = path.resolve(this.docsPath);
    if (!resolvedPath.startsWith(resolvedDocsPath)) {
      return this.send404(res);
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return this.send404(res);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      return this.serveDirectoryListing(urlPath, res);
    }

    // Serve file
    this.serveFile(filePath, res);
  }

  serveFile(filePath, res) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = this.getContentType(ext);
      
      const content = fs.readFileSync(filePath);
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
        'Cache-Control': 'no-cache'
      });
      
      // For markdown files, wrap in simple HTML
      if (ext === '.md') {
        const htmlContent = this.wrapMarkdownInHtml(content.toString(), path.basename(filePath));
        res.end(htmlContent);
      } else {
        res.end(content);
      }
      
      console.log(`📄 Served: ${filePath.replace(this.docsPath, '')}`);
    } catch (error) {
      console.error(`❌ Error serving file: ${error.message}`);
      this.send500(res, error.message);
    }
  }

  serveDirectoryListing(urlPath, res) {
    const dirPath = path.join(this.docsPath, urlPath);
    
    try {
      const files = fs.readdirSync(dirPath);
      const html = this.generateDirectoryHtml(urlPath, files);
      
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
      
      console.log(`📁 Served directory: ${urlPath}`);
    } catch (error) {
      console.error(`❌ Error serving directory: ${error.message}`);
      this.send500(res, error.message);
    }
  }

  wrapMarkdownInHtml(markdown, filename) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename} - WordPress MCP Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
            background: #fafafa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        pre { 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto;
            border-left: 4px solid #007acc;
        }
        code { 
            background: #f0f0f0; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Menlo', monospace;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #f8f9fa; 
            font-weight: 600;
        }
        h1, h2, h3 { 
            color: #333; 
            margin-top: 30px;
        }
        h1 { border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .badge { 
            display: inline-block; 
            padding: 4px 8px; 
            background: #007acc; 
            color: white; 
            border-radius: 12px; 
            font-size: 12px; 
            text-decoration: none;
        }
        .nav {
            margin-bottom: 20px;
            padding: 10px;
            background: #e9ecef;
            border-radius: 5px;
        }
        .nav a {
            color: #007acc;
            text-decoration: none;
            margin-right: 15px;
        }
        .nav a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">📖 Documentation Home</a>
            <a href="/tools/">🔧 Tools</a>
            <a href="/categories/">📂 Categories</a>
            <a href="/openapi.json">🌐 OpenAPI</a>
            <a href="/summary.json">📊 Summary</a>
        </div>
        <pre style="white-space: pre-wrap; background: white; border: none; padding: 0;">${this.escapeHtml(markdown)}</pre>
    </div>
</body>
</html>`;
  }

  generateDirectoryHtml(urlPath, files) {
    const title = urlPath === '/' ? 'Documentation Root' : `Directory: ${urlPath}`;
    
    let fileList = '';
    
    // Add parent directory link if not root
    if (urlPath !== '/') {
      const parentPath = path.dirname(urlPath);
      fileList += `<li><a href="${parentPath === '.' ? '/' : parentPath}/">📁 .. (parent directory)</a></li>`;
    }
    
    // Sort files and directories
    const sortedFiles = files.sort((a, b) => {
      const aPath = path.join(this.docsPath, urlPath, a);
      const bPath = path.join(this.docsPath, urlPath, b);
      const aIsDir = fs.statSync(aPath).isDirectory();
      const bIsDir = fs.statSync(bPath).isDirectory();
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    for (const file of sortedFiles) {
      const filePath = path.join(this.docsPath, urlPath, file);
      const isDirectory = fs.statSync(filePath).isDirectory();
      const icon = isDirectory ? '📁' : (file.endsWith('.md') ? '📄' : file.endsWith('.json') ? '📊' : '📄');
      const href = path.join(urlPath, file) + (isDirectory ? '/' : '');
      
      fileList += `<li><a href="${href}">${icon} ${file}</a></li>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - WordPress MCP Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #fafafa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        ul { list-style: none; padding: 0; }
        li { margin: 10px 0; }
        a { 
            color: #007acc; 
            text-decoration: none; 
            display: block;
            padding: 10px;
            border-radius: 5px;
            transition: background-color 0.2s;
        }
        a:hover { 
            background-color: #f8f9fa;
            text-decoration: none;
        }
        h1 { 
            color: #333; 
            border-bottom: 2px solid #007acc; 
            padding-bottom: 10px; 
        }
        .nav {
            margin-bottom: 20px;
            padding: 10px;
            background: #e9ecef;
            border-radius: 5px;
        }
        .nav a {
            display: inline;
            margin-right: 15px;
            padding: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">📖 Documentation Home</a>
            <a href="/tools/">🔧 Tools</a>
            <a href="/categories/">📂 Categories</a>
            <a href="/openapi.json">🌐 OpenAPI</a>
            <a href="/summary.json">📊 Summary</a>
        </div>
        <h1>${title}</h1>
        <ul>${fileList}</ul>
    </div>
</body>
</html>`;
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.md': 'text/html', // We wrap markdown in HTML
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };
    return types[ext] || 'application/octet-stream';
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  send404(res) {
    const html = `<!DOCTYPE html>
<html><head><title>404 - Not Found</title></head>
<body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
<h1>📄 Not Found</h1>
<p>The requested documentation file was not found.</p>
<a href="/">📖 Return to Documentation Home</a>
</body></html>`;
    
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  send500(res, error) {
    const html = `<!DOCTYPE html>
<html><head><title>500 - Server Error</title></head>
<body style="font-family: sans-serif; text-align: center; margin-top: 100px;">
<h1>⚠️ Server Error</h1>
<p>Error: ${this.escapeHtml(error)}</p>
<a href="/">📖 Return to Documentation Home</a>
</body></html>`;
    
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}

// Start the server
async function main() {
  const server = new DocumentationServer();
  await server.start();
}

main().catch(error => {
  console.error('💥 Server failed to start:', error);
  process.exit(1);
});