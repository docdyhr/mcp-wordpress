#!/usr/bin/env node

/* eslint-disable no-undef, no-unused-vars */

/**
 * Memory-safe test runner
 * Automatically handles test batching and memory management
 */

const { spawn, execSync } = require('child_process');
const { stripVTControlCharacters } = require('node:util');
const fs = require('fs');
const path = require('path');

// Test batch configuration
const TEST_BATCHES = [
  {
    name: 'Security & Cache',
    paths: ['tests/security/', 'tests/cache/', 'tests/server/'],
    timeout: 60000,
  },
  {
    name: 'Client & Config & Utils',
    paths: ['tests/client/', 'tests/config/', 'tests/utils/'],
    timeout: 90000,
  },
  {
    name: 'Tools & Performance',
    paths: ['tests/tools/', 'tests/performance/'],
    timeout: 120000,
  },
  {
    name: 'Root & Docs',
    paths: ['tests/*.test.js', 'tests/docs/', 'tests/bin/'],
    timeout: 60000,
  },
];

// Node.js memory options (only heap-size flags are allowed in NODE_OPTIONS)
const NODE_OPTIONS = [
  '--max-old-space-size=4096',
  '--max-semi-space-size=256',
].join(' ');

// Expand a simple glob like "tests/*.test.js" into real file paths.
// Handles only single-level wildcards (no **). Passes non-glob paths through.
function expandGlob(pattern) {
  if (!pattern.includes('*')) return [pattern];
  const dir = path.dirname(pattern);
  const ext = path.extname(pattern);
  const prefix = path.basename(pattern).replace(/\*.*/, '');
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

// Extract "<n> <label>" from a summary segment such as "2 failed | 108 passed (110)".
function countLabelled(segment, label) {
  const match = segment.match(new RegExp(`(\\d+)\\s+${label}\\b`));
  return match ? parseInt(match[1], 10) : 0;
}

// Pull the "(N)" total that vitest appends to a summary line, if present.
function parenthesisedTotal(segment) {
  const match = segment.match(/\((\d+)\)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

// Return the payload of the LAST line whose label matches, e.g. the text after
// "Tests" on "      Tests  1070 passed | 2 skipped (1072)". The summary block is
// printed at the very end of a run, so the last occurrence is the authoritative one.
function lastSummaryLine(text, label) {
  const matches = [...text.matchAll(new RegExp(`^\\s*${label}\\s+(.+?)\\s*$`, 'gm'))];
  return matches.length ? matches[matches.length - 1][1] : null;
}

/**
 * Parse the summary block that vitest's default reporter prints at the end of a run:
 *
 *      Test Files  33 passed (33)
 *           Tests  1070 passed | 2 skipped (1072)
 *
 * vitest colours these lines via tinyrainbow, which does not check whether stdout is
 * a TTY: it colours whenever TERM is not "dumb" (unset included) unless NO_COLOR is
 * set or an AI-agent environment is detected. In a normal terminal the piped output
 * is therefore coloured, and the digits are separated from their labels by ANSI
 * escape sequences (`\x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m1070 passed\x1b[39m…`).
 * The escape codes are stripped before matching so both coloured and plain output
 * parse identically.
 *
 * @param {string} output raw vitest stdout
 * @returns {{found: boolean, testFiles: number, tests: number, passed: number,
 *            failed: number, skipped: number, todo: number, expectedFail: number}}
 *   `found` is false when no "Tests" summary line exists (crash, no tests
 *   collected, unexpected reporter). Counts are 0 in that case, never estimated.
 */
function parseVitestSummary(output) {
  const text = stripVTControlCharacters(String(output ?? ''));
  const summary = {
    found: false,
    testFiles: 0,
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    expectedFail: 0,
  };

  const filesSegment = lastSummaryLine(text, 'Test Files');
  if (filesSegment !== null) {
    summary.testFiles =
      parenthesisedTotal(filesSegment) ??
      countLabelled(filesSegment, 'passed') +
        countLabelled(filesSegment, 'failed') +
        countLabelled(filesSegment, 'skipped');
  }

  const testsSegment = lastSummaryLine(text, 'Tests');
  if (testsSegment !== null) {
    summary.found = true;
    summary.passed = countLabelled(testsSegment, 'passed');
    summary.failed = countLabelled(testsSegment, 'failed');
    summary.skipped = countLabelled(testsSegment, 'skipped');
    summary.todo = countLabelled(testsSegment, 'todo');
    summary.expectedFail = countLabelled(testsSegment, 'expected fail');
    summary.tests =
      parenthesisedTotal(testsSegment) ??
      summary.passed + summary.failed + summary.skipped + summary.todo + summary.expectedFail;
  }

  return summary;
}

/**
 * Decide whether a batch is healthy. A zero exit code alone is not enough: a batch
 * that collected no tests, or whose summary could not be parsed, is treated as a
 * failure so a silently skipped batch can never be reported as "all tests passed".
 *
 * @param {{code: number|null, signal?: string|null, summary: ReturnType<typeof parseVitestSummary>}} input
 * @returns {{success: boolean, reason: string|null}}
 */
function evaluateBatch({ code, signal = null, summary }) {
  if (code !== 0) {
    return {
      success: false,
      reason: signal ? `vitest was killed by ${signal} (timeout?)` : `vitest exited with code ${code}`,
    };
  }
  if (!summary || !summary.found) {
    return { success: false, reason: 'no "Tests" summary line found in vitest output' };
  }
  if (summary.failed > 0) {
    return { success: false, reason: `${summary.failed} test(s) failed` };
  }
  if (summary.tests === 0) {
    return { success: false, reason: 'batch ran zero tests' };
  }
  // vitest reports passing test.fails() cases as "expected fail", not "passed", so
  // both count as executed. A batch where everything was skipped or todo ran nothing.
  if (summary.passed + summary.expectedFail === 0) {
    return {
      success: false,
      reason: `no tests executed (${summary.skipped} skipped, ${summary.todo} todo)`,
    };
  }
  return { success: true, reason: null };
}

class TestRunner {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.totalPassed = 0;
    this.totalFailed = 0;
  }

  async runBatch(batch) {
    console.log(`\n🧪 Running ${batch.name}...`);
    console.log(`   Paths: ${batch.paths.join(', ')}`);

    return new Promise((resolve, reject) => {
      // Build first
      try {
        console.log('   Building...');
        execSync('npm run build', { stdio: 'pipe' });
      } catch (buildError) {
        console.error(`   ❌ Build failed: ${buildError.message}`);
        resolve({
          batch: batch.name,
          success: false,
          reason: 'Build failed',
          error: 'Build failed',
          tests: 0,
          passed: 0,
          failed: 0,
        });
        return;
      }

      // Expand any glob patterns (spawn doesn't go through a shell)
      const expandedPaths = batch.paths.flatMap(expandGlob).filter(Boolean);

      // Run tests with memory limits
      const vitestCmd = [
        'vitest', 'run',
        '--config', 'vitest.memory-safe.config.ts',
        '--no-coverage',
        ...expandedPaths
      ];

      const child = spawn('npx', vitestCmd, {
        env: {
          ...process.env,
          NODE_OPTIONS,
        },
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: batch.timeout,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Show real-time output for important messages
        if (output.includes('✓') || output.includes('×') || output.includes('Test Files')) {
          process.stdout.write(output);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code, signal) => {
        const summary = parseVitestSummary(stdout);
        const { success, reason } = evaluateBatch({ code, signal, summary });

        const result = {
          batch: batch.name,
          success,
          reason,
          code,
          signal,
          testFiles: summary.testFiles,
          tests: summary.tests,
          passed: summary.passed,
          failed: summary.failed,
          skipped: summary.skipped,
          stdout: stdout.slice(-1000), // Keep last 1000 chars for debugging
          stderr: stderr.slice(-1000),
        };

        if (success) {
          console.log(
            `   ✅ ${batch.name}: ${summary.passed} passed` +
              (summary.skipped ? `, ${summary.skipped} skipped` : '') +
              ` (${summary.tests} tests, ${summary.testFiles} files)`
          );
        } else {
          console.log(
            `   ❌ ${batch.name}: ${reason} — ${summary.failed} failed, ${summary.passed} passed (${summary.tests} total)`
          );
          const tail = stripVTControlCharacters(stdout + stderr).trim().split('\n').slice(-20).join('\n');
          if (tail) {
            console.log('   --- last lines of vitest output ---');
            console.log(tail.replace(/^/gm, '   '));
          }
        }

        this.totalTests += summary.tests;
        this.totalPassed += summary.passed;
        this.totalFailed += summary.failed;

        resolve(result);
      });

      child.on('error', (error) => {
        console.log(`   ❌ ${batch.name}: Process error - ${error.message}`);
        resolve({
          batch: batch.name,
          success: false,
          reason: `Process error - ${error.message}`,
          error: error.message,
          tests: 0,
          passed: 0,
          failed: 0,
        });
      });
    });
  }

  async runAllBatches() {
    console.log('🚀 Starting memory-safe test runner...\n');

    for (const batch of TEST_BATCHES) {
      const result = await this.runBatch(batch);
      this.results.push(result);

      // Force garbage collection between batches
      if (global.gc) {
        global.gc();
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    this.printSummary();
    return this.totalFailed === 0;
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');

    let successfulBatches = 0;

    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      const detail = result.success ? '' : ` — ${result.reason}`;
      console.log(
        `${status} ${result.batch}: ${result.passed || 0} passed, ${result.failed || 0} failed${detail}`
      );
      if (result.success) successfulBatches++;
    }

    console.log('\n📈 Overall Results:');
    console.log(`   Batches: ${successfulBatches}/${this.results.length} successful`);
    console.log(`   Tests: ${this.totalPassed} passed, ${this.totalFailed} failed`);
    console.log(`   Total: ${this.totalTests} tests`);

    const anyBatchFailed = this.results.some((r) => !r.success);
    if (this.totalFailed > 0 || anyBatchFailed) {
      console.log('\n❌ Some tests failed. Check individual batch output above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllBatches().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
module.exports.TestRunner = TestRunner;
module.exports.TEST_BATCHES = TEST_BATCHES;
module.exports.parseVitestSummary = parseVitestSummary;
module.exports.evaluateBatch = evaluateBatch;
