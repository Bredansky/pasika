/**
 * ESLint rule: pasika/color-literal-usage
 *
 * Reusable fixed CSS colors belong in --color-* tokens. Fixed colors used
 * only once in CSS must be inlined, rather than wrapped in one-off color
 * tokens. Keep the source color syntax unchanged.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";

const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/giu;
const HEX_COLOR = /#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})(?![\da-f])/giu;
const NAMED_COLORS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan " +
    "darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen " +
    "darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey " +
    "darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite " +
    "forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
    "hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue " +
    "lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon " +
    "lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen " +
    "linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

const DECLARATION = /(?:^|[;{}\n])\s*(?<property>--[\w-]+|[a-z][\w-]*)\s*:\s*(?<value>[^;{}]*)/gmu;
const APPLY = /@apply\s+(?<value>[^;{}]*);/gu;

/** Hide comments, strings and url() payloads without changing source offsets. */
function maskNonColors(source: string): string {
  const spaces = (text: string): string => text.replace(/[^\r\n]/gu, " ");
  const masked = source.replace(/\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu, spaces);
  return masked.replace(/\burl\s*\([^)]*\)/giu, spaces);
}

function matchingClose(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === "(") depth++;
    if (text[index] === ")" && --depth === 0) return index + 1;
  }
  return -1;
}

/** Report only literal colors. Dynamic functions with var()/env() are not fixed literals. */
function colorLiterals(value: string): { text: string; offset: number }[] {
  const matches: { text: string; offset: number }[] = [];
  const occupied: { start: number; end: number }[] = [];
  for (const functionMatch of value.matchAll(COLOR_FUNCTION)) {
    const start = functionMatch.index;
    if (occupied.some((range) => start >= range.start && start < range.end)) continue;
    const open = start + functionMatch[0].lastIndexOf("(");
    const end = matchingClose(value, open);
    if (end < 0) continue;
    const text = value.slice(start, end);
    occupied.push({ start, end });
    if (!/\b(?:var|env|attr)\s*\(/iu.test(text)) matches.push({ text, offset: start });
  }
  for (const match of value.matchAll(HEX_COLOR)) {
    if (occupied.some((range) => match.index >= range.start && match.index < range.end)) continue;
    if (match.index > 0 && /[\w#-]/u.test(value[match.index - 1] ?? "")) continue;
    matches.push({ text: match[0], offset: match.index });
  }
  for (const word of value.matchAll(/\b[a-z]+\b/giu)) {
    if (!NAMED_COLORS.has(word[0].toLowerCase())) continue;
    if (occupied.some((range) => word.index >= range.start && word.index < range.end)) continue;
    if (word.index > 0 && /[-\w]/u.test(value[word.index - 1] ?? "")) continue;
    if (/[-\w]/u.test(value[word.index + word[0].length] ?? "")) continue;
    matches.push({ text: word[0], offset: word.index });
  }
  return matches.sort((a, b) => a.offset - b.offset);
}

export const colorLiteralUsageRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require reusable colors in tokens and one-off fixed colors inline.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const masked = maskNonColors(context.sourceCode.text);
        const declarations = [...masked.matchAll(DECLARATION)];
        const applyExpressions = [...masked.matchAll(APPLY)];
        const literalKey = (text: string): string => {
          const normalized = text.toLowerCase().replace(/\s+/gu, " ").trim();
          // Treat #fff/#ffffff and #abcd/#aabbccdd as the same fixed color.
          if (/^#[\da-f]{3,4}$/u.test(normalized)) {
            return `#${normalized.slice(1).replace(/[\da-f]/gu, (digit) => digit.repeat(2))}`;
          }
          return normalized;
        };
        const literalUses = new Map<string, number>();
        const literalColorTokens = new Map<string, { color: string; key: string }>();
        const colorTokenReferences = new Map<string, { offset: number; text: string }[]>();
        const trackReferences = (value: string, start: number): void => {
          for (const match of value.matchAll(/\bvar\s*\(\s*(--color-[\w-]+)\s*\)/giu)) {
            const token = match[1];
            if (!token) continue;
            const references = colorTokenReferences.get(token) ?? [];
            references.push({ offset: start + match.index, text: match[0] });
            colorTokenReferences.set(token, references);
          }
        };
        for (const match of declarations) {
          const property = match.groups?.property;
          const value = match.groups?.value;
          if (!property || value === undefined) continue;
          if (property.startsWith("--color-")) {
            const colors = colorLiterals(value);
            if (colors.length === 1 && colors[0]?.text === value.trim()) {
              literalColorTokens.set(property, { color: colors[0].text, key: literalKey(colors[0].text) });
            }
          }
          trackReferences(value, match.index + match[0].lastIndexOf(value));
        }
        for (const match of applyExpressions) {
          const value = match.groups?.value;
          if (value === undefined) continue;
          trackReferences(value, match.index + match[0].indexOf(value));
        }
        for (const match of [...declarations, ...applyExpressions]) {
          const value = match.groups?.value;
          if (value === undefined) continue;
          for (const color of colorLiterals(value)) {
            const key = literalKey(color.text);
            literalUses.set(key, (literalUses.get(key) ?? 0) + 1);
          }
        }

        const reported = new Set<number>();
        const reportValue = (value: string, start: number): void => {
          const colors = colorLiterals(value);
          for (const color of colors) {
            // One-off literals are valid in any CSS value, including composites.
            if (literalUses.get(literalKey(color.text)) === 1) continue;
            const offset = start + color.offset;
            if (reported.has(offset)) continue;
            reported.add(offset);
            const loc = context.sourceCode.getLocFromIndex(offset);
            context.report({
              node,
              loc: { start: loc, end: context.sourceCode.getLocFromIndex(offset + color.text.length) },
              message: `Move literal color "${color.text}" into a --color-* token and reference it with var().`,
            });
          }
        };
        for (const match of declarations) {
          const property = match.groups?.property;
          const value = match.groups?.value;
          if (!property || value === undefined || property.startsWith("--color-")) continue;
          reportValue(value, match.index + match[0].lastIndexOf(value));
        }
        // @apply can contain Tailwind arbitrary property values such as
        // [box-shadow:0_0_#000] which are not standalone CSS declarations.
        for (const match of applyExpressions) {
          const value = match.groups?.value;
          if (value === undefined) continue;
          reportValue(value, match.index + match[0].indexOf(value));
        }
        // A color token used in only one CSS expression adds an unnecessary
        // indirection. Tokens without CSS references can power Tailwind
        // utilities, so they are not treated as one-off composite colors.
        for (const [token, definition] of literalColorTokens) {
          const references = colorTokenReferences.get(token);
          if (references?.length !== 1 || literalUses.get(definition.key) !== 1) continue;
          const reference = references[0];
          if (!reference) continue;
          const start = context.sourceCode.getLocFromIndex(reference.offset);
          const end = context.sourceCode.getLocFromIndex(reference.offset + reference.text.length);
          context.report({
            node,
            loc: { start, end },
            message: `Inline one-off fixed color "${definition.color}" instead of referencing "${token}" through var().`,
          });
        }
      },
    };
  },
};
