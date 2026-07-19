# scripts/

## Purpose

Operational scripts: release/publishing, auth debugging, health checks, docs generation, CI/dev helpers. Flat
directory, 73 files (`.js`/`.cjs`/`.sh`/`.py`/`.ts`/`.mjs`/`.php`).

## Ownership

Owns `scripts/`. Not all files here are load-bearing — see Local Contracts.

## Local Contracts

**npm-script-wired (the ones agents will actually invoke)**:

| npm script | scripts file |
| --- | --- |
| `fix:rest-auth` | `fix-rest-api-auth.sh` |
| `health` | `health-check.js` |
| `security:scan` | `security-demo.js` |
| `test:auth` | `test-auth.js` |
| `test:coverage:report` | `coverage-guardrail.js` |
| `test:pre-push` | `test-pre-push.sh` |
| `test:safe` | `run-tests-safe.cjs` |
| `test:tools` | `test-all-tools-fixed.js` |
| `docker:publish` | `manual-docker-publish.sh` |
| `docs:generate` / `docs:serve` / `docs:validate` | `generate-docs.js` / `serve-docs.js` / `validate-docs.js` |
| `dxt:package:official` | `build-dxt-clean.cjs` |
| `verify-claude` | `verify-claude-integration.js` |
| `check:ignore` | `sync-ignore-files.js` |

**Do not run without explicit user confirmation** — these mutate remote/shared state:
`manual-docker-publish.sh` (pushes to Docker Hub), `rollback-deployment.sh`, `cleanup-stale-security-configs.sh`
(deletes GitHub code-scanning analyses via `gh api`), `close-verification-issues.sh` (closes hardcoded GitHub
issues), `fix-docker-publishing.sh` / `fix-docker-releases.sh` (re-trigger release workflows), and
`adjust-branch-protection.sh` / `setup-branch-protection.sh` (modify branch protection).

**Known scope leak**: several files (`mojibake-restore.py`, `neigong-mojibake-scan.py`,
`mojibake-scan-dyhr.json`, `mojibake-scan-neigong-v2.json`) are WordPress content-repair tooling for unrelated sites
(neigong.net, dyhr.com), not part of mcp-wordpress. Left in place — moving/deleting them is out of scope unless the
user asks.

## Work Guidance

New operational scripts should be wired into `package.json` `scripts` if they're meant to be run regularly; ad hoc
one-off scripts don't need an npm alias but should still get a one-line comment stating their purpose.

## Verification

None beyond each script's own behavior — there is no test suite for `scripts/` itself.

## Child DOX Index

None.
