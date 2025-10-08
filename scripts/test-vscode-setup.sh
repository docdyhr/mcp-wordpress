#!/bin/bash

# VS Code Setup Verification Script
# Quick shell version for immediate use

echo "🚀 Starting VS Code Setup Verification..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Function to log results
log_result() {
    local status=$1
    local name=$2
    local message=$3
    
    case $status in
        "pass")
            echo -e "✅ ${GREEN}$name${NC}: $message"
            ((PASS_COUNT++))
            ;;
        "fail")
            echo -e "❌ ${RED}$name${NC}: $message"
            ((FAIL_COUNT++))
            ;;
        "warning")
            echo -e "⚠️  ${YELLOW}$name${NC}: $message"
            ((WARN_COUNT++))
            ;;
    esac
}

echo "🔍 Testing VS Code Extensions..."
echo ""

# Check if VS Code CLI is available
if command -v code &> /dev/null; then
    # Required extensions
    EXTENSIONS=(
        "ms-vscode.vscode-typescript-next"
        "dbaeumer.vscode-eslint"
        "esbenp.prettier-vscode"
        "vitest.explorer"
        "eamodio.gitlens"
        "bradlc.vscode-tailwindcss"
        "ms-python.python"
        "ms-vscode.hexeditor"
    )
    
    # Get installed extensions
    INSTALLED=$(code --list-extensions)
    
    for ext in "${EXTENSIONS[@]}"; do
        if echo "$INSTALLED" | grep -q "$ext"; then
            log_result "pass" "Extension: $ext" "Installed and available"
        else
            log_result "fail" "Extension: $ext" "Not installed - run: code --install-extension $ext"
        fi
    done
else
    log_result "fail" "VS Code CLI" "VS Code command line tools not available"
fi

echo ""
echo "⚙️ Testing VS Code Configuration..."
echo ""

# Check settings.json
if [ -f ".vscode/settings.json" ]; then
    log_result "pass" "VS Code Settings" "settings.json found"
    
    # Check for specific configurations
    if grep -q '"vitest.enable"' .vscode/settings.json; then
        log_result "pass" "Vitest Integration" "Vitest enabled in settings"
    else
        log_result "warning" "Vitest Integration" "Vitest not explicitly enabled"
    fi
    
    if grep -q '"editor.formatOnSave"' .vscode/settings.json; then
        log_result "pass" "Format on Save" "Format on save configured"
    else
        log_result "warning" "Format on Save" "Format on save not configured"
    fi
else
    log_result "fail" "VS Code Settings" "settings.json not found"
fi

# Check extensions.json
if [ -f ".vscode/extensions.json" ]; then
    log_result "pass" "Extension Recommendations" "Extension recommendations configured"
else
    log_result "warning" "Extension Recommendations" "No extension recommendations found"
fi

echo ""
echo "🔗 Testing Project Integration..."
echo ""

# Check project configuration files
[ -f "tsconfig.json" ] && log_result "pass" "TypeScript Config" "tsconfig.json found" || log_result "fail" "TypeScript Config" "tsconfig.json missing"
[ -f "vitest.config.ts" ] && log_result "pass" "Vitest Config" "vitest.config.ts found" || log_result "fail" "Vitest Config" "vitest.config.ts missing"
[ -f "eslint.config.js" ] && log_result "pass" "ESLint Config" "eslint.config.js found" || log_result "warning" "ESLint Config" "eslint.config.js not found"
[ -f ".prettierrc.json" ] && log_result "pass" "Prettier Config" ".prettierrc.json found" || log_result "warning" "Prettier Config" ".prettierrc.json not found"

echo ""
echo "📊 VS Code Setup Test Report"
echo "=================================================="
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARN_COUNT${NC}"
echo "📊 Total: $((PASS_COUNT + FAIL_COUNT + WARN_COUNT))"
echo ""

# Provide recommendations
echo "💡 Recommendations:"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo "📦 To install missing extensions, run:"
    echo "  npm run setup:vscode"
    echo ""
fi

echo "🔄 After installing extensions:"
echo "  1. Restart VS Code completely"
echo "  2. Open a TypeScript file and verify IntelliSense"
echo "  3. Run tests using Cmd+Shift+P > 'Test: Run All Tests'"
echo "  4. Try formatting a file with Cmd+Shift+F"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 VS Code setup looks good!${NC}"
    exit 0
else
    echo -e "${RED}🔧 VS Code setup needs attention.${NC}"
    exit 1
fi