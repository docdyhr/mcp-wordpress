#!/usr/bin/env python3
"""
Restore WordPress posts to their pre-repair mojibake state using revisions.

The repair script wrote proper Unicode CJK to WordPress, but MySQL stored ???
because the columns use latin1 charset (storing raw UTF-8 bytes). This script
finds the revision from before the repair and restores the original content.

Usage:
  # Dry run - show what would be restored (safe, read-only)
  python3 scripts/mojibake-restore.py --site https://example.com \\
      --user YOUR_USER --password 'xxxx xxxx xxxx xxxx' \\
      --before 2026-05-01T09:00:00

  # Actually restore (WRITES TO WORDPRESS)
  python3 scripts/mojibake-restore.py --site https://example.com \\
      --user YOUR_USER --password 'xxxx xxxx xxxx xxxx' \\
      --before 2026-05-01T09:00:00 --apply --ids 1859,7,22,27
"""

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# WordPress REST client
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
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="PATCH",
            headers={
                "Authorization": self.auth_header,
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def has_question_marks(text: str) -> bool:
    """Return True if text contains ??? (MySQL charset substitution artifact)."""
    return "???" in text


def get_text(field_dict: dict | str, subfield: str = "raw") -> str:
    if isinstance(field_dict, dict):
        return field_dict.get(subfield, field_dict.get("rendered", "")) or ""
    return str(field_dict) if field_dict else ""


def find_pre_repair_revision(
    client: WPClient,
    post_type: str,
    post_id: int,
    before_dt: datetime,
) -> dict | None:
    """Return the most recent revision whose date is before before_dt."""
    try:
        revs = client.get(
            f"/wp/v2/{post_type}/{post_id}/revisions",
            {"per_page": 20, "_fields": "id,date,title,excerpt,content"},
        )
    except urllib.error.HTTPError as e:
        print(f"  [ERROR] Could not fetch revisions for #{post_id}: HTTP {e.code}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  [ERROR] Could not fetch revisions for #{post_id}: {e}", file=sys.stderr)
        return None

    if not isinstance(revs, list):
        return None

    # Parse revision dates and find most recent one before before_dt
    before_ts = before_dt.timestamp()
    candidates = []
    for rev in revs:
        date_str = rev.get("date", "")
        try:
            # WordPress returns dates in site-local time without timezone
            # Parse as UTC for comparison (we just need relative ordering)
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            candidates.append((dt.timestamp(), rev))
        except ValueError:
            continue

    # Sort by date descending, take most recent before cutoff
    candidates.sort(key=lambda x: x[0], reverse=True)
    for ts, rev in candidates:
        if ts < before_ts:
            return rev

    return None


def has_mojibake_char(text: str) -> bool:
    """Quick check: text contains characters that look like mojibake (non-ASCII < U+0100)."""
    return any(0x80 <= ord(c) <= 0xFF for c in text)


# ---------------------------------------------------------------------------
# Restore single post
# ---------------------------------------------------------------------------

def restore_post(
    client: WPClient,
    post_type: str,
    post_id: int,
    before_dt: datetime,
    apply: bool,
    verbose: bool,
) -> str:
    """
    Returns 'restored', 'skipped', 'no_revision', 'error', or 'no_damage'.
    """
    # Fetch current post
    try:
        current = client.get(
            f"/wp/v2/{post_type}/{post_id}",
            {"context": "edit", "_fields": "id,title,excerpt,content,status"},
        )
    except Exception as e:
        print(f"  [ERROR] #{post_id}: fetch failed: {e}")
        return "error"

    # Check if post actually has ??? damage
    current_title = get_text(current.get("title", {}))
    current_excerpt = get_text(current.get("excerpt", {}))
    current_content = get_text(current.get("content", {}))

    damaged_fields = []
    if has_question_marks(current_title):
        damaged_fields.append("title")
    if has_question_marks(current_excerpt):
        damaged_fields.append("excerpt")
    if has_question_marks(current_content):
        damaged_fields.append("content")

    if not damaged_fields and verbose:
        print(f"  [SKIP]  #{post_id}: no ??? damage found (status={current.get('status', '?')})")
        return "no_damage"
    elif not damaged_fields:
        return "no_damage"

    print(f"  [DMG]   #{post_id} status={current.get('status', '?')} damaged fields: {damaged_fields}")
    if verbose:
        print(f"          title now: {current_title[:80]!r}")

    # Find the pre-repair revision
    rev = find_pre_repair_revision(client, post_type, post_id, before_dt)
    if rev is None:
        print(f"  [NOREV] #{post_id}: no revision found before {before_dt.isoformat()}")
        return "no_revision"

    rev_date = rev.get("date", "?")
    rev_title = get_text(rev.get("title", {}), "rendered")

    if verbose:
        print(f"          revision #{rev['id']} date={rev_date}")
        print(f"          rev title: {rev_title[:80]!r}")

    # Build restore payload from the revision
    payload: dict[str, str] = {}

    if "title" in damaged_fields:
        rev_t = get_text(rev.get("title", {}), "rendered")
        if rev_t and not has_question_marks(rev_t):
            payload["title"] = rev_t
        else:
            print(f"  [WARN]  #{post_id}: revision title also damaged ({rev_t[:40]!r})")

    if "excerpt" in damaged_fields:
        rev_e = get_text(rev.get("excerpt", {}), "rendered")
        if rev_e and not has_question_marks(rev_e):
            payload["excerpt"] = rev_e

    if "content" in damaged_fields:
        rev_c = get_text(rev.get("content", {}), "rendered")
        if rev_c and not has_question_marks(rev_c):
            payload["content"] = rev_c

    if not payload:
        print(f"  [WARN]  #{post_id}: no usable revision content found")
        return "no_revision"

    # Show what we'd restore
    if "title" in payload:
        print(f"  [RESTORE] #{post_id} title: {payload['title'][:80]!r}")

    if apply:
        try:
            result = client.patch(f"/wp/v2/{post_type}/{post_id}", payload)
            restored_title = get_text(result.get("title", {}))
            if has_question_marks(restored_title):
                print(f"  [FAIL]  #{post_id}: still has ??? after restore: {restored_title[:60]!r}")
                return "error"
            print(f"  [DONE]  #{post_id}: → {restored_title[:80]!r}")
            return "restored"
        except Exception as e:
            print(f"  [FAIL]  #{post_id}: PATCH failed: {e}")
            return "error"
    else:
        print(f"  [DRY]   #{post_id}: would restore fields={list(payload.keys())}")
        return "restored"


# ---------------------------------------------------------------------------
# Site title restore
# ---------------------------------------------------------------------------

def restore_site_title(
    client: WPClient,
    before_dt: datetime,
    apply: bool,
) -> None:
    """Check and optionally restore the site blogname/blogdescription."""
    try:
        settings = client.get("/wp/v2/settings")
    except Exception as e:
        print(f"  [ERROR] Could not fetch settings: {e}")
        return

    blogname = settings.get("title", "")
    blogdesc = settings.get("description", "")

    damaged = {}
    if has_question_marks(blogname) or has_mojibake_char(blogname):
        damaged["title"] = blogname
    if has_question_marks(blogdesc) or has_mojibake_char(blogdesc):
        damaged["description"] = blogdesc

    if not damaged:
        print("  Site title/description: OK (no damage detected)")
        return

    for key, val in damaged.items():
        print(f"  Site {key} is damaged: {val!r}")

    print()
    print("  NOTE: Site settings do not have revisions via REST API.")
    print("  You need to manually restore the site title from WordPress admin")
    print("  or provide the correct value with --blogname.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Restore WordPress posts from pre-repair revisions")
    parser.add_argument("--site", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument(
        "--before",
        default="2026-05-01T09:30:00",
        help="ISO datetime cutoff — restore from the revision just before this time",
    )
    parser.add_argument(
        "--ids",
        default="",
        help="Comma-separated post IDs to restore (default: scan all posts for ??? damage)",
    )
    parser.add_argument(
        "--types",
        default="posts,pages",
        help="Post types to scan",
    )
    parser.add_argument("--apply", action="store_true", help="Actually write (default: dry run)")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--blogname", default="", help="Correct site title to set via settings API")
    args = parser.parse_args()

    client = WPClient(args.site, args.user, args.password)
    before_dt = datetime.fromisoformat(args.before).replace(tzinfo=timezone.utc)

    mode = "APPLYING" if args.apply else "DRY RUN"
    print(f"\n[{mode}] Restoring damaged posts on {args.site}")
    print(f"Using revisions before: {before_dt.isoformat()}\n")

    # Determine which post IDs to check
    if args.ids:
        post_ids = [(int(x.strip()), "posts") for x in args.ids.split(",") if x.strip()]
        print(f"Checking {len(post_ids)} specified post IDs\n")
    else:
        # Scan all posts for ??? damage
        post_ids = []
        types = [t.strip() for t in args.types.split(",")]
        for post_type in types:
            print(f"Scanning {post_type} for ??? damage...")
            page = 1
            while True:
                try:
                    items = client.get(
                        f"/wp/v2/{post_type}",
                        {
                            "per_page": 100,
                            "page": page,
                            "status": "any",
                            "context": "edit",
                            "_fields": "id,title",
                        },
                    )
                except urllib.error.HTTPError as e:
                    if e.code == 400:
                        break
                    print(f"  Error fetching {post_type} page {page}: {e}", file=sys.stderr)
                    break
                if not isinstance(items, list) or not items:
                    break
                for item in items:
                    title = get_text(item.get("title", {}))
                    if has_question_marks(title):
                        post_ids.append((item["id"], post_type))
                if len(items) < 100:
                    break
                page += 1
                time.sleep(0.1)
        print(f"Found {len(post_ids)} posts with ??? damage\n")

    # Check site title
    print("--- Site title ---")
    restore_site_title(client, before_dt, args.apply)
    if args.blogname and args.apply:
        try:
            result = client.patch("/wp/v2/settings", {"title": args.blogname})
            print(f"  Site title set to: {result.get('title', '?')!r}")
        except Exception as e:
            print(f"  [ERROR] Could not set site title: {e}")
    print()

    # Restore posts
    print("--- Posts ---")
    counts = {"restored": 0, "no_damage": 0, "no_revision": 0, "error": 0, "skipped": 0}
    for post_id, post_type in post_ids:
        result = restore_post(client, post_type, post_id, before_dt, args.apply, args.verbose)
        counts[result] = counts.get(result, 0) + 1
        time.sleep(0.1)

    print(f"\n{'='*60}")
    action = "Restored" if args.apply else "Would restore"
    print(f"{action}: {counts.get('restored', 0)}")
    print(f"No damage found: {counts.get('no_damage', 0)}")
    print(f"No pre-repair revision: {counts.get('no_revision', 0)}")
    print(f"Errors: {counts.get('error', 0)}")


if __name__ == "__main__":
    main()
