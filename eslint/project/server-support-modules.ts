import { readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import ts from "typescript";

const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

export function isServerOnlySpecifier(specifier: string): boolean {
  return specifier === "server-only" || specifier.startsWith("node:") || NODE_BUILTINS.has(specifier);
}

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/u;

function parseFile(file: string): ts.SourceFile | undefined {
  try {
    return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  } catch {
    return undefined;
  }
}

function isRuntimeExport(node: ts.ExportDeclaration): boolean {
  if (node.getText().startsWith("export type ")) return false;
  return (
    !node.exportClause ||
    !ts.isNamedExports(node.exportClause) ||
    node.exportClause.elements.some((element) => !element.getText().startsWith("type "))
  );
}

function hasServerImport(source: ts.SourceFile): boolean {
  let serverOnly = false;
  const check = (specifier: string): void => {
    if (isServerOnlySpecifier(specifier)) {
      serverOnly = true;
    }
  };
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      check(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      isRuntimeExport(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      check(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")
      ) {
        check(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return serverOnly;
}

/** Server-only support files are identified by imports and by exports from the server barrel, never filenames. */
export function serverSupportModules(directory: string): Set<string> {
  const names = new Set<string>();
  const serverEntry = parseFile(path.join(directory, "server.ts"));
  for (const statement of serverEntry?.statements ?? []) {
    if (
      !ts.isExportDeclaration(statement) ||
      !isRuntimeExport(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith("./")) names.add(path.basename(specifier));
  }
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return names;
  }
  for (const entry of entries) {
    if (!SOURCE_FILE.test(entry) || entry === "index.ts" || entry === "server.ts") continue;
    const source = parseFile(path.join(directory, entry));
    if (source && hasServerImport(source)) names.add(entry.replace(SOURCE_FILE, ""));
  }
  return names;
}
