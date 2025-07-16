#!/usr/bin/env node

/**
 * Generate comprehensive evaluation report
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.join(__dirname, "..", "results");
const REPORTS_DIR = path.join(__dirname, "..", "reports");

function generateReport() {
  try {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Read evaluation results
    const summaryFile = path.join(RESULTS_DIR, "evaluation-summary.json");
    const resultsFile = path.join(RESULTS_DIR, "evaluation-results.json");

    if (!fs.existsSync(summaryFile)) {
      console.error("❌ No evaluation summary found");
      return;
    }

    const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
    let detailedResults = null;

    if (fs.existsSync(resultsFile)) {
      detailedResults = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
    }

    // Generate HTML report
    const htmlReport = generateHTMLReport(summary, detailedResults);
    const htmlFile = path.join(REPORTS_DIR, "evaluation-report.html");
    fs.writeFileSync(htmlFile, htmlReport);

    // Generate Markdown report
    const mdReport = generateMarkdownReport(summary, detailedResults);
    const mdFile = path.join(REPORTS_DIR, "evaluation-report.md");
    fs.writeFileSync(mdFile, mdReport);

    console.log("📊 Reports generated:");
    console.log(`  - HTML: ${htmlFile}`);
    console.log(`  - Markdown: ${mdFile}`);
  } catch (error) {
    console.error("❌ Error generating report:", error.message);
    process.exit(1);
  }
}

function generateHTMLReport(summary, results) {
  const statusColor = {
    excellent: "#28a745",
    good: "#17a2b8",
    passed: "#ffc107",
    failed: "#dc3545",
  };

  const color = statusColor[summary.status] || "#6c757d";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP WordPress Tools Evaluation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .score { font-size: 3em; font-weight: bold; color: ${color}; }
        .status { font-size: 1.2em; color: ${color}; text-transform: uppercase; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; }
        .card h3 { margin-top: 0; color: #333; }
        .progress-bar { height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: ${color}; transition: width 0.3s ease; }
        .test-list { max-height: 200px; overflow-y: auto; }
        .test-item { margin: 5px 0; padding: 5px; border-radius: 4px; font-size: 0.9em; }
        .test-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MCP WordPress Tools Evaluation Report</h1>
        <div class="score">${summary.overall_score}/5.0</div>
        <div class="status">${summary.status}</div>
        <div class="timestamp">Generated: ${new Date(summary.timestamp).toLocaleString()}</div>
    </div>

    <div class="grid">
        <div class="card">
            <h3>Overall Performance</h3>
            <p><strong>Tests Passed:</strong> ${summary.tests_passed}/${summary.total_tests}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(summary.tests_passed / summary.total_tests) * 100}%"></div>
            </div>
            <p><strong>Pass Rate:</strong> ${((summary.tests_passed / summary.total_tests) * 100).toFixed(1)}%</p>
        </div>

        <div class="card">
            <h3>Category Breakdown</h3>
            ${Object.entries(summary.categories)
              .map(
                ([category, data]) => `
                <div style="margin: 15px 0;">
                    <strong>${category}:</strong> ${data.passed}/${data.total} (${data.avg_score}/5.0)
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(data.passed / data.total) * 100}%"></div>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>

        ${
          summary.failed_tests.length > 0
            ? `
        <div class="card">
            <h3>Failed Tests</h3>
            <div class="test-list">
                ${summary.failed_tests
                  .map(
                    (test) => `
                    <div class="test-item test-failed">
                        <strong>${test.name}</strong> (${test.score.toFixed(2)}/5.0)<br>
                        <small>${test.reason}</small>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        ${
          summary.top_performing_tests.length > 0
            ? `
        <div class="card">
            <h3>Top Performing Tests</h3>
            <div class="test-list">
                ${summary.top_performing_tests
                  .map(
                    (test) => `
                    <div class="test-item test-passed">
                        <strong>${test.name}</strong> (${test.score.toFixed(2)}/5.0)
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
        `
            : ""
        }

        ${
          summary.recommendations.length > 0
            ? `
        <div class="card">
            <h3>Recommendations</h3>
            <ul>
                ${summary.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
            </ul>
        </div>
        `
            : ""
        }
    </div>

    <div style="margin-top: 40px;">
        <h2>Detailed Results</h2>
        ${results ? generateDetailedTable(results) : "<p>No detailed results available</p>"}
    </div>
</body>
</html>`;
}

function generateDetailedTable(results) {
  const evaluations = Array.isArray(results) ? results : results.evaluations || results.results || [];

  return `
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Accuracy</th>
                <th>Completeness</th>
                <th>Relevance</th>
                <th>Clarity</th>
                <th>Reasoning</th>
                <th>Average</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${evaluations
              .map((evaluation) => {
                const avg =
                  ((evaluation.accuracy || 0) +
                    (evaluation.completeness || 0) +
                    (evaluation.relevance || 0) +
                    (evaluation.clarity || 0) +
                    (evaluation.reasoning || 0)) /
                  5;
                const status = avg >= 3.5 ? "PASS" : "FAIL";
                const statusClass = avg >= 3.5 ? "test-passed" : "test-failed";

                return `
                <tr>
                    <td><strong>${evaluation.name}</strong></td>
                    <td>${(evaluation.accuracy || 0).toFixed(1)}</td>
                    <td>${(evaluation.completeness || 0).toFixed(1)}</td>
                    <td>${(evaluation.relevance || 0).toFixed(1)}</td>
                    <td>${(evaluation.clarity || 0).toFixed(1)}</td>
                    <td>${(evaluation.reasoning || 0).toFixed(1)}</td>
                    <td><strong>${avg.toFixed(2)}</strong></td>
                    <td class="${statusClass}">${status}</td>
                </tr>
              `;
              })
              .join("")}
        </tbody>
    </table>
  `;
}

function generateMarkdownReport(summary, results) {
  return `# MCP WordPress Tools Evaluation Report

**Generated:** ${new Date(summary.timestamp).toLocaleString()}

## Overall Performance

- **Overall Score:** ${summary.overall_score}/5.0
- **Status:** ${summary.status.toUpperCase()}
- **Tests Passed:** ${summary.tests_passed}/${summary.total_tests}
- **Pass Rate:** ${((summary.tests_passed / summary.total_tests) * 100).toFixed(1)}%

## Category Breakdown

${Object.entries(summary.categories)
  .map(([category, data]) => `- **${category}:** ${data.passed}/${data.total} passed (avg: ${data.avg_score}/5.0)`)
  .join("\n")}

${
  summary.failed_tests.length > 0
    ? `
## Failed Tests

${summary.failed_tests.map((test) => `- **${test.name}** (${test.score.toFixed(2)}/5.0): ${test.reason}`).join("\n")}
`
    : ""
}

${
  summary.top_performing_tests.length > 0
    ? `
## Top Performing Tests

${summary.top_performing_tests.map((test) => `- **${test.name}** (${test.score.toFixed(2)}/5.0)`).join("\n")}
`
    : ""
}

${
  summary.recommendations.length > 0
    ? `
## Recommendations

${summary.recommendations.map((rec) => `- ${rec}`).join("\n")}
`
    : ""
}

## Detailed Results

${results ? generateMarkdownTable(results) : "No detailed results available"}

---

*Report generated by mcp-evals for MCP WordPress Server*
`;
}

function generateMarkdownTable(results) {
  const evaluations = Array.isArray(results) ? results : results.evaluations || results.results || [];

  return `
| Test Name | Accuracy | Completeness | Relevance | Clarity | Reasoning | Average | Status |
|-----------|----------|--------------|-----------|---------|-----------|---------|--------|
${evaluations
  .map((evaluation) => {
    const avg =
      ((evaluation.accuracy || 0) +
        (evaluation.completeness || 0) +
        (evaluation.relevance || 0) +
        (evaluation.clarity || 0) +
        (evaluation.reasoning || 0)) /
      5;
    const status = avg >= 3.5 ? "PASS" : "FAIL";

    return `| ${evaluation.name} | ${(evaluation.accuracy || 0).toFixed(1)} | ${(evaluation.completeness || 0).toFixed(1)} | ${(evaluation.relevance || 0).toFixed(1)} | ${(evaluation.clarity || 0).toFixed(1)} | ${(evaluation.reasoning || 0).toFixed(1)} | **${avg.toFixed(2)}** | ${status} |`;
  })
  .join("\n")}
`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReport();
}

export { generateReport };
