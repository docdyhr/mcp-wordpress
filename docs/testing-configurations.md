# Jest Configuration Documentation

This project uses multiple Jest configurations for different testing scenarios:

- **jest.config.cjs**: Main Jest configuration (default)
- **jest.typescript.config.json**: TypeScript test configuration (used by npm test)
- **jest.ci.config.json**: CI-specific configuration with limited test scope
- **jest.test-env.config.json**: Environment testing configuration
- **jest.vscode.config.json**: VS Code integration configuration

Each configuration serves a specific purpose and is optimized for its use case.
