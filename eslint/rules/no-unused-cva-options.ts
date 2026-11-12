/**
 * ESLint rule: pasika/no-unused-cva-options
 *
 * Disallows a statically unused CVA option in a closed application component.
 * Dynamic JSX props (including spreads) make the corresponding dimension
 * unknown, so an option is never reported from incomplete runtime evidence.
 *
 * @see docs/next-tailwind-guide/rules/component-variant-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { componentParameterDefaults, consumedOptions } from "../project/cva-consumers";
import { cvaOptions, owningComponent } from "../project/cva-options";
import { getProjectIndex, symbolKey } from "../project/index";
import { isProductionSource } from "../project/semantic-literals";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-tailwind-guide/rules/component-variant-rule.md";

/** Published packages have external consumers that cannot be counted from the local app tree. */
function hasExternalPackageConsumers(sourceRoot: string): boolean {
  try {
    const packageFile = path.resolve(sourceRoot, "..", "package.json");
    const manifest: unknown = JSON.parse(readFileSync(packageFile, "utf8"));
    return typeof manifest === "object" && manifest !== null && "exports" in manifest && manifest.exports !== undefined;
  } catch {
    return false;
  }
}

export const noUnusedCvaOptionsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Disallow provably unused CVA variant choices in closed application components." },
  },
  create(context) {
    const root = sourceRootOf(context);
    if (hasExternalPackageConsumers(root)) return {};
    const filename = path.resolve(context.filename);
    if (!filename.endsWith(".tsx") || !isProductionSource(filename, root)) return {};
    const project = getProjectIndex(root);
    if (!project?.modules.has(filename)) return {};
    return {
      "Program:exit"() {
        const source = ts.createSourceFile(
          filename,
          context.sourceCode.text,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        for (const definition of cvaOptions(source, project)) {
          // A CVA factory imported separately is a public styling API, not
          // necessarily exercised via the owning component JSX.
          if (project.symbolConsumers.get(symbolKey(filename, definition.name))?.size) continue;
          const owner = owningComponent(source, project, definition.name);
          if (!owner) continue;
          const defaults = new Map(definition.defaults);
          for (const [name, value] of componentParameterDefaults(project, filename, owner)) defaults.set(name, value);
          const usages = consumedOptions(project, filename, owner, definition.variants, defaults);
          if (usages.seen === 0) continue;
          for (const [dimension, options] of definition.variants) {
            if (usages.unknown.has(dimension)) continue;
            const used = usages.used.get(dimension) ?? new Set<string>();
            // All static values must be known, and at least one runtime value
            // must be observed before diagnosing a closed variant dimension.
            if (used.size === 0 || [...used].some((value) => !options.has(value))) continue;
            for (const [key, node] of options) {
              if (used.has(key)) continue;
              const position = source.getLineAndCharacterOfPosition(node.getStart(source));
              context.report({
                loc: { line: position.line + 1, column: position.character },
                message: `Unused CVA option "${dimension}=${key}" in ${owner}: no statically resolved production consumer selects it. Remove the option or explicitly use it. ${DOC}`,
              });
            }
          }
        }
      },
    };
  },
};
