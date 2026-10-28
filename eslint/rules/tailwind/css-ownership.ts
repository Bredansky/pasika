/**
 * Consumer-based CSS ownership, propagated through CSS definition references.
 * Unknown, duplicated and conditional definitions are never assigned a
 * speculative feature owner. No cross-file autofixes are attempted.
 */
import path from "node:path";
import { generate, parse, walk } from "@eslint/css-tree";
import type { CssDependencyGraph, CssSource, CssSymbol } from "./css-dependency-graph";
import { themeClasses } from "./css-dependency-graph";
import { escapeRegExp } from "./source-files";

const GLOBAL = "globals.css";
export function symbolId(def: CssSymbol): string {
  return [def.file, def.kind, def.name, def.line].join("|");
}
function consumerFeature(file: string, sourceRoot: string): string {
  const parts = path.relative(sourceRoot, file).split(path.sep);
  return parts[0] === "features" && parts.length > 2 ? (parts[1] ?? GLOBAL) : GLOBAL;
}
function contains(text: string, name: string): boolean {
  return new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, "u").test(text);
}

/** Find names referenced inside a single definition, not the whole file. */
function dependencies(text: string, defs: readonly CssSymbol[]): Set<string> {
  const result = new Set<string>();
  const variables = new Set([...text.matchAll(/var\(\s*(?<name>--[\w-]+)/gu)].map((m) => m.groups?.name));
  const applied = [...text.matchAll(/@apply\s+(?<value>[^;}]+)/gu)].map((m) => m.groups?.value ?? "");
  const animations = [...text.matchAll(/(?:animation|animation-name)\s*:\s*(?<value>[^;}\]]+)/gu)].map((m) =>
    (m.groups?.value ?? "").replaceAll("_", " "),
  );
  const families = [...text.matchAll(/font-family\s*:\s*(?<value>[^;}\]]+)/gu)].map((m) =>
    (m.groups?.value ?? "").replaceAll("_", " ").toLowerCase(),
  );
  for (const def of defs) {
    const match =
      ((def.kind === "theme-token" || def.kind === "root-variable") && variables.has(def.name)) ||
      ((def.kind === "utility" || def.kind === "selector") && applied.some((part) => contains(part, def.name))) ||
      (def.kind === "keyframes" && animations.some((part) => contains(part, def.name))) ||
      (def.kind === "font-face" &&
        (families.some((part) => contains(part, def.name)) ||
          new RegExp(`^\\s*["']?${escapeRegExp(def.name)}["']?\\s*(?:,|$)`, "iu").test(text))) ||
      (def.kind === "theme-token" &&
        applied.some((part) => themeClasses(def.name).some((name) => contains(part, name))));
    if (match) result.add(symbolId(def));
  }
  return result;
}

/** Map actual AST definition bodies; token/variable bodies are individual values. */
function bodiesOf(css: readonly CssSource[], defs: readonly CssSymbol[]): Map<string, string> {
  const bodies = new Map<string, string>();
  for (const src of css) {
    const file = path.normalize(src.path);
    const ast = parse(src.content, { positions: true, parseAtrulePrelude: false });
    walk(ast, {
      enter(node) {
        if (!node.loc) return;
        let kind: string | undefined;
        if (node.type === "Atrule" && ["utility", "keyframes", "font-face"].includes(node.name)) {
          kind = node.name;
        } else if (node.type === "Rule") {
          kind = "selector";
        }
        if (!kind) return;
        const found = defs.filter((def) => def.file === file && def.kind === kind && def.line === node.loc?.start.line);
        if (found.length !== 1 || !found[0]) return;
        bodies.set(symbolId(found[0]), src.content.slice(node.loc.start.offset, node.loc.end.offset));
      },
    });
  }
  for (const def of defs) {
    if ((def.kind === "theme-token" || def.kind === "root-variable") && def.value !== undefined) {
      bodies.set(symbolId(def), def.value);
    }
  }
  return bodies;
}

