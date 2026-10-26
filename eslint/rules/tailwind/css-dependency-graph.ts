/**
 * Dependency graph for the full Tailwind CSS tree and the modules that use it.
 * Source-module references are lexical candidates; only CSS definitions are
 * used for mandatory structural diagnostics.
 */
import path from "node:path";
import { generate, parse, walk } from "@eslint/css-tree";
import { escapeRegExp } from "./source-files";
import { importedSpecifiers, resolveSpecifier } from "./stylesheet-graph";

export type CssSymbolKind = "utility" | "theme-token" | "root-variable" | "keyframes" | "font-face";
export type CssReferenceKind = "utility" | "variable" | "keyframes" | "theme-class";
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
}
export interface CssReference {
  kind: CssReferenceKind;
  name: string;
  file: string;
  line: number;
  source: "css" | "module";
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
function themeClass(name: string): string | undefined {
  // Namespaces with an unambiguous class mapping. --color-* intentionally
  // excluded: one token generates many kinds of color utilities.
  if (name.startsWith("--text-") || name.startsWith("--tracking-") || name.startsWith("--font-")) {
    if (name.includes("--", 2)) return undefined;
    return name.slice(2);
  }
  return undefined;
}

/** Build one deterministic index over all stylesheets and their consumers. */
export function buildCssDependencyGraph(options: {
  css: readonly CssSource[];
  modules: readonly CssSource[];
  sourceRoot: string;
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
    walk(ast, {
      enter(node) {
        const line = node.loc?.start.line ?? 1;
        if (node.type === "Atrule") {
          if (node.name === "utility" || node.name === "keyframes") {
            pushSymbol(definitions, node.name, node.prelude ? generate(node.prelude).trim() : "", filename, line);
          } else if (node.name === "font-face") {
            const body = node.block ? generate(node.block) : "";
            const family = /font-family\s*:\s*(?<name>[^;}]+)/u.exec(body)?.groups?.name;
            if (family) {
              pushSymbol(definitions, "font-face", family.trim().replace(/^["']|["']$/gu, ""), filename, line);
            }
          } else if (node.name === "theme" && node.loc) {
            // Tailwind's --*: initial is deliberately nonstandard CSS. css-tree
            // can parse the rest of its @theme body as Rule/Raw instead of
            // Declaration nodes, so inspect this known theme scope directly.
            const source = file.content.slice(node.loc.start.offset, node.loc.end.offset);
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
        if (node.type !== "Declaration" || !node.property.startsWith("--") || node.property === "--*") return;
        const inRoot = this.rule?.type === "Rule" && generate(this.rule.prelude).trim() === ":root";
        if (inRoot) {
          pushSymbol(definitions, "root-variable", node.property, filename, line, generate(node.value));
        }
      },
    });
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

  const utilities = new Set(definitions.filter((item) => item.kind === "utility").map((item) => item.name));
  const keyframes = new Set(definitions.filter((item) => item.kind === "keyframes").map((item) => item.name));
  const themeClasses = new Set(
    definitions
      .filter((item) => item.kind === "theme-token")
      .map((item) => themeClass(item.name))
      .filter((item) => item !== undefined),
  );

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
      },
    });
  }

  for (const file of options.modules) {
    const filename = path.normalize(file.path);
    for (const [kind, names] of [
      ["utility", utilities],
      ["keyframes", keyframes],
      ["theme-class", themeClasses],
    ] as const) {
      for (const name of names) {
        for (const line of tokenLines(file.content, name)) {
          references.push({ kind, name, file: filename, line, source: "module" });
        }
      }
    }
  }
  return { definitions, references, imports };
}

export function cssSymbolUsages(graph: CssDependencyGraph, kind: CssReferenceKind, name: string): CssReference[] {
  return graph.references.filter((item) => item.kind === kind && item.name === name);
}
