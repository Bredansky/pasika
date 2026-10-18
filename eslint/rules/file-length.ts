/**
 * ESLint rule: pasika/file-length
 *
 * Keeps repository TypeScript and application JavaScript files bounded so they
 * cannot accumulate independent responsibilities without extraction.
 *
 * @see docs/next-codebase-guide/rules/application-structure-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { sourceRootOf } from "./project-root";

const MAX_SOURCE_FILE_LINES = 300;

/**
 * Locale entries are declarative content required to stay in one exported
 * dictionary. Only exempt the canonical module when it contains that
 * dictionary alone; unrelated logic in the same file remains subject to
 * the normal length limit.
 */
function isCanonicalLocalesModule(context: Rule.RuleContext): boolean {
  const relativeFile = path.relative(sourceRootOf(context), path.resolve(context.filename));
  if (relativeFile !== path.join("locales", "index.ts")) return false;

  const statements = context.sourceCode.ast.body;
  if (statements.length !== 1) return false;
  const statement = statements[0];
  if (statement?.type !== "ExportNamedDeclaration") return false;
  const declaration = statement.declaration;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return false;
  if (declaration.declarations.length !== 1) return false;
  const variable = declaration.declarations[0];
  if (variable?.id.type !== "Identifier" || variable.id.name !== "locales") return false;

  let value: unknown = variable.init;
  while (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value.type === "TSAsExpression" || value.type === "TSSatisfiesExpression") &&
    "expression" in value
  ) {
    value = value.expression;
  }
  return typeof value === "object" && value !== null && "type" in value && value.type === "ObjectExpression";
}

export const fileLengthRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require TypeScript files and application JavaScript files to stay at or below 300 lines.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const lineCount = context.sourceCode.lines.length;
        if (lineCount <= MAX_SOURCE_FILE_LINES || isCanonicalLocalesModule(context)) return;

        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Source file has ${String(lineCount)} lines; split it so no source file exceeds ${String(MAX_SOURCE_FILE_LINES)} lines. ` +
            "See docs/next-codebase-guide/rules/application-structure-rule.md",
        });
      },
    };
  },
};
