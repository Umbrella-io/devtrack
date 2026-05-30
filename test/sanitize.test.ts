import { describe, it, expect } from "vitest";
import { stripHtml, validateTextInput } from "../src/lib/sanitize";

describe("stripHtml", () => {
  it("removes simple HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("removes nested HTML tags", () => {
    expect(stripHtml("<div><span>Nested</span></div>")).toBe("Nested");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&lt;script&gt;")).toBe("<script>");
  });

  it("decodes &amp; entity", () => {
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &quot; entity", () => {
    expect(stripHtml('&quot;quoted&quot;')).toBe('"quoted"');
  });

  it("decodes &#x27; entity", () => {
    expect(stripHtml("&#x27;test&#x27;")).toBe("'test'");
  });

  it("decodes &#39; entity", () => {
    expect(stripHtml("&#39;test&#39;")).toBe("'test'");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("  <p>Hello</p>  ")).toBe("Hello");
  });

  it("handles text without HTML", () => {
    expect(stripHtml("Plain text")).toBe("Plain text");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("preserves text between multiple tags", () => {
    expect(stripHtml("<h1>Title</h1><p>Paragraph</p>")).toBe("TitleParagraph");
  });
});

describe("validateTextInput", () => {
  it("returns ok for valid text", () => {
    const result = validateTextInput("Hello World", "name");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("Hello World");
  });

  it("returns error for non-string input", () => {
    const result = validateTextInput(123, "name");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must be a string");
  });

  it("returns error for null input", () => {
    const result = validateTextInput(null, "name");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must be a string");
  });

  it("returns error for undefined input", () => {
    const result = validateTextInput(undefined, "name");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must be a string");
  });

  it("returns error for empty string", () => {
    const result = validateTextInput("", "name");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must not be empty");
  });

  it("returns error for string with only HTML", () => {
    const result = validateTextInput("<p></p>", "name");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must not be empty");
  });

  it("returns error when exceeding max length", () => {
    const longString = "a".repeat(201);
    const result = validateTextInput(longString, "name", 200);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must be 200 characters or fewer");
  });

  it("accepts text at exact max length", () => {
    const maxString = "a".repeat(200);
    const result = validateTextInput(maxString, "name", 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(maxString);
  });

  it("strips HTML before validation", () => {
    const result = validateTextInput("<p>Hello</p>", "name");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("Hello");
  });

  it("uses custom field name in error message", () => {
    const result = validateTextInput("", "customField");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("customField must not be empty");
  });

  it("uses custom max length", () => {
    const result = validateTextInput("abcdef", "name", 5);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("name must be 5 characters or fewer");
  });
});