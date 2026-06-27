import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csv", () => {
  describe("csvCell", () => {
    it("returns empty string for null", () => {
      expect(csvCell(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(csvCell(undefined)).toBe("");
    });

    it("returns plain string unchanged", () => {
      expect(csvCell("hello")).toBe("hello");
      expect(csvCell("hello world")).toBe("hello world");
    });

    it("quotes strings containing commas", () => {
      expect(csvCell("hello,world")).toBe('"hello,world"');
    });

    it("quotes strings containing double quotes", () => {
      expect(csvCell('say "hello"')).toBe('"say ""hello"""');
    });

    it("quotes strings containing newlines", () => {
      expect(csvCell("hello\nworld")).toBe('"hello\nworld"');
    });

    it("quotes strings containing carriage returns", () => {
      expect(csvCell("hello\rworld")).toBe('"hello\rworld"');
    });

    it("returns numbers as plain strings", () => {
      expect(csvCell(42)).toBe("42");
      expect(csvCell(3.14)).toBe("3.14");
      expect(csvCell(-10)).toBe("-10");
    });

    it("returns booleans as plain strings", () => {
      expect(csvCell(true)).toBe("true");
      expect(csvCell(false)).toBe("false");
    });
  });

  describe("toCsv", () => {
    it("returns empty string for empty array", () => {
      expect(toCsv([])).toBe("");
    });

    it("serialises a single row with correct header", () => {
      const result = toCsv([{ name: "Alice", age: "30" }]);
      expect(result).toBe("name,age\nAlice,30");
    });

    it("serialises multiple rows", () => {
      const result = toCsv([
        { name: "Alice", age: "30" },
        { name: "Bob", age: "25" },
      ]);
      expect(result).toBe("name,age\nAlice,30\nBob,25");
    });

    it("uses header order from first row", () => {
      const result = toCsv([
        { b: "2", a: "1" },
        { a: "3", b: "4" },
      ]);
      const lines = result.split("\n");
      expect(lines[0]).toBe("b,a");
    });

    it("fills missing keys with empty cells", () => {
      const result = toCsv([
        { a: "1", b: "2" },
        { a: "3" },
      ]);
      expect(result).toBe("a,b\n1,2\n3,");
    });

    it("ignores extra keys in subsequent rows", () => {
      const result = toCsv([
        { a: "1" },
        { a: "2", b: "3" },
      ]);
      const lines = result.split("\n");
      expect(lines[1]).toBe("1");
      expect(lines[2]).toBe("2");
    });

    it("handles special characters in values", () => {
      const result = toCsv([{ name: "Hello, World", quote: 'Say "Hi"' }]);
      expect(result).toBe('name,quote\n"Hello, World","Say ""Hi"""');
    });
  });
});
