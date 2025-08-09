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
if (process.env.JSON_OUTPUT === "true") {
  process.stdout.write(
    JSON.stringify({ lines: +linePct.toFixed(2), branches: +branchPct.toFixed(2), functions: +funcPct.toFixed(2) }),
  );
} else {
  console.log(`LINE_COV=${linePct.toFixed(2)}`);
  console.log(`BRANCH_COV=${branchPct.toFixed(2)}`);
  console.log(`FUNC_COV=${funcPct.toFixed(2)}`);
}
