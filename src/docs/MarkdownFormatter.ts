/**
 * Markdown Documentation Formatter
 * Converts documentation objects to well-formatted markdown files
 */

import type {
  ToolDocumentation,
  CategoryDocumentation,
  TypeDocumentation,
  DocumentationOutput,
  ExampleUsage,
  ParameterDocumentation,
} from "./DocumentationGenerator.js";

export class MarkdownFormatter {
  /**
   * Generate main API overview documentation
   */
  generateApiOverview(output: DocumentationOutput): string {
    const { tools, categories, summary } = output;

    return `# WordPress MCP Server - API Documentation

${this.generateBadges()}

## Overview

The WordPress MCP Server provides **${summary.totalTools} tools** across **${summary.totalCategories} categories** for comprehensive WordPress management through the Model Context Protocol.

**Last Updated:** ${new Date(summary.lastUpdated).toLocaleDateString()}  
**Version:** ${summary.version}  
**Coverage:** ${summary.coverage.toolsWithExamples}/${summary.totalTools} tools with examples

## Quick Start

### Basic Usage
\`\`\`bash
# List all posts
wp_list_posts

# Get specific post
wp_get_post --id=123

# Create new post
wp_create_post --title="My Post" --content="Post content"
\`\`\`

### Multi-Site Usage
\`\`\`bash
# Target specific site
wp_list_posts --site=site1

# Use with different authentication
wp_get_site_settings --site=production
\`\`\`

## Tool Categories

${this.generateCategoriesTable(categories)}

## Available Tools

${this.generateToolsTable(tools)}

## Authentication

All tools support multiple authentication methods:
- **Application Passwords** (recommended)
- **JWT Authentication** 
- **Basic Authentication** (development only)
- **API Key Authentication**

## Error Handling

Standard error response format:
\`\`\`json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "endpoint": "/wp-json/wp/v2/posts",
    "method": "GET"
  }
}
\`\`\`

## Configuration

### Multi-Site Configuration
\`\`\`json
{
  "sites": [
    {
      "id": "site1",
      "name": "My WordPress Site",
      "config": {
        "WORDPRESS_SITE_URL": "https://example.com",
        "WORDPRESS_USERNAME": "username",
        "WORDPRESS_APP_PASSWORD": "app_password"
      }
    }
  ]
}
\`\`\`

## Response Formats

All tools return responses in this format:
\`\`\`json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "site": "site1",
    "tool": "wp_list_posts"
  }
}
\`\`\`

## Performance Monitoring

The server includes comprehensive performance monitoring:
- Real-time metrics collection
- Historical performance analysis
- Industry benchmark comparisons
- Automated optimization recommendations

See [Performance Monitoring Guide](./performance/README.md) for details.

## Additional Resources

- [Tool Reference](./tools/README.md) - Detailed tool documentation
- [Type Definitions](./types/README.md) - TypeScript type definitions
- [Examples](./examples/README.md) - Usage examples and workflows
- [OpenAPI Specification](./openapi.json) - Machine-readable API spec

## Support

- **Documentation:** [GitHub Repository](https://github.com/docdyhr/mcp-wordpress)
- **Issues:** [GitHub Issues](https://github.com/docdyhr/mcp-wordpress/issues)
- **Discussions:** [GitHub Discussions](https://github.com/docdyhr/mcp-wordpress/discussions)
`;
  }

  /**
   * Generate tool documentation
   */
  generateToolDocumentation(tool: ToolDocumentation): string {
    return `# ${tool.name}

${this.generateToolBadge(tool.category)}

${tool.description}

## Parameters

${this.generateParametersTable(tool.parameters)}

## Examples

${this.generateExamples(tool.examples)}

${tool.wordpressEndpoint ? this.generateWordPressMapping(tool.wordpressEndpoint) : ""}

${tool.requiredPermissions ? this.generatePermissions(tool.requiredPermissions) : ""}

## Response Format

**Return Type:** \`${tool.returnType}\`

${this.generateResponseExample(tool)}

## Error Handling

${this.generateErrorDocumentation(tool.errorCodes)}

${tool.relatedTools.length > 0 ? this.generateRelatedTools(tool.relatedTools) : ""}

---

*Generated automatically from tool definitions - Do not edit manually*
`;
  }

