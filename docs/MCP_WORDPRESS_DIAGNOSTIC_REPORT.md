# WordPress MCP Server — Diagnostic Report

**For:** Claude Code (working in `mcp-wordpress` repo)
**Tested by:** Claude (Claude Desktop, claude.ai)
**Date:** 2026-04-29
**Environment:** Claude Desktop DXT Extension on macOS
**Site under test:** `https://dyhr.com` (single-site config, `app-password` auth, `editor` role)
**`wp_check_version` says:** `v3.1.22` (latest)
**MCP `serverInfo` handshake says:** `mcp-wordpress` `2.11.3`  ⚠️ *(see Defect #1)*

---

## Executive summary

**Overall status: 🟡 YELLOW** — server runs and the site is reachable, but several tools are broken or unreliable, the version reporting is inconsistent, and performance is below the project's stated 200ms SLA.

| Area | Status | Notes |
|---|---|---|
| Server lifecycle | 🟡 | Multiple rapid restart cycles observed; startup handshakes occasionally take 5–8s |
| Auth & connectivity | 🟢 / 🔴 | Real auth works; `wp_get_auth_status` reports stale "Not connected" state |
| Cache subsystem | 🔴 | `wp_cache_info` and `wp_cache_warm` hang >4 min; `wp_cache_stats` returns inconsistent entry counts |
| Performance | 🟡 | Average response 486–594ms vs 200ms SLA; cache hit rate stuck at 0% |
| Read tools (posts/SEO) | 🟢 | `wp_list_posts`, `wp_seo_test_integration` work, response payloads have encoding bugs |
| Alerting | 🟡 | Five duplicate "Low cache hit rate" warnings — needs deduplication |

Two confirmed hard defects, three soft defects, two performance issues, one data-integrity bug. Detailed below.

---

## Test methodology

Followed the `mcp-server-troubleshooter` playbook diagnostic sequence:

1. ✅ Confirm server running (implicit from successful tool calls)
2. ✅ Version check (`wp_check_version`)
3. ✅ Log analysis (last 200 lines of `~/Library/Logs/Claude/mcp-server-WordPress MCP Server.log`)
4. ✅ Auth status per site (`wp_get_auth_status`)
5. ✅ Connectivity smoke test (`wp_test_auth`)
6. ⚠️ Cache health (`wp_cache_stats` ✅, `wp_cache_info` hung, `wp_cache_warm` hung)
7. ✅ Performance check (`wp_performance_stats`, `wp_performance_alerts`)
8. ✅ Functional smoke tests (`wp_list_posts`, `wp_seo_test_integration`)

All tests run from claude.ai web client against the local Claude Desktop DXT extension on macOS during a single ~70-minute session.

---

## Defects (prioritized)

### 🔴 D1 — Version mismatch between MCP handshake and `wp_check_version`

**Severity:** High (release hygiene / supply chain integrity)

**Evidence:**
- `wp_check_version` returns `Current version: v3.1.22 / Latest version: v3.1.22 / No update needed.`
- Every `initialize` handshake in the log says `"serverInfo":{"name":"mcp-wordpress","version":"2.11.3"}`
- This is consistent across **every** server restart in the log window (Apr 24 → Apr 29)

**Hypothesis:**
The DXT bundle ships a `package.json` / `serverInfo` value of `2.11.3`, but the `wp_check_version` tool reads the version from somewhere else (hardcoded constant, separate `version.ts`, GitHub releases API, or a cached value). Either the source of truth is split between two files, or the version-check tool is reporting the *npm registry latest* and conflating it with *what is actually running*.

**Action for Claude Code:**
- Locate the version source for `wp_check_version` (likely `src/tools/version.ts` or similar) and the source used by the MCP `serverInfo` (likely `package.json` read at startup).
- Make them read from a single source of truth — typically `package.json`'s `version` field via `import { version } from '../../package.json'`.
- Add a unit test: assert that `serverInfo.version === currentVersion()` reported by the version tool.
- Decide whether the DXT bundle is genuinely v2.11.3 or v3.1.22 — if v3.1.22 is correct, the DXT manifest needs republishing; if v2.11.3 is correct, the version-check tool is misreporting "up to date".

---

### 🔴 D2 — `wp_get_auth_status` reports stale "Not connected" state even after successful `wp_test_auth`

**Severity:** High (UX & correctness — misleading users into thinking auth is broken)

**Reproduction (confirmed in log across 3+ sessions on Apr 29):**
```
1. wp_get_auth_status  →  "Authenticated: ❌ No / Not connected"
2. wp_test_auth        →  "✅ Authentication successful! User: claude_desktop / Role: editor"
3. wp_get_auth_status  →  "Authenticated: ❌ No / Not connected"   ← STILL stale
```

Log evidence (UTC):
- `13:42:58.524` `wp_get_auth_status` → "Not connected"
- `13:43:02.914` `wp_test_auth` → "Authentication successful!"
- `14:05:31.820` `wp_get_auth_status` → "Not connected" (after the successful test_auth at 13:43)
- `14:06:23.590` `wp_test_auth` → "Authentication successful!" again
- `14:07:24.991` `wp_get_auth_status` → "Not connected" (still!)

**Hypothesis:**
`wp_get_auth_status` reads a flag like `isAuthenticated` that is only set inside the `wp_test_auth` code path *and* the flag isn't persisted across the auth-status tool's request scope, OR the status tool reads from a different client/session object than the test tool writes to.

**Action for Claude Code:**
- Trace the read/write paths for the `authenticated` state. Likely in `src/auth/AuthManager.ts` or wherever the per-site `Client` keeps its auth state.
- Either: (a) make `wp_get_auth_status` perform a lightweight authenticated probe (e.g. `GET /wp/v2/users/me`) when the cached state is "unknown" or stale, or (b) make `wp_test_auth` write the success result into the same store `wp_get_auth_status` reads from.
- Recommended: option (a) is more robust — the status tool should reflect *current* reality, not stale session state.
- Add an integration test that calls `test_auth` then `get_auth_status` in sequence and asserts they agree.

---

### 🔴 D3 — `wp_cache_info` and `wp_cache_warm` hang indefinitely (>4 min, no response)

**Severity:** High (broken tools)

**Evidence:**
- Two attempts at `wp_cache_info` in this session — both timed out at the 4-minute MCP transport ceiling.
- One attempt at `wp_cache_warm` — same 4-minute timeout.
- **Critical:** these calls do *not* appear in the server log. The log advances from `wp_cache_stats` at `14:08:30` directly to `wp_performance_stats` at `14:13:06` — a 4m36s gap that aligns with the timeout.

This means one of:
- The tool handler is throwing/hanging *before* it logs the request (no `try/catch` around the handler entry, or logger isn't flushed).
- The MCP request is being swallowed by a middleware before reaching the handler.
- The handler does asynchronous work that never resolves (unawaited promise, deadlocked semaphore, hung HTTP connection without timeout).

By contrast, `wp_cache_stats` (which returns immediately with a JSON object) works fine — so the cache subsystem itself is partially functional.

**Action for Claude Code:**
- Find the handler for `wp_cache_info` and `wp_cache_warm`. They likely share an underlying call path (probably both touch a `CacheManager.getInfo()` / `CacheManager.warm()` method).
- Add an entry-log line at the very top of every tool handler: `logger.info({ tool, args }, 'tool call received')` — this would make D3 type defects diagnose-able in seconds next time.
- Wrap any HTTP call inside `wp_cache_warm` with an explicit timeout (e.g. 30s) and proper rejection — long-running operations should stream progress or chunk, not silently hang.
- If `wp_cache_warm` is intentionally long (it bulk-fetches and caches), consider returning immediately with a job ID and exposing a `wp_cache_warm_status` to poll, rather than blocking the MCP request.

---

### 🟡 D4 — Multiple rapid server restart cycles

**Severity:** Medium (instability / DX)

**Evidence (UTC, all on 2026-04-29):**
```
12:45:08.216  Shutting down...  (intentional)
12:45:12.727  Initializing server...
12:45:13.008  Shutting down... (1 second later)
12:45:14.690  Initializing server...
12:45:17.374  Server started
12:45:53.198  Shutting down...
12:45:53.947  Initializing server...
12:45:55.889  Server started
12:46:03.590  Shutting down...
12:46:10.157  Initializing server...
12:46:11.079  Server started
```

Five restarts in 63 seconds. This pattern often appears when:
- Claude Desktop's DXT extension installer/updater is racing.
- A config change causes a self-restart loop (file watcher firing on its own writes).
- Multiple Claude Desktop windows are racing for the same server instance.

**Action for Claude Code:**
- Check whether the DXT installer or any config-watching code can trigger restart loops. Add a debounce on file watchers (>= 500ms).
- Log the *reason* for shutdown — currently every shutdown just says "intentional shutdown" with no caller info. Add a stack frame or a reason string to the shutdown handler.
- Consider whether the DXT manifest's restart policy is too aggressive for transient errors.

---

### 🟡 D5 — Slow MCP `initialize` handshake (5–8 seconds)

**Severity:** Medium (UX — first interaction lag)

**Evidence:**
- `08:51:12.928` initialize sent → `08:51:21.298` response: **8.4s**
- `13:02:04.642` initialize sent → `13:02:10.293` response: **5.6s**
- `12:45:14.690` initialize sent → `12:45:17.374` response: **2.7s** (typical)

The `tools/list` schema is enormous — one response was truncated at **49,430 characters** in the log. If the server is constructing this schema on every `initialize`, that's likely the cause of the slow handshakes.

**Action for Claude Code:**
- Cache the `tools/list` JSON at server startup (build once, serve many times).
- Profile the `initialize` handler — anything synchronous that touches the filesystem, makes HTTP calls, or does crypto on the hot path should be deferred.
- The 70+ tool schemas are unavoidably large, but `initialize` itself shouldn't depend on them. Make `initialize` return quickly and only build `tools/list` lazily on first request.

---

### 🟡 D6 — Average response time (486–594ms) is 2.4–3.0× the stated 200ms SLA

**Severity:** Medium (perf budget breach)

**Evidence:**
- `wp_performance_stats` at uptime `3m 18s`: `averageResponseTime: 594ms` over 6 requests
- `wp_performance_stats` at uptime `1h 10m`: `averageResponseTime: 486ms` over 5 requests (different session)
- `cacheHitRate: 0.0%` at both samples

Some of this is unavoidable — every MCP call ultimately hits a remote WordPress REST endpoint over TLS. But the **0% cache hit rate** suggests the cache is never warming, which compounds the latency. And `wp_cache_warm` hangs (D3), which is probably *why* the cache is cold.

**Action for Claude Code:**
- Fix D3 first — once `wp_cache_warm` works, the hit rate should climb naturally on the second call to any cacheable tool.
- Add a synthetic warm-up on server startup for the most commonly-called read tools (`wp_list_posts`, `wp_get_site_settings`, `wp_get_current_user`).
- Reset the performance counters to per-session rather than session-wide if the latter is misleading the alert thresholds.

---

### 🟡 D7 — Alert spam: five identical "Low cache hit rate" warnings

**Severity:** Low (signal-to-noise)

**Evidence:** `wp_performance_alerts` returned 5 alerts, all identical except for the timestamp:

```
1777467730291  13:02:10.291  warning  cache  Low cache hit rate: 0%
1777470183131  13:43:03.131  warning  cache  Low cache hit rate: 0%
1777470184012  13:43:04.012  warning  cache  Low cache hit rate: 0%   (881ms after the previous!)
1777471583873  14:06:23.873  warning  cache  Low cache hit rate: 0%
1777471584696  14:06:24.696  warning  cache  Low cache hit rate: 0%   (823ms after the previous!)
```

Two pairs are <1 second apart — clearly the alert system is firing on every tool call rather than once per condition.

**Action for Claude Code:**
- Add deduplication to the alert generator: same `(metric, severity, value-bucket)` should not produce a new alert within a cooldown window (e.g. 15 minutes) — only update the existing alert's `lastSeen` timestamp.
- Consider an "alert resolved" state when `cacheHitRate` recovers above the threshold, rather than just appending forever.

---

### 🟡 D8 — UTF-8 / Latin-1 encoding bug in tool output

**Severity:** Medium (data integrity in SEO outputs)

**Evidence from `wp_seo_test_integration`:**
```
"Ziran Quan è‡ªç„¶æ‹³ — Natural Boxing"
"Yan Shou Gong å»¶å£½åŠŸ"
```

These should be the Chinese characters `自然拳` and `延寿功`. The pattern `è‡ªç„¶æ‹³` is the unmistakable signature of UTF-8 bytes being decoded as Latin-1 (Windows-1252). Same artifact appears in `wp_list_posts` output for the same titles.

**Action for Claude Code:**
- Audit the HTTP client config for the WordPress REST API calls. Likely the response body is being decoded with the wrong charset somewhere — `axios` / `node-fetch` / `undici` need explicit `charset=utf-8` handling, or the response is being read via `Buffer.toString()` without specifying encoding.
- Add a regression test with a post containing CJK characters.

---

### 🟢 D9 — Open Graph fields contain raw HTML tags

**Severity:** Low (data quality, but visible to end-users via social shares)

**Evidence from `wp_seo_test_integration`:**
```json
"openGraph": {
  "description": "<p>A synthesis of Master Yap...</p>\n"
}
```

The post excerpt is being passed through to the Open Graph description verbatim, including `<p>` tags and trailing newline. Facebook/Twitter will render this as literal text including the tags.

**Action for Claude Code:**
- In whatever code populates `openGraph.description`, run the source through a strip-tags + entity-decode pass before assigning. Standard recipe: `striptags(decode(input)).trim().slice(0, 160)`.
- Same fix applies to `twitter.description` (currently null in the test, but presumably uses the same source).

---

### 🟢 D10 — Cache stats `total_entries` non-monotonic

**Severity:** Low (probably benign, worth a glance)

**Evidence:**
- One `wp_cache_stats` call: `total_entries: 5`, `misses: 5`
- Later call (same session, no clear): `total_entries: 2`, `misses: 4`

The number of entries went *down* without an explicit clear, with `evictions: 0`. Either entries are being silently invalidated by the 22 invalidation rules, or the counter is bugged.

**Action for Claude Code:**
- Add evictions-by-rule counter to `wp_cache_stats` so users can see *why* entries disappeared.

---

## Out-of-scope observations (not WordPress MCP defects, but context)

- **Filesystem MCP server is intermittently hanging** in this Claude Desktop install — `Filesystem:list_allowed_directories` timed out at 4 min during this session, but a direct `read_text_file` worked. Worth a separate diagnostic on that connector.
- **Shutdown logging is noisy** — every shutdown emits ~6 lines like `Client transport closed` / `Server transport closed` / `Shutting down server...` in close succession. Functional, just verbose.

---

## Recommendations for Claude Code (prioritized)

1. **Fix D1 first** — version reporting integrity is a cheap, high-value fix and unblocks user trust.
2. **Then D3** — broken tools are the most user-visible failure. Add the "tool call received" log line as part of this work.
3. **Then D2** — quick UX win once D3's logging is in place.
4. **Then D8** — data correctness, easy fix once located.
5. **D5 + D6 together** — handshake caching + cache warmup will both move the perf needle.
6. **D4, D7, D9, D10** — polish, address opportunistically.

### Suggested PR breakdown

| PR | Scope | Touches |
|---|---|---|
| 1 | Version source-of-truth | `package.json`, `src/tools/version.ts`, `src/server.ts` |
| 2 | Tool handler entry logging + `wp_cache_info` / `wp_cache_warm` fix | `src/tools/cache/*`, `src/middleware/logging.ts` |
| 3 | Auth status freshness | `src/auth/AuthManager.ts`, `src/tools/auth/*` |
| 4 | UTF-8 client config + CJK regression test | HTTP client setup, tests |
| 5 | `tools/list` cache + perf hardening | server bootstrap |
| 6 | Alert deduplication + Open Graph sanitization | monitoring + SEO modules |

---

## Verification (after fixes)

For each defect, the verification call(s) Claude Code should run before closing the issue:

| Defect | Verify with |
|---|---|
| D1 | `wp_check_version` → version === `serverInfo.version` from `initialize` log |
| D2 | `wp_get_auth_status` → `wp_test_auth` → `wp_get_auth_status` — second call reports `Authenticated: ✅` |
| D3 | `wp_cache_info` returns within 5s; `wp_cache_warm` returns within 30s with a result |
| D4 | New session — log shows exactly one `Initializing server...` + one `Server started` line |
| D5 | New session — `initialize` round-trip < 1s |
| D6 | After warm cache, `wp_performance_stats` shows `averageResponseTime < 200ms` and `cacheHitRate > 70%` |
| D7 | Trigger same condition twice in 5 minutes → only one alert in `wp_performance_alerts` |
| D8 | `wp_list_posts` on a post titled with CJK characters returns them correctly |

---

## Appendix A — raw evidence pointers

- Server log: `~/Library/Logs/Claude/mcp-server-WordPress MCP Server.log`
- Log window analyzed: 2026-04-24 18:36 UTC → 2026-04-29 14:14 UTC (last 200 lines)
- Most recent server start before testing: `2026-04-29T13:02:04.642Z`
- Client identifier in handshake: `claude-ai 0.1.0`
- Protocol version: `2025-11-25`

## Appendix B — tools confirmed working in this session

`wp_check_version`, `wp_get_auth_status`, `wp_test_auth`, `wp_cache_stats`, `wp_performance_stats`, `wp_performance_alerts`, `wp_list_posts`, `wp_seo_test_integration`

## Appendix C — tools confirmed broken in this session

`wp_cache_info` (hang), `wp_cache_warm` (hang)

— *End of report* —
