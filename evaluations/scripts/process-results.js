#!/usr/bin/env node

/**
 * Process MCP evaluation results and generate summary
 */

const fs = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '..', 'results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'evaluation-results.json');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'evaluation-summary.json');

function processResults() {
  try {
    // Ensure results directory exists
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    // Check if results file exists
    if (!fs.existsSync(RESULTS_FILE)) {
      console.error('❌ No evaluation results found at:', RESULTS_FILE);
      
      // Create a dummy summary for CI
      const dummySummary = {
        overall_score: 0,
        tests_passed: 0,
        total_tests: 0,
        status: 'no_results',
        message: 'No evaluation results found'
      };
      
      fs.writeFileSync(SUMMARY_FILE, JSON.stringify(dummySummary, null, 2));
      process.exit(1);
    }

    // Read evaluation results
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    
    // Process results
    const summary = {
      timestamp: new Date().toISOString(),
      overall_score: 0,
      tests_passed: 0,
      total_tests: 0,
      categories: {},
      failed_tests: [],
      top_performing_tests: [],
      recommendations: []
    };

    // Handle different result formats
    let evaluations = [];
    if (Array.isArray(results)) {
      evaluations = results;
    } else if (results.evaluations) {
      evaluations = results.evaluations;
    } else if (results.results) {
      evaluations = results.results;
    } else {
      console.error('❌ Unexpected results format');
      process.exit(1);
    }

    // Process each evaluation
    let totalScore = 0;
    let scoreCount = 0;

    evaluations.forEach(eval => {
      summary.total_tests++;
      
      // Calculate average score for this evaluation
      const scores = [
        eval.accuracy || 0,
        eval.completeness || 0,
        eval.relevance || 0,
        eval.clarity || 0,
        eval.reasoning || 0
      ];
      
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      totalScore += avgScore;
      scoreCount++;
      
      // Determine if test passed (threshold 3.5)
      const passed = avgScore >= 3.5;
      if (passed) {
        summary.tests_passed++;
      } else {
        summary.failed_tests.push({
          name: eval.name,
          score: avgScore,
          reason: eval.overall_comments || 'No specific reason provided'
        });
      }
      
      // Track top performing tests
      if (avgScore >= 4.5) {
        summary.top_performing_tests.push({
          name: eval.name,
          score: avgScore
        });
      }
      
      // Categorize by tool type
      const category = eval.name.split('_')[0] || 'general';
      if (!summary.categories[category]) {
        summary.categories[category] = {
          total: 0,
          passed: 0,
          avg_score: 0,
          scores: []
        };
      }
      
      summary.categories[category].total++;
      summary.categories[category].scores.push(avgScore);
      if (passed) {
        summary.categories[category].passed++;
      }
    });

    // Calculate overall score
    summary.overall_score = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : 0;

    // Calculate category averages
    Object.keys(summary.categories).forEach(category => {
      const cat = summary.categories[category];
      cat.avg_score = cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length;
      cat.avg_score = cat.avg_score.toFixed(2);
      delete cat.scores; // Remove raw scores from summary
    });

    // Generate recommendations
    if (summary.failed_tests.length > 0) {
      summary.recommendations.push('Review and fix failed tests to improve overall score');
    }
    
    if (summary.overall_score < 4.0) {
      summary.recommendations.push('Consider improving tool reliability and error handling');
    }
    
    if (summary.categories.error && summary.categories.error.passed / summary.categories.error.total < 0.8) {
      summary.recommendations.push('Improve error handling and edge case management');
    }

    // Determine status
    let status = 'failed';
    if (summary.overall_score >= 4.5) {
      status = 'excellent';
    } else if (summary.overall_score >= 4.0) {
      status = 'good';
    } else if (summary.overall_score >= 3.5) {
      status = 'passed';
    }
    
    summary.status = status;

    // Write summary
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));

    // Output results
    console.log('📊 Evaluation Summary:');
    console.log(`Overall Score: ${summary.overall_score}/5.0`);
    console.log(`Tests Passed: ${summary.tests_passed}/${summary.total_tests}`);
    console.log(`Status: ${status.toUpperCase()}`);
    
    if (summary.failed_tests.length > 0) {
      console.log('\n❌ Failed Tests:');
      summary.failed_tests.forEach(test => {
        console.log(`  - ${test.name}: ${test.score.toFixed(2)}/5.0`);
      });
    }
    
    if (summary.top_performing_tests.length > 0) {
      console.log('\n✅ Top Performing Tests:');
      summary.top_performing_tests.forEach(test => {
        console.log(`  - ${test.name}: ${test.score.toFixed(2)}/5.0`);
      });
    }

    console.log('\n📈 Category Breakdown:');
    Object.entries(summary.categories).forEach(([category, data]) => {
      console.log(`  ${category}: ${data.passed}/${data.total} passed (avg: ${data.avg_score}/5.0)`);
    });

    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    console.log(`\n✅ Summary saved to: ${SUMMARY_FILE}`);
    
    // Exit with appropriate code
    process.exit(status === 'failed' ? 1 : 0);

  } catch (error) {
    console.error('❌ Error processing results:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  processResults();
}

module.exports = { processResults };