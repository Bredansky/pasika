import type { Linter } from "eslint";
import { RuleSeverity, styleguide } from "zirka";
import markdown from "@eslint/markdown";
import jsonPlugin from "@eslint/json";
import { documentationRules, repoPackageJsonRules, huskyRules } from "./eslint/index";

const documentationBlock: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["**/_*/**"],
  plugins: { markdown, pasika: { rules: documentationRules } },
  language: "markdown/gfm",
  rules: Object.fromEntries(Object.keys(documentationRules).map((name) => [`pasika/${name}`, "error"])),
};

// pasika predates the Vitest Coverage Rule and runs its own suite on node's
// built-in test runner instead of Vitest, so it does not self-apply that one
// requirement — every other framework-agnostic package.json rule still applies.
const { "vitest-coverage": _vitestCoverageRule, ...selfPackageJsonRules } = repoPackageJsonRules;

const manifestBlock: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: { ...selfPackageJsonRules, ...huskyRules } },
  },
  language: "json/json",
  rules: Object.fromEntries(
    [...Object.keys(selfPackageJsonRules), ...Object.keys(huskyRules)].map((name) => [`pasika/${name}`, "error"]),
  ),
};

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**"],
  additionalConfigs: [documentationBlock, manifestBlock],
});

export default eslintConfig;
