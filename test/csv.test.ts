import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("returns empty string for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvCell(undefined)).toBe("");
  });

  it("returns plain string unquoted", () => {
    expect(csvCell("hello")).toBe("hello");
  });

  it("wraps string with comma in double quotes", () => {
    expect(csvCell("hello, world")).toBe('"hello, world"');
  });

  it("wraps string with double quote in double quotes and escapes quotes", () => {
    expect(csvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps string with newline in double quotes", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps string with carriage return in double quotes", () => {
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("returns number as plain string", () => {
    expect(csvCell(42)).toBe("42");
  });

  it("returns boolean as plain string", () => {
    expect(csvCell(true)).toBe("true");
    expect(csvCell(false)).toBe("false");
  });
});

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("serialises a single row with header", () => {
    expect(toCsv([{ name: "Alice", age: 30 }])).toBe("name,age\nAlice,30");
  });

  it("serialises multiple rows", () => {
    const rows = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    expect(toCsv(rows)).toBe("name,age\nAlice,30\nBob,25");
  });

  it("uses header order from first row", () => {
    const rows = [
      { age: 30, name: "Alice" },
      { name: "Bob", age: 25 },
    ];
    expect(toCsv(rows)).toBe("age,name\n30,Alice\n25,Bob");
  });

  it("emits empty cell for missing key", () => {
    const rows = [{ name: "Alice" }, { name: "Bob", age: 25 }];
    // Header is derived from first row keys only
    expect(toCsv(rows)).toBe("name\nAlice\nBob");
  });

  it("ignores extra keys not in header", () => {
    const rows = [{ name: "Alice", extra: "data" }];
    expect(toCsv(rows)).toBe("name,extra\nAlice,data");
  });

  it("escapes special characters in cells", () => {
    const rows = [{ value: 'hello, "world"' }];
    expect(toCsv(rows)).toBe('value\n"hello, ""world"""');
  });
});