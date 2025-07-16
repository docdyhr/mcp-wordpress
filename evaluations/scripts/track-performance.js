#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Track performance over time
 */
function trackPerformance() {
  const resultsDir = path.join(__dirname, "../results");
  const summaryFile = path.join(resultsDir, "evaluation-summary.json");
  const historyFile = path.join(resultsDir, "performance-history.json");

  try {
    // Read current results
    if (!fs.existsSync(summaryFile)) {
      console.log("⚠️ No evaluation summary found");
      return;
    }

    const currentResults = JSON.parse(fs.readFileSync(summaryFile, "utf8"));

    // Read or initialize history
    let history = [];
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
    }

    // Add current results to history
    const historyEntry = {
      timestamp: currentResults.timestamp || new Date().toISOString(),
      overall_score: parseFloat(currentResults.overall_score),
      tests_passed: currentResults.tests_passed,
      total_tests: currentResults.total_tests,
      status: currentResults.status,
      git_sha: process.env.GITHUB_SHA || "unknown",
      categories: currentResults.categories || {},
    };

    history.push(historyEntry);

    // Keep only last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // Calculate trends
    const trends = calculateTrends(history);

    // Write updated history
    const historyData = {
      entries: history,
      trends: trends,
      last_updated: new Date().toISOString(),
    };

    fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));

    console.log("📈 Performance tracking updated");
    console.log(`📊 Current Score: ${historyEntry.overall_score}/5.0`);
    console.log(`📈 Trend: ${trends.score_trend}`);
    console.log(`🎯 Pass Rate: ${((historyEntry.tests_passed / historyEntry.total_tests) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error("❌ Error tracking performance:", error.message);
    process.exit(1);
  }
}

function calculateTrends(history) {
  if (history.length < 2) {
    return {
      score_trend: "stable",
      pass_rate_trend: "stable",
      recent_change: 0,
    };
  }

  const recent = history.slice(-5); // Last 5 entries
  const current = recent[recent.length - 1];
  const previous = recent[recent.length - 2];

  const scoreDiff = current.overall_score - previous.overall_score;
  const passRateDiff = current.tests_passed / current.total_tests - previous.tests_passed / previous.total_tests;

  return {
    score_trend: scoreDiff > 0.1 ? "improving" : scoreDiff < -0.1 ? "declining" : "stable",
    pass_rate_trend: passRateDiff > 0.05 ? "improving" : passRateDiff < -0.05 ? "declining" : "stable",
    recent_change: scoreDiff,
    average_score: recent.reduce((sum, entry) => sum + entry.overall_score, 0) / recent.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  trackPerformance();
}

export { trackPerformance };
