/**
 * ESLint rule: pasika/base-layer-pair
 *
 * A single global CSS tree may split @layer base across multiple files.
 * Require semantic background and foreground colors on the body across that tree.
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

function collectBodyUtilities(node: StyleSheetPlain): { hasBaseLayer: boolean; names: string[]; colors: string[] } {
  const colors = atrulesNamed(node, "theme").flatMap((theme) =>
    blockChildren(theme).flatMap((child) =>
      child.type === "Declaration" && child.property.startsWith("--color-")
        ? [child.property.slice("--color-".length)]
        : [],
    ),
  );
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
  return { hasBaseLayer: baseLayers.length > 0, names, colors };
}

export const baseLayerPairRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require the global CSS tree's base layer to apply theme-defined background and foreground colors to body.",
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
            const parsed = toPlainObject(parse(source, { parseAtrulePrelude: true }));
            if (parsed.type !== "StyleSheet") continue;
            const fragment = collectBodyUtilities(parsed);
            applied.hasBaseLayer ||= fragment.hasBaseLayer;
            applied.names.push(...fragment.names);
            applied.colors.push(...fragment.colors);
            queue.push({ file: filename, source });
          }
        }

        if (!applied.hasBaseLayer) return;
        const colors = new Set(applied.colors);
        const hasColorUtility = (prefix: "bg-" | "text-"): boolean =>
          applied.names.some((name) => {
            const utility = name.split(":").at(-1)?.split("/")[0] ?? "";
            return utility.startsWith(prefix) && colors.has(utility.slice(prefix.length));
          });
        if (!hasColorUtility("bg-") || !hasColorUtility("text-")) {
          context.report({
            node,
            message:
              "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
          });
        }
      },
    };
  },
};
