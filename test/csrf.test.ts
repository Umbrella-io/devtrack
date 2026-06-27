import { describe, it, expect } from "vitest";
import { isStateChangingMethod, isCsrfExempt } from "../src/lib/csrf";

describe("csrf", () => {
  describe("isStateChangingMethod", () => {
    it("returns true for POST", () => {
      expect(isStateChangingMethod("POST")).toBe(true);
    });

    it("returns true for PUT", () => {
      expect(isStateChangingMethod("PUT")).toBe(true);
    });

    it("returns true for PATCH", () => {
      expect(isStateChangingMethod("PATCH")).toBe(true);
    });

    it("returns true for DELETE", () => {
      expect(isStateChangingMethod("DELETE")).toBe(true);
    });

    it("returns false for GET", () => {
      expect(isStateChangingMethod("GET")).toBe(false);
    });

    it("returns false for HEAD", () => {
      expect(isStateChangingMethod("HEAD")).toBe(false);
    });

    it("returns false for OPTIONS", () => {
      expect(isStateChangingMethod("OPTIONS")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(isStateChangingMethod("post")).toBe(false);
      expect(isStateChangingMethod("Post")).toBe(false);
    });
  });

  describe("isCsrfExempt", () => {
    it("returns true for webhook routes", () => {
      expect(isCsrfExempt("/api/webhooks/github")).toBe(true);
      expect(isCsrfExempt("/api/webhooks/github/push")).toBe(true);
      expect(isCsrfExempt("/api/webhooks/custom")).toBe(true);
      expect(isCsrfExempt("/api/webhooks/dispatch/event")).toBe(true);
    });

    it("returns true for rate-limit API routes", () => {
      expect(isCsrfExempt("/api/metrics")).toBe(true);
      expect(isCsrfExempt("/api/metrics/weekly")).toBe(true);
      expect(isCsrfExempt("/api/auth/signin")).toBe(true);
      expect(isCsrfExempt("/api/auth/callback")).toBe(true);
    });

    it("returns false for non-exempt routes", () => {
      expect(isCsrfExempt("/api/goals")).toBe(false);
      expect(isCsrfExempt("/api/user")).toBe(false);
      expect(isCsrfExempt("/api/repos")).toBe(false);
    });
  });
});
