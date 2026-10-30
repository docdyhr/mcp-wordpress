# tests/

## Purpose

Vitest test suite for the MCP WordPress server: unit, integration, contract, security, and performance tests.

## Ownership

Owns `tests/`: `baseline/`, `bin/`, `cache/`, `client/`, `config/`, `contracts/`, `fixtures/`, `performance/`,
`property/`, `scripts/`, `security/`, `server/`, `tools/`, `unit/`, `utils/`. `logs/` and `pacts/` are gitignored
runtime output, not source.

**A new test directory runs only once it is added to a batch.** The four batches name their directories explicitly, in
three places that must agree: `package.json` `test:batch:*`, the `main-ci.yml` test matrix `path`, and
`scripts/run-tests-safe.cjs` (pre-push). `tests/scripts/` ran in none of them until 2026-10. `tests/unit/`,
`tests/property/` and `tests/contracts/` still run in none.

## Local Contracts

**Tests run against compiled output, not source**: every test file is `.test.js` (not `.test.ts`) because
`vitest.config.ts` aliases `@/*` to `./dist/*`. Run `npm run build` before running tests directly with `vitest` — most
`npm run test:*` scripts already chain `npm run build &&`.

**Four vitest configs, different purposes**:

- `vitest.config.ts` — default/full config; coverage thresholds `branches 40 / functions 45 / lines 50 / statements 50`
  (a floor, not the ~76% actual line coverage). Used by `test:coverage`, `test:batch:*`, `test:cache`, `test:security`,
  `test:performance`, `test:watch`, `test:ui`, and `test:ci` (with `CI=true`).
- `vitest.ci.config.ts` — CI-tuned: fixed thread pool, shorter timeouts, `bail: 1`, excludes flaky/heavy suites
  (`SecurityReviewer`, `ToolRegistry`, `regression-detection`, `tests/integration/**`). Used only by `test:ci:safe`.
- `vitest.memory-safe.config.ts` — strictest: sequential execution, coverage disabled, longer teardown timeouts.
  Excludes `ToolRegistry` and `SecurityReviewer` (plus `regression-detection` under `CI`). Used by `test:memory-config`
  and by `test:safe` (`scripts/run-tests-safe.cjs`), which the pre-push hook runs — so the pre-push suite runs fewer
  tests than `npm test`.
- `vitest.test.config.ts` — minimal manual/local debug config; not wired to any npm script.

**Contract testing**: `tests/contracts/provider-verification.test.js` runs Pact provider verification against `../pacts`
(currently empty/gitignored — generated at runtime, not committed); self-skips in CI unless `WORDPRESS_TEST_URL` is set.

**HTTP mocks (nock 15)**: nock intercepts at the socket, so `fetch` gets what a real server would send. A reply function
receives the intercepted `Request` (headers from `request.headers`, the body from `await request.json()`; `this.req` and
the `(uri, body)` arguments are gone), and `replyWithError()` with a string or an `Error` reaches the client as
`TypeError("fetch failed")` with the error in `cause` (the object form `replyWithError({ code, message })` never
settles). Don't mock a hanging server with nock for a timeout test: when the client aborts a request nock still has in
flight, undici's socket teardown races the mock socket and throws an uncaught error (every time with `.delay()`,
intermittently with a reply that never settles). Stub `fetch` instead with a promise that rejects on the request's abort
signal (`hangingFetch` in `tests/client/api-upload-timeout.test.js`).

**`tests/vitest.setup.ts`** deliberately has no global `uncaughtException`/`unhandledRejection` handlers, so real async
bugs surface as failures instead of being silently swallowed — do not add them back.

## Work Guidance

New tests mirror the `src/` structure they cover (e.g. `tests/tools/posts/` for `src/tools/posts/`). Mock the import
path as used by the module under test (`@/...` resolving to `dist/...`), not the `src/` path.

## Verification

```bash
npm run build && npm test          # test:batch — the standard suite
npm run test:coverage              # with coverage report
npm run test:ci:safe               # CI-tuned config
```

## Child DOX Index

None.
