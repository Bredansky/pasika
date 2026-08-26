import { RuleSeverity, styleguide } from "zirka";
import type { Linter } from "eslint";
import markdown from "@eslint/markdown";
import { pasikaMdRules } from "./eslint/pasika/index.js";

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

export default (async () => {
  const resolved = await eslintConfig;
  // Scope the framework configs away from docs, so markdown files are linted
  // only by the markdown block and JS rules never run against the mdast.
  const scoped = (resolved ?? []).map((config) => ({
    ...config,
    ignores: [...(config.ignores ?? []), "docs/**"],
  }));
  return [...scoped, markdownConfig];
})();
