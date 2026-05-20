const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  collectMissingDeps,
  extractImports,
  extractPackageName,
} = require("../scripts/check-deps");

test("extractPackageName keeps scoped package names intact", () => {
  assert.equal(extractPackageName("@scope/pkg/submodule"), "@scope/pkg");
  assert.equal(extractPackageName("react/jsx-runtime"), "react");
});

test("extractImports includes side-effect imports", () => {
  const imports = extractImports(`
    import "server-only";
    import value from "package-one";
    export { thing } from "@scope/pkg/path";
    const dynamic = await import("package-two");
  `);

  assert.deepEqual(imports, [
    "package-one",
    "@scope/pkg/path",
    "server-only",
    "package-two",
  ]);
});

test("collectMissingDeps reports undeclared side-effect imports", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-deps-"));
  const srcFile = path.join(dir, "src", "entry.ts");
  fs.mkdirSync(path.dirname(srcFile), { recursive: true });
  fs.writeFileSync(
    srcFile,
    `
      import "missing-side-effect";
      import "server-only";
      import localThing from "./local";
      import aliasThing from "@/lib/local";
      import react from "react";
    `
  );

  const missing = collectMissingDeps([srcFile], new Set(["react"]), dir);

  assert.deepEqual([...missing.keys()], ["missing-side-effect"]);
  assert.deepEqual([...missing.get("missing-side-effect")], ["src/entry.ts"]);
});
