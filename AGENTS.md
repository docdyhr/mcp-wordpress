# mcp-wordpress

MCP (Model Context Protocol) Server for WordPress. TypeScript ESM, 73 WordPress tools across 12 categories, exposed over
the MCP SDK to any MCP-compatible client.

## Quick Start

```bash
npm run build               # cross-platform clean + tsc && tsc-alias — required before most test/CLI scripts (tests run against dist/)
npm test                   # Run tests (npm run test:batch)
npm run dev                # Build + run with DEBUG=true
npm run health              # System check (scripts/health-check.js)
npm run fix:rest-auth      # Fix WordPress 401 errors (scripts/fix-rest-api-auth.sh)
npm run lint                # eslint src/ tests/
npm run typecheck           # tsc --noEmit
npm run security:scan       # blocking production npm-audit gate (scripts/security-audit-gate.js) against security-exceptions.json
npm run security:demo       # AI security-scanner demo (scripts/security-demo.js) — informational only, not a gate
```

## Architecture

**Core**: MCP Server (`src/index.ts`) registers 73 WordPress tools via `src/server/ToolRegistry.ts`. **Client**:
`src/client/api.ts` (`WordPressClient`) composes per-resource operation classes (`src/client/operations/`) via
constructor injection; App Passwords, JWT, Basic, and API Key are configurable via `.env`/`mcp-wordpress.config.json` —
Cookie auth is also implemented but is client/programmatic-only (see Authentication below). **Tools**: Posts(6) Pages(6)
Media(5) Users(6) Comments(7) Taxonomies(10) Site(3) Auth(6) Cache(4) Performance(6) SEO(11) System(3) = 73. **Key
files**: `src/client/api.ts`, `src/server/ToolRegistry.ts`, `src/tools/`, `src/config/ServerConfiguration.ts`,
`src/utils/logger.ts`.

Full per-directory contracts live in the Child DOX Index below — read the applicable child doc before editing.

## Configuration

**Multi-Site** (`mcp-wordpress.config.json`, gitignored — never commit real credentials):

```json
{
  "sites": [
    {
      "id": "site1",
      "name": "Site 1",
      "config": {
        "WORDPRESS_SITE_URL": "https://site.com",
        "WORDPRESS_USERNAME": "user",
        "WORDPRESS_APP_PASSWORD": "xxxx xxxx xxxx xxxx"
      }
    }
  ]
}
```

**Single-Site** (`.env`):

