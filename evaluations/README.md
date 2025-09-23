# MCP WordPress Tools Evaluations

This directory contains evaluation configurations and scripts for testing WordPress MCP tools using
[mcp-evals](https://github.com/mclenhard/mcp-evals).

## Structure

```
evaluations/
├── config/                     # Evaluation configurations
│   ├── wordpress-tools-eval.yaml       # Comprehensive evaluation
│   └── critical-tools-eval.yaml        # Critical tools only
├── scripts/                    # Processing scripts
│   ├── process-results.js              # Result processing
│   └── generate-report.js              # Report generation
├── results/                    # Generated results (gitignored)
│   ├── evaluation-results.json         # Raw evaluation data
│   └── evaluation-summary.json         # Processed summary
├── reports/                    # Generated reports (gitignored)
│   ├── evaluation-report.html          # HTML report
│   └── evaluation-report.md            # Markdown report
├── critical-tools.eval.ts      # TypeScript evaluations
└── README.md                   # This file
```

## Quick Start

```bash
# Install dependencies
npm install

# Run comprehensive evaluation
npm run eval

# Run critical tools only
npm run eval:critical

# Generate reports
npm run eval:report
```

## Configuration Files

### `wordpress-tools-eval.yaml`

- Tests all 59 WordPress tools
- Comprehensive coverage across all categories
- Standard scoring thresholds (3.5/5.0 to pass)

### `critical-tools-eval.yaml`

- Focuses on essential tools only
- Stricter scoring thresholds (4.0/5.0 to pass)
- Faster execution for CI/CD

### `critical-tools.eval.ts`

- Advanced TypeScript evaluations
- Complex workflow testing
- Custom scoring logic

## Usage

### Local Development

```bash
# Set environment variables
export OPENAI_API_KEY=your_key
export WORDPRESS_SITE_URL=http://localhost/wp
export WORDPRESS_USERNAME=admin
export WORDPRESS_APP_PASSWORD=your_password

# Run evaluations
npm run eval:quick
```

### CI/CD Integration

The evaluations run automatically on:

- Pull requests to main
- Push to main branch
- Weekly schedule
- Manual trigger

See `.github/workflows/mcp-evaluations.yml` for details.

## Results

Evaluation results are automatically processed into:

- **JSON files**: Machine-readable results and summaries
- **HTML reports**: Visual dashboards with charts and tables
- **Markdown reports**: Documentation-friendly format

## Adding New Evaluations

1. Add to appropriate YAML config file
2. Define clear success criteria
3. Test locally before committing
4. Update documentation

## Scoring

Each evaluation scores on 5 dimensions (1-5):

- **Accuracy**: Correctness of tool function
- **Completeness**: Task completion thoroughness
- **Relevance**: Response relevance to request
- **Clarity**: Output clarity and structure
- **Reasoning**: Error handling and edge cases

## Support

For evaluation issues:

- Check [docs/EVALUATION.md](../docs/EVALUATION.md) for detailed guide
- Open GitHub issue with `evaluation` label
- Review existing evaluation results for patterns

---

**Ready to evaluate?** Run `npm run eval:quick` to get started!
