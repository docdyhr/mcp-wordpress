/**
 * Jest setup for performance tests
 * Ensures proper cleanup of timers and resources
 */

// Store references to timers for cleanup
global.__timers = [];

// Override setInterval to track timers
const originalSetInterval = global.setInterval;
global.setInterval = function (callback, delay, ...args) {
  const timer = originalSetInterval(callback, delay, ...args);
  global.__timers.push(timer);
  return timer;
};

// Override setTimeout to track timers
const originalSetTimeout = global.setTimeout;
global.setTimeout = function (callback, delay, ...args) {
  const timer = originalSetTimeout(callback, delay, ...args);
  global.__timers.push(timer);
  return timer;
};

// Clean up all timers after each test
afterEach(() => {
  // Clear all timers
  global.__timers.forEach((timer) => {
    clearInterval(timer);
    clearTimeout(timer);
  });
  global.__timers = [];
});

// Ensure process exits cleanly
afterAll(() => {
  // Final cleanup
  global.__timers.forEach((timer) => {
    clearInterval(timer);
    clearTimeout(timer);
  });
  global.__timers = [];
});
