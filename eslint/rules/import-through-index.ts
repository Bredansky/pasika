import path from "node:path";
import type { Rule } from "eslint";
import { resolveSpecifier } from "../project/index";
import { segmentsOf } from "../project/ccf";

export const importThroughIndexRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require imports of support files to use their support-folder index.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context, filename);
    return {
      Program(node) {
        for (const specifier of importSpecifiers(context.sourceCode.text)) {
          const target = resolveSpecifier(filename, specifier, sourceRoot);
          if (!target) continue;
          const targetSegments = segmentsOf(target, sourceRoot);
          const supportFolderIndex = targetSegments.findIndex((segment) =>
            ["constants", "types", "schemas"].includes(segment),
          );
          const supportFolder = supportFolderIndex >= 0 ? targetSegments[supportFolderIndex] : undefined;
          if (!supportFolder || path.basename(target).startsWith("index.")) continue;
          const folderIndex = targetSegments.slice(0, supportFolderIndex + 1);
          const expected = `@/${folderIndex.join("/")}`;
          context.report({
            node,
            message:
              `Import support files through ${expected} instead of "${specifier}". ` +
              "See the code-organization-guide exports and imports rules.",
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

function sourceRootOf(context: { cwd?: string }, filename: string): string {
  const marker = `${path.sep}src${path.sep}`;
  const srcIndex = filename.lastIndexOf(marker);
  // Prefer the src root implied by the linted file's own path, which is immune
  // to cwd entirely; fall back to ESLint's cwd rather than the process cwd.
  if (srcIndex >= 0) return filename.slice(0, srcIndex + marker.length - 1);
  return path.resolve(context.cwd ?? process.cwd(), "src");
}
