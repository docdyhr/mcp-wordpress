# mcp-wordpress v3.1.24 — Post-Fix Live Test Report

**Audience:** Claude Code (work in repo root of `mcp-wordpress`)
**Reporter:** Claude (claude.ai), exercising the live MCP server
**Date:** 2026-04-29 19:31 CEST
**Site under test:** `https://dyhr.com` (single-site config, app-password, role: editor)
**Server uptime at test:** 20m 19s · **Total requests:** 17 · **Error rate:** 0.00%

---

## TL;DR

v3.1.24 fixed the prior diagnostic-report issues. Auth, REST CRUD reads, and SEO integration are all green. **Two tools have a hard regression: they hang indefinitely (>4 min MCP client timeout) instead of returning or erroring:**

1. `wp_cache_info`
2. `wp_performance_benchmark`

Neither tool crashes the server — sibling tools in the same module continue to respond. This is a stuck-promise / missing-timeout pattern, not a global failure. **Priority: P1**, blocking the v3.1.24 release as "ship-ready" because both tools are user-facing diagnostic surfaces.

---

## Test matrix

| Tool | Result | Latency | Notes |
|---|---|---|---|
| `wp_check_version` | ✅ | <1s | Reports v3.1.24 = latest |
| `wp_get_auth_status` | ✅ | <1s | app-password, user `claude_desktop`, role `editor` |
| `wp_test_auth` | ✅ | ~200ms | End-to-end DNS+TLS+HTTP+auth OK |
| `wp_seo_test_integration` | ✅ | ~1s | Read+write metadata OK; no SEO plugin detected (expected) |
| `wp_list_posts` (per_page=5) | ✅ | ~300ms | Enriched payload with categories, tags, excerpts |
| `wp_list_pages` (per_page=5) | ✅ | ~250ms | Returned 1 page |
| `wp_list_comments` | ✅ | ~300ms | Returned 10 approved comments |
| `wp_performance_stats` | ✅ | ~150ms | See raw data §3 |
| `wp_performance_alerts` | ✅ | ~150ms | 2 warnings, both "Low cache hit rate: 0%" |
| **`wp_cache_info`** | ❌ **HANG** | >240s timeout | No response, no error, no log line on the client side |
| **`wp_performance_benchmark`** | ❌ **HANG** | >240s timeout | Same symptom |

---

## §1 — Hang #1: `wp_cache_info`

### Symptom
Tool call dispatched with no `site` argument (single-site config) returns nothing; client times out at 240s. Server stays responsive on subsequent calls — confirms localized hang, not a crash.

### Hypothesis (most likely → least likely)
1. **Awaiting a Redis/cache-backend handle that was never connected.** When `CACHE_REDIS_URL` is unset, the handler likely calls `await client.info()` on a stub or undefined client and never resolves. No `Promise.race`/timeout guard.
2. **Sync read of cache config that touches the filesystem on a path that doesn't exist** (e.g. trying to stat a Redis socket that isn't there).
3. **Recursive promise chain** waiting on cache subsystem boot that completes only on first cache read — not triggered until `wp_cache_info` itself runs.

### Where to look (Claude Code: start here)
```
src/tools/cache/info.ts          # the handler — primary suspect
src/cache/manager.ts             # cache abstraction; check getInfo() / describe()
src/cache/redis.ts               # Redis adapter — does it short-circuit when disabled?
src/cache/memory.ts              # in-memory adapter — is getInfo() implemented?
```
Filename guesses follow the project's convention (`src/tools/<group>/<name>.ts`). Adjust if the layout differs.

### Reproduction
```bash
# In a terminal connected to the running server
npx mcp-wordpress wp_cache_info
# or via the test harness
npm run test:integration -- --grep "wp_cache_info"
```
Expected: returns a status object within ~200ms. Actual: hangs.

### Suggested fix (in priority order)

**Fix A — wrap with timeout (mandatory, defensive):**
```ts
// src/tools/cache/info.ts
const TIMEOUT_MS = 5_000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function handleCacheInfo(args: CacheInfoArgs) {
  try {
    const info = await withTimeout(cache.getInfo(args.site), TIMEOUT_MS, "cache.getInfo");
    return formatInfoResponse(info);
  } catch (err) {
    return {
      backend: "unknown",
      status: "unavailable",
      error: err instanceof Error ? err.message : String(err),
      hint: "Check CACHE_BACKEND env var and adapter availability.",
    };
  }
}
```

