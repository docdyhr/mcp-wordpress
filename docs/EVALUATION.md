# MCP WordPress Tools Evaluation Guide

This guide covers the comprehensive evaluation system for MCP WordPress tools using
[mcp-evals](https://github.com/mclenhard/mcp-evals).

## Overview

The evaluation system provides automated testing and scoring of WordPress MCP tools using LLM-based evaluation to
ensure:

- **Tool Reliability**: Consistent performance across different scenarios
- **Quality Assurance**: Comprehensive testing of all 59 WordPress tools
- **Performance Monitoring**: Track tool performance over time
- **Regression Detection**: Identify when changes affect tool quality

## Quick Start

### Prerequisites

- Node.js 20+
- OpenAI API key (configured in GitHub secrets)
- WordPress test site credentials

### Running Evaluations

```bash
# Run all evaluations
npm run eval

# Run quick evaluation (critical tools only)
npm run eval:quick

# Run critical tools evaluation
npm run eval:critical

# Generate evaluation report
npm run eval:report

# Watch mode for development
npm run eval:watch
```

## Evaluation Configurations

### 1. Comprehensive Evaluation (`wordpress-tools-eval.yaml`)

Tests all 59 WordPress tools across multiple categories:

- **Post Management**: Create, read, update, delete posts
- **Media Management**: Upload, manage media files
- **User Management**: User creation, role management
- **Comment Management**: Comment moderation workflows
- **Taxonomy Management**: Categories and tags
- **Site Management**: Settings, health checks
- **Performance**: Cache management, optimization
- **Authentication**: Security and permissions
- **Error Handling**: Edge cases and failures

### 2. Critical Tools Evaluation (`critical-tools-eval.yaml`)

Focused evaluation of the most important tools with stricter scoring:

- Higher pass threshold (4.0/5.0 vs 3.5/5.0)
- Essential functionality only
- Faster execution for CI/CD pipelines

### 3. TypeScript Evaluations (`critical-tools.eval.ts`)

Advanced evaluations using TypeScript for complex scenarios:

- Multi-tool workflows
- Error recovery scenarios
- Performance benchmarks
- Security testing

## Evaluation Scoring

### Scoring Criteria

Each evaluation is scored on five dimensions (1-5 scale):

1. **Accuracy** (25%): How accurately the tool performs its function
2. **Completeness** (20%): How thoroughly it completes the task
3. **Relevance** (20%): How relevant the response is to the request
4. **Clarity** (20%): How clear and understandable the output is
5. **Reasoning** (15%): How well it handles edge cases and errors

### Scoring Thresholds

- **Pass**: 3.5/5.0 (Acceptable performance)
- **Good**: 4.0/5.0 (Solid performance)
- **Excellent**: 4.5/5.0 (Outstanding performance)

### Example Evaluation

```yaml
- name: create_post_basic
  description: Test basic post creation functionality
  prompt: "Create a new blog post titled 'AI Trends in 2025' with content about emerging AI technologies"
  expected_tools:
    - wp_create_post
  success_criteria:
    - Post is created successfully
    - Title matches the request
    - Content is relevant to AI trends
```

## GitHub Actions Integration

### Automated Evaluation Pipeline

The evaluation system runs automatically on:

- **Pull Requests**: When tools are modified
- **Push to Main**: After merging changes
- **Weekly Schedule**: Every Monday at 2 AM UTC
- **Manual Trigger**: Via GitHub Actions UI

### Workflow Features

- **PR Comments**: Automatic evaluation results in PR comments
- **Artifacts**: Evaluation results saved for 30 days
- **Regression Detection**: Compares with previous results
- **Performance Tracking**: Trends over time
- **Failure Notifications**: Creates issues for significant regressions

### Environment Variables

Required secrets in GitHub repository:

```bash
OPENAI_API_KEY=your_openai_api_key
TEST_WORDPRESS_URL=https://test-site.com
TEST_WORDPRESS_USER=testuser
TEST_WORDPRESS_PASSWORD=app_password
```

## Writing Custom Evaluations

### YAML Configuration

```yaml
model:
  provider: openai
  name: gpt-4o
  temperature: 0.3

evals:
  - name: custom_evaluation
    description: Description of what this tests
    prompt: "Test prompt for the LLM"
    expected_tools:
      - wp_tool_name
    success_criteria:
      - What constitutes success
      - Additional criteria
```

### TypeScript Evaluation

```typescript
import { EvalFunction, grade } from "mcp-evals";
import { openai } from "mcp-evals/models";

export const customEval: EvalFunction = {
  name: "custom_evaluation",
  description: "Test custom functionality",
  run: async () => {
    const result = await grade(openai("gpt-4o"), "Your test prompt here", {
      systemPrompt: "Evaluation criteria...",
      responseFormat: { type: "json_object" },
    });
    return JSON.parse(result);
  },
};
```

## Evaluation Categories

### 1. Functional Testing

Tests basic tool functionality:

```yaml
- name: create_post_basic
  prompt: "Create a new blog post with title and content"
  expected_tools: [wp_create_post]
```

### 2. Integration Testing

Tests multiple tools working together:

```yaml
- name: content_publishing_workflow
  prompt: "Create a post with images and publish it"
  expected_tools: [wp_create_post, wp_upload_media, wp_update_post]
```

### 3. Error Handling Testing

Tests edge cases and error scenarios:

```yaml
- name: handle_invalid_post
  prompt: "Try to update a non-existent post"
  expected_tools: [wp_update_post]
```

### 4. Performance Testing

Tests tool performance and efficiency:

```yaml
- name: high_volume_operations
  prompt: "List 100 most recent posts and generate summary"
  expected_tools: [wp_list_posts, wp_get_post]
```

## Best Practices

### Writing Effective Evaluations

1. **Clear Prompts**: Write specific, actionable prompts
2. **Realistic Scenarios**: Test real-world use cases
3. **Success Criteria**: Define clear success metrics
4. **Error Cases**: Include failure scenarios
5. **Performance**: Consider timeout and efficiency

### Evaluation Maintenance

1. **Regular Updates**: Keep evaluations current with tool changes
2. **Threshold Tuning**: Adjust scoring thresholds based on results
3. **Coverage Analysis**: Ensure all tools are tested
4. **Performance Monitoring**: Track evaluation trends

### CI/CD Integration

1. **Fast Feedback**: Use `eval:quick` for PR checks
2. **Comprehensive Testing**: Full evaluations on main branch
3. **Regression Detection**: Compare with previous results
4. **Performance Gates**: Fail builds on significant regressions

## Troubleshooting

### Common Issues

1. **API Key Missing**: Ensure `OPENAI_API_KEY` is set
2. **WordPress Connection**: Verify test site credentials
3. **Timeout Errors**: Increase timeout or reduce evaluation scope
4. **Rate Limiting**: Add delays between evaluations

### Debug Mode

```bash
# Run with debug output
DEBUG=true npm run eval

# Run single evaluation
npm run eval:quick -- --filter create_post_basic
```

### Local Testing

```bash
# Set up local environment
export OPENAI_API_KEY=your_key
export WORDPRESS_SITE_URL=http://localhost/wp
export WORDPRESS_USERNAME=admin
export WORDPRESS_APP_PASSWORD=your_password

# Run evaluations
npm run eval:quick
```

## Reporting

### Automatic Reports

Evaluation results are automatically processed into:

- **JSON Summary**: Machine-readable results
- **HTML Report**: Visual dashboard
- **Markdown Report**: Documentation-friendly format

### Manual Report Generation

```bash
# Generate comprehensive report
npm run eval:report

# View results
open evaluations/reports/evaluation-report.html
```

### Example Report Structure

```json
{
  "overall_score": 4.2,
  "tests_passed": 23,
  "total_tests": 25,
  "status": "good",
  "categories": {
    "post": { "passed": 5, "total": 6, "avg_score": 4.1 },
    "media": { "passed": 3, "total": 3, "avg_score": 4.5 }
  },
  "failed_tests": [
    {
      "name": "handle_invalid_post",
      "score": 3.2,
      "reason": "Error handling could be more graceful"
    }
  ],
  "recommendations": ["Improve error handling for edge cases", "Add more comprehensive validation"]
}
```

## Advanced Features

### Performance Tracking

Track evaluation performance over time:

```bash
# Generate performance trends
node evaluations/scripts/track-performance.js

# Compare with previous results
node evaluations/scripts/compare-performance.js
```

### Custom Scoring

Override default scoring with custom logic:

```typescript
const customScoring = {
  accuracy: { weight: 0.3, min: 4.0 },
  completeness: { weight: 0.3, min: 3.5 },
  relevance: { weight: 0.2, min: 3.0 },
  clarity: { weight: 0.1, min: 3.0 },
  reasoning: { weight: 0.1, min: 3.0 },
};
```

### Integration with Monitoring

Connect evaluations to monitoring systems:

```bash
# Export metrics to Prometheus
npm run eval:metrics

# Send results to monitoring dashboard
npm run eval:monitor
```

## Contributing

### Adding New Evaluations

1. Create evaluation in `evaluations/config/`
2. Add to appropriate category
3. Test locally with `npm run eval:quick`
4. Submit PR with evaluation results

### Improving Existing Evaluations

1. Review current evaluation scores
2. Identify areas for improvement
3. Update prompts and success criteria
4. Test changes thoroughly

### Reporting Issues

- Use GitHub Issues for evaluation problems
- Include full evaluation results
- Provide reproduction steps
- Tag with `evaluation` label

## Resources

- [mcp-evals Documentation](https://github.com/mclenhard/mcp-evals)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Ready to improve tool quality?** Start by running `npm run eval:quick` to see current performance, then dive into
writing custom evaluations for your specific use cases!
