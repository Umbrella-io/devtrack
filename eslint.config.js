// @ts-check
const nextConfig = require("eslint-config-next/core-web-vitals");

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  ...nextConfig,
  {
    linterOptions: {
      // Some files have eslint-disable comments for rules that are now off
      // by default or were removed; suppress the "unused directive" noise.
      reportUnusedDisableDirectives: "off",
    },
    // Disable rules that were added in eslint-plugin-react-hooks v6 (bundled
    // with eslint-config-next@16). These rules flag pre-existing patterns
    // throughout the codebase and were not enforced by the previous config.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/no-direct-set-state-in-use-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      "react-compiler/react-compiler": "off",
    },
  },
];
