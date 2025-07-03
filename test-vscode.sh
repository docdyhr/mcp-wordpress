#!/bin/bash
# VS Code Jest test runner script
export NODE_OPTIONS="--experimental-vm-modules"
npx jest --config=jest.vscode.config.json "$@"
