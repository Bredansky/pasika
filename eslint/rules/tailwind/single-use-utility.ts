/**
 * ESLint rule: pasika/single-use-utility
 *
 * Styling used by only one component MUST stay in that component as static
 * Tailwind classes instead of becoming a global custom utility.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import { statSync } from "node:fs";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, preludeIdentifiers } from "./helpers";
import { sourceRootOf } from "../project-root";
import { SOURCE_EXTENSIONS, cachedTextReader, escapeRegExp, findFiles } from "./source-files";

function usagePattern(name: string): RegExp {
  return new RegExp(`(?<![\\\\w-])${escapeRegExp(name)}(?![\\\\w-])`);
}

export const singleUseUtilityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow custom utilities referenced by only one source file.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    let files: string[];
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
      files = findFiles(sourceRoot, SOURCE_EXTENSIONS);
    } catch {
      return {};
    }

    const textOf = cachedTextReader();

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          if (!name) continue;

          const pattern = usagePattern(name);
          const definition = `@utility ${name}`;
          const consumers = files.filter((file) => pattern.test(textOf(file).replaceAll(definition, "")));
          if (consumers.length !== 1) continue;
          context.report({
            node: utility,
            message: `Custom utility "${name}" is used by only one source file; keep that styling as static Tailwind classes in its consumer.`,
          });
        }
      },
    };
  },
};
