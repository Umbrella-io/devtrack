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

test("extractImports handles comments with quotes inside multiline imports", () => {
  const imports = extractImports(`
    import {
      // we'll use this
      foo
    } from "package-three";
    
    /* some other comment with "double" quotes */
    import "package-four";
  `);

  assert.deepEqual(imports, [
    "package-three",
    "package-four",
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

test("extractPackageName handles @scope packages correctly", () => {
  assert.equal(extractPackageName("@org/name"), "@org/name");
  assert.equal(extractPackageName("@org/name/sub/path"), "@org/name");
});

test("extractPackageName handles unscoped packages correctly", () => {
  assert.equal(extractPackageName("react"), "react");
  assert.equal(extractPackageName("lodash/debounce"), "lodash");
  assert.equal(extractPackageName("axios"), "axios");
});

test("extractImports handles various import syntax", () => {
  const imports = extractImports(`
    import default1 from "pkg1";
    import * as namespaced from "pkg2";
    import { named1, named2 } from "pkg3";
    import "side-effect-only";
  `);

  assert.deepEqual(imports, [
    "pkg1",
    "pkg2",
    "pkg3",
    "side-effect-only",
  ]);
});

test("collectMissingDeps skips relative imports", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-deps-"));
  const srcFile = path.join(dir, "src", "entry.ts");
  fs.mkdirSync(path.dirname(srcFile), { recursive: true });
  fs.writeFileSync(
    srcFile,
    `
      import local from "./local";
      import sibling from "../utils/helper";
      import absolute from "/absolute/path";
      import alias from "@/lib/alias";
      import react from "react";
    `
  );

  const missing = collectMissingDeps([srcFile], new Set(["react"]), dir);

  assert.ok(!missing.has("local"), "should skip relative imports starting with ./");
  assert.ok(!missing.has("sibling"), "should skip relative imports starting with ../");
  assert.ok(!missing.has("absolute"), "should skip absolute imports starting with /");
});

test("collectMissingDeps skips framework aliases", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-deps-"));
  const srcFile = path.join(dir, "src", "entry.ts");
  fs.mkdirSync(path.dirname(srcFile), { recursive: true });
  fs.writeFileSync(
    srcFile,
    `
      import next from "next";
      import react from "react";
      import reactDOM from "react-dom";
      import serverOnly from "server-only";
      import clientOnly from "client-only";
      import missing from "nonexistent-package";
    `
  );

  const missing = collectMissingDeps([srcFile], new Set(["react", "next"]), dir);

  assert.ok(!missing.has("next"), "should skip next framework alias");
  assert.ok(!missing.has("react"), "should skip react framework alias");
  assert.ok(!missing.has("react-dom"), "should skip react-dom framework alias");
  assert.ok(!missing.has("server-only"), "should skip server-only alias");
  assert.ok(!missing.has("client-only"), "should skip client-only alias");
  assert.deepEqual([...missing.keys()], ["nonexistent-package"], "should only report truly missing packages");
});
