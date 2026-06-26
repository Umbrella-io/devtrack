import { describe, it, expect } from "vitest";
import { esc, pluralise, langColour } from "@/lib/digest-email";

describe("esc", () => {
  it("escapes ampersand", () => {
    expect(esc("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than sign", () => {
    expect(esc("<div>")).toBe("&lt;div&gt;");
  });

  it("escapes greater-than sign", () => {
    expect(esc("a > b")).toBe("a &gt; b");
  });

  it("escapes double-quote", () => {
    expect(esc('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes multiple special characters together", () => {
    expect(esc('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("returns plain string unchanged", () => {
    expect(esc("hello world")).toBe("hello world");
  });

  it("returns empty string for empty input", () => {
    expect(esc("")).toBe("");
  });

  it("returns numbers coerced to string", () => {
    expect(esc(42 as unknown as string)).toBe("42");
  });
});

describe("pluralise", () => {
  it("uses singular form when n equals 1", () => {
    expect(pluralise(1, "commit")).toBe("1 commit");
  });

  it("uses plural form when n is 0", () => {
    expect(pluralise(0, "commit")).toBe("0 commits");
  });

  it("uses plural form when n is greater than 1", () => {
    expect(pluralise(5, "commit")).toBe("5 commits");
  });

  it("uses default plural (singular + 's')", () => {
    expect(pluralise(2, "star")).toBe("2 stars");
  });

  it("uses custom plural string when provided", () => {
    expect(pluralise(2, "leaf", "leaves")).toBe("2 leaves");
  });

  it("uses singular form with custom plural when n equals 1", () => {
    expect(pluralise(1, "leaf", "leaves")).toBe("1 leaf");
  });

  it("handles large numbers", () => {
    expect(pluralise(1000, "commit")).toBe("1000 commits");
  });
});

describe("langColour", () => {
  it("returns TypeScript colour", () => {
    expect(langColour("TypeScript")).toBe("#3178c6");
  });

  it("returns JavaScript colour", () => {
    expect(langColour("JavaScript")).toBe("#f7df1e");
  });

  it("returns Python colour", () => {
    expect(langColour("Python")).toBe("#3776ab");
  });

  it("returns Go colour", () => {
    expect(langColour("Go")).toBe("#00add8");
  });

  it("returns Rust colour", () => {
    expect(langColour("Rust")).toBe("#ce412b");
  });

  it("returns CSS colour", () => {
    expect(langColour("CSS")).toBe("#563d7c");
  });

  it("returns HTML colour", () => {
    expect(langColour("HTML")).toBe("#e34c26");
  });

  it("returns default colour for unknown language", () => {
    expect(langColour("MyCoolLanguage")).toBe("#64748b");
  });

  it("returns default colour for empty string", () => {
    expect(langColour("")).toBe("#64748b");
  });

  it("is case-sensitive", () => {
    expect(langColour("typescript")).toBe("#64748b");
  });
});
