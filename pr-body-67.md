## Summary

Introduce multi-metric (lines / branches / functions) coverage visibility and automated badge updates.
Expands test suite from 207 to 404 tests (all passing) and adds a guardrail script enforcing
minimal thresholds (lines>=30, branches>=5, functions>=5) as a foundation for future ratcheting.

## Key Changes

- Add workflow .github/workflows/test-coverage-badges.yml:
  - Runs tests with coverage
  - Spins up MySQL + WordPress containers for live compatibility tests
  - Extracts line/branch/function coverage via new script
  - Posts PR comment with metrics
  - Updates README badges (tests + line/branch/function coverage)
  - Appends metrics history on main
  - Enforces guardrail thresholds (configurable via env)
- Add scripts/extract-coverage-metrics.js (deterministic parsing of coverage-final.json).
- Extend guardrail (scripts/coverage-guardrail.js) to include branches and functions.
- README: Replace single coverage badge with three granular badges; update test counts (404/404).
- Documentation wording adjustments (production readiness / coverage growth framing).

## Rationale

Granular coverage metrics improve signal and help focus future improvements (e.g., branch coverage
often lags lines). Guardrail starts permissive to avoid blocking while establishing baseline after
large test suite expansion. History file will enable trend visualization in a later PR.

## Follow-Up Ideas (Not in this PR)

- Incrementally ratchet thresholds (e.g., +2–5% per milestone).
- Generate SVG trend badge from metrics/history.jsonl.
- Separate live WordPress tests into a matrix job.
- Add per-package or critical-path coverage deltas.

## Testing

- Local run: 404/404 tests passing.
- Workflow YAML indentation and failure surfacing validated (removed masking of test failures).
- Guardrail script correctly exits non-zero when thresholds are unmet (simulated locally).

## Security & Quality

- No secrets added.
- Added explicit failure surfacing (removed `|| true` masking in test step).
- Improved error logging with stack trace in extraction script.

## Checklist

- [x] Tests pass
- [x] Coverage artifacts generated
- [x] Guardrail thresholds applied
- [x] README badges updated
- [x] Review feedback addressed
