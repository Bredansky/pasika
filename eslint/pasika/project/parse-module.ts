import path from "node:path";
import { readFileSync } from "node:fs";
import ts from "typescript";

/** What an exported name is, as far as the placement rules need to care. */
export type ExportKind = "component" | "hook" | "type" | "schema" | "constant" | "function" | "other";

export interface ModuleExport {
  name: string;
  kind: ExportKind;
  line: number;
}

export interface ModuleImport {
  /** The specifier exactly as written. */
  specifier: string;
  /** Names taken from the module; empty for a side-effect or namespace import. */
  names: string[];
  line: number;
}

export interface ParsedModule {
  file: string;
  imports: ModuleImport[];
  exports: ModuleExport[];
}

const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);
const isHookName = (name: string): boolean => /^use[A-Z]/.test(name);
const isSchemaName = (name: string): boolean => /[Ss]chema$/.test(name);

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function returnsJsx(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child) ||
      ts.isJsxOpeningFragment(child)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function classifyFunction(name: string, isTsx: boolean, hasJsx: boolean): ExportKind {
  if (isHookName(name)) return "hook";
  if (isTsx && isPascalCase(name) && hasJsx) return "component";
  return "function";
}

function classifyValue(name: string, initializer: ts.Node | undefined, isTsx: boolean): ExportKind {
  const isFunctionLike =
    initializer !== undefined &&
    (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer) || ts.isFunctionDeclaration(initializer));

  if (isHookName(name)) return "hook";
  if (isSchemaName(name)) return "schema";
  if (isTsx && isPascalCase(name) && (initializer === undefined || returnsJsx(initializer) || isFunctionLike)) {
    return "component";
  }
  if (isFunctionLike) return "function";
  return "constant";
}

/**
 * Parses one module for the names it exports and the modules it imports.
 *
 * Uses the TypeScript parser without a program or typechecker: the placement
 * rules only need the shape of the import and export statements, and parsing a
 * file in isolation keeps this fast enough to run over a whole tree.
 */
export function parseModule(file: string): ParsedModule {
  const text = readFileSync(file, "utf8");
  const isTsx = file.endsWith(".tsx") || file.endsWith(".jsx");
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const imports: ModuleImport[] = [];
  const exports: ModuleExport[] = [];

  const addImport = (specifierNode: ts.Expression, names: string[], node: ts.Node): void => {
    if (!ts.isStringLiteral(specifierNode)) return;
    imports.push({ specifier: specifierNode.text, names, line: lineOf(sourceFile, node) });
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const names: string[] = [];
      const bindings = statement.importClause?.namedBindings;
      if (statement.importClause?.name) names.push(statement.importClause.name.text);
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) names.push(element.propertyName?.text ?? element.name.text);
      }
      addImport(statement.moduleSpecifier, names, statement);
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      // `export { x } from "./y"` both imports and re-exports.
      if (statement.moduleSpecifier) {
        const names: string[] = [];
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            names.push(element.propertyName?.text ?? element.name.text);
          }
        }
        addImport(statement.moduleSpecifier, names, statement);
      }
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          exports.push({ name: element.name.text, kind: "other", line: lineOf(sourceFile, element) });
        }
      }
      continue;
    }

    const isExported = ts.canHaveModifiers(statement)
      ? (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      : false;
    if (!isExported) continue;

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      exports.push({
        name,
        kind: classifyFunction(name, isTsx, returnsJsx(statement)),
        line: lineOf(sourceFile, statement),
      });
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        exports.push({
          name: declaration.name.text,
          kind: classifyValue(declaration.name.text, declaration.initializer, isTsx),
          line: lineOf(sourceFile, declaration),
        });
      }
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      exports.push({ name: statement.name.text, kind: "type", line: lineOf(sourceFile, statement) });
    }
  }

  return { file: path.resolve(file), imports, exports };
}
