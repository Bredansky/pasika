/**
 * ESLint rule: pasika/base-layer-pair
 *
 * The global base layer MUST apply base-canvas and base-ink to the document
 * body as the default page pair.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers, selectorNames } from "./helpers";

export const baseLayerPairRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the base layer to apply base-canvas and base-ink to the body.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const baseLayers = atrulesNamed(node, "layer").filter((layer) => preludeIdentifiers(layer).includes("base"));
        if (baseLayers.length === 0) return;

        const applied: string[] = [];
        for (const layer of baseLayers) {
          for (const child of blockChildren(layer)) {
            if (child.type !== "Rule") continue;
            if (!selectorNames(child).includes("body")) continue;
            for (const declaration of blockChildren(child)) {
              if (declaration.type !== "Atrule" || declaration.name !== "apply") continue;
              applied.push(...preludeIdentifiers(declaration));
            }
          }
        }

        const hasCanvas = applied.some((name) => name.includes("canvas"));
        const hasInk = applied.some((name) => name.includes("ink"));
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
