/**
 * ESLint rule: pasika/utility-name-parity
 *
 * Require property/value parity for every static, single-@apply custom utility.
 * Readable literals retain units; complex expressions retain a stable digest.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import { createHash } from "node:crypto";
import type { CSSRuleDefinition } from "@eslint/css";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";

const arbitraryPrefixProperties = new Map([
  ["h", "height"],
  ["w", "width"],
  ["min-h", "min-height"],
  ["min-w", "min-width"],
  ["max-h", "max-height"],
  ["max-w", "max-width"],
  ["bg", "background-image"],
  ["shadow", "box-shadow"],
  ["grid-cols", "grid-template-columns"],
  ["grid-rows", "grid-template-rows"],
  ["text", "color"],
  ["rounded", "border-radius"],
  ["tracking", "letter-spacing"],
  ["leading", "line-height"],
  ["gap", "gap"],
  ["p", "padding"],
  ["m", "margin"],
  ["top", "top"],
  ["left", "left"],
  ["right", "right"],
  ["bottom", "bottom"],
  ["inset", "inset"],
  ["z", "z-index"],
  ["opacity", "opacity"],
]);

function numericPart(value: string): string | undefined {
  const match =
    /^(?<negative>-?)(?<number>(?:\d+(?:\.\d+)?|\.\d+))(?<unit>%|px|rem|em|vw|vh|dvw|dvh|ch|fr|s|ms|deg|turn)?$/u.exec(
      value,
    );
  if (!match?.groups?.number) return undefined;
  const number = String(Number(match.groups.number)).replace(".", "p");
  const sign = match.groups.negative === "-" ? "neg-" : "";
  return sign + number + (match.groups.unit === "%" ? "pct" : (match.groups.unit ?? ""));
}

function readableValue(value: string): string | undefined {
  const words = value
    .trim()
    .replace(/,/gu, "_comma_")
    .split(/[_\s]+/u)
    .filter(Boolean);
  if (words.length === 0 || words.length > 8) return undefined;
  const parts: string[] = [];
  for (const word of words) {
    const numeric = numericPart(word);
    if (numeric) {
      parts.push(numeric);
      continue;
    }
    const hex = /^#(?<color>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(word)?.groups?.color;
    if (hex) {
      parts.push("hex", hex.toLowerCase());
      continue;
    }
    const variable = /^var\(--(?<name>[a-z][a-z0-9-]*)\)$/u.exec(word)?.groups?.name;
    if (variable) {
      parts.push("var", variable);
      continue;
    }
    if (/^[a-z][a-z0-9-]*$/iu.test(word)) {
      parts.push(word.toLowerCase());
      continue;
    }
    return undefined;
  }
  const slug = parts.join("-");
  return slug.length <= 70 ? slug : undefined;
}

function compoundValue(value: string): string {
  const readable = readableValue(value);
  if (readable) return readable;
  const candidate = /^(?<fn>[a-z][a-z0-9-]*)\(/iu.exec(value.trim())?.groups?.fn?.toLowerCase();
  const hint = candidate?.endsWith("-") ? undefined : candidate;
  const digest = createHash("sha256").update(value.trim()).digest("hex").slice(0, 12);
  return [hint, "hash", digest].filter(Boolean).join("-");
}

interface Operation {
  property: string;
  value: string;
}

function parseOperation(applyText: string): Operation | undefined {
  const expression = /^@apply\s+(?<content>[\s\S]+?)\s*;?$/u
    .exec(applyText.trim())
    ?.groups?.content?.replace(/;\s*$/u, "")
    .trim();
  if (!expression) return undefined;
  const arbitraryProperty = /^\[(?<property>-?[a-z][a-z0-9-]*):(?<value>[\s\S]+)\]$/iu.exec(expression);
  if (arbitraryProperty?.groups?.property && arbitraryProperty.groups.value) {
    return { property: arbitraryProperty.groups.property, value: arbitraryProperty.groups.value };
  }
  const arbitraryClass = /^(?<prefix>[a-z][a-z0-9-]*)-\[(?<value>[\s\S]+)\]$/u.exec(expression);
  const prefix = arbitraryClass?.groups?.prefix;
  const raw = arbitraryClass?.groups?.value;
  if (prefix && raw) {
    const kind = /^(?<hint>length|color|image|size|position):(?<value>[\s\S]+)$/u.exec(raw)?.groups;
    const value = kind?.value ?? raw;
    if (prefix === "text") {
      const isLength = kind?.hint === "length" || /^(?:\d+(?:\.\d+)?)(?:px|rem|em|vh|vw|%)$/u.test(raw);
      const isColor = kind?.hint === "color" || /^(?:#|(?:rgb|hsl|oklch|color)\()/u.test(raw);
      if (isLength) return { property: "font-size", value };
      if (isColor) return { property: "color", value };
      return { property: "", value: expression }; // Tailwind text-* needs a type hint.
    }
    if (prefix === "bg") {
      const isImage = kind?.hint === "image" || /^(?:(?:repeating-)?(?:linear|radial|conic)-gradient|url)\(/u.test(raw);
      const isColor = kind?.hint === "color" || /^(?:#|(?:rgb|hsl|oklch|color)\()/u.test(raw);
      if (isImage) return { property: "background-image", value };
      if (isColor) return { property: "background-color", value };
      if (kind?.hint === "size") return { property: "background-size", value };
      if (kind?.hint === "position") return { property: "background-position", value };
      return { property: "", value: expression };
    }
    const property = arbitraryPrefixProperties.get(prefix);
    if (property) return { property, value: raw };
  }
  const typedClass = /^(?<prefix>[a-z][a-z0-9-]*)-\((?<hint>[a-z-]+:)?(?<variable>--[a-z][a-z0-9-]*)\)$/u.exec(
    expression,
  );
  if (typedClass?.groups?.prefix && typedClass.groups.variable) {
    const typedPrefix = typedClass.groups.prefix;
    const hinted = typedClass.groups.hint;
    if (typedPrefix === "text" && hinted === "length:") {
      return { property: "font-size", value: `var(${typedClass.groups.variable})` };
    }
    if (typedPrefix === "font" && hinted === "number:") {
      return { property: "font-weight", value: `var(${typedClass.groups.variable})` };
    }
    if (typedPrefix === "font" && hinted === "family-name:") {
      return { property: "font-family", value: `var(${typedClass.groups.variable})` };
    }
    if ((typedPrefix === "text" || typedPrefix === "bg" || typedPrefix === "font") && !hinted) {
      return { property: "", value: expression };
    }
    if (typedPrefix === "bg" && hinted) {
      const type = hinted.slice(0, -1);
      if (type === "image") return { property: "background-image", value: `var(${typedClass.groups.variable})` };
      if (type === "color") return { property: "background-color", value: `var(${typedClass.groups.variable})` };
      if (type === "size") return { property: "background-size", value: `var(${typedClass.groups.variable})` };
      if (type === "position") return { property: "background-position", value: `var(${typedClass.groups.variable})` };
      return { property: "", value: expression };
    }
    const typedProperty = arbitraryPrefixProperties.get(typedPrefix);
    if (typedProperty) return { property: typedProperty, value: `var(${typedClass.groups.variable})` };
  }
  return { property: "", value: expression };
}

function expectedName(operation: Operation): string {
  const value = compoundValue(operation.value);
  if (operation.property === "background-size") return `bg-size-${value}`;
  return `css-${operation.property.replace(/^-+/u, "")}-${value}`;
}

function singleApply(utility: CssNodePlain, textOf: (node: CssNodePlain) => string): Operation | undefined {
  const children = blockChildren(utility);
  if (children.length !== 1) return undefined;
  const child = children[0];
  if (child?.type !== "Atrule" || child.name !== "apply") return undefined;
  return parseOperation(textOf(child));
}

export const utilityNameParityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require single-operation custom utilities to have deterministic property/value-derived names.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const utility of atrulesNamed(node, "utility")) {
          const name = preludeIdentifiers(utility)[0];
          if (!name || name.endsWith("-*")) continue;
          const operation = singleApply(utility, (child) => context.sourceCode.getText(child));
          if (!operation) continue;
          if (!operation.property) {
            context.report({
              node: utility,
              message: `Custom utility "${name}" applies "${operation.value}", but its actual CSS property/value cannot be resolved safely; use an explicit [property:value] @apply mapping instead of a guessed name.`,
            });
            continue;
          }
          const expected = expectedName(operation);
          if (name === expected) continue;
          context.report({
            node: utility,
            message: `Custom utility "${name}" maps ${operation.property}: ${operation.value}; rename it "${
              expected
            }" to preserve property/value parity.`,
          });
        }
      },
    };
  },
};
