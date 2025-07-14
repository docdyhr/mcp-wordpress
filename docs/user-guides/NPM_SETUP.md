# NPM Setup Guide (Local Development)

This guide provides step-by-step instructions for setting up the MCP WordPress server locally for development,
customization, and contribution.

---

## 📦 Local NPM Setup

For local development, customization, or contributing to the project:

### 1. Install Dependencies

Clone the repository and install dependencies:

```bash
git clone https://github.com/docdyhr/mcp-wordpress.git
cd mcp-wordpress
npm install
```

### 2. Run the Setup Wizard

Run the interactive setup wizard:

```bash
npm run setup
```

### 3. Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

### 4. Start the Server

Start the MCP WordPress server:

```bash
npm start
```

### 5. Test the Tools

Run tests to verify functionality:

```bash
npm run test:tools
```

### 6. Claude Desktop Configuration (Local)

For local development, use this Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mcp-wordpress": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-wordpress/dist/index.js"],
      "env": {
        "DEBUG": "false",
        "MCP_DEBUG": "false"
      }
    }
  }
}
```

### 7. Development Commands

```bash
npm run dev             # Development mode with auto-rebuild
npm run build:watch     # Watch mode compilation
npm run test:watch      # Watch mode testing
npm run lint            # Code linting
npm run format          # Code formatting
```

### 8. Maintenance Commands

```bash
npm run status          # Check WordPress connection
npm run health          # Full system health check
npm run verify-claude   # Verify Claude Desktop integration
npm run docs:generate   # Generate API documentation
```

## 🔧 Local Development Benefits

- **Full Control**: Complete access to source code for customization
- **Offline Work**: No internet required after initial setup
- **Debugging**: Direct access to code for troubleshooting
- **Contributing**: Make changes and submit pull requests
- **Version Control**: Lock to specific versions or branches
- **Custom Features**: Add your own tools and modifications

## 🚨 Important Notes

- **Build Required**: Must compile TypeScript before running
- **Dependencies**: Requires Node.js 18+ and npm installed
- **Updates**: Manual process to get latest changes
- **Space**: Uses local disk space for code and dependencies

---

After setup, restart Claude Desktop and test with commands like "List my WordPress posts" or "Show me my site
statistics".
