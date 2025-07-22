#!/bin/bash

# Enhanced GitHub CLI and bat configuration for MCP WordPress development
# Add this to your ~/.zshrc or ~/.bashrc for optimal experience

echo "🔧 Setting up enhanced GitHub CLI configuration..."

# Enhanced bat function for GitHub CLI and general use
function safe-bat() {
  bat --paging=never --plain "$@"
}

# Set PAGER environment variable with enhanced bat options
if command -v bat &> /dev/null; then
  export PAGER="bat --plain --paging=never"
  echo "✅ Enhanced PAGER configured with bat --plain --paging=never"
else
  export PAGER=cat
  echo "⚠️  bat not found, using fallback PAGER=cat"
  echo "💡 Install bat for enhanced experience: brew install bat (macOS) or apt install bat (Ubuntu)"
fi

# GitHub CLI aliases for common operations
alias ghpr="gh pr view"
alias ghprs="gh pr list"
alias ghprm="gh pr merge"
alias ghprc="gh pr create"

# Test GitHub CLI configuration
echo "🧪 Testing GitHub CLI configuration..."
echo "PAGER is set to: $PAGER"

# Verify bat installation and version
if command -v bat &> /dev/null; then
  echo "📦 bat version: $(bat --version)"
  echo "🎨 Testing safe-bat function..."
  echo "Hello, World!" | safe-bat
else
  echo "📦 bat not installed - using cat fallback"
fi

echo ""
echo "🎉 Setup complete! You can now use GitHub CLI commands without hanging."
echo "💡 Try: gh pr list"
echo "📚 For more info, see CLAUDE.md in the project root"
