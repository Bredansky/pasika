import type { Linter } from "eslint";
import { RuleSeverity, styleguide } from "zirka";
import markdown from "@eslint/markdown";
import jsonPlugin from "@eslint/json";
import { documentationRules, repoPackageJsonRules, huskyRules } from "./eslint/index";

const docsBlock: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["**/_*/**"],
  plugins: { markdown, pasika: { rules: documentationRules } },
  language: "markdown/gfm",
  rules: Object.fromEntries(Object.keys(documentationRules).map((name) => [`pasika/${name}`, "error"])),
};

const manifestBlock: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: { ...repoPackageJsonRules, ...huskyRules } },
  },
  language: "json/json",
  rules: Object.fromEntries([...Object.keys(repoPackageJsonRules), ...Object.keys(huskyRules)].map((name) => [`pasika/${name}`, "error"])),
};

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**"],
  additionalConfigs: [docsBlock, manifestBlock],
});

export default eslintConfig;