```bash
WORDPRESS_SITE_URL=https://site.com
WORDPRESS_USERNAME=user
WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Schema lives in `src/config/ConfigurationSchema.ts` (Zod); `src/config/ServerConfiguration.ts` decides single- vs
multi-site mode and fails startup loudly on invalid config (no silent fallback).

## Authentication

**Configurable methods** (`.env`/`mcp-wordpress.config.json`): App Passwords (recommended), JWT, Basic, API Key. Cookie
auth is implemented in the client but is client/programmatic-only — `ConfigurationSchema` rejects it as a configured
method, so it isn't available via `.env` or the multi-site config file.

**401 Fix**: `npm run fix:rest-auth` or add to `.htaccess`:

```apache
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
```

## Troubleshooting

- WordPress 401: `npm run fix:rest-auth`
- Debug logging: `DEBUG=true npm run dev`
- Cache issues: `rm -rf cache/`
- TypeScript: use `| undefined` for optional properties
- ESLint: use `_` prefix for unused variables
- Zed dotenv diagnostics: environment templates suppress ShellCheck `SC2034`, which is inapplicable to externally
  consumed variables

## CI/CD Pipeline

Conventional commits trigger semantic-release versioning (`docs`, `style`, `test`, `build`, `ci`, `chore` do **not** cut
a release — see `release.config.js`). Publishing: NPM + Docker Hub + DXT packaging. Node versions tested: 22, 24 (LTS).
Quality gates: all tests pass, security scans clean.

**Workflow architecture (known audit deviation)**: all `.github/workflows/` files are intentionally self-contained
inline definitions, not thin callers to `docdyhr/.github` — the shared library has no matching reusable workflows for
this stack. `main-ci.yml` (4-suite × Node-version matrix), `wordpress-compatibility.yml` (live WordPress API tests),
`release.yml` (DXT + Docker Hub + npm in one pipeline), `docker-modern.yml`, `dependency-review.yml` are all
project-specific by design. `/repo-audit` flags these as P1 — expected and accepted.

**Claude workflows authenticate with the owner's subscription token**: `claude.yml` (`@claude` mentions) and
`claude-code-review.yml` (PR opens and pushes from a same-repo branch, unless the event's sender is a bot) pass
`claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` to `anthropics/claude-code-action@v1`, so their runs
draw on the Claude subscription, not API billing. `claude setup-token` mints the token, valid for one year;
`gh api repos/docdyhr/mcp-wordpress/actions/secrets/CLAUDE_CODE_OAUTH_TOKEN --jq .updated_at` shows when the secret was
last set, not when the token was minted. Rotate it with `claude setup-token`, then
`gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo docdyhr/mcp-wordpress` (paste at the prompt). The action hides Claude's
output by default, so a failed first request, such as a rejected or expired token, shows only as `is_error: true`,
`total_cost_usd: 0` and a `duration_ms` of about 200 in the result block; re-run the job with debug logging to see the
error. Never pass `anthropic_api_key`, or set an `ANTHROPIC_API_KEY` env, beside it: `ANTHROPIC_API_KEY` outranks the
OAuth token and would silently resume API billing. A PR cannot exercise its own edits to these workflows: on the PR the
action exits early ("Skipping action due to workflow validation") and the check shows green, and `@claude` issue
comments run the default branch's copy. So an auth change is verified only by the first run after merge.

**`.github/dependabot.yml` fails as a whole**: one invalid value makes GitHub reject the entire file. Dependabot keeps
using the last valid version, if there is one, so edits silently stop taking effect. The only trace is a failing
`.github/dependabot.yml` check run on the commit that changed the file. That check is not required, so it was ignored
and blocked nothing. This file was never valid on main from 2025-07 to 2026-10 (a group
`update-types: ["security-update"]`), so no scheduled version update ever ran. Security updates kept running, which hid
it. `tests/dependabot-config.test.js` (batch 4) checks the file against the schema's allowed keys and value types.
Dependabot validates only default-branch commits, so after merging an edit, check that check run on the merge commit (a
PR head never gets one). Keep `target-branch` unset (once it is set, the entry's options stop applying to security
updates), give every ecosystem an `applies-to: "security-updates"` group, put no `security` label at entry level (entry
labels go on version-update PRs too), and keep the commit-message prefixes `chore`/`ci`. Two majors are ignored and
bumped by hand: `typescript` (only once `@typescript-eslint` accepts the new major) and the Docker `node` image (moved
to the next even-numbered LTS line together with `engines` and the CI matrix). `@vitest/*` stays in the
`development-dependencies` group so it moves with `vitest`.

**Production Docker image has no npm**: `Dockerfile`'s production stage removes the `node:22-alpine` base image's
bundled npm CLI (`node_modules`, `npm`, `npx` binaries) entirely — the container's entrypoint only ever runs
`node dist/index.js` (`CMD`/`HEALTHCHECK`), and `docs/DOCKER.md`'s documented `docker exec` usage only ever invokes
`node` directly, so npm is never needed at runtime. Do not add a runtime code path (health check, `docker exec`
instructions, `bin/*.js` scripts run inside the container) that shells out to `npm`/`npx` without restoring it first.
This also means npm's own vendored dependencies (`tar`, `brace-expansion`, `picomatch`, `sigstore` — CVEs in npm's
internals that `npm audit --omit=dev` never surfaces since they're not in this project's own dependency tree, but that
periodically tripped the post-push Trivy HIGH/CRITICAL image-scan gate) are gone from the shipped image; `corepack` is a
separate package and is unaffected.

**`release.config.js`'s `changelogTitle` must byte-match Prettier's output**: `@semantic-release/changelog` only skips
prepending a fresh `# Changelog` header when the live `CHANGELOG.md` already `startsWith()` the configured
`changelogTitle` — a byte-exact check (`node_modules/@semantic-release/changelog/lib/prepare.js`). Prettier's
`proseWrap: "always"` wraps the intro paragraph at a specific point; if `changelogTitle` wraps it differently, the check
silently fails on every release and prepends a duplicate header, compounding on each subsequent release (hit in the
3.3.29 release commit, fixed in #230). If `.prettierrc.json`'s `printWidth`/`proseWrap` or the intro text ever change,
run `npx prettier --write CHANGELOG.md` and copy the new byte-exact header into `changelogTitle`.

**`release.config.js` runs an inline `formatChangelog` prepare plugin** between `@semantic-release/changelog` and
`@semantic-release/git` that reformats `CHANGELOG.md` with Prettier's JS API before the release commit — otherwise
semantic-release writes raw conventional-changelog output (unwrapped lines, `*` bullets) straight to disk, which fails
`format:check` on the very next release. This happened after 3.3.30 (patched by hand in #232); this plugin exists so it
self-heals instead of needing another manual patch each time. If this plugin is ever removed, the failure mode returns.

**Claude Code Review posts one sticky comment per PR**: `claude-code-review.yml` sets `track_progress: true`, so
`claude-code-action` runs in tag mode and writes the review into a top-level tracking comment, and
`use_sticky_comment: true`, so each push rewrites that comment instead of adding one; a newer push cancels the running
review (job-level `concurrency`). Keep both: with a plain `prompt` alone the action runs in agent mode, which has no
comment tools, so the review runs and posts nothing. Tag mode also grants file edits, `git add`/`commit`/`rm` and a
`git-push.sh` wrapper, and it feeds the PR's comments into the prompt. So the job denies those tools in `claude_args`
and reads comments only from `docdyhr` (`include_comments_by_actor`): keep the automatic review unable to change
anything off the runner. The PR body is not filtered. The comment opens no review thread, so it never blocks the merge.
The sticky lookup reuses the first top-level comment by a Claude bot on the PR's first page of comments, so a top-level
`@claude` answer (`claude.yml`) that predates the PR's first review is overwritten; answers in review threads are not.

## Development Workflow

Branch naming: `feature/...`, `fix/...`, `chore/...`. Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
Quality gates before a PR: `npm test && npm run lint && npm run format:check && npm run security:scan && npm run build`.
`format:check` also runs in PR CI (`main-ci.yml` Quality Checks) and in `release.yml` before semantic-release. A
formatter bump that changes prettier's output needs a reformat commit in the same PR.

## Security Notes

- Never commit credentials or config files (`mcp-wordpress.config.json` and `.env` are gitignored)
- Branch protection enforced on main; PRs required for all changes
- CodeQL + Trivy scanning enabled in CI
- Run `npm run security:scan` before commits
- Vendored agent skills (`.claude/skills/`) are advisory: where one conflicts with an AGENTS.md rule, the AGENTS.md rule
  wins. In particular:
  - Dependabot edits keep the invariants under CI/CD Pipeline and never set `open-pull-requests-limit: 0`
  - Never start the server or send tool calls against a site from `.env` or `mcp-wordpress.config.json`; use a
    disposable test site or mocks
  - Install smoke tests use `npm pack` then `npm install --prefix <tmp-dir> <tarball>`, never `npm install -g` or
    `npx -y mcp-wordpress` (both run the published package, not the candidate)
  - Never print secret values; report `.env` and config files only as present or ignored

---

## DOX Framework

- DOX is a highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

### Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the
  nearest applicable AGENTS.md plus every parent AGENTS.md above it

### Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

### Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when
parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change
behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

### Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the
  top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

### Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities,
  workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific
  standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it
  when one exists

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

### Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

### Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

### User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md.

- Documentation updates (CHANGELOG, README) should accompany code changes in the same PR, not be deferred.

### Child DOX Index

- `.claude/skills/AGENTS.md` — vendored agent skills (Claude Code + Copilot); edit via upstream, not in place (one
  documented correction in `dependabot`)
- `.zed/AGENTS.md` — project-scoped Zed language associations for configuration templates and generated output
- `src/AGENTS.md` — source-wide TypeScript/ESLint conventions, composition-pattern DI, logger usage; indexes its own
  children
- `tests/AGENTS.md` — Vitest configs, coverage thresholds, test-against-dist convention
- `scripts/AGENTS.md` — 73 operational scripts (release, auth-fix, health, docker, CI helpers); flags destructive ones
