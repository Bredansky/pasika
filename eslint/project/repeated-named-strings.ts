/** Repeated named strings that are indistinguishable by both name and value. */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { isProductionSource } from "./semantic-literals";
import type { ProjectIndex } from "./index";

export interface NamedStringConstant {
  file: string;
  name: string;
  value: string;
  line: number;
  column: number;
  moduleLevel: boolean;
}

/** Generic lexical variable names don't prove that values share one meaning. */
const ambiguousNames = new Set([
  "code",
  "data",
  "error",
  "id",
  "input",
  "item",
  "key",
  "label",
  "message",
  "name",
  "output",
  "path",
  "query",
  "result",
  "status",
  "text",
  "title",
  "type",
  "url",
  "value",
]);

function literalString(node: ts.Expression): string | undefined {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  return undefined;
}

function declarations(file: string): NamedStringConstant[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: NamedStringConstant[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      node.parent.flags === ts.NodeFlags.Const &&
      !ambiguousNames.has(node.name.text)
    ) {
      const value = literalString(node.initializer);
      if (value !== undefined) {
        const position = source.getLineAndCharacterOfPosition(node.initializer.getStart(source));
        const statement = node.parent.parent;
        found.push({
          file,
          name: node.name.text,
          value,
          line: position.line + 1,
          column: position.character,
          moduleLevel:
            ts.isVariableStatement(statement) &&
            (ts.isSourceFile(statement.parent) ||
              (ts.isModuleBlock(statement.parent) && ts.isSourceFile(statement.parent.parent))),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const cache = new WeakMap<ProjectIndex, Map<string, NamedStringConstant[]>>();

export function namedStringConstantsByKey(index: ProjectIndex): Map<string, NamedStringConstant[]> {
  const previous = cache.get(index);
  if (previous) return previous;
  const groups = new Map<string, NamedStringConstant[]>();
  for (const file of index.modules.keys()) {
    if (!isProductionSource(file, index.sourceRoot)) continue;
    try {
      for (const entry of declarations(file)) {
        const key = JSON.stringify([entry.name, entry.value]);
        const group = groups.get(key) ?? [];
        group.push(entry);
        groups.set(key, group);
      }
    } catch {
      // A file being concurrently edited does not contribute duplicate evidence.
    }
  }
  cache.set(index, groups);
  return groups;
}
