import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("returns empty string for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvCell(undefined)).toBe("");
  });

  it("returns plain string unchanged when no special chars", () => {
    expect(csvCell("hello")).toBe("hello");
  });

  it("wraps value with comma in quotes", () => {
    expect(csvCell("hello,world")).toBe('"hello,world"');
  });

  it("wraps value with double-quote in quotes and escapes the quote", () => {
    expect(csvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps value with newline in quotes", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps value with carriage return in quotes", () => {
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("coerces number to string without quoting", () => {
    expect(csvCell(42)).toBe("42");
  });

  it("coerces boolean to string without quoting", () => {
    expect(csvCell(true)).toBe("true");
    expect(csvCell(false)).toBe("false");
  });
});

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("serialises single row correctly", () => {
    const rows = [{ name: "Alice", age: 30 }];
    expect(toCsv(rows)).toBe("name,age\nAlice,30");
  });

  it("uses first row keys as stable header order", () => {
    const rows = [
      { b: "2", a: "1" },
      { a: "3", b: "4" },
    ];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines[0]).toBe("b,a");
    expect(lines[1]).toBe("2,1");
    expect(lines[2]).toBe("4,3");
  });

  it("escapes special characters in cells", () => {
    const rows = [{ name: "Bob, Jr.", note: 'says "hi"' }];
    expect(toCsv(rows)).toBe('name,note\n"Bob, Jr.","says ""hi"""');
  });

  it("handles null and undefined as empty cells", () => {
    const rows = [{ a: null, b: undefined, c: "c" }];
    expect(toCsv(rows)).toBe("a,b,c\n,,c");
  });

  it("handles numeric values without quoting", () => {
    const rows = [{ x: 1, y: 2 }];
    expect(toCsv(rows)).toBe("x,y\n1,2");
  });
});
