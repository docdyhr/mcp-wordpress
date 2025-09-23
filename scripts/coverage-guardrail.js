#!/usr/bin/env node
/**
 * Enhanced Coverage Guardrail
 * Enforces component-specific coverage thresholds and provides actionable recommendations
 *
 * Environment Variables:
 *   COVERAGE_MIN_LINES (default: 40 - Phase 1 target)
 *   COVERAGE_MIN_BRANCHES (default: 30 - Phase 1 target)
 *   COVERAGE_MIN_FUNCTIONS (default: 35 - Phase 1 target)
 *   COVERAGE_MIN_STATEMENTS (default: 38 - Phase 1 target)
 *   COVERAGE_PHASE (1|2|3 - selects threshold phase)
 *   COVERAGE_STRICT (true|false - enforce component thresholds)
 */
import fs from "fs";
import path from "path";

// Phase-based thresholds
const PHASE_THRESHOLDS = {
  1: { lines: 40, branches: 30, functions: 35, statements: 38 },
  2: { lines: 55, branches: 45, functions: 50, statements: 53 },
  3: { lines: 70, branches: 65, functions: 70, statements: 68 },
};

// Component-specific thresholds (Phase 1)
const COMPONENT_THRESHOLDS = {
  "src/utils/validation.ts": { lines: 85, branches: 80, functions: 90, statements: 85 },
  "src/utils/error.ts": { lines: 100, branches: 100, functions: 100, statements: 100 },
  "src/utils/toolWrapper.ts": { lines: 78, branches: 75, functions: 80, statements: 78 },
  "src/client/api.ts": { lines: 45, branches: 40, functions: 50, statements: 45 },
  "src/config/": { lines: 55, branches: 50, functions: 60, statements: 55 },
  "src/tools/": { lines: 25, branches: 20, functions: 25, statements: 25 },
};

const phase = parseInt(process.env.COVERAGE_PHASE || "1");
const globalThresholds = PHASE_THRESHOLDS[phase] || PHASE_THRESHOLDS[1];
const strictMode = process.env.COVERAGE_STRICT === "true";

const lineThreshold = parseFloat(process.env.COVERAGE_MIN_LINES || globalThresholds.lines.toString());
const branchThreshold = parseFloat(process.env.COVERAGE_MIN_BRANCHES || globalThresholds.branches.toString());
const functionThreshold = parseFloat(process.env.COVERAGE_MIN_FUNCTIONS || globalThresholds.functions.toString());
const statementThreshold = parseFloat(process.env.COVERAGE_MIN_STATEMENTS || globalThresholds.statements.toString());
const reportPath = path.resolve("coverage/coverage-final.json");

// Enhanced error handling with helpful instructions
if (!fs.existsSync(reportPath)) {
  console.error("❌ Coverage report not found at", reportPath);
  console.error("💡 Run 'npm test -- --coverage' to generate coverage report first");
  process.exit(1);
}

let json;
try {
  json = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
} catch (e) {
  console.error("❌ Unable to parse coverage report:", e.message);
  console.error("💡 Try deleting the coverage directory and regenerating: rm -rf coverage && npm test -- --coverage");
  process.exit(1);
}

// Calculate global coverage
let linesTotal = 0,
  linesCovered = 0;
let branchesTotal = 0,
  branchesCovered = 0;
let funcsTotal = 0,
  funcsCovered = 0;
let statementsTotal = 0,
  statementsCovered = 0;

// Component-specific coverage tracking
const componentCoverage = new Map();

