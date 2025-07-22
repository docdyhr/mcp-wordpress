# Enhanced GitHub CLI and bat configuration for MCP WordPress development
# Add this to your ~/.zshrc for optimal GitHub CLI experience

# Enhanced bat function for GitHub CLI and general use
function safe-bat() {
  bat --paging=never --plain "$@"
}

# Set PAGER environment variable with enhanced bat options
if command -v bat &> /dev/null; then
  export PAGER="bat --plain --paging=never"
else
  export PAGER=cat
fi

# GitHub CLI aliases for common operations (optional)
alias ghpr="gh pr view"
alias ghprs="gh pr list" 
alias ghprm="gh pr merge"
alias ghprc="gh pr create"
alias ghprco="gh pr comment"

# Utility aliases for MCP WordPress development
alias mcp-test="npm test"
alias mcp-health="npm run health"
alias mcp-dev="npm run dev"
alias mcp-build="npm run build"
