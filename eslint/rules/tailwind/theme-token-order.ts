/**
 * ESLint rule: pasika/theme-token-order
 *
 * Keep the global Tailwind v4 theme grouped by purpose and alphabetically
 * ordered within each group. The theme reset remains first.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import { statSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const OPT_IN = "/* @pasika-component-groups */";
const GROUP_RE =
  /^\s*\/\*\s*(?:Group:\s*)?(?<paths>(?:global|src\/[\w./-]+\.(?:tsx?|jsx?))(?:\s*,\s*src\/[\w./-]+\.(?:tsx?|jsx?))*)\s*\*\/\s*$/u;
const PATH_RE = /^src\/[\w./-]+\.(?:tsx?|jsx?)$/u;
interface Group {
  label: string;
  line: number;
}
interface Item {
  symbol: CssSymbol;
  group?: Group;
  owner: string;
  section: string;
}

function normalizeGroup(label: string): string {
  if (label === "global") return "global";
  return [...new Set(label.split(",").map((name) => name.trim()))].sort().join(", ");
}

function sectionOf(symbol: CssSymbol): string {
  if (symbol.kind === "theme-token") return "theme";
  if (symbol.kind === "utility") return "utility";
  if (symbol.kind === "keyframes") return "keyframes";
  return symbol.kind;
}

function ownerOf(symbol: CssSymbol, graph: ReturnType<typeof buildCssDependencyGraph>, root: string): string {
  const references = graph.references.filter((ref) => {
    if (
      ref.source !== "module" ||
      !/\.(?:tsx|jsx)$/u.test(ref.file) ||
      /\.(?:test|spec|stories)\.(?:tsx|jsx)$/u.test(ref.file)
    ) {
      return false;
    }
    if (symbol.kind === "theme-token") {
      return (
        (ref.kind === "theme-class" && ref.token === symbol.name) ||
        (ref.kind === "variable" && ref.name === symbol.name)
      );
    }
    if (symbol.kind === "utility" || symbol.kind === "keyframes" || symbol.kind === "selector") {
      return ref.name === symbol.name;
    }
    return ref.kind === "variable" && ref.name === symbol.name;
  });
  // CSS-to-CSS references can be shared indirectly by other consumers.
  const indirect = graph.references.some(
    (ref) =>
      ref.source === "css" &&
      ref.file !== symbol.file &&
      ((symbol.kind === "theme-token" && ref.kind === "variable" && ref.name === symbol.name) ||
        (symbol.kind === "utility" && ref.kind === "utility" && ref.name === symbol.name) ||
        (symbol.kind === "keyframes" && ref.kind === "keyframes" && ref.name === symbol.name)),
  );
  if (indirect) return "global";
  const owners = [
    ...new Set(references.map((ref) => path.relative(path.dirname(root), ref.file).split(path.sep).join("/"))),
  ]
    .filter((name) => PATH_RE.test(name))
    .sort();
  return owners.length > 0 ? owners.join(", ") : "global";
}

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
    fixable: "code",
    docs: {
      description: "Require global Tailwind theme tokens to follow purpose groups and alphabetical order.",
    },
  },
  create(context) {
    if (context.sourceCode.text.includes(OPT_IN)) {
      const root = sourceRootOf(context);
      try {
        if (!statSync(root).isDirectory()) return {};
      } catch {
        return {};
      }
      const current = path.normalize(path.resolve(context.filename));
      const textOf = cachedTextReader();
      const graph = buildCssDependencyGraph({
        sourceRoot: root,
        css: findFiles(root, CSS_EXTENSIONS).map((file) => ({
          path: file,
          content: path.normalize(file) === current ? context.sourceCode.text : textOf(file),
        })),
        modules: findFiles(root, MODULE_EXTENSIONS).map((file) => ({ path: file, content: textOf(file) })),
      });
      const lines = context.sourceCode.text.split(/\r?\n/u);
      const groups: Group[] = [];
      for (const [index, line] of lines.entries()) {
        const match = GROUP_RE.exec(line);
        if (match?.groups?.paths) groups.push({ label: normalizeGroup(match.groups.paths), line: index + 1 });
      }
      const items: Item[] = graph.definitions
        .filter((symbol) => symbol.file === current && symbol.name !== "--*")
        .filter((symbol) => ["theme-token", "utility", "keyframes", "root-variable", "selector"].includes(symbol.kind))
        .map((symbol) => ({
          symbol,
          group: groups.filter((group) => group.line < symbol.line).at(-1),
          owner: ownerOf(symbol, graph, root),
          section: sectionOf(symbol),
        }))
        .sort((a, b) => a.symbol.line - b.symbol.line);

      return {
        "StyleSheet:exit"(node: StyleSheetPlain) {
          let previous: Item | undefined;
          for (const item of items) {
            const currentGroup = item.group;
            const actual = currentGroup?.label;
            let message: string | undefined;
            if (!currentGroup) {
              message = `CSS definition "${item.symbol.name}" requires a component-path group comment (or /* Group: global */).`;
            } else if (actual !== item.owner) {
              message = `CSS definition "${item.symbol.name}" belongs to group "${item.owner}", not "${currentGroup.label}".`;
            } else if (previous?.section === item.section && previous.group) {
              if (previous.group !== currentGroup && previous.group.label.localeCompare(currentGroup.label) > 0) {
                message = `CSS consumer groups in ${item.section} must be ordered alphabetically by path.`;
              } else if (previous.group === currentGroup && previous.symbol.name.localeCompare(item.symbol.name) > 0) {
                message = `CSS definitions in group "${previous.group.label}" must be alphabetical: "${item.symbol.name}" comes before "${previous.symbol.name}".`;
              }
            }
            if (message) {
              const line = item.symbol.line;
              context.report({
                node,
                loc: { start: { line, column: 1 }, end: { line, column: 2 } },
                message,
                ...(currentGroup &&
                actual !== item.owner &&
                items.filter((candidate) => candidate.group === currentGroup).length === 1
                  ? {
                      fix(fixer) {
                        const start = context.sourceCode.getIndexFromLoc({ line: currentGroup.line, column: 1 });
                        const end = start + (lines[currentGroup.line - 1] ?? "").length;
                        return fixer.replaceTextRange([start, end], `/* Group: ${item.owner} */`);
                      },
                    }
                  : {}),
              });
            }
            previous = item;
          }
        },
      };
    }
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
