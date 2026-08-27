/**
 * Docs lint config used by `npm run docs`.
 *
 * The main `eslint.config.ts` composes the consumer-facing styleguide, whose
 * base config ignores markdown globally; this config wires the pasika markdown
 * rules over the repository's own docs so the docs gate is independent of it.
 */
import markdown from "@eslint/markdown";
import { mdRules } from "./eslint/pasika/index.js";

const config = [
  {
    files: ["docs/**/*.md"],
    ignores: ["docs/**/_templates/**"],
    plugins: {
      markdown,
      pasika: { rules: mdRules },
    },
    language: "markdown/gfm",
    rules: Object.fromEntries(Object.keys(mdRules).map((name) => [`pasika/${name}`, "error"])),
  },
];

export default config;