for (const [filePath, file] of Object.entries(json)) {
  // Global aggregation - handle both new and legacy Istanbul formats
  if (file.lines) {
    // New format with lines/branches/functions/statements objects
    linesTotal += file.lines.total || 0;
    linesCovered += file.lines.covered || 0;
  } else if (file.s && file.statementMap) {
    // Legacy format with s/f/b arrays and maps
    const stmtMap = file.statementMap;
    const stmtHits = file.s;
    linesTotal += Object.keys(stmtMap).length;
    linesCovered += Object.values(stmtHits).filter((hits) => hits > 0).length;
  }

  if (file.branches) {
    branchesTotal += file.branches.total || 0;
    branchesCovered += file.branches.covered || 0;
  } else if (file.b && file.branchMap) {
    const branchMap = file.branchMap;
    const branchHits = file.b;
    for (const branchId in branchMap) {
      const branch = branchMap[branchId];
      const hits = branchHits[branchId] || [];
      branchesTotal += branch.locations ? branch.locations.length : hits.length;
      branchesCovered += hits.filter((hit) => hit > 0).length;
    }
  }

  if (file.functions) {
    funcsTotal += file.functions.total || 0;
    funcsCovered += file.functions.covered || 0;
  } else if (file.f && file.fnMap) {
    const fnMap = file.fnMap;
    const fnHits = file.f;
    funcsTotal += Object.keys(fnMap).length;
    funcsCovered += Object.values(fnHits).filter((hits) => hits > 0).length;
  }

  if (file.statements) {
    statementsTotal += file.statements.total || 0;
    statementsCovered += file.statements.covered || 0;
  } else if (file.s && file.statementMap) {
    // Same as lines for legacy format
    const stmtMap = file.statementMap;
    const stmtHits = file.s;
    statementsTotal += Object.keys(stmtMap).length;
    statementsCovered += Object.values(stmtHits).filter((hits) => hits > 0).length;
  }

  // Component-specific tracking
  const normalizedPath = filePath.replace(process.cwd(), "").replace(/\\/g, "/").replace(/^\//, "");

  // Calculate percentages for component tracking
  let linePct = 0,
    branchPct = 0,
    funcPct = 0,
    stmtPct = 0;

  if (file.lines) {
    linePct = file.lines.total ? (file.lines.covered / file.lines.total) * 100 : 0;
  } else if (file.s && file.statementMap) {
    const total = Object.keys(file.statementMap).length;
    const covered = Object.values(file.s).filter((hits) => hits > 0).length;
    linePct = total ? (covered / total) * 100 : 0;
  }

  if (file.branches) {
    branchPct = file.branches.total ? (file.branches.covered / file.branches.total) * 100 : 0;
  } else if (file.b && file.branchMap) {
    let totalBranches = 0,
      coveredBranches = 0;
    for (const branchId in file.branchMap) {
      const branch = file.branchMap[branchId];
      const hits = file.b[branchId] || [];
      totalBranches += branch.locations ? branch.locations.length : hits.length;
      coveredBranches += hits.filter((hit) => hit > 0).length;
    }
    branchPct = totalBranches ? (coveredBranches / totalBranches) * 100 : 0;
  }

  if (file.functions) {
    funcPct = file.functions.total ? (file.functions.covered / file.functions.total) * 100 : 0;
  } else if (file.f && file.fnMap) {
    const total = Object.keys(file.fnMap).length;
    const covered = Object.values(file.f).filter((hits) => hits > 0).length;
    funcPct = total ? (covered / total) * 100 : 0;
  }

  if (file.statements) {
    stmtPct = file.statements.total ? (file.statements.covered / file.statements.total) * 100 : 0;
  } else if (file.s && file.statementMap) {
    const total = Object.keys(file.statementMap).length;
    const covered = Object.values(file.s).filter((hits) => hits > 0).length;
    stmtPct = total ? (covered / total) * 100 : 0;
  }

  componentCoverage.set(normalizedPath, {
    lines: linePct,
    branches: branchPct,
    functions: funcPct,
    statements: stmtPct,
  });
}

const linePct = linesTotal ? (linesCovered / linesTotal) * 100 : 0;
const branchPct = branchesTotal ? (branchesCovered / branchesTotal) * 100 : 0;
const funcPct = funcsTotal ? (funcsCovered / funcsTotal) * 100 : 0;
const statementPct = statementsTotal ? (statementsCovered / statementsTotal) * 100 : 0;

// Global threshold validation
const globalFailures = [];
if (linePct < lineThreshold) globalFailures.push(`Lines ${linePct.toFixed(2)}% < ${lineThreshold}%`);
if (branchPct < branchThreshold) globalFailures.push(`Branches ${branchPct.toFixed(2)}% < ${branchThreshold}%`);
if (funcPct < functionThreshold) globalFailures.push(`Functions ${funcPct.toFixed(2)}% < ${functionThreshold}%`);
if (statementPct < statementThreshold)
  globalFailures.push(`Statements ${statementPct.toFixed(2)}% < ${statementThreshold}%`);

// Component-specific threshold validation
const componentFailures = [];
const recommendations = [];

if (strictMode) {
  for (const [pattern, thresholds] of Object.entries(COMPONENT_THRESHOLDS)) {
    const matchingFiles = Array.from(componentCoverage.entries()).filter(([filePath]) => {
      if (pattern.endsWith("/")) {
        return filePath.startsWith(pattern);
      }
      return filePath === pattern;
    });

    for (const [filePath, coverage] of matchingFiles) {
      if (coverage.lines < thresholds.lines) {
        componentFailures.push(`${filePath}: Lines ${coverage.lines.toFixed(1)}% < ${thresholds.lines}%`);
      }
      if (coverage.branches < thresholds.branches) {
        componentFailures.push(`${filePath}: Branches ${coverage.branches.toFixed(1)}% < ${thresholds.branches}%`);
      }
      if (coverage.functions < thresholds.functions) {
        componentFailures.push(`${filePath}: Functions ${coverage.functions.toFixed(1)}% < ${thresholds.functions}%`);
      }
      if (coverage.statements < thresholds.statements) {
        componentFailures.push(
          `${filePath}: Statements ${coverage.statements.toFixed(1)}% < ${thresholds.statements}%`,
        );
      }
    }
  }
}

// Generate improvement recommendations
if (globalFailures.length > 0) {
  recommendations.push("🎯 Priority improvements needed:");

  // Find lowest coverage files
  const sortedFiles = Array.from(componentCoverage.entries())
    .filter(([filePath]) => filePath.startsWith("src/"))
    .sort(([, a], [, b]) => a.lines - b.lines)
    .slice(0, 5);

  for (const [filePath, coverage] of sortedFiles) {
    if (coverage.lines < lineThreshold) {
      recommendations.push(`   • ${filePath}: ${coverage.lines.toFixed(1)}% lines coverage`);
    }
  }
}

const allFailures = [...globalFailures, ...componentFailures];

const result = {
  status: allFailures.length ? "failed" : "passed",
  phase: phase,
  strictMode: strictMode,
  thresholds: {
    global: {
      lines: lineThreshold,
      branches: branchThreshold,
      functions: functionThreshold,
      statements: statementThreshold,
    },
    components: strictMode ? COMPONENT_THRESHOLDS : null,
  },
  coverage: {
    global: {
      lines: parseFloat(linePct.toFixed(2)),
      branches: parseFloat(branchPct.toFixed(2)),
      functions: parseFloat(funcPct.toFixed(2)),
      statements: parseFloat(statementPct.toFixed(2)),
    },
    components: Object.fromEntries(
      Array.from(componentCoverage.entries())
        .filter(([path]) => path.startsWith("src/"))
        .map(([path, cov]) => [
          path,
          {
            lines: parseFloat(cov.lines.toFixed(1)),
            branches: parseFloat(cov.branches.toFixed(1)),
            functions: parseFloat(cov.functions.toFixed(1)),
            statements: parseFloat(cov.statements.toFixed(1)),
          },
        ]),
    ),
  },
  failures: {
    global: globalFailures,
    components: componentFailures,
  },
  recommendations: recommendations,
  summary: {
    totalFiles: componentCoverage.size,
    srcFiles: Array.from(componentCoverage.keys()).filter((p) => p.startsWith("src/")).length,
    failedComponents: componentFailures.length,
    phase: `Phase ${phase} (Target: ${globalThresholds.lines}% lines)`,
  },
};

// Output results
if (allFailures.length > 0) {
  console.error(`❌ Coverage guardrail failed (Phase ${phase}${strictMode ? " + Strict" : ""})`);
  console.error(`\nGlobal Failures: ${globalFailures.length ? globalFailures.join("; ") : "None"}`);

  if (componentFailures.length > 0) {
    console.error(`\nComponent Failures: ${componentFailures.length}`);
    componentFailures.slice(0, 10).forEach((failure) => console.error(`  • ${failure}`));
    if (componentFailures.length > 10) {
      console.error(`  ... and ${componentFailures.length - 10} more`);
    }
  }

  if (recommendations.length > 0) {
    console.error("\n" + recommendations.join("\n"));
  }

  console.error("\n📊 Current Coverage:");
  console.error(`  Lines: ${linePct.toFixed(2)}% (target: ${lineThreshold}%)`);
  console.error(`  Branches: ${branchPct.toFixed(2)}% (target: ${branchThreshold}%)`);
  console.error(`  Functions: ${funcPct.toFixed(2)}% (target: ${functionThreshold}%)`);
  console.error(`  Statements: ${statementPct.toFixed(2)}% (target: ${statementThreshold}%)`);

  // Machine-readable output for CI/CD
  console.error("\n" + JSON.stringify(result));
  process.exit(1);
}

console.log(`✅ Coverage guardrail passed (Phase ${phase}${strictMode ? " + Strict" : ""})`);
console.log(
  `📊 Coverage: Lines ${linePct.toFixed(2)}%, Branches ${branchPct.toFixed(2)}%, Functions ${funcPct.toFixed(
    2,
  )}%, Statements ${statementPct.toFixed(2)}%`,
);
console.log(
  `🎯 Progress toward Phase ${phase} targets: ${((linePct / globalThresholds.lines) * 100).toFixed(1)}% complete`,
);

// Machine-readable success output
console.log("\n" + JSON.stringify(result));
