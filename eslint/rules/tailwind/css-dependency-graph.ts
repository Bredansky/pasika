/**
 * Dependency graph for the full Tailwind CSS tree and the modules that use it.
 * Source-module references are lexical candidates; only CSS definitions are
 * used for mandatory structural diagnostics.
 */
import path from "node:path";
import { generate, parse, walk } from "@eslint/css-tree";
import { escapeRegExp } from "./source-files";
import { importedSpecifiers, resolveSpecifier } from "./stylesheet-graph";

export type CssSymbolKind = "utility" | "theme-token" | "root-variable" | "keyframes" | "font-face" | "selector";
export type CssReferenceKind = "utility" | "variable" | "keyframes" | "theme-class" | "selector";
export interface CssSource {
  path: string;
  content: string;
}
export interface CssSymbol {
  kind: CssSymbolKind;
  name: string;
  file: string;
  line: number;
  value?: string;
  /** Only default :root definitions compete for canonical ownership. */
  scope?: "default" | "conditional";
  /** Font face signature includes family, style, weight, stretch and unicode range. */
  identity?: string;
}
export interface CssReference {
  kind: CssReferenceKind;
  name: string;
  file: string;
  line: number;
  source: "css" | "module";
  /** Originating @theme variable for a generated class reference. */
  token?: string;
}
export interface CssDependencyGraph {
  definitions: CssSymbol[];
  references: CssReference[];
  imports: { from: string; to: string }[];
}
function lineAt(text: string, offset: number): number {
  return text.slice(0, offset).split("\n").length;
}
function tokenLines(content: string, token: string): number[] {
  const regex = new RegExp(`(?<![\\w-])${escapeRegExp(token)}(?![\\w-])`, "gu");
  return [...content.matchAll(regex)].map((found) => lineAt(content, found.index));
}
function pushSymbol(
  symbols: CssSymbol[],
  kind: CssSymbolKind,
  name: string,
  file: string,
  line: number,
  value?: string,
): void {
  if (name) symbols.push({ kind, name, file, line, ...(value === undefined ? {} : { value }) });
}
export function themeClasses(name: string): string[] {
  // Only map namespaces with predictable class names. A color token emits
  // several classes; semantic suffixes constrain them to the relevant roles.
  if (name.includes("--", 2)) return [];
  if (name.startsWith("--color-")) {
    const stem = name.slice("--color-".length);
    if (stem.endsWith("-canvas")) {
      return ["bg", "fill", "from", "via", "to", "ring-offset"].map((prefix) => `${prefix}-${stem}`);
    }
    if (stem.endsWith("-ink")) return ["text", "caret", "decoration"].map((prefix) => `${prefix}-${stem}`);
    if (stem.endsWith("-edge")) {
      return ["border", "outline", "ring", "divide", "stroke"].map((prefix) => `${prefix}-${stem}`);
    }
    return ["bg", "text", "border", "fill", "stroke", "ring"].map((prefix) => `${prefix}-${stem}`);
  }
  if (name.startsWith("--animate-")) return [`animate-${name.slice("--animate-".length)}`];
  if (name.startsWith("--radius-")) return [`rounded-${name.slice("--radius-".length)}`];
  if (name.startsWith("--text-") || name.startsWith("--tracking-") || name.startsWith("--font-")) {
    return [name.slice(2)];
  }
  return [];
}

