# Contract & Compatibility Tests

This directory contains provider verification and WordPress compatibility tests.

## Live vs Mock Mode

The `wordpress-compatibility.test.js` suite now runs in two modes:

- **Live Mode** (real WordPress): Enabled when `WORDPRESS_TEST_URL` is set and `SKIP_LIVE_TESTS` is not set.
- **Mock Mode** (default fallback): Activated when no live WordPress instance is configured.
A lightweight mock client implements the minimal interface so tests are never skipped,
preserving pass/fail signal.

Force live mode explicitly with:

```bash
FORCE_LIVE_WP=true WORDPRESS_TEST_URL=http://localhost:8081 npm run test:compatibility
```

Skip live mode during CI (already default when URL absent) by *not* setting `WORDPRESS_TEST_URL`.

## Rationale

Previously these tests were skipped in CI without a configured environment, inflating pass rate while
reducing meaningful coverage. Mock fallback ensures:

1. Interface regressions are still caught.
2. Developers always see deterministic test results.
3. Coverage growth can be tracked even before full integration.

## Adding New Endpoints

When adding a new client method:

1. Extend the mock client in `wordpress-compatibility.test.js` to include a representative stub.
2. Add a live-mode assertion branch if behavior differs.
3. Run with live WordPress locally before merging.

## Future Enhancements

- Spin up an ephemeral WordPress container in CI for true end-to-end verification.
- Snapshot contract definitions for diff-based alerting.
- Collect latency metrics and publish performance deltas alongside coverage.
