/**
 * ESLint rule: pasika/tailwind-default-comment
 *
 * After --*: initial, re-declared Tailwind default tokens are intentional.
 * Mark exact default values with a trailing comment to distinguish them
 * from design overrides. Defaults come from the consumer's Tailwind package.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate } from "@eslint/css-tree";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren } from "./helpers";

const cache = new Map<string, Map<string, string>>();
const COMMENT = /;\s*\/\*\s*Tailwind default\s*\*\/\s*$/u;

function normalize(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function tailwindDefaults(filename: string): Map<string, string> {
  const require = createRequire(filename);
  let file: string;
  try {
    file = require.resolve("tailwindcss/theme.css");
  } catch {
    return new Map();
  }
  const existing = cache.get(file);
  if (existing) return existing;
  const defaults = new Map<string, string>();
  for (const match of readFileSync(file, "utf8").matchAll(/^\s*(?<token>--[\w-]+):\s*(?<value>[^;\r\n]+);/gmu)) {
    const { token, value } = match.groups ?? {};
    if (token && value) defaults.set(token, normalize(value));
  }
  cache.set(file, defaults);
  return defaults;
}

export const tailwindDefaultCommentRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require an inline Tailwind default comment on re-declared theme tokens matching installed Tailwind defaults.",
    },
  },
  create(context) {
    const defaults = tailwindDefaults(context.filename);
    const lines = context.sourceCode.text.split(/\r?\n/u);
    return {
      "StyleSheet:exit"(sheet: StyleSheetPlain) {
        for (const theme of atrulesNamed(sheet, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type !== "Declaration" || !child.loc) continue;
            const expected = defaults.get(child.property);
            if (expected === undefined || normalize(generate(child.value)) !== expected) continue;
            const line = lines[child.loc.end.line - 1] ?? "";
            if (COMMENT.test(line)) continue;
            context.report({
              node: child,
              message: `Tailwind default token ${child.property} MUST end with /* Tailwind default */ on the declaration line.`,
            });
          }
        }
      },
    };
  },
};
