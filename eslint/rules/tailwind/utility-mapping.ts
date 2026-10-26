/**
 * ESLint rule: pasika/utility-mapping
 *
 * A custom utility maps one Tailwind styling operation into the project's
 * Tailwind API. Reusable presentation belongs in components instead of
 * utilities that bundle multiple operations.
 *
 * The rule also requires simple font-size and letter-spacing mappings to
 * use theme tokens and rejects aliases of configured, equivalent Tailwind
 * typography utilities. Ambiguous CSS remains untouched.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers, rawValue, rules } from "./helpers";

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
 * Recognize one plain arbitrary-property or typed variable @apply,
 * without other declarations, modifiers or nested blocks. Ambiguous cases
 * remain custom utilities until their compiled CSS can be reviewed manually.
 */
function themeCandidate(name: string, utilityText: string): ThemeCandidate | undefined {
  const source = utilityText.trim();
  const arbitrary =
    /^@utility\s+[\w-]+\s*\{\s*@apply\s+\[(?<property>font-size|letter-spacing):(?<value>[^\]\r\n;{}]+)\];?\s*\}$/u.exec(
      source,
    );
  const typed =
    /^@utility\s+[\w-]+\s*\{\s*@apply\s+(?<kind>text|tracking)-\((?<hint>length:)?(?<variable>--[a-z][a-z0-9-]*)\);?\s*\}$/u.exec(
      source,
    );
  const kind = typed?.groups?.kind;
  const hint = typed?.groups?.hint;
  if (kind === "text" && hint !== "length:") return undefined;
  if (kind === "tracking" && hint !== undefined) return undefined;

  let property = arbitrary?.groups?.property;
  if (!property && kind === "text") property = "font-size";
  if (!property && kind === "tracking") property = "letter-spacing";
  const value =
    arbitrary?.groups?.value?.trim() ?? (typed?.groups?.variable ? `var(${typed.groups.variable})` : undefined);
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

/** Names whose Tailwind classes are part of the common typography API. */
const builtInTextSizes = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
]);
const builtInTracking = new Set(["tighter", "tight", "normal", "wide", "wider", "widest"]);

interface ThemeDefinition {
  node: CssNodePlain;
  value: string;
}

/**
 * Accept only direct numeric CSS lengths; 14px != 0.875rem because the root
 * font size can vary. Ignore calc(), fallbacks, keywords, complex syntax, etc.
 */
function lengthIdentity(value: string): string | undefined {
  const match = /^(?<number>-?(?:\d+(?:\.\d*)?|\.\d+))(?<unit>px|rem|em|%)$/u.exec(value);
  const number = match?.groups?.number;
  const unit = match?.groups?.unit;
  if (!number || !unit) return undefined;
  return `${String(Number(number))}${unit}`;
}

function declarationValue(text: string): string | undefined {
  const match = /^--[\w-]+\s*:\s*(?<value>[^;{}]+);?$/u.exec(text.trim());
  return match?.groups?.value?.trim();
}

function canonicalToken(name: string): boolean {
  if (name.startsWith("--text-")) return builtInTextSizes.has(name.slice("--text-".length));
  if (name.startsWith("--tracking-")) return builtInTracking.has(name.slice("--tracking-".length));
  return false;
}

function isTypographySize(name: string): boolean {
  return /^--text-(?!.*--)(?:[a-z0-9]+-)*[a-z0-9]+$/u.test(name);
}

export const utilityMappingRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require one styling operation per custom utility and enforce theme tokens instead of redundant mappings.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const utilities = atrulesNamed(node, "utility");
        const themeTokens = new Set<string>();
        const nameCounts = new Map<string, number>();
        for (const theme of atrulesNamed(node, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type === "Declaration") themeTokens.add(child.property);
          }
        }
        for (const utility of utilities) {
          const name = preludeIdentifiers(utility)[0] ?? "";
          nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
        }

        // Theme-generated classes can be redundant too. Only compare
        // explicit tokens in this stylesheet, not presumed Tailwind defaults
        // (projects can reset the theme with "--*: initial").
        const themeDefinitions = new Map<string, ThemeDefinition[]>();
        for (const theme of atrulesNamed(node, "theme")) {
          for (const child of blockChildren(theme)) {
            if (child.type !== "Declaration") continue;
            const value = declarationValue(context.sourceCode.getText(child));
            if (!value) continue;
            const definitions = themeDefinitions.get(child.property) ?? [];
            definitions.push({ node: child, value });
            themeDefinitions.set(child.property, definitions);
          }
        }

        // Resolve a single, unambiguous :root value only. Multiple
        // definitions (including overrides) are dynamic, not duplicates.
        const rootValues = new Map<string, string[]>();
        const overriddenVariables = new Set<string>();
        for (const cssRule of rules(node)) {
          if (!("prelude" in cssRule) || !cssRule.prelude) continue;
          const isRoot = context.sourceCode.getText(cssRule.prelude).trim() === ":root";
          for (const child of blockChildren(cssRule)) {
            if (child.type !== "Declaration" || !child.property.startsWith("--")) continue;
            if (!isRoot) {
              overriddenVariables.add(child.property);
              continue;
            }
            const value = declarationValue(context.sourceCode.getText(child));
            if (!value) continue;
            const definitions = rootValues.get(child.property) ?? [];
            definitions.push(value);
            rootValues.set(child.property, definitions);
          }
        }

        function identity(value: string): string | undefined {
          const variable = /^var\((?<name>--[a-z][a-z0-9-]*)\)$/u.exec(value);
          if (!variable) return lengthIdentity(value);
          const name = variable.groups?.name;
          if (!name || overriddenVariables.has(name)) return undefined;
          const definitions = rootValues.get(name);
          const definition = definitions?.length === 1 ? definitions[0] : undefined;
          return definition ? lengthIdentity(definition) : undefined;
        }

        for (const [name, definitions] of themeDefinitions) {
          const definition = definitions.length === 1 ? definitions[0] : undefined;
          if (!definition || canonicalToken(name)) continue;
          if (!isTypographySize(name) && !name.startsWith("--tracking-")) continue;
          if (name.includes("--", 2)) continue; // --text-sm--line-height, etc.
          const value = identity(definition.value);
          if (!value) continue;
          const prefix = name.startsWith("--text-") ? "--text-" : "--tracking-";
          for (const [other, otherDefinitions] of themeDefinitions) {
            const otherDefinition = otherDefinitions.length === 1 ? otherDefinitions[0] : undefined;
            if (!canonicalToken(other) || !other.startsWith(prefix) || !otherDefinition) continue;
            if (identity(otherDefinition.value) !== value) continue;
            // A configured text-* class can emit extra line-height,
            // letter-spacing, or font-weight declarations. Such a class
            // cannot replace a size-only class without semantic review.
            if (
              prefix === "--text-" &&
              ["--line-height", "--letter-spacing", "--font-weight"].some(
                (suffix) => themeDefinitions.has(`${name}${suffix}`) || themeDefinitions.has(`${other}${suffix}`),
              )
            ) {
              continue;
            }
            context.report({
              node: definition.node,
              message:
                `Theme token "${name}" duplicates the configured built-in "${other}" (${value}); ` +
                `reuse the "${other.slice(2)}" utility instead of defining an equivalent theme token.`,
            });
            break;
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

          if (nameCounts.get(name) !== 1) continue;
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
