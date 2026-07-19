/**
 * Vitest setup and teardown to ensure proper cleanup of resources
 * This helps prevent worker processes from hanging
 */

import { beforeAll, afterAll, afterEach } from "vitest";

// Global setup
beforeAll(() => {
  // Set execution context for compatibility
  (globalThis as unknown as { __EXECUTION_CONTEXT__: string }).__EXECUTION_CONTEXT__ = "vitest";
});

// Cleanup after each test
afterEach(() => {
  // Clear all timers and intervals
  if (typeof (globalThis as unknown as { clearImmediate?: () => void }).clearImmediate === "function") {
    (globalThis as unknown as { clearImmediate: () => void }).clearImmediate();
  }

  // Force garbage collection if available
  if ((globalThis as unknown as { gc?: () => void }).gc) {
    (globalThis as unknown as { gc: () => void }).gc();
  }
});

// Global teardown
afterAll(() => {
  // Force garbage collection if available
  if ((globalThis as unknown as { gc?: () => void }).gc) {
    (globalThis as unknown as { gc: () => void }).gc();
  }
});

// Deliberately no process-level "uncaughtException"/"unhandledRejection"
// listeners here. This file used to install listeners that only logged and
// returned, which counts as Node.js "handling" the exception — it suppresses
// Node's default fatal-exception behavior, so a genuine async bug (e.g. a
// leaked Nock interceptor exception) was silently swallowed and the suite
// still exited 0. With no listener installed, an uncaught exception or
// unhandled rejection in any worker now falls through to Node's default
// behavior (print and terminate that worker), which vitest's own pool-level
// crash detection catches and reports as a failing, non-zero-exit run.
// Calling process.exit() from a listener here does NOT work as an
// alternative: vitest patches process.exit inside its worker/fork pool
// specifically to prevent test code from exiting the process, so it just
// throws a confusing secondary error instead of failing cleanly.