export function inferCssOwners(options: {
  graph: CssDependencyGraph;
  css: readonly CssSource[];
  modules: readonly CssSource[];
  sourceRoot: string;
}): Map<string, string | undefined> {
  const { graph, css, modules, sourceRoot } = options;
  const defs = graph.definitions;
  const owners = new Map(defs.map((def) => [symbolId(def), new Set<string>()]));
  const counts = new Map<string, number>();
  for (const def of defs) {
    // Scoped :root overrides are not competing default definitions.
    if (def.kind === "root-variable" && def.scope === "conditional") continue;
    const key = `${def.kind}:${def.identity ?? def.name}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = new Set(
    defs.filter((d) => (counts.get(`${d.kind}:${d.identity ?? d.name}`) ?? 0) > 1).map(symbolId),
  );
  for (const def of defs) {
    const key = symbolId(def);
    if (duplicates.has(key) || (def.kind === "root-variable" && def.scope === "conditional")) continue;
    for (const ref of graph.references) {
      if (ref.source !== "module") continue;
      if (
        (def.kind === "utility" && ref.kind === "utility" && ref.name === def.name) ||
        (def.kind === "selector" && ref.kind === "selector" && ref.name === def.name) ||
        (def.kind === "theme-token" && ref.kind === "theme-class" && ref.token === def.name)
      ) {
        owners.get(key)?.add(consumerFeature(ref.file, sourceRoot));
      }
    }
    for (const mod of modules) {
      const name = escapeRegExp(def.name);
      const explicit =
        ((def.kind === "theme-token" || def.kind === "root-variable") &&
          new RegExp(`var\\(\\s*${name}(?![\\w-])`, "u").test(mod.content)) ||
        (def.kind === "keyframes" &&
          new RegExp(`(?:animationName|animation-name|animation)\\s*[:=]\\s*["'][^"']*${name}`, "u").test(
            mod.content,
          )) ||
        (def.kind === "font-face" &&
          new RegExp(`(?:fontFamily|font-family)\\s*[:=]\\s*["'][^"']*${name}`, "iu").test(mod.content));
      if (explicit) owners.get(key)?.add(consumerFeature(mod.path, sourceRoot));
    }
    // Tailwind default spacing and base page colors are system foundations.
    if (
      (def.kind === "theme-token" && (def.name === "--spacing" || def.name.startsWith("--color-base-"))) ||
      (def.kind === "root-variable" && def.name.startsWith("--color-base-"))
    ) {
      owners.get(key)?.add(GLOBAL);
    }
  }

  const links = new Map<string, Set<string>>();
  for (const [key, content] of bodiesOf(css, defs)) {
    const targets = dependencies(content, defs);
    const def = defs.find((candidate) => symbolId(candidate) === key);
    // Tailwind --animate-* values are animation shorthands without an
    // "animation:" declaration prefix; resolve the referenced keyframes.
    if (def?.kind === "theme-token" && def.name.startsWith("--animate-")) {
      for (const frame of defs) {
        if (frame.kind === "keyframes" && contains(content, frame.name)) {
          targets.add(symbolId(frame));
        }
      }
    }
    targets.delete(key);
    links.set(key, targets);
  }
  // Explicit global base-layer usage is never evidence of feature ownership.
  for (const src of css) {
    if (path.basename(src.path) !== GLOBAL) continue;
    const ast = parse(src.content, { positions: true, parseAtrulePrelude: false });
    if (ast.type !== "StyleSheet") continue;
    for (const node of ast.children) {
      if (
        node.type !== "Atrule" ||
        node.name !== "layer" ||
        !node.loc ||
        !node.prelude ||
        generate(node.prelude).trim() !== "base"
      ) {
        continue;
      }
      const body = src.content.slice(node.loc.start.offset, node.loc.end.offset);
      for (const key of dependencies(body, defs)) owners.get(key)?.add(GLOBAL);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, targets] of links) {
      for (const feature of owners.get(from) ?? []) {
        for (const to of targets) {
          if (duplicates.has(to)) continue;
          const set = owners.get(to);
          if (set && !set.has(feature)) {
            set.add(feature);
            changed = true;
          }
        }
      }
    }
  }
  const result = new Map<string, string | undefined>();
  for (const def of defs) {
    const key = symbolId(def);
    const set = owners.get(key);
    let owner: string | undefined;
    if (!duplicates.has(key) && set && set.size > 0 && !(def.kind === "root-variable" && def.scope === "conditional")) {
      owner = set.size === 1 ? [...set][0] : GLOBAL;
    }
    result.set(key, owner);
  }
  return result;
}
