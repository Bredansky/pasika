/**
 * ESLint rule: pasika/external-provider-comment
 *
 * External @theme mappings should identify the npm package that supplies
 * the referenced runtime CSS variable, just as Tailwind defaults are labelled.
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate, parse, walk, type StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { externalMapping } from "./external-mapping";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const PACKAGE_COMMENT = /^\s*\/\*\s*(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*\s*\*\/\s*$/u;

export const externalProviderCommentRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a trailing npm package name comment on external CSS variable mappings in @theme inline.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const textOf = cachedTextReader();
    const authored = new Set<string>();
    const files = new Set([...findFiles(sourceRoot, CSS_EXTENSIONS), current]);
    for (const file of files) {
      const css = path.normalize(file) === current ? context.sourceCode.text : textOf(file);
      const ast = parse(css, { parseAtrulePrelude: false });
      walk(ast, {
        enter(node) {
          if (node.type === "Declaration" && node.property.startsWith("--")) authored.add(node.property);
        },
      });
    }

    const lines = context.sourceCode.text.split(/\r?\n/u);
    return {
      "StyleSheet:exit"(sheet: StyleSheetPlain) {
        for (const theme of atrulesNamed(sheet, "theme")) {
          if (!preludeIdentifiers(theme).includes("inline")) continue;
          for (const child of blockChildren(theme)) {
            if (child.type !== "Declaration" || !child.loc) continue;
            if (!externalMapping(generate(child.value), child.property, authored)) continue;
            const line = lines[child.loc.end.line - 1] ?? "";
            const trailing = line.slice(child.loc.end.column - 1).replace(/^;/u, "");
            if (PACKAGE_COMMENT.test(trailing)) continue;
            context.report({
              node: child,
              message: `External CSS variable mapping ${child.property} MUST end with /* <npm-package-name> */ on the declaration line.`,
            });
          }
        }
      },
    };
  },
};
