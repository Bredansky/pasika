/**
 * ESLint rule: pasika/external-provider-comment
 *
 * External @theme and @utility mappings should identify the npm package
 * that supplies the referenced runtime CSS variable, just as Tailwind defaults are labelled.
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate, parse, walk, type StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { externalMapping } from "./external-mapping";
import { atrulesNamed, blockChildren, preludeIdentifiers } from "./helpers";
import { CSS_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const PACKAGE_COMMENT = /^\s*\/\*\s*(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*\s*\*\/\s*$/u;
const APPLY_VARIABLE = /(?:\bvar\(\s*|-\(\s*)(?<source>--[a-z][\w-]*)/gu;

export const externalProviderCommentRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a source npm package comment on external CSS variable mappings in @theme inline and @utility.",
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

        for (const utility of atrulesNamed(sheet, "utility")) {
          for (const apply of atrulesNamed(utility, "apply")) {
            if (!apply.loc) continue;
            const text = context.sourceCode.text.slice(apply.loc.start.offset, apply.loc.end.offset);
            const external = [...text.matchAll(APPLY_VARIABLE)]
              .map((match) => match.groups?.source)
              .find((source) => source && !authored.has(source));
            if (!external) continue;
            const line = lines[apply.loc.end.line - 1] ?? "";
            const trailing = line.slice(apply.loc.end.column - 1).replace(/^;/u, "");
            if (PACKAGE_COMMENT.test(trailing)) continue;
            context.report({
              node: apply,
              message: `External CSS variable mapping ${
                external
              } in @apply MUST end with /* <npm-package-name> */ on the at-rule line.`,
            });
          }
        }
      },
    };
  },
};
