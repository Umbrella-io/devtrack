import { describe, expect, it } from "vitest";
import { detectBrowserLocale, detectLocale } from "@/i18n/detection";
import { translateMessage } from "@/i18n/translate";

describe("i18n locale detection", () => {
  it("uses user preference before cookie or browser language", () => {
    expect(
      detectLocale({
        preferredLocale: "es",
        cookieLocale: "en",
        acceptLanguage: "en-US,en;q=0.9",
      })
    ).toEqual({ locale: "es", source: "preference" });
  });

  it("uses cookie before browser language", () => {
    expect(
      detectLocale({
        cookieLocale: "es",
        acceptLanguage: "en-US,en;q=0.9",
      })
    ).toEqual({ locale: "es", source: "cookie" });
  });

  it("detects supported browser languages from Accept-Language", () => {
    expect(detectBrowserLocale("fr-CA,es;q=0.8,en;q=0.7")).toBe("es");
  });

  it("falls back to English for unsupported languages", () => {
    expect(
      detectLocale({
        acceptLanguage: "fr-CA,fr;q=0.9",
      })
    ).toEqual({ locale: "en", source: "default" });
  });
});

describe("i18n translation lookup", () => {
  it("renders Spanish strings", async () => {
    await expect(translateMessage("es", "navigation.settings")).resolves.toBe("Configuración");
  });

  it("falls back to English when locale is unsupported", async () => {
    await expect(translateMessage("fr", "navigation.settings")).resolves.toBe("Settings");
  });

  it("returns the key for missing translations", async () => {
    await expect(translateMessage("es", "missing.example")).resolves.toBe("missing.example");
  });
});
