/**
 * ESLint rule: pasika/utility-mapping
 *
 * A custom utility maps one Tailwind styling operation into the project's
 * Tailwind API. Reusable presentation belongs in components instead of
 * utilities that bundle multiple operations.
 *
 * An opt-in diagnostic identifies simple @utility mappings that a Tailwind
 * theme token could provide. It does not modify styles or enable new lint
 * failures for existing consumers by default.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers, rawValue } from "./helpers";

function applyOperationCount(utility: CssNodePlain): number {
  let count = 0;

  for (const apply of atrulesNamed(utility, "apply")) {
    const identifiers = preludeIdentifiers(apply);
    if (identifiers.length > 0) {
      count += identifiers.length;
      continue;
    }

    const prelude = "prelude" in apply ? apply.prelude : undefined;
    const raw = prelude ? rawValue(prelude) : "";
    const rawOperations = raw.trim().split(/\s+/).filter(Boolean);
    count += rawOperations.length > 0 ? rawOperations.length : 1;
  }

  return count;
}

interface ThemeCandidate {
  token: string;
  property: string;
  value: string;
}

/**
 * Conservative POC: one plain arbitrary-property @apply, with no other
 * declarations, variants, modifiers or nested blocks. Ambiguous cases remain
 * custom utilities until their compiled CSS has been reviewed manually.
 */
function themeCandidate(name: string, utilityText: string): ThemeCandidate | undefined {
  const match =
    /^@utility\s+[\w-]+\s*\{\s*@apply\s+\[(?<property>font-size|letter-spacing):(?<value>[^\]\r\n;{}]+)\];?\s*\}$/u.exec(
      utilityText.trim(),
    );
  if (!match) return undefined;

  const property = match.groups?.property;
  const value = match.groups?.value?.trim();
  if (!property || !value) return undefined;

  const prefix = property === "font-size" ? "text-" : "tracking-";
  if (!name.startsWith(prefix) || name.length === prefix.length) return undefined;

  // Only plain length values and standalone CSS variables are considered.
  // In particular, underscore escapes, calc(), keywords and multiple values
  // require semantic review rather than an automated lint recommendation.
  const length = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%)$/u.test(value);
  const variable = /^var\(--[a-z][a-z0-9-]*\)$/u.test(value);
  if (!length && !variable) return undefined;
  if (property === "font-size" && value.startsWith("-")) return undefined;

  return { token: `--${name}`, property, value };
}

export const utilityMappingRule: CSSRuleDefinition = {
  meta: {
    schema: [
      {
        type: "object",
        properties: { preferThemeTokens: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    type: "problem",
    docs: {
      description: "Require one styling operation per custom utility; optionally suggest theme-generated utilities.",
    },
  },
  create(context) {
    const option: unknown = context.options[0];
    const preferThemeTokens =
      typeof option === "object" &&
      option !== null &&
      "preferThemeTokens" in option &&
      option.preferThemeTokens === true;

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const utilities = atrulesNamed(node, "utility");
        const themeTokens = new Set<string>();
        const nameCounts = new Map<string, number>();
        if (preferThemeTokens) {
          for (const theme of atrulesNamed(node, "theme")) {
            for (const child of blockChildren(theme)) {
              if (child.type === "Declaration") themeTokens.add(child.property);
            }
          }
          for (const utility of utilities) {
            const name = preludeIdentifiers(utility)[0] ?? "";
            nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
          }
        }

        for (const utility of utilities) {
          const name = preludeIdentifiers(utility)[0] ?? "unknown";
          const operationCount = applyOperationCount(utility);
          if (operationCount !== 1) {
            context.report({
              node: utility,
              message:
                `Custom utility "${name}" maps ${String(operationCount)} Tailwind operations; ` +
                "custom utilities must map exactly one operation. Reusable presentation belongs in a component.",
            });
            continue;
          }

          if (!preferThemeTokens || nameCounts.get(name) !== 1) continue;
          const candidate = themeCandidate(name, context.sourceCode.getText(utility));
          if (!candidate || themeTokens.has(candidate.token)) continue;
          if (candidate.property === "font-size" && themeTokens.has(`--color-${name.slice(5)}`)) continue;

          context.report({
            node: utility,
            message:
              `Custom utility "${name}" only maps ${candidate.property} (${candidate.value}); ` +
              `prefer @theme inline token "${candidate.token}" backed by a :root variable. ` +
              "Preserve the class name and compare compiled CSS before removing the utility.",
          });
        }
      },
    };
  },
};
