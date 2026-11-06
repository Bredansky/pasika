/**
 * ESLint rule: pasika/unique-css-token-value
 *
 * Static values are unique across all tokens, including cross-role colors.
 * Conditional overrides are not defaults.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_NAMED_COLORS } from "./css-named-colors";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

/** Compare fixed colors without changing their source format or rounding precision. */
export function normalizedColor(text: string): string | undefined {
  const hex = /^#(?<digits>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(text)?.groups?.digits;
  if (hex) {
    const expanded = hex.length <= 4 ? Array.from(hex.matchAll(/./gu), (match) => match[0] + match[0]).join("") : hex;
    const channels = [0, 2, 4].map((start) => Number.parseInt(expanded.slice(start, start + 2), 16));
    const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
    return `srgb:${channels.join(",")}/${String(alpha)}`;
  }
  const named = CSS_NAMED_COLORS[text.toLowerCase()];
  if (Array.isArray(named)) return `srgb:${named.join(",")}/1`;

  const expression = /^(?<kind>rgba?|hsla?)\(\s*(?<body>[^()]*)\s*\)$/iu.exec(text);
  if (!expression?.groups) return undefined;
  const parts = (expression.groups.body ?? "").replace(/,/gu, " ").replace(/\//gu, " / ").trim().split(/\s+/u);
  const alphaIndex = parts[3] === "/" ? 4 : 3;
  if (parts.length !== 3 && !(parts.length === 4 && parts[3] !== "/") && !(parts.length === 5 && parts[3] === "/")) {
    return undefined;
  }
  const alphaText = parts[alphaIndex];
  const parseNumeric = (raw: string): number | undefined => {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/u.test(raw)) return undefined;
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? numeric : undefined;
  };
  const alpha = alphaText === undefined ? 1 : parseNumeric(alphaText);
  if (alpha === undefined || alpha < 0 || (alphaText?.endsWith("%") ? alpha > 100 : alpha > 1)) return undefined;
  const opacity = alphaText?.endsWith("%") ? alpha / 100 : alpha;
  const kind = expression.groups.kind?.toLowerCase();
  let channels: number[];
  if (kind === "rgb" || kind === "rgba") {
    const rgb = parts.slice(0, 3).map((part) => {
      const value = parseNumeric(part);
      if (value === undefined) return Number.NaN;
      if (part.endsWith("%")) return (value * 255) / 100;
      return value;
    });
    if (rgb.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) return undefined;
    channels = rgb;
  } else {
    const hue = parseNumeric(parts[0] ?? "");
    const saturation = parseNumeric(parts[1] ?? "");
    const lightness = parseNumeric(parts[2] ?? "");
    if (hue === undefined || saturation === undefined || lightness === undefined) return undefined;
    if (parts[0]?.endsWith("%") || !parts[1]?.endsWith("%") || !parts[2]?.endsWith("%")) return undefined;
    if (saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) return undefined;
    const h = ((hue % 360) + 360) % 360;
    const s = saturation / 100;
    const l = lightness / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma / 2;
    let rgb: number[];
    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    const exact = rgb.map((channel) => (channel + m) * 255);
    // Only compare HSL to other formats when conversion is unambiguously
    // an exact 8-bit channel. Never round an arbitrary HSL color.
    if (exact.some((channel) => Math.abs(channel - Math.round(channel)) > 1e-10)) return undefined;
    channels = exact.map(Math.round);
  }
  return `srgb:${channels.join(",")}/${String(opacity)}`;
}

/** Normalize provably equivalent fixed syntax; leave dynamic values alone. */
function valueIdentity(value: string): string {
  const text = value.trim();
  return normalizedColor(text) ?? text;
}

function isComparable(symbol: CssSymbol): boolean {
  if (symbol.value === undefined || symbol.value.trim() === "") return false;
  // Runtime-dependent values are not statically equal, even when their syntax matches.
  if (/\b(?:var|env|attr|calc|min|max|clamp|color-mix|light-dark)\s*\(/iu.test(symbol.value)) return false;
  return symbol.kind === "theme-token" || (symbol.kind === "root-variable" && symbol.scope === "default");
}

function compareLocations(left: CssSymbol, right: CssSymbol): number {
  const file = left.file.localeCompare(right.file);
  return file || left.line - right.line;
}

export const uniqueCssTokenValueRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Reject distinct CSS design tokens with duplicate static values across the project.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({
        path: file,
        content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
      })),
      modules: [],
      includeReferences: false,
    });

    const byValue = new Map<string, CssSymbol[]>();
    for (const definition of graph.definitions) {
      if (!isComparable(definition)) continue;
      const value = valueIdentity(definition.value ?? "");
      const group = byValue.get(value) ?? [];
      group.push(definition);
      byValue.set(value, group);
    }

    // A fixed HSL primitive wrapped by hsl(var(--primitive)) is an unnecessary
    // intermediate layer. Define the public Tailwind color directly instead.
    // Dynamic / variant-driven primitives are intentionally excluded.
    const fixedHslPrimitives = new Map(
      graph.definitions
        .filter((symbol) => symbol.kind === "theme-token" && symbol.value !== undefined)
        .filter((symbol) => /^\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%\s*$/u.test(symbol.value ?? ""))
        .map((symbol) => [symbol.name, symbol] as const),
    );
    const wrappedPrimitives = new Map<CssSymbol, CssSymbol>();
    for (const symbol of graph.definitions) {
      if (symbol.kind !== "theme-token" || !symbol.name.startsWith("--color-")) continue;
      const primitive = /^hsl\(\s*var\(\s*(?<name>--[\w-]+)\s*\)\s*\)$/u.exec(symbol.value ?? "")?.groups?.name;
      const original = primitive ? fixedHslPrimitives.get(primitive) : undefined;
      if (original && original.name !== symbol.name) wrappedPrimitives.set(symbol, original);
    }

    const redundant = new Map<CssSymbol, CssSymbol>();
    for (const group of byValue.values()) {
      group.sort(compareLocations);
      const seen: CssSymbol[] = [];
      for (const definition of group) {
        const original = seen.find((prior) => prior.name !== definition.name);
        if (original) redundant.set(definition, original);
        seen.push(definition);
      }
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const [definition, primitive] of wrappedPrimitives) {
          if (definition.file !== current) continue;
          context.report({
            node,
            loc: {
              start: { line: definition.line, column: 1 },
              end: { line: definition.line, column: 2 },
            },
            message: `Color token "${definition.name}" unnecessarily wraps fixed HSL primitive "${primitive.name}"; define a single --color-* token with hsl(...) directly and reuse it across utility roles.`,
          });
        }
        for (const [definition, original] of redundant) {
          if (definition.file !== current) continue;
          context.report({
            node,
            loc: {
              start: { line: definition.line, column: 1 },
              end: { line: definition.line, column: 2 },
            },
            message: `Token "${definition.name}" duplicates the value of "${original.name}" in ${path.relative(
              sourceRoot,
              original.file,
            )}:${String(original.line)}; reuse one design token.`,
          });
        }
      },
    };
  },
};
