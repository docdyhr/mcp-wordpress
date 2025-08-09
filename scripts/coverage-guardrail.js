#!/usr/bin/env node
/**
 * coverage-guardrail.js
 * Enforces minimum coverage thresholds using coverage/coverage-final.json
 * Supports environment variables:
 *   COVERAGE_MIN_LINES (default 30)
 *   COVERAGE_MIN_BRANCHES (default 5)
 *   COVERAGE_MIN_FUNCTIONS (default 5)
 */
import fs from "fs";
import path from "path";

const lineThreshold = parseFloat(process.env.COVERAGE_MIN_LINES || process.env.COVERAGE_MIN || "30");
const branchThreshold = parseFloat(process.env.COVERAGE_MIN_BRANCHES || "5");
const functionThreshold = parseFloat(process.env.COVERAGE_MIN_FUNCTIONS || "5");
const reportPath = path.resolve("coverage/coverage-final.json");

if (!fs.existsSync(reportPath)) {
  console.error("Coverage report not found at", reportPath);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
} catch (e) {
  console.error("Unable to parse coverage report:", e.message);
  process.exit(1);
}

let linesTotal = 0,
  linesCovered = 0;
let branchesTotal = 0,
  branchesCovered = 0;
let funcsTotal = 0,
  funcsCovered = 0;
for (const file of Object.values(json)) {
  if (file.lines) {
    linesTotal += file.lines.total || 0;
    linesCovered += file.lines.covered || 0;
  }
  if (file.branches) {
    branchesTotal += file.branches.total || 0;
    branchesCovered += file.branches.covered || 0;
  }
  if (file.functions) {
    funcsTotal += file.functions.total || 0;
    funcsCovered += file.functions.covered || 0;
  }
}

const linePct = linesTotal ? (linesCovered / linesTotal) * 100 : 0;
const branchPct = branchesTotal ? (branchesCovered / branchesTotal) * 100 : 0;
const funcPct = funcsTotal ? (funcsCovered / funcsTotal) * 100 : 0;

const failures = [];
if (linePct < lineThreshold) failures.push(`Lines ${linePct.toFixed(2)}% < ${lineThreshold}%`);
if (branchPct < branchThreshold) failures.push(`Branches ${branchPct.toFixed(2)}% < ${branchThreshold}%`);
if (funcPct < functionThreshold) failures.push(`Functions ${funcPct.toFixed(2)}% < ${functionThreshold}%`);

const result = {
  status: failures.length ? "failed" : "passed",
  thresholds: {
    lines: lineThreshold,
    branches: branchThreshold,
    functions: functionThreshold,
  },
  coverage: {
    lines: parseFloat(linePct.toFixed(2)),
    branches: parseFloat(branchPct.toFixed(2)),
    functions: parseFloat(funcPct.toFixed(2)),
  },
  failures,
};

if (failures.length) {
  console.error("❌ Coverage guardrail failed:", failures.join("; "));
  // Structured JSON (single line) for downstream parsing
  console.error(JSON.stringify(result));
  process.exit(1);
}

console.log(
  `✅ Coverage guardrail passed: Lines ${linePct.toFixed(2)}% ≥ ${lineThreshold}%, Branches ${branchPct.toFixed(2)}% ≥ ${branchThreshold}%, Functions ${funcPct.toFixed(2)}% ≥ ${functionThreshold}%`,
);
// Structured JSON (single line) for downstream parsing
console.log(JSON.stringify(result));
