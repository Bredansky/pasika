/**
 * ESLint rule: pasika/unused-utility
 *
 * A custom utility MUST be used by at least one file in the repository's
 * source; an @utility no file references is dead. The rule reads the src/ tree
 * from disk and reports @utility blocks whose name appears nowhere, because a
 * stylesheet alone cannot see what the components use.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import { statSync } from "node:fs";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";
import { sourceRootOf } from "../project-root";
import { SOURCE_EXTENSIONS, cachedTextReader, escapeRegExp, findFiles } from "./source-files";

/**
 * A usage regex for one utility name. The lookarounds require the name to be a
 * standalone token — not adjacent to a word or dash character — so a reference
 * to `primary-surface` never counts as a use of `primary`, and `surface-primary-x`
 * never counts as a use of `surface-primary`.
 */
function usagePattern(name: string): RegExp {
  return new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`);
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
    const sourceRoot = sourceRootOf(context);
    let files: string[];
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
      files = findFiles(sourceRoot, SOURCE_EXTENSIONS);
    } catch {
      // No src/ tree: the rule is inert, like the other cross-file rules.
      return {};
    }

    const textOf = cachedTextReader();

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