/**
 * ESLint rule: pasika/no-catch-all-constants
 *
 * Prevents high-confidence mixed-concern constants bags. A generic filename
 * alone is not an error, and naming-prefix diversity alone is not proof:
 * require both before reporting a likely catch-all module.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

/** Common bag names, optionally preceded by a qualifier (e.g. service-values). */
const BAG_NAME = /^(?:(?:[a-z][a-z0-9]*-)+)?(?:values|constants|common|misc|miscellaneous|shared)$/u;
const MIN_EXPORTS = 7;
const MIN_DOMAINS = 5;

function leadingDomain(name: string): string | undefined {
  // Treat camelCase and PascalCase consistently; discard non-domain digits.
  const words = name.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|[0-9]+/gu);
  const first = words?.find((word) => /^[a-z]/iu.test(word));
  return first?.toLowerCase();
}

function enumDeclarationName(node: unknown): string | undefined {
  if (
    node === null ||
    typeof node !== "object" ||
    !("type" in node) ||
    node.type !== "TSEnumDeclaration" ||
    !("id" in node)
  ) {
    return undefined;
  }
  const id = node.id;
  if (id === null || typeof id !== "object" || !("name" in id) || typeof id.name !== "string") {
    return undefined;
  }
  return id.name;
}

export const noCatchAllConstantsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Detect likely mixed-concern bags of exported constants in generically named support modules.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");
    const basename = path.posix.basename(filename);
    if (
      !filename.includes("/src/") ||
      !filename.includes("/constants/") ||
      !basename.endsWith(".ts") ||
      basename === "index.ts" ||
      !BAG_NAME.test(basename.slice(0, -3))
    ) {
      return {};
    }

    const names: string[] = [];
    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration) return;
        if (declaration.type === "VariableDeclaration") {
          for (const entry of declaration.declarations) {
            if (entry.id.type === "Identifier") names.push(entry.id.name);
          }
        } else {
          const name = enumDeclarationName(declaration);
          if (name) names.push(name);
        }
      },
      "Program:exit"() {
        if (names.length < MIN_EXPORTS) return;
        const domains = [...new Set(names.map(leadingDomain).filter((part): part is string => part !== undefined))];
        if (domains.length < MIN_DOMAINS) return;
        context.report({
          loc: { line: 1, column: 0 },
          message:
            `Likely catch-all constants module "${basename}": ${String(names.length)} exported values span ${String(domains.length)} naming domains (${domains.join(", ")}). ` +
            "Split unrelated values into cohesive, domain-named constants files and preserve each export's consumer placement. " +
            "See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
