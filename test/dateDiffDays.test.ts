import { describe, it, expect } from "vitest";
import { dateDiffDays } from "../src/lib/dateUtils";

describe("dateUtils dateDiffDays", () => {
  it("returns 0 for same day", () => {
    expect(dateDiffDays("2024-06-15", "2024-06-15")).toBe(0);
  });

  it("returns positive for future date", () => {
    expect(dateDiffDays("2024-06-15", "2024-06-20")).toBe(5);
  });

  it("returns negative for past date", () => {
    expect(dateDiffDays("2024-06-20", "2024-06-15")).toBe(-5);
  });

  it("handles leap year Feb 28 to Mar 1", () => {
    expect(dateDiffDays("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("handles year boundary crossing", () => {
    expect(dateDiffDays("2023-12-31", "2024-01-01")).toBe(1);
  });

  it("handles month boundary within year", () => {
    expect(dateDiffDays("2024-01-31", "2024-02-01")).toBe(1);
  });

  it("returns exact day difference for sequential days", () => {
    expect(dateDiffDays("2024-05-01", "2024-05-02")).toBe(1);
    expect(dateDiffDays("2024-05-01", "2024-05-03")).toBe(2);
  });

  it("handles large day differences", () => {
    expect(dateDiffDays("2024-01-01", "2024-12-31")).toBe(365);
  });
});