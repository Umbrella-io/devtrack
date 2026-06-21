import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("returns empty string for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvCell(undefined)).toBe("");
  });

  it("returns plain string unchanged when no special characters", () => {
    expect(csvCell("hello")).toBe("hello");
  });

  it("wraps string with comma in double quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
  });

  it("wraps string with double quote in double quotes and escapes quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps string with newline in double quotes", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps string with carriage return in double quotes", () => {
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("wraps string with both carriage return and newline", () => {
    expect(csvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("returns number as a plain string without quoting", () => {
    expect(csvCell(42)).toBe("42");
    expect(csvCell(3.14)).toBe("3.14");
    expect(csvCell(-7)).toBe("-7");
  });

  it("returns boolean as a plain string without quoting", () => {
    expect(csvCell(true)).toBe("true");
    expect(csvCell(false)).toBe("false");
  });

  it("handles string containing multiple special characters", () => {
    expect(csvCell('Hello, "World"\nnext')).toBe('"Hello, ""World""\nnext"');
  });

  it("handles empty string", () => {
    expect(csvCell("")).toBe("");
  });

  it("handles string with only quotes", () => {
    expect(csvCell('"')).toBe('""""');
  });
});

describe("toCsv", () => {
  it("returns empty string for an empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("serialises single row correctly", () => {
    const result = toCsv([{ name: "Alice", age: "30" }]);
    expect(result).toBe("name,age\nAlice,30");
  });

  it("serialises multiple rows with consistent headers", () => {
    const result = toCsv([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("name,age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("uses headers from the first row only", () => {
    const result = toCsv([
      { name: "Alice", age: "30" },
      { name: "Bob", city: "NYC" },
    ]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name,age");
    expect(lines[2]).toBe("Bob,"); // city key ignored, age column is empty
  });

  it("emits empty cell for missing keys in a row", () => {
    const result = toCsv([
      { a: "1", b: "2" },
      { a: "3" },
    ]);
    expect(result).toContain("1,2\n3,");
  });

  it("escapes special characters in values", () => {
    const result = toCsv([{ name: "Val with comma, and quote\"here", age: "30" }]);
    expect(result).toContain('"Val with comma, and quote""here"');
    expect(result).toContain("30");
  });

  it("handles numbers and booleans without extra quoting", () => {
    const result = toCsv([{ count: 42, active: true, name: "Bob" }]);
    expect(result).toContain("42");
    expect(result).toContain("true");
  });

  it("handles null and undefined as empty cells", () => {
    const result = toCsv([{ a: null, b: undefined, c: "c" }]);
    expect(result).toBe("a,b,c\n,,c");
  });

  it("joins rows with LF newline regardless of OS", () => {
    const result = toCsv([
      { x: "1", y: "2" },
      { x: "3", y: "4" },
    ]);
    expect(result).not.toContain("\r");
    expect(result).toContain("x,y\n1,2\n3,4");
  });

  it("column order matches keys of the first row", () => {
    const result = toCsv([{ z: "z", a: "a", m: "m" }]);
    expect(result.split("\n")[0]).toBe("z,a,m");
  });
});
