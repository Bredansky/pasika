import path from "node:path";
import type { Rule } from "eslint";
import { resolveSpecifier } from "../project/index.js";

export const noUtilBarrelRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require utilities to be imported directly without a barrel.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(filename);

    return {
      Program(node) {
        for (const specifier of importSpecifiers(context.sourceCode.text)) {
          const target = resolveSpecifier(filename, specifier, sourceRoot);
          if (!target) continue;
          const segments = target.replace(/\\/g, "/").split("/");
          const utilsIndex = segments.lastIndexOf("utils");
          if (utilsIndex < 0 || !path.basename(target).startsWith("index.")) continue;
          context.report({
            node,
            message:
              `Import utilities directly instead of through "${specifier}". ` +
              "See docs/code-organization-guide/rules/utilities-rule.md",
          });
        }
      },
    };
  },
};

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /\bimport\s+(?:(?:type\s+)?[\s\S]*?\sfrom\s+)?["'](?<specifier>[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match.groups?.specifier;
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

function sourceRootOf(filename: string): string {
  const marker = `${path.sep}src${path.sep}`;
  const srcIndex = filename.lastIndexOf(marker);
  return srcIndex >= 0 ? filename.slice(0, srcIndex + marker.length - 1) : path.resolve("src");
}
