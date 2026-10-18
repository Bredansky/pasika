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

/** Canonical locales contain only static strings and one level of namespaces. */
function isLocaleContent(node: unknown, depth = 0): boolean {
  if (typeof node !== "object" || node === null || !("type" in node)) return false;
  if ((node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") && "expression" in node) {
    return isLocaleContent(node.expression, depth);
  }
  if (node.type === "Literal") return depth > 0 && "value" in node && typeof node.value === "string";
  if (node.type === "TemplateLiteral") {
    return depth > 0 && "expressions" in node && Array.isArray(node.expressions) && node.expressions.length === 0;
  }
  if (node.type !== "ObjectExpression" || depth > 1 || !("properties" in node) || !Array.isArray(node.properties)) {
    return false;
  }
  return node.properties.every(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "type" in entry &&
      entry.type === "Property" &&
      "kind" in entry &&
      entry.kind === "init" &&
      "computed" in entry &&
      !entry.computed &&
      "value" in entry &&
      isLocaleContent(entry.value, depth + 1),
  );
}

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

  return isLocaleContent(variable.init);
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