  /**
   * Generate category documentation
   */
  generateCategoryDocumentation(category: CategoryDocumentation): string {
    return `# ${category.name} Tools

${category.description}

**Tool Count:** ${category.toolCount}

## Available Tools

${category.tools.map((tool) => `- [\`${tool}\`](./tools/${tool}.md)`).join("\n")}

## Common Usage Patterns

${category.usagePatterns.map((pattern) => `- ${pattern}`).join("\n")}

## Examples

### Basic ${category.name} Workflow
\`\`\`bash
# List all ${category.name.toLowerCase()}
wp_list_${category.name.toLowerCase()}

# Get specific item
wp_get_${category.name.toLowerCase().slice(0, -1)} --id=123

# Create new item  
wp_create_${category.name.toLowerCase().slice(0, -1)} --title="Example"
\`\`\`

### Multi-Site ${category.name} Management
\`\`\`bash
# Work with specific site
wp_list_${category.name.toLowerCase()} --site=production

# Bulk operations
wp_list_${category.name.toLowerCase()} --site=staging --limit=50
\`\`\`
`;
  }

  /**
   * Generate type documentation
   */
  generateTypeDocumentation(type: TypeDocumentation): string {
    return `# ${type.name}

${type.description}

${type.wordpressSource ? `**WordPress Source:** \`${type.wordpressSource}\`` : ""}

## Properties

${this.generateTypePropertiesTable(type.properties)}

## Example

\`\`\`json
${JSON.stringify(type.examples[0] || {}, null, 2)}
\`\`\`

${type.examples.length > 1 ? this.generateAdditionalExamples(type.examples.slice(1)) : ""}
`;
  }

  /**
   * Generate parameters table
   */
  private generateParametersTable(parameters: ParameterDocumentation[]): string {
    if (parameters.length === 0) {
      return "*No parameters required.*";
    }

    const headers = "| Parameter | Type | Required | Description | Default | Examples |";
    const separator = "|-----------|------|----------|-------------|---------|----------|";

    const rows = parameters.map((param) => {
      const examples = param.examples
        .slice(0, 2)
        .map((ex) => `\`${ex}\``)
        .join(", ");
      const defaultVal = param.defaultValue !== undefined ? `\`${param.defaultValue}\`` : "-";
      const required = param.required ? "✅" : "❌";

      return `| \`${param.name}\` | \`${param.type}\` | ${required} | ${param.description} | ${defaultVal} | ${examples || "-"} |`;
    });

    return [headers, separator, ...rows].join("\n");
  }

  /**
   * Generate examples section
   */
  private generateExamples(examples: ExampleUsage[]): string {
    if (examples.length === 0) {
      return "*No examples available.*";
    }

    return examples
      .map(
        (example) => `### ${example.title}

${example.description}

**Command:**
\`\`\`bash
${example.command} ${this.formatParameters(example.parameters)}
\`\`\`

**Response:**
\`\`\`json
${JSON.stringify(example.expectedResponse, null, 2)}
\`\`\`

${example.errorExample ? this.generateErrorExample(example.errorExample) : ""}
`,
      )
      .join("\n\n");
  }

  /**
   * Generate error example
   */
  private generateErrorExample(errorExample: { scenario: string; error: any }): string {
    return `**Error Example (${errorExample.scenario}):**
\`\`\`json
${JSON.stringify(errorExample.error, null, 2)}
\`\`\``;
  }

  /**
   * Generate WordPress mapping section
   */
  private generateWordPressMapping(endpoint: string): string {
    return `## WordPress REST API Mapping

**Endpoint:** \`${endpoint}\`

This tool directly interfaces with the WordPress REST API endpoint above. The response format and available parameters are determined by WordPress core functionality.

### WordPress Documentation
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Endpoint Reference](https://developer.wordpress.org/rest-api/reference/)
`;
  }

  /**
   * Generate permissions section
   */
  private generatePermissions(permissions: string[]): string {
    return `## Required Permissions

This tool requires the following WordPress user capabilities:

${permissions.map((perm) => `- \`${perm}\``).join("\n")}

