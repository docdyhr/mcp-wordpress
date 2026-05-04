/**
 * Unit tests for the mojibake detection utilities.
 *
 * Covers both positive (clean UTF-8 preserved) and negative (mojibake
 * detected and rejected) cases as required by the v3.1.26 acceptance
 * criteria in the Bear note "v3.1.26 — UTF-8 mojibake: round-trip evidence
 * + repro".
 */

import { describe, it, expect } from "vitest";
import { isMojibake, assertNoMojibake } from "@/utils/mojibake.js";

// ---------------------------------------------------------------------------
// Known-good strings — must NOT be flagged as mojibake
// ---------------------------------------------------------------------------
const CLEAN_STRINGS = [
  // Plain ASCII
  "Natural Boxing",
  // CJK unified ideographs (the canonical test fixture from the Bear note)
  "自然拳",
  "太極答問",
  "動靜無始 變化無端",
  // Em-dash and typographic punctuation
  "Ziran Quan 自然拳 — Natural Boxing: The Hidden Art of Effortless Power",
  "it’s", // right single quotation mark U+2019
  "“hello”", // curly double quotes
  // Latin extended (legitimate, not corrupted)
  "café",
  "naïve",
  "résumé",
  // Mixed CJK + ASCII + punctuation
  "陳微明 by Chen Weiming [1929]",
  // Empty / trivial
  "",
];

// ---------------------------------------------------------------------------
// Known-bad strings — MUST be flagged as mojibake
// ---------------------------------------------------------------------------
// These are produced by: utf-8_bytes.decode('cp1252') for each source string.
const MOJIBAKE_STRINGS = [
  // Source: 自然拳  (E8 87 AA  E7 84 B6  E6 8B B3  via cp1252)
  "è‡\xaaç„\xb6æ‹\xb3",
  // Source: — (em dash, E2 80 94)  →  â + € + ”
  "â€”",
  // Source: é (C3 A9)  →  Ã + ©
  "\xc3\xa9",
  // Longer string containing a mojibake substring
  "Post title: è‡\xaaç„\xb6æ‹\xb3 — Natural Boxing",
  // â€ prefix alone (minimal trigger for pattern 1)
  "â€",
];

// ---------------------------------------------------------------------------
// isMojibake()
// ---------------------------------------------------------------------------
describe("isMojibake", () => {
  describe("clean UTF-8 strings (must return false)", () => {
    for (const s of CLEAN_STRINGS) {
      it(`clean: ${JSON.stringify(s).slice(0, 60)}`, () => {
        expect(isMojibake(s)).toBe(false);
      });
    }
  });

  describe("mojibake strings (must return true)", () => {
    for (const s of MOJIBAKE_STRINGS) {
      it(`mojibake: ${JSON.stringify(s).slice(0, 60)}`, () => {
        expect(isMojibake(s)).toBe(true);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// assertNoMojibake()
// ---------------------------------------------------------------------------
describe("assertNoMojibake", () => {
  it("passes for clean string payload", () => {
    expect(() => assertNoMojibake("自然拳 — Natural Boxing")).not.toThrow();
  });

  it("passes for clean nested object payload", () => {
    const payload = {
      title: "Ziran Quan 自然拳",
      content: "動靜無始 變化無端",
      tags: ["太極", "自然"],
    };
    expect(() => assertNoMojibake(payload)).not.toThrow();
  });

  it("throws MOJIBAKE_REFUSED for mojibake string", () => {
    const mojibake = "è‡\xaaç„\xb6"; // partial mojibake of 自然
    expect(() => assertNoMojibake(mojibake)).toThrow("[MOJIBAKE_REFUSED]");
  });

  it("throws MOJIBAKE_REFUSED for mojibake nested in object", () => {
    const payload = {
      title: "è‡\xaaç„\xb6æ‹\xb3", // mojibake of 自然拳
      status: "publish",
    };
    expect(() => assertNoMojibake(payload, "post update")).toThrow("[MOJIBAKE_REFUSED]");
  });

  it("throws MOJIBAKE_REFUSED for mojibake in array", () => {
    const payload = ["clean title", "è‡\xaa"];
    expect(() => assertNoMojibake(payload)).toThrow("[MOJIBAKE_REFUSED]");
  });

  it("error message includes offending value excerpt", () => {
    const mojibake = "â€”"; // em-dash mojibake
    let message = "";
    try {
      assertNoMojibake(mojibake, "test context");
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("[MOJIBAKE_REFUSED]");
    expect(message).toContain("test context");
  });
});
