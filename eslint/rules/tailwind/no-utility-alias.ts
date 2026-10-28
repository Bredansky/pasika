/**
 * ESLint rule: pasika/no-utility-alias
 *
 * A custom utility with only one plain @apply class is a redundant rename.
 * Runs on every stylesheet, including files imported by globals.css.
 * Typed CSS-variable utilities, arbitrary properties, modifiers and nested
 * constructs are not plain aliases.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";

/** Match the full @apply source, not a lossy AST identifier list. */
function plainUtilityAlias(utility: CssNodePlain, textOf: (node: CssNodePlain) => string): string | undefined {
  const children = blockChildren(utility);
  if (children.length !== 1) return undefined;
  const apply = children[0];
  if (apply?.type !== "Atrule" || apply.name !== "apply") return undefined;
  const source = textOf(apply).trim();
  return /^@apply\s+(?<name>-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z0-9.%-]+)?)\s*;?$/u.exec(source)?.groups?.name;
}

export const noUtilityAliasRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow custom @utility definitions that only rename one plain Tailwind class.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const alias = plainUtilityAlias(utility, (child) => context.sourceCode.getText(child));
          if (!alias) continue;
          const name = preludeIdentifiers(utility)[0] ?? "unknown";
          context.report({
            node: utility,
            message: `Custom utility "${name}" only renames "${alias}"; use the class directly instead of defining an @utility alias.`,
          });
        }
      },
    };
  },
};
