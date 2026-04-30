/**
 * Tests for src/tools/params.ts — Zod-based parameter parsing utilities
 */

import { describe, it, expect } from "vitest";
import { parseId, parseIdAndForce, toolParams } from "../../dist/tools/params.js";

describe("parseId", () => {
  it("returns the id for a valid positive integer", () => {
    expect(parseId({ id: 1 })).toBe(1);
    expect(parseId({ id: 42 })).toBe(42);
  });

  it("throws for zero", () => {
    expect(() => parseId({ id: 0 })).toThrow();
  });

  it("throws for negative numbers", () => {
    expect(() => parseId({ id: -1 })).toThrow();
  });

  it("throws for non-integer floats", () => {
    expect(() => parseId({ id: 1.5 })).toThrow();
  });

  it("throws for strings", () => {
    expect(() => parseId({ id: "1" })).toThrow();
  });

  it("throws when id is missing", () => {
    expect(() => parseId({})).toThrow();
  });

  it("throws when id is null", () => {
    expect(() => parseId({ id: null })).toThrow();
  });
});

describe("parseIdAndForce", () => {
  it("returns id and undefined force when force is omitted", () => {
    expect(parseIdAndForce({ id: 5 })).toEqual({ id: 5, force: undefined });
  });

  it("returns id and force: true", () => {
    expect(parseIdAndForce({ id: 5, force: true })).toEqual({ id: 5, force: true });
  });

  it("returns id and force: false", () => {
    expect(parseIdAndForce({ id: 5, force: false })).toEqual({ id: 5, force: false });
  });

  it("throws for missing id", () => {
    expect(() => parseIdAndForce({ force: true })).toThrow();
  });

  it("throws for invalid id", () => {
    expect(() => parseIdAndForce({ id: -1, force: true })).toThrow();
  });
});

describe("toolParams", () => {
  it("passes through the object unchanged", () => {
    const input = { foo: "bar", count: 3 };
    expect(toolParams(input)).toBe(input);
  });

  it("works with empty object", () => {
    expect(toolParams({})).toEqual({});
  });
});
