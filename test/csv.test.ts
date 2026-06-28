import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("returns string unchanged when no special chars", () => {
    expect(csvCell("hello")).toBe("hello");
  });

  it("returns null as empty string", () => {
    expect(csvCell(null)).toBe("");
  });

  it("returns undefined as empty string", () => {
    expect(csvCell(undefined)).toBe("");
  });

  it("returns number as string", () => {
    expect(csvCell(42)).toBe("42");
  });

  it("returns boolean as string", () => {
    expect(csvCell(true)).toBe("true");
  });

  it("wraps value containing comma in quotes", () => {
    expect(csvCell("hello,world")).toBe('"hello,world"');
  });

  it("wraps value containing double quote in quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps value containing newline in quotes", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps value containing carriage return in quotes", () => {
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("handles value with multiple special characters", () => {
    expect(csvCell('hello, "world"\n')).toBe('"hello, ""world""\n"');
  });

  it("handles empty string", () => {
    expect(csvCell("")).toBe("");
  });
});

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("returns header row with data for single row", () => {
    const rows = [{ name: "Alice", age: 30 }];
    expect(toCsv(rows)).toBe("name,age\nAlice,30");
  });

  it("includes all values in a row", () => {
    const rows = [{ a: 1, b: 2 }];
    expect(toCsv(rows)).toBe("a,b\n1,2");
  });

  it("escapes values with commas", () => {
    const rows = [{ name: "Hello, World" }];
    expect(toCsv(rows)).toBe('name\n"Hello, World"');
  });

  it("escapes values with quotes", () => {
    const rows = [{ name: 'Say "Hi"' }];
    expect(toCsv(rows)).toBe('name\n"Say ""Hi"""');
  });

  it("uses stable column order from first row", () => {
    // Object.keys preserves insertion order; { b: 2, a: 1 } gives keys ['b', 'a']
    // Second row's values are output in header order, not its own key order
    const rows = [{ b: 2, a: 1 }, { a: 3, b: 4 }];
    expect(toCsv(rows)).toBe("b,a\n2,1\n4,3");
  });

  it("emits empty cell for missing keys in subsequent rows", () => {
    const rows = [{ a: 1, b: 2 }, { a: 3 }];
    expect(toCsv(rows)).toBe("a,b\n1,2\n3,");
  });

  it("ignores extra keys in subsequent rows", () => {
    const rows = [{ a: 1 }, { a: 2, b: 3 }];
    expect(toCsv(rows)).toBe("a\n1\n2");
  });

  it("handles null values", () => {
    const rows = [{ name: null as any, age: null as any }];
    expect(toCsv(rows)).toBe("name,age\n,");
  });

  it("handles numbers and booleans", () => {
    const rows = [{ n: 42, b: true }];
    expect(toCsv(rows)).toBe("n,b\n42,true");
  });
});
