#!/bin/bash
# Cleanup stale security scanning configurations
# Run: ./scripts/cleanup-stale-security-configs.sh
#
# This removes old/renamed workflow analyses from GitHub Security tab
# Reference: https://docs.github.com/en/code-security/code-scanning/managing-code-scanning-alerts/resolving-code-scanning-alerts#removing-stale-configurations-and-alerts-from-a-branch

REPO="docdyhr/mcp-wordpress"
STALE_KEYS=(
  ".github/workflows/ci.yml:security-scan"
  ".github/workflows/codeql-analysis.yml:analyze"
)

echo "=== Stale Security Config Cleanup for $REPO ==="
echo ""

for KEY in "${STALE_KEYS[@]}"; do
  echo "Processing: $KEY"
  
  iteration=0
  while true; do
    iteration=$((iteration + 1))
    
    # Get deletable analyses
    DELETABLE_IDS=$(gh api "/repos/$REPO/code-scanning/analyses" --paginate 2>/dev/null | \
      jq -r ".[] | select(.analysis_key == \"$KEY\" and .deletable == true) | .id")
    
    if [ -z "$DELETABLE_IDS" ]; then
      # Try to delete remaining with confirm_delete (for last-of-type)
      REMAINING_IDS=$(gh api "/repos/$REPO/code-scanning/analyses" --paginate 2>/dev/null | \
        jq -r ".[] | select(.analysis_key == \"$KEY\") | .id")
      
      if [ -z "$REMAINING_IDS" ]; then
        echo "  ✓ Fully removed!"
        break
      fi
      
      # Try force delete
      DELETED=0
      for ID in $REMAINING_IDS; do
        if gh api -X DELETE "/repos/$REPO/code-scanning/analyses/$ID?confirm_delete" 2>/dev/null; then
          DELETED=$((DELETED + 1))
        fi
      done
      
      if [ "$DELETED" -eq 0 ]; then
        FINAL=$(echo "$REMAINING_IDS" | wc -w | tr -d ' ')
        echo "  ⚠ $FINAL analyses cannot be deleted (protected by GitHub)"
        break
      fi
      continue
    fi
    
    # Delete in parallel
    COUNT=$(echo "$DELETABLE_IDS" | wc -w | tr -d ' ')
    for ID in $DELETABLE_IDS; do
      gh api -X DELETE "/repos/$REPO/code-scanning/analyses/$ID?confirm_delete" 2>/dev/null &
    done
    wait
    
    # Progress every 20 iterations
    if [ $((iteration % 20)) -eq 0 ]; then
      REMAINING=$(gh api "/repos/$REPO/code-scanning/analyses" --paginate 2>/dev/null | \
        jq -r "[.[] | select(.analysis_key == \"$KEY\")] | length")
      echo "  Progress: $REMAINING remaining (iteration $iteration)"
    fi
    
    # Safety limit
    if [ "$iteration" -gt 500 ]; then
      echo "  ⚠ Reached iteration limit"
      break
    fi
  done
  echo ""
done

echo "=== Final Status ==="
gh api "/repos/$REPO/code-scanning/analyses" --paginate 2>/dev/null | jq -r '
  [.[].analysis_key] | unique | .[]
' | while read key; do
  COUNT=$(gh api "/repos/$REPO/code-scanning/analyses" --paginate 2>/dev/null | \
    jq -r "[.[] | select(.analysis_key == \"$key\")] | length")
  echo "  $key: $COUNT analyses"
done
