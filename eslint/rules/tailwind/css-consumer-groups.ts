/**
 * ESLint rule: pasika/css-consumer-groups
 *
 * An opt-in rule for tracing CSS definitions to consuming components.
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
type Group = { label: string; line: number };
type Item = { symbol: CssSymbol; group?: Group; owner: string; section: string };

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
    )
      return false;
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

export const cssConsumerGroupsRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: { description: "Group CSS definitions by component paths and sort within their groups." },
  },
  create(context) {
    if (!context.sourceCode.text.includes(OPT_IN)) return {};
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
            message =
              'CSS definition "' +
              item.symbol.name +
              '" requires a component-path group comment (or /* Group: global */).';
          } else if (actual !== item.owner) {
            message =
              'CSS definition "' + item.symbol.name + '" belongs to group "' + item.owner + '", not "' + actual + '".';
          } else if (previous?.section === item.section && previous.group && currentGroup) {
            if (previous.group !== currentGroup && previous.group.label.localeCompare(currentGroup.label) > 0) {
              message = "CSS consumer groups in " + item.section + " must be ordered alphabetically by path.";
            } else if (previous.group === currentGroup && previous.symbol.name.localeCompare(item.symbol.name) > 0) {
              message =
                'CSS definitions in group "' +
                actual +
                '" must be alphabetical: "' +
                item.symbol.name +
                '" comes before "' +
                previous.symbol.name +
                '".';
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
                      const end = start + lines[currentGroup.line - 1].length;
                      return fixer.replaceTextRange([start, end], "/* Group: " + item.owner + " */");
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
