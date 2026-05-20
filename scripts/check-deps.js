/**
 * Checks that every third-party import in src/ has a matching entry
 * in package.json dependencies or devDependencies.
 *
 * Catches issues like: import jsPDF from 'jspdf' with no jspdf in package.json.
 */

const fs = require("fs");
const path = require("path");

// Node built-ins (not in package.json but valid to import)
const BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram",
  "dns", "domain", "events", "fs", "http", "http2", "https", "module",
  "net", "os", "path", "perf_hooks", "process", "punycode", "querystring",
  "readline", "repl", "stream", "string_decoder", "timers", "tls", "tty",
  "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
]);

// Next.js / framework aliases that resolve internally
const FRAMEWORK_ALIASES = new Set([
  "next", "react", "react-dom",
  "server-only", "client-only",
]);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", ".git"].includes(entry.name)) continue;
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function extractPackageName(mod) {
  if (mod.startsWith("@")) {
    // scoped: @org/pkg/sub → @org/pkg
    const parts = mod.split("/");
    return parts.slice(0, 2).join("/");
  }
  return mod.split("/")[0];
}

const IMPORT_RE = /^\s*(?:import|export)\s[^'"]*from\s+['"]([^'"]+)['"]/gm;
const SIDE_EFFECT_IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/gm;
const DYNAMIC_RE = /(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function extractImports(src) {
  const imports = [];

  for (const re of [IMPORT_RE, SIDE_EFFECT_IMPORT_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      imports.push(m[1]);
    }
  }

  return imports;
}

function collectMissingDeps(files, allDeps, cwd = process.cwd()) {
  const missing = new Map(); // pkgName → Set of files

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(cwd, file).replace(/\\/g, "/");

    for (const mod of extractImports(src)) {
      // Skip relative imports, path aliases (@/ is the src alias — not a pkg)
      if (mod.startsWith(".") || mod.startsWith("/") || mod.startsWith("@/")) continue;
      const pkgName = extractPackageName(mod);
      if (BUILTINS.has(pkgName) || FRAMEWORK_ALIASES.has(pkgName)) continue;
      if (allDeps.has(pkgName)) continue;

      if (!missing.has(pkgName)) missing.set(pkgName, new Set());
      missing.get(pkgName).add(rel);
    }
  }

  return missing;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const allDeps = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]);

  const files = collectFiles("src");
  const missing = collectMissingDeps(files, allDeps);

  if (missing.size > 0) {
    console.error("\n❌  Imports found with no matching entry in package.json:\n");
    for (const [pkg, usedIn] of missing) {
      console.error(`  ${pkg}`);
      for (const f of usedIn) console.error(`    └─ ${f}`);
    }
    console.error("\nFix: npm install <package-name>  then commit package.json + package-lock.json\n");
    process.exit(1);
  }

  console.log(`✓  All imports accounted for (${files.length} files checked)`);
}

if (require.main === module) {
  main();
}

module.exports = {
  collectMissingDeps,
  extractImports,
  extractPackageName,
};