/** Build one deterministic index over all stylesheets and their consumers. */
export function buildCssDependencyGraph(options: {
  css: readonly CssSource[];
  modules: readonly CssSource[];
  sourceRoot: string;
  /** Skip reference discovery when a rule only needs definitions and imports. */
  includeReferences?: boolean;
}): CssDependencyGraph {
  const definitions: CssSymbol[] = [];
  const references: CssReference[] = [];
  const imports: CssDependencyGraph["imports"] = [];

  for (const file of options.css) {
    const filename = path.normalize(file.path);
    for (const spec of importedSpecifiers(file.content)) {
      const target = resolveSpecifier(filename, spec, options.sourceRoot);
      if (target) imports.push({ from: filename, to: path.normalize(target) });
    }
    const ast = parse(file.content, { positions: true, parseAtrulePrelude: false });
    const atRuleStack: { name: string; baseLayer: boolean }[] = [];
    walk(ast, {
      enter(node) {
        if (node.type === "Atrule") {
          atRuleStack.push({
            name: node.name,
            baseLayer: node.name === "layer" && node.prelude !== null && generate(node.prelude).trim() === "base",
          });
        }
        const line = node.loc?.start.line ?? 1;
        if (node.type === "Atrule") {
          if (node.name === "utility" || node.name === "keyframes") {
            pushSymbol(definitions, node.name, node.prelude ? generate(node.prelude).trim() : "", filename, line);
          } else if (node.name === "font-face") {
            const descriptors = new Map<string, string>();
            for (const child of node.block?.children ?? []) {
              if (child.type === "Declaration") descriptors.set(child.property, generate(child.value).trim());
            }
            const family = descriptors
              .get("font-family")
              ?.replace(/^["']|["']$/gu, "")
              .replace(/\s+/gu, " ")
              .toLowerCase();
            if (family) {
              const descriptor = (name: string, fallback: string): string =>
                (descriptors.get(name) ?? fallback).toLowerCase().replace(/\s+/gu, " ").trim();
              const weight = descriptor("font-weight", "400");
              let normalizedWeight = weight;
              if (weight === "normal") normalizedWeight = "400";
              else if (weight === "bold") normalizedWeight = "700";
              const stretch = descriptor("font-stretch", "normal");
              definitions.push({
                kind: "font-face",
                name: family,
                file: filename,
                line,
                identity: [
                  family,
                  descriptor("font-style", "normal"),
                  normalizedWeight,
                  stretch === "100%" ? "normal" : stretch,
                  descriptor("unicode-range", "u+0-10ffff"),
                ].join("|"),
              });
            }
          } else if (node.name === "theme" && node.loc) {
            // Tailwind's --*: initial is deliberately nonstandard CSS. css-tree
            // can parse the rest of its @theme body as Rule/Raw instead of
            // Declaration nodes, so inspect this known theme scope directly.
            const source = file.content
              .slice(node.loc.start.offset, node.loc.end.offset)
              // Ignore declaration-shaped text inside CSS comments while
              // preserving offsets so diagnostics still point to real lines.
              .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\r\n]/gu, " "));
            for (const found of source.matchAll(
              /(?:^|[{;\r\n])\s*(?<name>--[a-z][\w-]*)\s*:\s*(?<value>[^;\r\n]+);/gu,
            )) {
              const name = found.groups?.name;
              const value = found.groups?.value;
              if (!name || !value) continue;
              pushSymbol(
                definitions,
                "theme-token",
                name,
                filename,
                lineAt(file.content, node.loc.start.offset + found.index + found[0].indexOf(name)),
                value.trim(),
              );
            }
          }
        }
        // Class-only selectors can be traced to TSX consumers. Compound/global
        // selectors are deliberately excluded because they have cascade context.
        if (node.type === "Rule" && !atRuleStack.some((entry) => entry.name === "keyframes" || entry.baseLayer)) {
          const selector = generate(node.prelude).trim();
          const match = /^\.(?<name>[a-zA-Z_][\w-]*)(?:::{0,1}[a-zA-Z-]+(?:\([^)]*\))?)*$/u.exec(selector);
          if (match?.groups?.name) pushSymbol(definitions, "selector", match.groups.name, filename, line);
        }
        if (node.type !== "Declaration" || !node.property.startsWith("--") || node.property === "--*") return;
        const inRoot = this.rule?.type === "Rule" && generate(this.rule.prelude).trim() === ":root";
        if (inRoot) {
          // @layer does not change the selector's matching conditions;
          // @media/@supports/@container etc. may override it deliberately.
          const scope = atRuleStack.every((entry) => entry.name === "layer") ? "default" : "conditional";
          definitions.push({
            kind: "root-variable",
            name: node.property,
            file: filename,
            line,
            value: generate(node.value),
            scope,
          });
        }
      },
      leave(node) {
        if (node.type === "Atrule") atRuleStack.pop();
      },
    });
    if (options.includeReferences === false) continue;
    for (const found of file.content.matchAll(/var\(\s*(?<name>--[\w-]+)/gu)) {
      if (!found.groups?.name) continue;
      references.push({
        kind: "variable",
        name: found.groups.name,
        file: filename,
        line: lineAt(file.content, found.index),
        source: "css",
      });
    }
  }

  if (options.includeReferences === false) return { definitions, references, imports };

  const utilities = new Set(definitions.filter((item) => item.kind === "utility").map((item) => item.name));
  const selectors = new Set(definitions.filter((item) => item.kind === "selector").map((item) => item.name));
  const keyframes = new Set(definitions.filter((item) => item.kind === "keyframes").map((item) => item.name));
  const generatedClasses = new Map<string, string>();
  for (const symbol of definitions) {
    if (symbol.kind !== "theme-token") continue;
    for (const className of themeClasses(symbol.name)) generatedClasses.set(className, symbol.name);
  }

  for (const file of options.css) {
    const filename = path.normalize(file.path);
    const ast = parse(file.content, { positions: true, parseAtrulePrelude: false });
    walk(ast, {
      enter(node) {
        let kind: CssReferenceKind;
        let text: string;
        let names: Set<string>;
        if (node.type === "Atrule" && node.name === "apply" && node.prelude) {
          kind = "utility";
          text = generate(node.prelude);
          names = utilities;
        } else if (
          node.type === "Declaration" &&
          (node.property === "animation" || node.property === "animation-name")
        ) {
          kind = "keyframes";
          text = generate(node.value);
          names = keyframes;
        } else return;
        for (const name of names) {
          if (tokenLines(text, name).length > 0) {
            references.push({ kind, name, file: filename, line: node.loc?.start.line ?? 1, source: "css" });
          }
        }
        if (kind === "utility") {
          // @apply arbitrary animation values use underscores as spaces.
          for (const match of text.matchAll(/\[(?:animation|animation-name):(?<value>[^\]]+)\]/gu)) {
            const normalized = (match.groups?.value ?? "").replace(/_/gu, " ");
            for (const name of keyframes) {
              if (tokenLines(normalized, name).length > 0) {
                references.push({
                  kind: "keyframes",
                  name,
                  file: filename,
                  line: node.loc?.start.line ?? 1,
                  source: "css",
                });
              }
            }
          }
          for (const [name, token] of generatedClasses) {
            if (tokenLines(text, name).length > 0) {
              references.push({
                kind: "theme-class",
                name,
                token,
                file: filename,
                line: node.loc?.start.line ?? 1,
                source: "css",
              });
            }
          }
        }
      },
    });
  }

  for (const file of options.modules) {
    const filename = path.normalize(file.path);
    for (const [kind, names] of [
      ["utility", utilities],
      ["keyframes", keyframes],
      ["selector", selectors],
    ] as const) {
      for (const name of names) {
        for (const line of tokenLines(file.content, name)) {
          references.push({ kind, name, file: filename, line, source: "module" });
        }
      }
    }
    for (const [name, token] of generatedClasses) {
      for (const line of tokenLines(file.content, name)) {
        references.push({ kind: "theme-class", name, token, file: filename, line, source: "module" });
      }
    }
  }
  return { definitions, references, imports };
}

export function cssSymbolUsages(graph: CssDependencyGraph, kind: CssReferenceKind, name: string): CssReference[] {
  return graph.references.filter((item) => item.kind === kind && item.name === name);
}
