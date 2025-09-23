# Badge Update Process

This document describes how to update the README badges with current test and coverage metrics.

## Overview

The README.md contains dynamic badges showing:

- Test results (passed/total count)
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage

These badges should be updated when test counts or coverage metrics change significantly.

## Manual Update Process

### 1. Extract Current Metrics

Run the metrics extraction script:

```bash
node scripts/extract-metrics.cjs
```

This will output current metrics and generate updated badge URLs.

### 2. Update README.md

Replace the badge URLs in README.md with the new ones from the script output.

**Badge Sections to Update:**

- Line 19: `[![Line Coverage](...)]`
- Line 20: `[![Branch Coverage](...)]`
- Line 21: `[![Function Coverage](...)]`
- Line 22: `[![Test Results](...)]`

### 3. Badge Color Coding

The script automatically applies colors based on coverage levels:

| Coverage % | Color        | Badge Color Code |
| ---------- | ------------ | ---------------- |
| ≥ 70%      | Bright Green | `brightgreen`    |
| ≥ 50%      | Green        | `green`          |
| ≥ 30%      | Yellow       | `yellow`         |
| ≥ 20%      | Orange       | `orange`         |
| < 20%      | Red          | `red`            |

**Test Results:**

- All passing: `brightgreen`
- Some failing: `yellow`
- Many failing: `red`

## Script Details

### extract-metrics.cjs

The extraction script:

1. **Test Count**: Runs `npm test` and parses output for passed/failed/total counts
2. **Coverage**: Attempts to read `coverage/coverage-final.json` or uses fallback values
3. **Badge URLs**: Generates shields.io badge URLs with appropriate colors
4. **Fallback**: Uses existing README values if extraction fails

### Key Functions

- `extractMetrics()`: Main function to gather all metrics
- `getCoverageColor(percentage)`: Maps coverage % to badge colors
- Automatic test result parsing from Jest output
- Graceful fallback to existing values on errors

## Future Automation

### Planned CI Integration

Future improvements will include:

1. **Automated Badge Updates**: GitHub Actions workflow to update badges after successful CI runs
2. **Coverage Reporting**: Enhanced coverage collection from TypeScript sources
3. **Historical Tracking**: Track coverage trends over time
4. **PR Integration**: Show coverage diff in pull requests

### CI Workflow Structure

```yaml
name: Update Badges
on:
  push:
    branches: [main]
jobs:
  update-badges:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: node scripts/extract-metrics.cjs
      - run: scripts/update-readme-badges.sh
      - uses: stefanzweifel/git-auto-commit-action@v4
```

## Current Status

**As of August 2025:**

- **Tests**: 399/404 passing (5 failed)
- **Line Coverage**: 30.97%
- **Branch Coverage**: 23.84%
- **Function Coverage**: 27.69%
- **Statement Coverage**: 29.76%

## Related Issues

- Issue #54: Update README badges to reflect current status ✅
- Issue #55: Automate dynamic badges via CI (pending)
- Issue #66: Implement incremental coverage guardrail script (pending)

## Manual Badge Testing

Test badge rendering by visiting the URLs directly:

```bash
# Test line coverage badge
curl -I "https://img.shields.io/badge/lines%20coverage-30.97%25-yellow?logo=jest&logoColor=white"

# Test test results badge
curl -I "https://img.shields.io/badge/tests-399%2F404%20passing-yellow?logo=checkmarx&logoColor=white"
```

All badges should return HTTP 200 and render properly in the README.
