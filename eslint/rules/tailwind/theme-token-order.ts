/**
 * ESLint rule: pasika/theme-token-order
 *
 * Keep the global Tailwind v4 theme grouped by purpose and alphabetically
 * ordered within each group. The theme reset remains first.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";

export const THEME_GROUPS = [
  "Color primitives",
  "Semantic colors",
  "Fixed and brand colors",
  "Font families",
  "Typography",
  "Spacing and sizing",
  "Breakpoints, containers, and aspect ratios",
  "Border radii",
  "Shadows and visual effects",
  "Background images",
  "Transitions and easing",
  "Animations",
  "Blur",
  "Other tokens",
];

const primitiveColors = new Set([
  "--accent",
  "--base-canvas",
  "--base-edge",
  "--base-ink",
  "--card",
  "--destructive",
  "--magenta",
  "--muted",
  "--muted-ink",
  "--primary",
  "--rainbow-ink",
  "--retro-edge",
  "--retro-shadow",
  "--secondary",
  "--violet",
]);

export function themeGroupName(name: string, value: string): string {
  if (primitiveColors.has(name)) return "Color primitives";
  if (name.startsWith("--color-")) {
    return value.includes("var(") ? "Semantic colors" : "Fixed and brand colors";
  }
  if (name.startsWith("--font-") && !name.startsWith("--font-weight-")) return "Font families";
  if (/^--(?:font-weight|text-|tracking-|leading-)/u.test(name)) return "Typography";
  if (name.startsWith("--spacing")) return "Spacing and sizing";
  if (/^--(?:breakpoint|container|aspect)-/u.test(name)) return "Breakpoints, containers, and aspect ratios";
  if (name.startsWith("--radius")) return "Border radii";
  if (/^--(?:shadow|inset-shadow|drop-shadow|text-shadow)-/u.test(name)) return "Shadows and visual effects";
  if (name.startsWith("--background-image-")) return "Background images";
  if (/^--(?:default-transition|transition|ease)-/u.test(name)) return "Transitions and easing";
  if (name.startsWith("--animate-")) return "Animations";
  if (name.startsWith("--blur-")) return "Blur";
  return "Other tokens";
}

interface ThemeToken {
  name: string;
  group: string;
  activeHeading?: string;
  line: number;
}

export const themeTokenOrderRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require global Tailwind theme tokens to follow purpose groups and alphabetical order.",
    },
  },
  create(context) {
    // Consumer ownership grouping replaces purpose grouping for opted-in files.
    if (context.sourceCode.text.includes("/* @pasika-component-groups */")) return {};
    const root = sourceRootOf(context);
    const entry = path.normalize(path.join(root, "app", "styles", "globals.css"));
    if (path.normalize(path.resolve(context.filename)) !== entry) return {};

    return {
      "StyleSheet:exit"(sheet: StyleSheetPlain) {
        const theme = [...sheet.children].find(
          (child) => child.type === "Atrule" && child.name === "theme" && child.loc,
        );
        if (!theme?.loc) return;
        const raw = context.sourceCode.text.slice(theme.loc.start.offset, theme.loc.end.offset);
        const opening = raw.indexOf("{");
        const closing = raw.lastIndexOf("}");
        if (opening === -1 || closing <= opening) return;

        const lines = raw.slice(opening + 1, closing).split(/\r?\n/u);
        const firstLine = theme.loc.start.line + (raw.slice(0, opening + 1).match(/\n/gu)?.length ?? 0);
        const tokens: ThemeToken[] = [];
        let activeHeading: string | undefined;
        let hasGroupHeadings = false;

        for (const [index, line] of lines.entries()) {
          const heading = /^\s*\/\*\s*(?<heading>.*?)\s*\*\/\s*$/u.exec(line)?.groups?.heading;
          if (heading && THEME_GROUPS.includes(heading)) {
            activeHeading = heading;
            hasGroupHeadings = true;
          }

          // Only top-level, two-space-indented declarations belong to this
          // sequence; multiline CSS values and nested theme blocks are ignored.
          const declaration = /^ {2}(?<name>--[a-z][a-z0-9-]*)\s*:\s*(?<value>.*)$/u.exec(line);
          const { name, value } = declaration?.groups ?? {};
          if (!name || value === undefined) continue;
          tokens.push({
            name,
            group: themeGroupName(name, value),
            activeHeading,
            line: firstLine + index,
          });
        }

        if (tokens.length > 1 && !hasGroupHeadings) {
          context.report({
            node: sheet,
            message: "Global theme tokens must use named purpose-group section comments.",
          });
        }

        let previous: ThemeToken | undefined;
        for (const token of tokens) {
          let message: string | undefined;
          const groupIndex = THEME_GROUPS.indexOf(token.group);
          const previousIndex = previous ? THEME_GROUPS.indexOf(previous.group) : -1;

          if (previous && groupIndex < previousIndex) {
            message = `Theme token "${token.name}" belongs to "${token.group}", which must appear before "${previous.group}".`;
          } else if (
            previous &&
            groupIndex === previousIndex &&
            token.name.toLowerCase() < previous.name.toLowerCase()
          ) {
            message = `Theme tokens in "${token.group}" must be alphabetical: "${token.name}" goes before "${previous.name}".`;
          } else if (hasGroupHeadings && token.activeHeading !== token.group) {
            message = `Theme token "${token.name}" belongs under the "${token.group}" section comment.`;
          }

          if (message) {
            context.report({
              node: sheet,
              loc: {
                start: { line: token.line, column: 1 },
                end: { line: token.line, column: 2 },
              },
              message,
            });
          }
          previous = token;
        }
      },
    };
  },
};
