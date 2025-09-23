#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compare current performance with previous results
 */
function comparePerformance() {
  const currentFile = path.join(__dirname, "../results/current/evaluation-summary.json");
  const previousFile = path.join(__dirname, "../results/previous/evaluation-summary.json");

  try {
    if (!fs.existsSync(currentFile) || !fs.existsSync(previousFile)) {
      console.log("⚠️ Cannot compare: missing current or previous results");
      return;
    }

    const current = JSON.parse(fs.readFileSync(currentFile, "utf8"));
    const previous = JSON.parse(fs.readFileSync(previousFile, "utf8"));

    // Compare overall scores
    const scoreDiff = parseFloat(current.overall_score) - parseFloat(previous.overall_score);
    const passRateDiff = current.tests_passed / current.total_tests - previous.tests_passed / previous.total_tests;

    console.log("📊 Performance Comparison");
    console.log("========================");
    console.log(`Current Score: ${current.overall_score}/5.0`);
    console.log(`Previous Score: ${previous.overall_score}/5.0`);
    console.log(`Change: ${scoreDiff > 0 ? "+" : ""}${scoreDiff.toFixed(2)}`);
    console.log("");
    console.log(`Current Pass Rate: ${((current.tests_passed / current.total_tests) * 100).toFixed(1)}%`);
    console.log(`Previous Pass Rate: ${((previous.tests_passed / previous.total_tests) * 100).toFixed(1)}%`);
    console.log(`Change: ${passRateDiff > 0 ? "+" : ""}${(passRateDiff * 100).toFixed(1)}%`);

    // Check for regression
    const regressionThreshold = -0.2; // 0.2 point decrease
    if (scoreDiff < regressionThreshold) {
      console.log("");
      console.log("❌ PERFORMANCE REGRESSION DETECTED!");
      console.log(`Score decreased by ${Math.abs(scoreDiff).toFixed(2)} points`);

      // Compare failed tests
      const newFailures =
        current.failed_tests?.filter(
          (test) => !previous.failed_tests?.some((prevTest) => prevTest.name === test.name),
        ) || [];

      if (newFailures.length > 0) {
        console.log("");
        console.log("New failing tests:");
        newFailures.forEach((test) => {
          console.log(`  - ${test.name}: ${test.score}/5.0`);
        });
      }

      process.exit(1);
    }

    // Check for significant improvement
    const improvementThreshold = 0.2;
    if (scoreDiff > improvementThreshold) {
      console.log("");
      console.log("✅ PERFORMANCE IMPROVEMENT DETECTED!");
      console.log(`Score increased by ${scoreDiff.toFixed(2)} points`);

      // Compare newly passing tests
      const newPasses =
        previous.failed_tests?.filter(
          (test) => !current.failed_tests?.some((currentTest) => currentTest.name === test.name),
        ) || [];

      if (newPasses.length > 0) {
        console.log("");
        console.log("Newly passing tests:");
        newPasses.forEach((test) => {
          console.log(`  - ${test.name}`);
        });
      }
    }

    // Category comparison
    if (current.categories && previous.categories) {
      console.log("");
      console.log("📂 Category Changes:");
      Object.keys(current.categories).forEach((category) => {
        const curr = current.categories[category];
        const prev = previous.categories[category];

        if (prev) {
          const categoryDiff = parseFloat(curr.avg_score) - parseFloat(prev.avg_score);
          if (Math.abs(categoryDiff) > 0.1) {
            console.log(
              `  ${category}: ${prev.avg_score} → ${curr.avg_score} (${
                categoryDiff > 0 ? "+" : ""
              }${categoryDiff.toFixed(2)})`,
            );
          }
        } else {
          console.log(`  ${category}: NEW - ${curr.avg_score}/5.0`);
        }
      });
    }

    console.log("");
    console.log("✅ Performance comparison complete");
  } catch (error) {
    console.error("❌ Error comparing performance:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  comparePerformance();
}

export { comparePerformance };
