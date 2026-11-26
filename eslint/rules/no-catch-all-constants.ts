/**
 * Detect proven mixed semantic domains in constants modules, including index.ts.
 * No identifier-prefix or literal-equality heuristics.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { exportedConstantOwner, getConstantDomains } from "../project/constant-domains";
import { constantDomainFamily, hasConflictingDomains } from "../project/typed-constant-domains";
import { typedParserServices } from "./contract-ownership";
import { sourceRootOf } from "./project-root";

export const noCatchAllConstantsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Detect constants used in unrelated, identifiable semantic domains." },
  },
  create(context) {
    const file = path.resolve(context.filename);
    const root = sourceRootOf(context);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !relative.split(path.sep).includes("constants")) {
      return {};
    }
    const services = typedParserServices(context.sourceCode.parserServices);
    if (!services) return {};

    return {
      Program(node) {
        const evidence = getConstantDomains(services.program, root).byFile.get(file) ?? [];
        const families = new Map<string, Set<string>>();
        for (const item of evidence) {
          if (!exportedConstantOwner(item.owner)) continue;
          const name = item.owner.name.getText();
          if (hasConflictingDomains(item.domains)) {
            context.report({
              node,
              message: `Constant ${item.declaration.name.getText()} is consumed in distinct semantic domains (${[
                ...item.domains,
              ]
                .sort()
                .join(", ")}). Use separate definitions. See docs/next-codebase-guide/rules/constants-rule.md`,
            });
          }
          for (const domain of item.domains) {
            const family = constantDomainFamily(domain);
            const names = families.get(family) ?? new Set<string>();
            names.add(name);
            families.set(family, names);
          }
        }
        // Require distinct exported owners. One misused value alone is not a bag.
        if (families.size < 2 || new Set([...families.values()].flatMap((names) => [...names])).size < 2) return;
        context.report({
          node,
          message: `Mixed semantic domains in constants module: ${[...families]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([family, names]) => `${family} (${[...names].sort().join(", ")})`)
            .join(
              "; ",
            )}. Split cohesive definitions while preserving consumer placement. See docs/next-codebase-guide/rules/constants-rule.md`,
        });
      },
    };
  },
};
