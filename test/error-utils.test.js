/**
 * Unit tests for src/lib/error-utils.ts
 *
 * These tests verify that raw internal error messages — including Supabase
 * constraint names, table names, and stack traces — are never surfaced to
 * the browser in production. They also confirm that development mode retains
 * the raw message for debugging.
 */

import { getSafeApiErrorMessage } from "../src/lib/error-utils.ts";
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

describe("getSafeApiErrorMessage", () => {
  it("returns the mapped message for known safe error keys", () => {
    assert.strictEqual(
      getSafeApiErrorMessage("TokenRevoked", "production"),
      "Your GitHub session has expired. Please sign in again."
    );
    assert.strictEqual(
      getSafeApiErrorMessage("Unauthorized", "production"),
      "You must be signed in to view this page."
    );
  });

  it("replaces unknown messages with a generic string in production", () => {
    const raw =
      'duplicate key value violates unique constraint "users_github_id_key"';
    const result = getSafeApiErrorMessage(raw, "production");
    assert.strictEqual(result, "An unexpected error occurred.");
    assert.ok(!result.includes("users_github_id_key"), "constraint name must not leak");
    assert.ok(!result.includes("duplicate key"), "DB error detail must not leak");
  });

  it("returns the raw message in development mode for debuggability", () => {
    const raw = 'relation "goals" does not exist';
    const result = getSafeApiErrorMessage(raw, "development");
    assert.strictEqual(result, raw);
  });

  it("falls back to the generic message for an empty string in production", () => {
    const result = getSafeApiErrorMessage("", "production");
    assert.strictEqual(result, "An unexpected error occurred.");
  });

  it("returns 'Unknown error' for an empty string in development", () => {
    const result = getSafeApiErrorMessage("", "development");
    assert.strictEqual(result, "Unknown error");
  });

  it("scrubs real Supabase schema-leaking error strings in production", () => {
    const schemaErrors = [
      'column "github_id" of relation "users" does not exist',
      'null value in column "user_id" of relation "goals" violates not-null constraint',
      'insert or update on table "ai_insights" violates foreign key constraint',
      'relation "metric_snapshots" does not exist',
    ];
    for (const raw of schemaErrors) {
      const result = getSafeApiErrorMessage(raw, "production");
      assert.strictEqual(result, "An unexpected error occurred.", `Expected scrubbed output for: ${raw}`);
    }
  });
});
