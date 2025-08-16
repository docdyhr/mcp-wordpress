#!/usr/bin/env node
/**
 * extract-coverage-metrics.js
 * Reads coverage/coverage-final.json and prints shell-compatible exports:
 *   LINE_COV=xx.xx
 *   BRANCH_COV=yy.yy
 *   FUNC_COV=zz.zz
 * Also prints JSON to stdout when JSON_OUTPUT=true.
 */
import fs from "fs";
import path from "path";

const reportPath = path.resolve("coverage/coverage-final.json");
if (!fs.existsSync(reportPath)) {
  console.error(`# coverage file missing: ${reportPath}`);
  process.exit(1);
}
let data;
try {
  data = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
} catch (e) {
  console.error("# failed to parse coverage-final.json", e.stack || e.message);
  process.exit(1);
}
let linesTotal = 0,
  linesCovered = 0;
let branchesTotal = 0,
  branchesCovered = 0;
let funcsTotal = 0,
  funcsCovered = 0;

for (const file of Object.values(data)) {
  // Jest format: s = statements, f = functions, b = branches
  if (file.s) {
    const statementCounts = Object.values(file.s);
    linesTotal += statementCounts.length;
    linesCovered += statementCounts.filter((count) => count > 0).length;
  }

  if (file.f) {
    const functionCounts = Object.values(file.f);
    funcsTotal += functionCounts.length;
    funcsCovered += functionCounts.filter((count) => count > 0).length;
  }

  if (file.b) {
    const branchCounts = Object.values(file.b);
    branchesTotal += branchCounts.length;
    branchesCovered += branchCounts.filter((branchArray) =>
      Array.isArray(branchArray) ? branchArray.some((count) => count > 0) : branchArray > 0,
    ).length;
  }
}
const linePct = linesTotal ? (linesCovered / linesTotal) * 100 : 0;
const branchPct = branchesTotal ? (branchesCovered / branchesTotal) * 100 : 0;
const funcPct = funcsTotal ? (funcsCovered / funcsTotal) * 100 : 0;
if (process.env.JSON_OUTPUT === "true") {
  process.stdout.write(
    JSON.stringify({ lines: +linePct.toFixed(2), branches: +branchPct.toFixed(2), functions: +funcPct.toFixed(2) }),
  );
} else {
  console.log(`LINE_COV=${linePct.toFixed(2)}`);
  console.log(`BRANCH_COV=${branchPct.toFixed(2)}`);
  console.log(`FUNC_COV=${funcPct.toFixed(2)}`);
}