**Fix B — handle the "no backend configured" case explicitly:**
```ts
// src/cache/manager.ts
export async function getInfo(site?: string): Promise<CacheInfo> {
  if (!this.adapter) {
    return {
      backend: "none",
      status: "disabled",
      hits: 0,
      misses: 0,
      message: "No cache backend configured. Set CACHE_BACKEND=memory|redis to enable.",
    };
  }
  return this.adapter.getInfo(site);
}
```

**Fix C — emit a log line on entry/exit of cache handlers** so future hangs are diagnosable from the log alone:
```ts
logger.debug({ tool: "wp_cache_info", site }, "cache info: enter");
// ... handler ...
logger.debug({ tool: "wp_cache_info", site, durationMs }, "cache info: exit");
```

### Verification
After the patch, this should return in <500ms with either real cache info or the "disabled" payload — never hang:
```bash
npx mcp-wordpress wp_cache_info
```
Add an integration test that fails if the call exceeds 1s.

---

## §2 — Hang #2: `wp_performance_benchmark`

### Symptom
Same as §1: dispatched with `category=all`, `includeRecommendations=true`. Hangs >240s, no response, no log signal client-side. Server remains responsive.

### Hypothesis
- Benchmark code likely runs a synchronous loop that calls into the cache module (which itself may be in the broken state seen in §1) — so this hang may be **downstream of §1**.
- Alternatively: benchmark fetches reference values from a remote endpoint without a fetch timeout. If the endpoint is unreachable, it stalls forever.

### Where to look
```
src/tools/performance/benchmark.ts
src/performance/benchmark.ts          # the benchmarking engine
src/performance/baselines.ts          # any external baseline source
```

### Diagnostic question for Claude Code
**Run this first before patching:** does `benchmark.ts` call into `cache.getInfo()` / `cache.stats()` internally? If yes, fixing §1 may resolve §2 automatically. Confirm with:
```bash
grep -rn "getInfo\|cacheInfo\|cache\.stats" src/tools/performance src/performance
```

### Suggested fix
- Apply the same `withTimeout` guard pattern from §1 to every external call in the benchmark pipeline.
- If `fetch` is used to retrieve baselines, add `AbortController` with a 3s timeout.
- Add a per-stage progress logger so a future hang shows up as "stuck at stage X".

### Verification
```bash
npx mcp-wordpress wp_performance_benchmark --category all
# Expected: returns within 3s, or returns partial results with a "stage_failed" marker.
```

---

## §3 — Live performance data (working tools)

Captured from `wp_performance_stats` mid-test:

```
overallHealth:        Fair
performanceScore:     65
totalRequests:        17
averageResponseTime:  893 ms
p50 / p95 / p99:      1141 / 1366 / 1366 ms
errorRate:            0.00%
cacheHitRate:         0.0%   ← cache is cold, see §4
memoryUsage:          89%   ← worth watching, see §5
uptime:               20m
```

**SLA check:** project target is **<200ms** (per memory: "sub-200ms response times for content analysis"). Current p95 is **1366ms — 6.8× over SLA**. Most of this is dominated by REST round-trips to `dyhr.com` from a cold cache, but the gap is real.

---

## §4 — Cache: 0% hit rate (warning, not a regression)

`wp_performance_alerts` returned 2 warnings, both:
> Low cache hit rate: 0% (threshold: 80%)

This is **expected on a 20-minute-old server with 17 requests** that never repeat the same call signature. Not a v3.1.24 regression. But once §1 is fixed, suggest:

1. Add `wp_cache_warm` to the post-startup hook so the server boots warm.
2. Lower the alert threshold for the first 30 min of uptime, or suppress alerts until at least N=50 requests have been made (avoids false-positive alerts during boot).

---

## §5 — Memory: 89% usage on idle server

