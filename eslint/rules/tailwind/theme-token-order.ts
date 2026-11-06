/**
 * ESLint rule: pasika/theme-token-order
 *
 * Group CSS definitions by their single consumer or shared feature/layer scopes,
 * with alphabetical order for groups and definitions in each stylesheet.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

// Recognize legacy src/...tsx group comments so the rule can report and
// autofix them, while generating only the new extensionless src-relative labels.
const GROUP_PATH = String.raw`(?:global|src/[\w./-]+\.(?:tsx?|jsx?)|(?:features|shared|compositions)(?:/[\w.-]+)*)`;
const GROUP_RE = new RegExp(
  String.raw`^\s*/\*\s*(?:Group:\s*)?(?<paths>${GROUP_PATH}(?:\s*,\s*${GROUP_PATH})*)\s*\*/\s*/**
 * ESLint rule: pasika/theme-token-order
 *
 * Group CSS definitions by their single consumer or shared feature/layer scopes,
 * with alphabetical order for groups and definitions in each stylesheet.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph, type CssSymbol } from "./css-dependency-graph";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

,
  "u",
);
const PATH_RE = /^(?:features\/[\w-]+\/[\w./-]+|shared\/[\w./-]+|compositions\/[\w./-]+)\.(?:tsx|jsx)$/u;
interface Group {
  label: string;
  line: number;
}
interface Item {
  symbol: CssSymbol;
  group?: Group;
  owner: string;
  section: string;
  scope: string;
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

// Never compare or inherit group headers across different CSS blocks.
// In particular, @layer keyframes and top-level keyframes have separate
// cascade contexts, and each @theme or :root block stands on its own.
function scopeOf(symbol: CssSymbol, sheet: StyleSheetPlain): string {
  const enclosing = [...sheet.children].find(
    (node) => node.loc && node.loc.start.line <= symbol.line && node.loc.end.line >= symbol.line,
  );
  if (!enclosing?.loc) return "top-level";
  if (
    symbol.kind === "theme-token" ||
    symbol.kind === "root-variable" ||
    (enclosing.type === "Atrule" && enclosing.name === "layer")
  ) {
    return `block:${enclosing.loc.start.offset.toString()}`;
  }
  return "top-level";
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
  const consumers = [
    ...new Set(
      references
        .map((ref) => path.relative(root, ref.file).split(path.sep).join("/"))
        .filter((name) => PATH_RE.test(name))
        .map((name) => name.replace(/\.(?:tsx|jsx)$/u, "")),
    ),
  ].sort();
  if (consumers.length === 0) return "global";
  if (consumers.length === 1) return consumers[0] ?? "global";

  // A shared CSS entry has one group per feature or layer, regardless of the
  // number of components in each scope. Mixed groups combine those labels.
  return [...new Set(consumers.map((consumer) => {
    const parts = consumer.split("/");
    return parts[0] === "features" ? parts.slice(0, 2).join("/") : parts[0] ?? "global";
  }))].sort().join(", ");
}

export const themeTokenOrderRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: {
      description: "Group CSS definitions by single consumers or common feature/layer paths in alphabetical order.",
    },
  },
  create(context) {
    const root = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const cssFiles = new Set([...findFiles(root, CSS_EXTENSIONS).map((file) => path.normalize(file)), current]);
    const graph = buildCssDependencyGraph({
      sourceRoot: root,
      css: [...cssFiles].map((file) => ({
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
      .filter((symbol) =>
        ["theme-token", "utility", "keyframes", "root-variable", "selector", "font-face"].includes(symbol.kind),
      )
      .map((symbol) => ({
        symbol,
        owner: ownerOf(symbol, graph, root),
        section: sectionOf(symbol),
        scope: scopeOf(symbol, context.sourceCode.ast),
      }))
      .sort((a, b) => a.symbol.line - b.symbol.line);

    // Group headings belong to the following run of one definition kind.
    // A new kind resets the heading; globally owned definitions need none.
    let activeGroup: Group | undefined;
    let previousItem: Item | undefined;
    for (const item of items) {
      const previousLine = previousItem?.symbol.line ?? 0;
      const intervening = groups.filter((group) => group.line > previousLine && group.line < item.symbol.line).at(-1);
      const previousScope = previousItem?.scope;
      if (item.section !== previousItem?.section || item.scope !== previousScope) activeGroup = intervening;
      else if (intervening) activeGroup = intervening;
      item.group = activeGroup;
      previousItem = item;
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const group of groups.filter((entry) => entry.label === "global")) {
          context.report({
            node,
            loc: { start: { line: group.line, column: 1 }, end: { line: group.line, column: 2 } },
            message: "Global CSS definitions must not have a group comment.",
            fix(fixer) {
              const start = context.sourceCode.getIndexFromLoc({ line: group.line, column: 1 });
              const end = start + (lines[group.line - 1] ?? "").length;
              const remaining = context.sourceCode.text.slice(end);
              let newline = 0;
              if (remaining.startsWith("\r\n")) newline = 2;
              else if (remaining.startsWith("\n")) newline = 1;
              return fixer.removeRange([start, end + newline]);
            },
          });
        }
        let previous: Item | undefined;
        for (const item of items) {
          const currentGroup = item.group;
          const actual = currentGroup?.label;
          const reportedGroup = actual ?? "none";
          let message: string | undefined;
          if (item.owner === "global" && currentGroup && currentGroup.label !== "global") {
            message = "Global definitions must be ungrouped.";
          } else if (item.owner !== "global" && !currentGroup) {
            message = `CSS definition "${item.symbol.name}" requires a consumer-path group comment.`;
          } else if (item.owner !== "global" && actual !== item.owner) {
            message = `CSS definition "${item.symbol.name}" belongs to group "${item.owner}", not "${reportedGroup}".`;
          } else if (previous?.section === item.section && previous.scope === item.scope) {
            if (previous.owner !== item.owner && previous.owner.localeCompare(item.owner) > 0) {
              message = `CSS consumer groups in ${item.section} must be ordered alphabetically by path.`;
            } else if (previous.owner === item.owner && previous.symbol.name.localeCompare(item.symbol.name) > 0) {
              message = `CSS definitions in group "${item.owner}" must be alphabetical: "${item.symbol.name}" comes before "${previous.symbol.name}".`;
            }
          }
          if (message) {
            const line = item.symbol.line;
            context.report({
              node,
              loc: { start: { line, column: 1 }, end: { line, column: 2 } },
              message,
              ...(item.owner !== "global" &&
              currentGroup &&
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
  },
};
