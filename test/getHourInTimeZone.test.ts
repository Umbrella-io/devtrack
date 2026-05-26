import { describe, test, expect } from "vitest";
import { getHourInTimeZone } from "../src/lib/coding-activity-insights";

describe("getHourInTimeZone", () => {
  test("UTC noon -> hour 12 in UTC", () => {
    const result = getHourInTimeZone(
      new Date("2024-01-01T12:00:00Z"),
      "UTC"
    );

    expect(result).toBe(12);
  });

  test("UTC noon -> hour 17 in Asia/Kolkata", () => {
    const result = getHourInTimeZone(
      new Date("2024-01-01T12:00:00Z"),
      "Asia/Kolkata"
    );

    expect(result).toBe(17);
  });

  test("UTC midnight -> hour 19 in America/New_York", () => {
    const result = getHourInTimeZone(
      new Date("2024-01-01T00:00:00Z"),
      "America/New_York"
    );

    expect(result).toBe(19);
  });

  test("DST handling for America/New_York", () => {
    const result = getHourInTimeZone(
      new Date("2024-07-01T00:00:00Z"),
      "America/New_York"
    );

    expect(result).toBe(20);
  });

  test("invalid date returns 0", () => {
    expect(() =>
      getHourInTimeZone(
        new Date("invalid-date"),
        "UTC"
      )
    ).not.toThrow();

    expect(
      getHourInTimeZone(
        new Date("invalid-date"),
        "UTC"
      )
    ).toBe(0);
  });
});