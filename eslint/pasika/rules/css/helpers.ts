/**
 * Shared AST walkers for the CSS rules.
 *
 * The @eslint/css language parses with css-tree in tolerant mode, so constructs
 * Tailwind v4 extends beyond the CSS grammar — `--*: initial`, arbitrary
 * properties inside `@apply`, nested `@media` inside `@theme` — survive as
 * `Raw` nodes instead of structured ones. Rules therefore walk the plain AST
 * and fall back to raw text when a construct came through unparsed.
 */

import type { CssNodePlain } from "@eslint/css-tree";

/** Visits `node` and every descendant, in document order. */
export function walkNodes(node: CssNodePlain, visit: (current: CssNodePlain) => void): void {
  visit(node);
  if ("children" in node && node.children) {
    for (const child of node.children) walkNodes(child, visit);
  }
  if ("prelude" in node && node.prelude) {
    walkNodes(node.prelude, visit);
  }
  if ("block" in node && node.block) {
    walkNodes(node.block, visit);
  }
}

/** Every `Atrule` node in the sheet, in document order. */
export function atrules(node: CssNodePlain): CssNodePlain[] {
  const result: CssNodePlain[] = [];
  walkNodes(node, (current) => {
    if (current.type === "Atrule") result.push(current);
  });
  return result;
}

/** Every `Atrule` with the given name. */
export function atrulesNamed(node: CssNodePlain, name: string): CssNodePlain[] {
  return atrules(node).filter((candidate) => candidate.type === "Atrule" && candidate.name === name);
}

/** The children of a block-bearing node. */
export function blockChildren(node: CssNodePlain | undefined): CssNodePlain[] {
  if (!node) return [];
  if (!("block" in node) || !node.block) return [];
  return node.block.children;
}

/**
 * The names in an at-rule prelude: `Identifier`s (the classes of an `@apply`,
 * the `inline` of `@theme inline`) and `Layer`s (the layers of `@layer base`).
 */
export function preludeIdentifiers(node: CssNodePlain | undefined): string[] {
  if (!node) return [];
  if (!("prelude" in node) || !node.prelude) return [];
  const names: string[] = [];
  walkNodes(node.prelude, (current) => {
    if (current.type === "Identifier") names.push(current.name);
    if (current.type === "Layer") names.push(current.name);
  });
  return names;
}

/** The text of a `Raw` node, or the empty string. */
export function rawValue(node: CssNodePlain | undefined): string {
  if (!node) return "";
  if (node.type === "Raw") return node.value;
  return "";
}

/** Every `Rule` node in the sheet, in document order. */
export function rules(node: CssNodePlain): CssNodePlain[] {
  const result: CssNodePlain[] = [];
  walkNodes(node, (current) => {
    if (current.type === "Rule") result.push(current);
  });
  return result;
}

/** The selector names of a rule's prelude, e.g. `root` for `:root`. */
export function selectorNames(node: CssNodePlain | undefined): string[] {
  if (!node) return [];
  if (!("prelude" in node) || !node.prelude) return [];
  const names: string[] = [];
  walkNodes(node.prelude, (current) => {
    if (current.type === "PseudoClassSelector" || current.type === "TypeSelector" || current.type === "ClassSelector") {
      names.push(current.name);
    }
  });
  return names;
}
