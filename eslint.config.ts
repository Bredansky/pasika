import { RuleSeverity, styleguide } from "zirka";
import type { Linter } from "eslint";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import json from "@eslint/json";
import { pasikaMdRules, pasikaCssRules, pasikaJsonRules } from "./eslint/pasika/index.js";

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**"],
});

// Build markdown rules config
const mdRules: Linter.RulesRecord = Object.fromEntries(
  Object.keys(pasikaMdRules).map((name) => [`pasika/${name}`, "error"]),
);

const markdownConfig: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["docs/**/_templates/**"],
  plugins: {
    markdown,
    pasika: { rules: pasikaMdRules },
  },
  language: "markdown/gfm",
  rules: mdRules,
};

// The global stylesheet rules run on the entry point that registers Tailwind,
// while global-css-location guards every stylesheet against becoming a second
// source of global CSS. Tolerant parsing lets the rules see Tailwind v4
// constructs (@custom-variant, --*: initial, arbitrary-property @apply) that
// the CSS grammar itself does not know.
const cssEntryRules: Linter.RulesRecord = Object.fromEntries(
  Object.keys(pasikaCssRules)
    .filter((name) => name !== "global-css-location")
    .map((name) => [`pasika/${name}`, "error"]),
);

const cssEntryConfig: Linter.Config = {
  files: ["src/**/globals.css"],
  plugins: {
    css,
    pasika: { rules: pasikaCssRules },
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: cssEntryRules,
};

const cssLocationConfig: Linter.Config = {
  files: ["src/**/*.css"],
  plugins: {
    css,
    pasika: { rules: pasikaCssRules },
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: {
    "pasika/global-css-location": "error",
  },
};

const jsonRules: Linter.RulesRecord = Object.fromEntries(
  Object.keys(pasikaJsonRules).map((name) => [`pasika/${name}`, "error"]),
);

const jsonConfig: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: { languages: { json: json.languages.json } },
    pasika: { rules: pasikaJsonRules },
  },
  language: "json/json",
  rules: jsonRules,
};

export default (async () => {
  const resolved = await eslintConfig;
  // Scope the framework configs away from files the language blocks own, so
  // the JS rules never run against mdast, the CSS AST, or the JSON AST.
  const scoped = (resolved ?? []).map((config) => ({
    ...config,
    ignores: [...(config.ignores ?? []), "docs/**", "src/**/*.css", "package.json"],
  }));
  return [...scoped, markdownConfig, cssEntryConfig, cssLocationConfig, jsonConfig];
})();
