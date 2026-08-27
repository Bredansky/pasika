import type { Linter } from "eslint";
import { RuleSeverity, styleguide } from "zirka";
import markdown from "@eslint/markdown";
import { mdRules } from "./eslint/pasika/index";

/**
 * Pasika's own docs, linted with this repository's local markdown rules rather
 * than the published `pasika` package. The repo's source lives in `cli/`,
 * `enforcement/`, and `eslint/` — not `src/**` — so the TS/TSX and CSS pasika
 * blocks do not apply here, and the JSON rules target consumer `package.json`
 * conventions the repo's own manifest already follows. The docs block is the
 * one that genuinely fires on this repository.
 *
 * The block mirrors zirka's `loadPasikaConfigs` (same glob and plugin), so a
 * consumer wired through zirka sees the same markdown configuration.
 */
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