**Note:** The authenticated user must have these capabilities to successfully execute this tool.
`;
  }

  /**
   * Generate response example
   */
  private generateResponseExample(tool: ToolDocumentation): string {
    return `\`\`\`json
{
  "success": true,
  "data": {
    // ${tool.returnType} response data
  },
  "metadata": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "${tool.name}",
    "site": "site1"
  }
}
\`\`\``;
  }

  /**
   * Generate error documentation
   */
  private generateErrorDocumentation(errorCodes: any[]): string {
    if (errorCodes.length === 0) {
      return `### Common Errors

- **Authentication Error**: Invalid credentials or insufficient permissions
- **Validation Error**: Invalid or missing required parameters  
- **Not Found Error**: Requested resource does not exist
- **Server Error**: Internal WordPress or network error

See [Error Handling Guide](../error-handling.md) for complete error reference.`;
    }

    return errorCodes
      .map(
        (error) => `### ${error.code}

**Message:** ${error.message}  
**Description:** ${error.description}  
**Resolution:** ${error.resolution}
`,
      )
      .join("\n\n");
  }

  /**
   * Generate related tools section
   */
  private generateRelatedTools(relatedTools: string[]): string {
    return `## Related Tools

${relatedTools.map((tool) => `- [\`${tool}\`](./${tool}.md)`).join("\n")}
`;
  }

  /**
   * Generate categories table
   */
  private generateCategoriesTable(categories: CategoryDocumentation[]): string {
    const headers = "| Category | Tools | Description |";
    const separator = "|----------|-------|-------------|";

    const rows = categories.map(
      (cat) => `| [${cat.name}](./categories/${cat.name.toLowerCase()}.md) | ${cat.toolCount} | ${cat.description} |`,
    );

    return [headers, separator, ...rows].join("\n");
  }

  /**
   * Generate tools table
   */
  private generateToolsTable(tools: ToolDocumentation[]): string {
    const headers = "| Tool | Category | Description |";
    const separator = "|------|----------|-------------|";

    const rows = tools.map(
      (tool) => `| [\`${tool.name}\`](./tools/${tool.name}.md) | ${tool.category} | ${tool.description} |`,
    );

    return [headers, separator, ...rows].join("\n");
  }

  /**
   * Generate type properties table
   */
  private generateTypePropertiesTable(properties: any[]): string {
    const headers = "| Property | Type | Required | Description |";
    const separator = "|----------|------|----------|-------------|";

    const rows = properties.map((prop) => {
      const required = prop.required ? "✅" : "❌";
      return `| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${prop.description} |`;
    });

    return [headers, separator, ...rows].join("\n");
  }

  /**
   * Generate badges for overview
   */
  private generateBadges(): string {
    return `![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Tools](https://img.shields.io/badge/tools-60+-green)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![License](https://img.shields.io/badge/license-MIT-blue)
`;
  }

  /**
   * Generate tool category badge
   */
  private generateToolBadge(category: string): string {
    const colors = {
      posts: "blue",
      pages: "green",
      media: "purple",
      users: "orange",
      comments: "red",
      taxonomies: "yellow",
      site: "lightblue",
      auth: "darkblue",
      cache: "grey",
      performance: "brightgreen",
    };

    const color = colors[category.toLowerCase() as keyof typeof colors] || "lightgrey";
    return `![${category}](https://img.shields.io/badge/category-${category}-${color})`;
  }

  /**
   * Format parameters for command examples
   */
  private formatParameters(params: Record<string, any>): string {
    return Object.entries(params)
      .map(([key, value]) => `--${key}="${value}"`)
      .join(" ");
  }

  /**
   * Generate additional examples
   */
  private generateAdditionalExamples(examples: any[]): string {
    return `## Additional Examples

${examples
  .map(
    (example, index) => `### Example ${index + 2}
\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`
`,
  )
  .join("\n")}`;
  }
}
