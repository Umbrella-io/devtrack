import { describe, it, expect } from "vitest";
import { stripHtml, validateTextInput } from "../src/lib/sanitize";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<b>Hello</b>")).toBe("Hello");
  });

  it("removes nested HTML tags", () => {
    expect(stripHtml("<div><p>Test</p></div>")).toBe("Test");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&lt;script&gt;")).toBe("<script>");
  });

  it("decodes ampersand entity", () => {
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes quote entities", () => {
    expect(stripHtml("&quot;Hello&quot;")).toBe('"Hello"');
  });

  it("trims whitespace", () => {
    expect(stripHtml("   Hello World   ")).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("normalizes and strips Unicode look-alike full-width angle brackets", () => {
    expect(stripHtml("＜script＞alert(1)＜/script＞")).toBe("alert(1)");
    expect(stripHtml("＜b＞Hello＜/b＞")).toBe("Hello");
  });
});

describe("validateTextInput", () => {
  it("accepts valid text", () => {
    expect(validateTextInput("Hello", "Name")).toEqual({
      ok: true,
      value: "Hello",
    });
  });

  it("strips HTML before validation", () => {
    expect(validateTextInput("<b>Hello</b>", "Name")).toEqual({
      ok: true,
      value: "Hello",
    });
  });

  it("rejects non-string input", () => {
    expect(validateTextInput(123, "Name")).toEqual({
      ok: false,
      value: "",
      error: "Name must be a string",
    });
  });

  it("rejects empty string", () => {
    expect(validateTextInput("", "Name")).toEqual({
      ok: false,
      value: "",
      error: "Name must not be empty",
    });
  });

  it("rejects HTML-only content", () => {
    expect(validateTextInput("<div></div>", "Name")).toEqual({
      ok: false,
      value: "",
      error: "Name must not be empty",
    });
  });

  it("rejects text exceeding max length", () => {
    const longText = "a".repeat(201);

    expect(validateTextInput(longText, "Name")).toEqual({
      ok: false,
      value: "",
      error: "Name must be 200 characters or fewer",
    });
  });

  it("accepts text exactly at max length", () => {
    const text = "a".repeat(200);

    expect(validateTextInput(text, "Name")).toEqual({
      ok: true,
      value: text,
    });
  });

  it("supports custom max length", () => {
    expect(validateTextInput("abcdef", "Name", 5)).toEqual({
      ok: false,
      value: "",
      error: "Name must be 5 characters or fewer",
    });
  });
});
