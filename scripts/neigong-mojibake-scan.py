#!/usr/bin/env python3
"""
Scan a WordPress site for mojibake-corrupted content and optionally repair it.

Mojibake signature: UTF-8 bytes decoded as cp1252 then re-encoded as UTF-8.
Recovery: surgical char-by-char cp1252→UTF-8 round-trip (handles mixed content).

Usage:
  # Scan only (read-only, safe)
  python3 neigong-mojibake-scan.py --site https://neigong.net

  # Repair — dry run (default, shows what would change)
  python3 neigong-mojibake-scan.py --site https://neigong.net --repair \\
      --report scripts/mojibake-scan-neigong.json

  # Repair — apply changes (WRITES TO WORDPRESS)
  python3 neigong-mojibake-scan.py --site https://neigong.net --repair --apply \\
      --report scripts/mojibake-scan-neigong.json
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

import urllib.request
import urllib.error
import base64


# ---------------------------------------------------------------------------
# Mojibake detection and repair
# ---------------------------------------------------------------------------

_EM_PREFIX = "â€"  # â€  — first two chars of em/en-dash and smart-quote mojibake

# cp1252 has 5 undefined bytes (0x81 0x8D 0x8F 0x90 0x9D). Python's cp1252 codec
# decodes them to the corresponding C1 control chars (U+0081 etc.) but cannot
# encode those control chars back. latin-1 can round-trip all of U+0000–U+00FF,
# so we fall back to latin-1 for those 5 code points.
_CP1252_UNDEF = frozenset("\x81\x8d\x8f\x90\x9d")


def _window_to_bytes(w: str) -> bytes:
    """Encode a small string to cp1252 bytes, using latin-1 for the 5 undefined slots."""
    parts: list[bytes] = []
    for ch in w:
        if ch in _CP1252_UNDEF:
            parts.append(ch.encode("latin-1"))
        else:
            parts.append(ch.encode("cp1252"))  # raises UnicodeEncodeError if not in cp1252
    return b"".join(parts)


def surgical_repair(s: str) -> str:
    """
    Repair mojibake char by char.

    For each position, try to decode a 4-, 3-, or 2-char window by encoding it
    to cp1252 bytes (with latin-1 fallback for the 5 undefined cp1252 slots) and
    decoding those bytes as UTF-8.  If the result is a single non-ASCII char,
    use it; otherwise keep the original char and advance by 1.

    This handles mixed content where some chars are already correct and only
    isolated windows are mojibake.
    """
    result = []
    i = 0
    n = len(s)
    while i < n:
        repaired = False
        for width in (4, 3, 2):
            if i + width <= n:
                w = s[i : i + width]
                try:
                    b = _window_to_bytes(w)
                    c = b.decode("utf-8", errors="strict")
                    if len(c) == 1 and ord(c) > 0x7F and "â€" not in c:
                        result.append(c)
                        i += width
                        repaired = True
                        break
                except (UnicodeEncodeError, UnicodeDecodeError):
                    pass
        if not repaired:
            result.append(s[i])
            i += 1
    return "".join(result)


def is_mojibake(s: str) -> bool:
    """Return True if s likely contains mojibake sequences."""
    if not s:
        return False
    # Fast path: â€ prefix is a reliable marker for punctuation/dash mojibake
    if _EM_PREFIX in s:
        return True
    # Scan for any 2-3 char window that encodes as cp1252 bytes and decodes
    # back as UTF-8 to a single non-ASCII char. Correct non-ASCII chars
    # (CJK, etc.) can't be encoded as cp1252, so they won't trigger this.
    for i in range(len(s)):
        for width in (3, 2):
            if i + width <= len(s):
                w = s[i : i + width]
                try:
                    c = w.encode("cp1252").decode("utf-8", errors="strict")
                    if len(c) == 1 and ord(c) > 0x7F:
                        return True
                except (UnicodeEncodeError, UnicodeDecodeError):
                    pass
    return False


def strip_html(s: str) -> str:
    """Remove HTML tags for preview."""
    return re.sub(r"<[^>]+>", "", s)


# ---------------------------------------------------------------------------
# WordPress REST API client
# ---------------------------------------------------------------------------


class WPClient:
    def __init__(self, site_url: str, username: str, password: str):
        self.base = site_url.rstrip("/")
        creds = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.auth_header = f"Basic {creds}"

    def get(self, endpoint: str, params: dict | None = None) -> list | dict:
        url = f"{self.base}/wp-json{endpoint}"
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{qs}"
        req = urllib.request.Request(
            url,
            headers={"Authorization": self.auth_header, "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def patch(self, endpoint: str, data: dict) -> dict:
        url = f"{self.base}/wp-json{endpoint}"
        body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="PATCH",
            headers={
                "Authorization": self.auth_header,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

# We scan and repair the raw stored values, not the HTML-rendered versions.
FIELDS_TO_CHECK: dict[str, list[tuple[str, str]]] = {
    "posts": [("title", "raw"), ("excerpt", "raw"), ("content", "raw")],
    "pages": [("title", "raw"), ("excerpt", "raw"), ("content", "raw")],
}


def scan_post_type(
    client: WPClient, post_type: str, status: str, verbose: bool
) -> list[dict]:
    """Return a list of mojibake hit records for this post type."""
    hits = []
    page = 1
    per_page = 50

    while True:
        params: dict[str, str | int] = {
            "per_page": per_page,
            "page": page,
            "status": status,
            "context": "edit",
            "_fields": "id,slug,link,status,modified,title,excerpt,content",
        }
        try:
            items = client.get(f"/wp/v2/{post_type}", params)
        except urllib.error.HTTPError as e:
            if e.code == 400 and page > 1:
                break
            print(f"  [ERROR] {post_type} page {page}: HTTP {e.code}", file=sys.stderr)
            break

        if not isinstance(items, list) or not items:
            break

        for item in items:
            item_hits: dict[str, dict] = {}
            for field, subfield in FIELDS_TO_CHECK.get(post_type, [("title", "raw")]):
                raw_field = item.get(field, {})
                text: str = (
                    raw_field.get(subfield, "")
                    if isinstance(raw_field, dict)
                    else str(raw_field)
                )
                if not is_mojibake(text):
                    continue
                repaired = surgical_repair(text)
                item_hits[f"{field}.{subfield}"] = {
                    "corrupted_preview": strip_html(text)[:200],
                    "repaired_preview": strip_html(repaired)[:200],
                    "changed": repaired != text,
                }

            if item_hits:
                hits.append(
                    {
                        "id": item["id"],
                        "slug": item.get("slug", ""),
                        "link": item.get("link", ""),
                        "status": item.get("status", ""),
                        "modified": item.get("modified", ""),
                        "post_type": post_type,
                        "fields": item_hits,
                    }
                )
                slug = item.get("slug", "")[:50]
                print(
                    f"  [HIT] {post_type} #{item['id']}  {item.get('status', '')}  {slug}",
                    file=sys.stderr,
                )
            elif verbose:
                print(
                    f"  [OK]  {post_type} #{item['id']}  {item.get('slug', '')[:50]}",
                    file=sys.stderr,
                )

        if len(items) < per_page:
            break
        page += 1
        time.sleep(0.2)

    return hits


def scan(
    site_url: str,
    username: str,
    password: str,
    types: list[str],
    status: str,
    verbose: bool,
) -> dict:
    client = WPClient(site_url, username, password)
    all_hits: list[dict] = []

    for post_type in types:
        print(f"\nScanning {post_type} (status={status})…", file=sys.stderr)
        hits = scan_post_type(client, post_type, status, verbose)
        all_hits.extend(hits)
        print(f"  → {len(hits)} mojibake hits in {post_type}", file=sys.stderr)

    return {
        "site": site_url,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "status_filter": status,
        "types": types,
        "hits": all_hits,
    }


# ---------------------------------------------------------------------------
# Repair
# ---------------------------------------------------------------------------


def repair(
    site_url: str,
    username: str,
    password: str,
    report: dict,
    apply: bool,
) -> None:
    client = WPClient(site_url, username, password)
    hits: list[dict] = report.get("hits", [])

    if not hits:
        print("No mojibake found — nothing to repair.")
        return

    mode = "APPLYING" if apply else "DRY RUN"
    print(f"\n[{mode}] Repairing {len(hits)} posts…\n")

    repaired_count = 0
    skipped_count = 0
    no_change_count = 0

    for hit in hits:
        post_id = hit["id"]
        post_type = hit["post_type"]
        slug = hit.get("slug", "")[:50]

        # Fetch live raw content (scan report may be stale)
        try:
            raw = client.get(
                f"/wp/v2/{post_type}/{post_id}",
                {"context": "edit", "_fields": "id,title,excerpt,content"},
            )
        except Exception as e:
            print(f"  [SKIP] #{post_id} {slug} — fetch failed: {e}")
            skipped_count += 1
            continue

        payload: dict[str, str] = {}
        any_change = False

        for field_key in hit["fields"]:
            field, subfield = field_key.split(".", 1)
            raw_field = raw.get(field, {})
            text: str = (
                raw_field.get(subfield, "")
                if isinstance(raw_field, dict)
                else str(raw_field)
            )
            if not is_mojibake(text):
                continue
            repaired = surgical_repair(text)
            if repaired == text:
                continue
            payload[field] = repaired
            any_change = True
            print(
                f"  [{post_id}] {field}: {strip_html(text)[:70]!r}\n"
                f"           → {strip_html(repaired)[:70]!r}"
            )

        if not any_change:
            no_change_count += 1
            continue

        if apply:
            try:
                client.patch(f"/wp/v2/{post_type}/{post_id}", payload)
                print(f"  [DONE] #{post_id} {slug}")
                repaired_count += 1
            except Exception as e:
                print(f"  [FAIL] #{post_id} {slug} — {e}")
                skipped_count += 1
        else:
            print(f"  [DRY]  #{post_id} {slug} — would write: {list(payload.keys())}")
            repaired_count += 1

    action = "repaired" if apply else "would repair"
    print(
        f"\nDone. {action}: {repaired_count}, "
        f"no change needed: {no_change_count}, "
        f"errors: {skipped_count}"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan (and optionally repair) WordPress mojibake"
    )
    parser.add_argument("--site", required=True, help="WordPress site URL")
    parser.add_argument(
        "--user",
        default=os.environ.get("WP_USER", ""),
        help="WordPress username",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("WP_APP_PASSWORD", ""),
        help="App password",
    )
    parser.add_argument(
        "--types", default="posts,pages", help="Comma-separated post types"
    )
    parser.add_argument(
        "--status", default="any", help="Post status filter (any, publish, draft, …)"
    )
    parser.add_argument("--repair", action="store_true", help="Run repair after scan")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually write repairs (default is dry-run)",
    )
    parser.add_argument(
        "--report",
        default="",
        help="Existing scan report JSON to load for repair (skips re-scan)",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Show all posts, not just hits"
    )
    parser.add_argument(
        "--output",
        default="",
        help="Write JSON report to this file (default: auto-named)",
    )
    args = parser.parse_args()

    if not args.user or not args.password:
        print(
            "Error: --user and --password (or WP_USER / WP_APP_PASSWORD env vars) required.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Load existing report or run a fresh scan
    if args.report:
        with open(args.report) as f:
            report = json.load(f)
        print(f"Loaded report: {args.report}", file=sys.stderr)
    else:
        types = [t.strip() for t in args.types.split(",")]
        report = scan(args.site, args.user, args.password, types, args.status, args.verbose)

        out_path = args.output or (
            f"mojibake-scan-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        )
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"\nReport written to: {out_path}", file=sys.stderr)

    hits = report.get("hits", [])
    print(f"\n{'='*60}", file=sys.stderr)
    print(f"Mojibake hits: {len(hits)}", file=sys.stderr)
    for h in hits[:20]:
        print(f"  #{h['id']} [{h['post_type']}] {h.get('slug','')[:50]}", file=sys.stderr)
        for fk, fi in h["fields"].items():
            print(f"    {fk}: {fi['corrupted_preview'][:60]!r}", file=sys.stderr)
    if len(hits) > 20:
        print(f"  … and {len(hits) - 20} more", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    if args.repair:
        repair(args.site, args.user, args.password, report, apply=args.apply)

    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
