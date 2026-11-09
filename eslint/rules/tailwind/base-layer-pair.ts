/**
 * ESLint rule: pasika/base-layer-pair
 *
 * A single global CSS tree may split @layer base across multiple files.
 * Require the body canvas/ink pair across that tree, not in every partial.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { parse, toPlainObject } from "@eslint/css-tree";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { atrulesNamed, blockChildren, preludeIdentifiers, selectorNames } from "./helpers";
import { cachedTextReader } from "./source-files";
import { importedSpecifiers, resolveSpecifier } from "./stylesheet-graph";

function collectBodyUtilities(node: StyleSheetPlain): { hasBaseLayer: boolean; names: string[] } {
  const baseLayers = atrulesNamed(node, "layer").filter((layer) => preludeIdentifiers(layer).includes("base"));
  const names: string[] = [];
  for (const layer of baseLayers) {
    for (const child of blockChildren(layer)) {
      if (child.type !== "Rule" || !selectorNames(child).includes("body")) continue;
      for (const declaration of blockChildren(child)) {
        if (declaration.type === "Atrule" && declaration.name === "apply") {
          names.push(...preludeIdentifiers(declaration));
        }
      }
    }
  }
  // Keyframe-only @layer base blocks do not define document base styles.
  // They must not trigger the body canvas/ink requirement by themselves.
  const hasBaseLayer = baseLayers.some((layer) =>
    blockChildren(layer).some((child) => child.type !== "Atrule" || child.name !== "keyframes"),
  );
  return { hasBaseLayer, names };
}

export const baseLayerPairRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the global CSS tree's base layer to apply canvas and ink utilities to body.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const entryPoint = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    if (current !== entryPoint) return {};

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const applied = collectBodyUtilities(node);
        const themeColors = new Set<string>();
        const collectThemeColors = (source: string): void => {
          const uncommented = source.replace(/\/\*[\s\S]*?\*\//gu, " ");
          for (const theme of uncommented.matchAll(/@theme(?:\s+[\w-]+)*\s*\{(?<body>[^}]*)\}/gu)) {
            for (const token of (theme.groups?.body ?? "").matchAll(/(?:^|[;\r\n])\s*--color-(?<name>[\w-]+)\s*:/gu)) {
              if (token.groups?.name) themeColors.add(token.groups.name);
            }
          }
        };
        collectThemeColors(context.sourceCode.text);
        const seen = new Set<string>([current]);
        const queue: { file: string; source: string }[] = [{ file: current, source: context.sourceCode.text }];
        const textOf = cachedTextReader();

        while (queue.length > 0) {
          const from = queue.shift();
          if (!from) continue;
          for (const specifier of importedSpecifiers(from.source)) {
            const target = resolveSpecifier(from.file, specifier, sourceRoot);
            if (!target || path.extname(target) !== ".css") continue;
            const filename = path.normalize(target);
            if (seen.has(filename) || !existsSync(filename)) continue;
            seen.add(filename);
            const source = textOf(filename);
            collectThemeColors(source);
            const parsed = toPlainObject(parse(source, { parseAtrulePrelude: true }));
            if (parsed.type !== "StyleSheet") continue;
            const fragment = collectBodyUtilities(parsed);
            applied.hasBaseLayer ||= fragment.hasBaseLayer;
            applied.names.push(...fragment.names);
            queue.push({ file: filename, source });
          }
        }

        if (!applied.hasBaseLayer) return;
        const hasCanvas = applied.names.some(
          (name) => name.includes("canvas") || (name.startsWith("bg-") && themeColors.has(name.slice(3))),
        );
        const hasInk = applied.names.some(
          (name) => name.includes("ink") || (name.startsWith("text-") && themeColors.has(name.slice(5))),
        );
        if (!hasCanvas || !hasInk) {
          context.report({
            node,
            message:
              "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
          });
        }
      },
    };
  },
};
