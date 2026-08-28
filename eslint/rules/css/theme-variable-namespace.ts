/**
 * ESLint rule: pasika/theme-variable-namespace
 *
 * A value that needs at least two utility classes from the same Tailwind
 * theme-variable namespace MUST use that namespace and have the same name in
 * :root.
 *
 * @see docs/styling-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";

export const themeVariableNamespaceRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require utility classes from the same theme namespace to share a prefix.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // Namespaces are the first segment of each theme variable name, e.g.
        // --color-* defines the `color` namespace.
        const namespaces = new Set<string>();
        for (const theme of atrulesNamed(node, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type !== "Declaration") continue;
            const segments = child.property.replace(/^--/, "").split("-");
            if (segments[0]) namespaces.add(segments[0]);
          }
        }

        for (const apply of atrulesNamed(node, "apply")) {
          const classes = preludeIdentifiers(apply);
          for (const ns of namespaces) {
            const matching = classes.filter((name) => name.startsWith(`${ns}-`) || name === ns);
            if (matching.length < 2) continue;
            // All classes from one namespace must share a deeper prefix.
            const prefixes = matching.map((name) => name.split("-").slice(0, 2).join("-"));
            if (new Set(prefixes).size > 1) {
              context.report({
                node: apply,
                message: `Utility classes ${matching.join(", ")} use namespace "${ns}" but lack a shared prefix; use the theme-variable namespace prefix.`,
              });
            }
          }
        }
      },
    };
  },
};