System reports 89% memory usage on a 20-min idle server with 17 requests served. Likely:
- Node.js V8 heap reservation looking high relative to available RSS — usually benign.
- Could also be a leaked closure in the cache or performance module — worth a heap snapshot if usage trends up over a longer run.

**Action for Claude Code:** add a startup memory baseline log line and a "growth rate" calculation in `wp_performance_stats`:
```ts
// growth = (currentRss - startupRss) / uptimeHours
// flag if growth > 50MB/hour
```

---

## §6 — Minor: UTF-8 mojibake in post titles

`wp_list_posts` returned titles with broken multi-byte chars:
- Expected: `Ziran Quan 自然拳 — Natural Boxing`
- Actual:   `Ziran Quan è‡ªç„¶æ‹³ â€" Natural Boxing`

Classic double-decoding (UTF-8 read as Latin-1, then re-encoded as UTF-8). May be a Claude Desktop display artifact rather than the MCP server, but worth checking that the server explicitly sets `charset=utf-8` on the response and doesn't decode the WordPress JSON twice.

**Where to look:**
```
src/utils/response-formatter.ts
src/clients/wordpress-rest.ts        # check Content-Type + decoding
```

Quick test:
```bash
curl -s -u "claude_desktop:APP_PASSWORD" \
  "https://dyhr.com/wp-json/wp/v2/posts?per_page=1&search=Ziran" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['title']['rendered'])"
```
If this returns clean UTF-8 but the MCP tool still mojibakes, the bug is in the MCP layer, not WordPress.

---

## §7 — Suggested execution plan for Claude Code

In order — do not parallelize, each step gates the next:

1. **Read** `src/tools/cache/info.ts` and `src/cache/manager.ts`. Confirm or refute the §1 hypothesis.
2. **Patch** §1 with Fix A (mandatory) + Fix B (if root cause matches) + Fix C (always — better observability).
3. **Re-run** integration tests. Confirm `wp_cache_info` returns in <1s.
4. **Investigate** §2: grep for cache calls inside benchmark code. If found, retest after §1 fix before patching.
5. **Patch** §2 with the same timeout pattern. Add per-stage progress logging.
6. **Add regression tests:**
   ```ts
   it("wp_cache_info returns within 1s even with no cache backend", async () => {
     const start = Date.now();
     const result = await callTool("wp_cache_info");
     expect(Date.now() - start).toBeLessThan(1000);
     expect(result).toBeDefined();
   });
   ```
7. **Address §6** mojibake — quick win, isolated to the response formatter.
8. **Bump version** to v3.1.25, update CHANGELOG with the two hang fixes referenced as `fix(cache): timeout wrap on info handler` and `fix(performance): timeout wrap on benchmark`.
9. **Optional follow-ups** (separate PRs): §4 cache warmup hook, §5 memory growth metric.

---

## §8 — What I could not check from this environment

- The local server log at `/Users/thomas/Library/Logs/Claude/mcp-server-WordPress MCP Server.log` — not reachable from claude.ai. Run the **mcp-wordpress-log-analyzer** skill locally:
  ```bash
  python3 ~/.claude/skills/mcp-wordpress-log-analyzer/scripts/analyze_log.py \
    "/Users/thomas/Library/Logs/Claude/mcp-server-WordPress MCP Server.log" \
    --since 1h --tool wp_cache_info
  ```
  This will confirm whether `wp_cache_info` actually entered the handler (debug log) or never made it past the dispatcher.

- Source code itself — file paths above are best-guess based on convention. Claude Code should verify and adjust.

- Did not run write-path tests (`wp_create_post`, `wp_update_post`, `wp_delete_post`) to avoid mutating the live site. Recommend running these against a staging site before tagging v3.1.25.

---

## §9 — Verification checklist before tagging v3.1.25

- [ ] `wp_cache_info` returns in <1s, with or without a cache backend
- [ ] `wp_performance_benchmark` returns in <5s with all categories
- [ ] No new lines added to the error log during a 10-min idle period
- [ ] Integration test added for both timeout regressions
- [ ] Memory usage stable (±5%) over a 30-min soak test
- [ ] UTF-8 round-trip confirmed for a post containing Chinese characters
- [ ] CHANGELOG updated, version bumped, git tag pushed
