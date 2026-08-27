import type { Linter } from "eslint";
import { RuleSeverity, styleguide } from "zirka";
import markdown from "@eslint/markdown";
import { mdRules } from "./eslint/pasika/index";

// Pasika's own docs, linted with this repository's local markdown rules.
const docsBlock: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["**/_templates/**"],
  plugins: { markdown, pasika: { rules: mdRules } },
  language: "markdown/gfm",
  rules: Object.fromEntries(Object.keys(mdRules).map((name) => [`pasika/${name}`, "error"])),
};

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**"],
  additionalConfigs: [docsBlock],
});

export default eslintConfig;
