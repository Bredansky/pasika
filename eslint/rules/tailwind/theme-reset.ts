/**
 * ESLint rule: pasika/theme-reset
 *
 * The CSS tree must reset Tailwind's default theme once with `--*: initial`.
 * The reset may live in globals.css or a directly imported stylesheet.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate, parse, toPlainObject } from "@eslint/css-tree";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { atrulesNamed, blockChildren, walkNodes } from "./helpers";
import { cachedTextReader } from "./source-files";
import { importedSpecifiers, resolveSpecifier } from "./stylesheet-graph";

/** The tolerant parser may carry Tailwind's --*: initial as a Raw node. */
function isThemeReset(node: CssNodePlain | undefined): boolean {
  if (!node) return false;
  if (node.type === "Declaration") return node.property === "--*" && generate(node.value).trim() === "initial";
  if (node.type === "Raw") return /--\*\s*:\s*initial\s*;/u.test(node.value);
  return false;
}

function hasThemeReset(node: StyleSheetPlain): boolean {
  return atrulesNamed(node, "theme").some((theme) => {
    if (blockChildren(theme).some(isThemeReset)) return true;
    let nested = false;
    walkNodes(theme, (child) => {
      if (isThemeReset(child)) nested = true;
    });
    return nested;
  });
}

export const themeResetRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require the CSS tree to reset Tailwind's default theme with --*: initial.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const entryPoint = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    if (current !== entryPoint) return {};

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        if (hasThemeReset(node)) return;

        const textOf = cachedTextReader();
        const seen = new Set<string>([current]);
        const queue: { file: string; source: string }[] = [{ file: current, source: context.sourceCode.text }];

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
            const parsed = toPlainObject(parse(source, { parseAtrulePrelude: false }));
            if (parsed.type === "StyleSheet" && hasThemeReset(parsed)) return;
            queue.push({ file: filename, source });
          }
        }

        context.report({
          node,
          message:
            "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
        });
      },
    };
  },
};
