/**
 * Mojibake detection for the MCP WordPress write path.
 *
 * Mojibake: UTF-8 bytes decoded as cp1252, then re-encoded as UTF-8.
 * The guard refuses writes that contain these sequences to protect the DB.
 *
 * Detection strategy (all patterns use Unicode escapes):
 *  1. U+00E2 U+20AC prefix — byte pair 0xE2 0x80 decoded via cp1252:
 *     0xE2 → U+00E2 (â), 0x80 → U+20AC (€ via cp1252).
 *     Prefix of em-dash, en-dash, smart quotes, bullet, ellipsis, etc.
 *     Almost never appears in legitimate text.
 *  2. U+00C3 + (U+00A0–U+00BF) — byte pair 0xC3 + 0xA0-0xBF decoded
 *     via Latin-1. Signature of 2-byte UTF-8 Latin Extended chars.
 *  3. (U+00E0–U+00EF) + two chars from the cp1252 continuation set —
 *     signature of 3-byte UTF-8 CJK and other non-Latin scripts.
 *     The continuation set covers U+00A0-U+00BF (0xA0-0xBF, same in
 *     cp1252 and Latin-1) plus the specific cp1252 mappings for 0x82-0x9F.
 */

// cp1252 continuation-byte chars for the range 0x80-0x9F (excluding the 5
// undefined slots at 0x81 0x8D 0x8F 0x90 0x9D):
//   0x80→€ 0x82→‚ 0x83→ƒ 0x84→„ 0x85→…
//   0x86→† 0x87→‡ 0x88→ˆ 0x89→‰ 0x8a→Š
//   0x8b→‹ 0x8c→Œ 0x8e→Ž 0x91→‘ 0x92→’
//   0x93→“ 0x94→” 0x95→• 0x96→– 0x97→—
//   0x98→˜ 0x99→™ 0x9a→š 0x9b→› 0x9c→œ
//   0x9e→ž 0x9f→Ÿ
const CP1252_CONT_CLASS =
  "[ -¿" + // 0xA0-0xBF = U+00A0-U+00BF (same in cp1252 and Latin-1)
  "€" + // 0x80 → €
  "‚ƒ„…†‡ˆ‰" + // 0x82-0x89
  "Š‹ŒŽ" + // 0x8A-0x8E
  "‘’“”•–—" + // 0x91-0x97
  "˜™š›œžŸ" + // 0x98-0x9F
  "]";

const MOJIBAKE_PATTERNS: readonly RegExp[] = [
  // U+00E2 U+20AC — em-dash / smart-quote family prefix (0xE2 0x80 in cp1252)
  /â€/,
  // U+00C3 + (U+00A0-U+00BF) — 2-byte Latin Extended (e.g. é, ü, ñ)
  /Ã[\xa0-\xbf]/,
  // U+00E0-U+00EF + two cp1252 continuation chars — 3-byte CJK / Cyrillic
  new RegExp(`[à-ï]${CP1252_CONT_CLASS}{2}`),
];

/**
 * Return true if the string contains likely-mojibake byte sequences.
 */
export function isMojibake(s: string): boolean {
  return MOJIBAKE_PATTERNS.some((p) => p.test(s));
}

/**
 * Recursively collect all string values from a plain object / array.
 */
function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

/**
 * Throw if any string in the payload looks like mojibake.
 *
 * Call this before every POST/PUT/PATCH that writes WordPress content.
 * A false positive refuses a write (recoverable). A false negative would
 * corrupt the database (hard to recover). The guard is intentionally strict.
 */
export function assertNoMojibake(payload: unknown, context = "payload"): void {
  const strings = collectStrings(payload);
  for (const s of strings) {
    if (isMojibake(s)) {
      throw new Error(
        `[MOJIBAKE_REFUSED] Outbound ${context} contains likely-mojibake sequences. ` +
          "This usually means a read-side decoding bug fed corrupted text into a write. " +
          "Refusing to protect the database. " +
          `Offending value (first 120 chars): ${JSON.stringify(s.slice(0, 120))}`,
      );
    }
  }
}
