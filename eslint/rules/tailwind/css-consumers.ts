import path from "node:path";
import { generate, parse } from "@eslint/css-tree";
import type { CssDependencyGraph, CssSource } from "./css-dependency-graph";
import { bodiesOf, dependencies, symbolId } from "./css-ownership";
import { escapeRegExp } from "./source-files";
import { themeClassesForTokens } from "./tailwind-theme-classes";

function contains(text: string, name: string): boolean {
  return new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, "u").test(text);
}

/**
 * Trace CSS definitions to component consumers for stylesheet grouping.
 * Reuse the dependency-body parser from placement checks, but retain concrete
 * component paths instead of collapsing them into stylesheet owners.
 */
export function inferCssConsumerPaths(options: {
  graph: CssDependencyGraph;
  css: readonly CssSource[];
  modules: readonly CssSource[];
  sourceRoot: string;
}): Map<string, string[]> {
  const { graph, css, modules, sourceRoot } = options;
  const defs = graph.definitions;
  const components = modules.filter((mod) => {
    const relative = path.relative(sourceRoot, mod.path).split(path.sep).join("/");
    return (
      /^(?:features\/[\w-]+\/|shared\/|compositions\/)[\w./-]+\.(?:tsx|jsx)$/u.test(relative) &&
      !/\.(?:test|spec|stories)\.(?:tsx|jsx)$/u.test(relative)
    );
  });
  const classesByToken = themeClassesForTokens(
    defs.filter((def) => def.kind === "theme-token").map((def) => def.name),
    sourceRoot,
  );
  const consumers = new Map(defs.map((def) => [symbolId(def), new Set<string>()]));

  for (const def of defs) {
    const refs = graph.references.filter(
      (ref) =>
        ref.source === "module" &&
        ((def.kind === "theme-token" && ref.kind === "theme-class" && ref.token === def.name) ||
          (def.kind === "utility" && ref.kind === "utility" && ref.name === def.name) ||
          (def.kind === "selector" && ref.kind === "selector" && ref.name === def.name) ||
          (def.kind === "keyframes" && ref.kind === "keyframes" && ref.name === def.name)),
    );
    for (const mod of components) {
      const explicit =
        (["theme-token", "root-variable"].includes(def.kind) && contains(mod.content, def.name)) ||
        (def.kind === "keyframes" && contains(mod.content, def.name)) ||
        (def.kind === "font-face" &&
          new RegExp(`(?:fontFamily|font-family)\\s*[:=]\\s*["']${escapeRegExp(def.name)}`, "iu").test(mod.content));
      if (explicit || refs.some((ref) => ref.file === mod.path)) {
        consumers.get(symbolId(def))?.add(path.relative(sourceRoot, mod.path).split(path.sep).join("/"));
      }
    }
  }

  const links = new Map<string, Set<string>>();
  for (const [from, body] of bodiesOf(css, defs)) {
    const targets = dependencies(body, defs, classesByToken);
    const def = defs.find((candidate) => symbolId(candidate) === from);
    if (def?.kind === "theme-token" && def.name.startsWith("--animate-")) {
      for (const frame of defs) {
        if (frame.kind === "keyframes" && contains(body, frame.name)) {
          targets.add(symbolId(frame));
        }
      }
    }
    // The text utility also consumes its optional text metadata tokens.
    if (def?.kind === "theme-token" && /^--text-[\w-]+$/u.test(def.name)) {
      for (const metadata of defs) {
        if (
          metadata.kind === "theme-token" &&
          ["--line-height", "--letter-spacing", "--font-weight"].some((suffix) => metadata.name === def.name + suffix)
        ) {
          targets.add(symbolId(metadata));
        }
      }
    }
    targets.delete(from);
    links.set(from, targets);
  }

  // Base styles and Tailwind design-system defaults have app-wide consumers.
  for (const src of css) {
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
      for (const target of dependencies(body, defs, classesByToken)) consumers.get(target)?.add("app");
    }
  }
  for (const def of defs) {
    if (def.kind !== "theme-token") continue;
    if (
      ["--spacing", "--radius", "--font-sans", "--font-mono"].includes(def.name) ||
      def.name.startsWith("--breakpoint-") ||
      def.name.startsWith("--default-")
    ) {
      consumers.get(symbolId(def))?.add("app");
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [from, targets] of links) {
      for (const consumer of consumers.get(from) ?? []) {
        for (const target of targets) {
          const set = consumers.get(target);
          if (set && !set.has(consumer)) {
            set.add(consumer);
            changed = true;
          }
        }
      }
    }
  }
  return new Map([...consumers].map(([id, paths]) => [id, [...paths].sort()]));
}
