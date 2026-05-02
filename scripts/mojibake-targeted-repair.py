#!/usr/bin/env python3
"""
Targeted repair for posts where revision-based restore couldn't recover content.

All repairs are derived from the scan file's corrupted_preview (the original
mojibake form captured before the repair ran).

Usage:
  python3 scripts/mojibake-targeted-repair.py         # dry run
  python3 scripts/mojibake-targeted-repair.py --apply  # write to WordPress
"""

import argparse
import base64
import json
import sys
import urllib.request
import urllib.error


# ---------------------------------------------------------------------------
# REST client
# ---------------------------------------------------------------------------

class WPClient:
    def __init__(self, site_url: str, username: str, password: str):
        self.base = site_url.rstrip("/")
        creds = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.auth_header = f"Basic {creds}"

    def get(self, endpoint: str, params: dict | None = None) -> dict:
        url = f"{self.base}/wp-json{endpoint}"
        if params:
            url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
        req = urllib.request.Request(
            url, headers={"Authorization": self.auth_header, "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))

    def patch(self, endpoint: str, data: dict) -> dict:
        url = f"{self.base}/wp-json{endpoint}"
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url, data=body, method="PATCH",
            headers={
                "Authorization": self.auth_header,
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Mojibake inverse: repaired Unicode → original cp1252-encoded mojibake
# ---------------------------------------------------------------------------

def can_store_in_cp1252(ch: str) -> bool:
    """MySQL latin1 = cp1252 — return True if MySQL can store this char."""
    try:
        ch.encode("cp1252")
        return True
    except (UnicodeEncodeError, ValueError):
        return False


def to_mojibake(unicode_text: str) -> str:
    """
    Convert repaired Unicode text back to the mojibake form that MySQL can store.

    Chars already in cp1252 range are kept as-is.
    Chars outside cp1252 (e.g., CJK) are re-encoded: UTF-8 bytes → decoded as cp1252.
    """
    result = []
    for ch in unicode_text:
        if ord(ch) <= 0x7F or can_store_in_cp1252(ch):
            result.append(ch)
        else:
            # Inverse repair: encode to UTF-8, decode each byte as cp1252
            for b in ch.encode("utf-8"):
                try:
                    result.append(bytes([b]).decode("cp1252"))
                except (UnicodeDecodeError, ValueError):
                    result.append(chr(b))  # Fallback for undefined cp1252 slots
    return "".join(result)


def get_raw(field: dict | str, subfield: str = "raw") -> str:
    if isinstance(field, dict):
        return field.get(subfield, field.get("rendered", "")) or ""
    return str(field) if field else ""


# ---------------------------------------------------------------------------
# Context-aware targeted replacement
# ---------------------------------------------------------------------------

def context_replace(text: str, prefix: str, damaged: str, mojibake: str, suffix: str) -> str:
    """
    Replace `prefix + damaged + suffix` with `prefix + mojibake + suffix` in text.
    Returns the modified text (unchanged if pattern not found).
    """
    needle = prefix + damaged + suffix
    replacement = prefix + mojibake + suffix
    return text.replace(needle, replacement)


def apply_targeted(text: str, replacements: list) -> str:
    """Apply a list of (prefix, damaged, mojibake, suffix) replacements."""
    for prefix, damaged, mojibake, suffix in replacements:
        text = context_replace(text, prefix, damaged, mojibake, suffix)
    return text


# ---------------------------------------------------------------------------
# Post repair specifications
# Each field uses either:
#   ("full",     mojibake_value)   — replace the ENTIRE field
#   ("targeted", [(prefix, damaged, mojibake, suffix), ...])  — context replacements
# ---------------------------------------------------------------------------

def build_repairs() -> dict:
    """Build the repair specifications with dynamically computed mojibake values."""

    # Mojibake for 举手投足 (from scan corrupted_preview: 'Ju Shou Tou Zu (ä¸¾æ‰‹æŠ•è¶³)')
    jsstz = to_mojibake("举手投足")
    assert jsstz == "ä¸¾æ‰‹æŠ•è¶³", f"举手投足 mojibake mismatch: {repr(jsstz)}"

    # Mojibake for 太極拳論 (from scan corrupted_preview: 'The Treatise on Tai Chi Chuan (å¤ªæ¥µæ‹³è«–)')
    tjql = to_mojibake("太極拳論")
    assert tjql == "å¤ªæ¥µæ‹³è«–", f"太極拳論 mojibake mismatch: {repr(tjql)}"

    # Mojibake for 王懷湘 (from scan corrupted_preview: '...Howard Huai Hsiang Wang (çŽ‹æ‡·æ¹˜)...')
    whx = to_mojibake("王懷湘")
    assert whx == "çŽ‹æ‡·æ¹˜", f"王懷湘 mojibake mismatch: {repr(whx)}"

    # Mojibake for 武当山 and 武術 (from scan corrupted_preview)
    wds = to_mojibake("武当山")
    wsx = to_mojibake("武術")

    # Mojibake for 馬岳樑 and ǎ (from scan corrupted_preview: 'é¦¬å²³æ¨' and 'ÇŽ')
    myl = to_mojibake("馬岳樑")
    a_caron = to_mojibake("ǎ")

    return {
        # Post #1813: Ju Shou Tou Zu (举手投足)
        # Only the title was in the scan as reversible=True; excerpt and content
        # also have ???? but they come from the same "举手投足" pattern
        1813: {
            "title": ("full", f"Ju Shou Tou Zu ({jsstz})"),
            "excerpt": ("targeted", [("Tou Zu (", "????", jsstz, ")")]),
            "content": ("targeted", [("Tou Zu (", "????", jsstz, ")")]),
        },

        # Post #1824: The Treatise on Tai Chi Chuan (太極拳論)
        # Only the title was repaired by us; the content's ???? is PRE-EXISTING
        1824: {
            "title": ("full", f"The Treatise on Tai Chi Chuan ({tjql})"),
        },

        # Post #1849 (draft): Wang (王懷湘) in excerpt
        1849: {
            "excerpt": ("targeted", [("Hsiang Wang (", "???", whx, ")")]),
        },

        # Post #179: Wudang Gong Fu — repeated 武当山/武術 pattern
        179: {
            "excerpt": ("targeted", [
                ("Wudang Wushu ", "???", wds, " "),
                (wds + " ", "??", wsx, " "),
            ]),
            "content": ("targeted", [
                ("Wudang Wushu ", "???", wds, " "),
                (wds + " ", "??", wsx, " "),
            ]),
        },

        # Post #115: Ma Yueh-liang — 馬岳樑 and Mǎ
        115: {
            "excerpt": ("targeted", [
                ("(Chinese: ", "???", myl, ";"),
                ("M", "?", a_caron, " Yuèliáng"),
            ]),
            "content": ("targeted", [
                ("(Chinese: ", "???", myl, ";"),
                ("M", "?", a_caron, " Yuèliáng"),
            ]),
        },
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def repair_post(
    client: WPClient,
    post_id: int,
    field_repairs: dict,
    apply: bool,
    verbose: bool,
) -> str:
    """Returns 'repaired', 'no_change', or 'error'."""
    try:
        post = client.get(
            f"/wp/v2/posts/{post_id}",
            {"context": "edit", "_fields": "id,title,excerpt,content,status"},
        )
    except Exception as e:
        print(f"  [ERROR] #{post_id}: fetch failed: {e}")
        return "error"

    print(f"\n--- Post #{post_id} slug={post.get('slug','?')[:40]} (status={post.get('status', '?')}) ---")

    payload: dict[str, str] = {}

    for field_name, (strategy, spec) in field_repairs.items():
        current = get_raw(post.get(field_name, {}))

        if strategy == "full":
            mojibake_val = spec
            if current.strip() == mojibake_val.strip():
                print(f"  {field_name}: already correct")
                continue
            if "?" not in current:
                print(f"  {field_name}: no ??? found, skip")
                continue
            print(f"  {field_name} [FULL]:")
            print(f"    was: {repr(current[:80])}")
            print(f"    now: {repr(mojibake_val[:80])}")
            payload[field_name] = mojibake_val

        elif strategy == "targeted":
            replacements = spec
            new_text = apply_targeted(current, replacements)
            if new_text == current:
                print(f"  {field_name}: pattern not matched in current content (skip)")
                if verbose:
                    print(f"    content sample: {repr(current[:100])}")
                continue
            print(f"  {field_name} [TARGETED]: changes applied")
            if verbose:
                print(f"    before: {repr(current[:120])}")
                print(f"    after:  {repr(new_text[:120])}")
            payload[field_name] = new_text

    if not payload:
        print(f"  No changes needed")
        return "no_change"

    if apply:
        try:
            result = client.patch(f"/wp/v2/posts/{post_id}", payload)
            print(f"  [DONE] patched {list(payload.keys())}")
            if "title" in result:
                print(f"    title now: {repr(get_raw(result['title'])[:80])}")
            return "repaired"
        except Exception as e:
            print(f"  [FAIL] PATCH failed: {e}")
            return "error"
    else:
        print(f"  [DRY] would patch {list(payload.keys())}")
        return "repaired"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", required=True, help="WordPress site URL")
    parser.add_argument("--user", required=True, help="WordPress username")
    parser.add_argument("--password", required=True, help="WordPress application password")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    mode = "APPLYING" if args.apply else "DRY RUN"
    print(f"\n[{mode}] Targeted mojibake repair on {args.site}")

    try:
        repairs = build_repairs()
    except AssertionError as e:
        print(f"ASSERTION FAILED: {e}")
        sys.exit(1)

    print(f"\nRepair specs built OK. Processing {len(repairs)} posts...")

    client = WPClient(args.site, args.user, args.password)
    counts: dict[str, int] = {}

    for post_id, field_repairs in repairs.items():
        result = repair_post(client, post_id, field_repairs, args.apply, args.verbose)
        counts[result] = counts.get(result, 0) + 1

    print(f"\n{'='*60}")
    action = "Repaired" if args.apply else "Would repair"
    print(f"{action}: {counts.get('repaired', 0)}")
    print(f"No change needed: {counts.get('no_change', 0)}")
    print(f"Errors: {counts.get('error', 0)}")

    print()
    print("Posts/fields that could NOT be auto-recovered:")
    print("  #184 content  — 169 ??? groups, 25KB: too complex, needs DB backup or web archive")
    print("  #191 content  — 3 ??? groups: needs original content to identify CJK chars")
    print("  #904 content  — 31 ??? groups, 25KB: needs DB backup or web archive")
    print("  #1824 content — '???? by ???' may be PRE-EXISTING (not from our repair)")
    print("  #1849 content — draft, complex content")
    print()
    print("Site title 'å…§åŠŸ Neigong.net' still shows as mojibake.")
    print("  → Fix: WordPress Admin → Settings → General → Site Title")
    print("  → Correct value: 內功 Neigong.net")


if __name__ == "__main__":
    main()
