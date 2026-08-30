/**
 * ESLint rule: pasika/unused-utility
 *
 * A custom utility MUST be used by at least one file in the repository's
 * source; an @utility no file references is dead. The rule reads the src/ tree
 * from disk and reports @utility blocks whose name appears nowhere, because a
 * stylesheet alone cannot see what the components use.
 *
 * @see docs/styling-guide/rules/theme-and-utility-definition-rule.md
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";

/** File kinds that can reference a utility class: source modules and stylesheets. */
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".css"];

/** Every file under `dir` that could reference a utility class, recursively. */
function sourceFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    if (entry.startsWith(".") || entry === "node_modules") return [];
    const entryPath = path.join(dir, entry);
    let stats;
    try {
      stats = statSync(entryPath);
    } catch {
      return [];
    }
    if (stats.isDirectory()) return sourceFiles(entryPath);
    return SOURCE_EXTENSIONS.includes(path.extname(entry)) ? [entryPath] : [];
  });
}

/**
 * A usage regex for one utility name. The lookarounds require the name to be a
 * standalone token — not adjacent to a word or dash character — so a reference
 * to `primary-surface` never counts as a use of `primary`, and `surface-primary-x`
 * never counts as a use of `surface-primary`.
 */
function usagePattern(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
}

export const unusedUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require every custom @utility to be referenced by the repository's source.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    let files: string[];
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
      files = sourceFiles(sourceRoot);
    } catch {
      // No src/ tree: the rule is inert, like the other cross-file rules.
      return {};
    }

    // Read every file once per linted stylesheet, so one utility never forces
    // a re-read of the same file.
    const texts = new Map<string, string>();
    const textOf = (file: string): string => {
      let text = texts.get(file);
      if (text === undefined) {
        try {
          text = readFileSync(file, "utf8");
        } catch {
          text = "";
        }
        texts.set(file, text);
      }
      return text;
    };

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          if (!name) continue;

          const pattern = usagePattern(name);
          // The defining stylesheet contains the name in the `@utility` line
          // itself, so drop that exact token before scanning; a reference in
          // the same file via `@apply` still counts.
          const definition = `@utility ${name}`;
          const used = files.some((file) => pattern.test(textOf(file).replaceAll(definition, "")));
          if (used) continue;

          context.report({
            node: utility,
            message: `Custom utility "${name}" is never used by the repository's source; remove it or use it.`,
          });
        }
      },
    };
  },
};
