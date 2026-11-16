import { readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import ts from "typescript";

const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/u;

export function isServerOnlySpecifier(specifier: string): boolean {
  return specifier === "server-only" || specifier.startsWith("node:") || NODE_BUILTINS.has(specifier);
}

export interface ModuleDependency {
  specifier: string;
  runtime: boolean;
}

/** Classify real module references, not text that merely resembles an import. */
export function moduleDependencies(source: ts.SourceFile): ModuleDependency[] {
  const dependencies: ModuleDependency[] = [];
  const add = (specifier: ts.Node | undefined, runtime: boolean): void => {
    if (specifier && ts.isStringLiteral(specifier)) dependencies.push({ specifier: specifier.text, runtime });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const runtime =
        !clause ||
        (clause.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
          (Boolean(clause.name) ||
            !clause.namedBindings ||
            !ts.isNamedImports(clause.namedBindings) ||
            clause.namedBindings.elements.length === 0 ||
            clause.namedBindings.elements.some((element) => !element.isTypeOnly)));
      add(node.moduleSpecifier, runtime);
    } else if (ts.isExportDeclaration(node)) {
      const runtime =
        !node.isTypeOnly &&
        (!node.exportClause ||
          !ts.isNamedExports(node.exportClause) ||
          node.exportClause.elements.length === 0 ||
          node.exportClause.elements.some((element) => !element.isTypeOnly));
      add(node.moduleSpecifier, runtime);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, !node.isTypeOnly);
    } else if (ts.isCallExpression(node)) {
      if (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")
      ) {
        add(node.arguments[0], true);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return dependencies;
}

function parseFile(file: string): ts.SourceFile | undefined {
  try {
    return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  } catch {
    return undefined;
  }
}

/** Server-only support files are identified by runtime dependencies or by their server barrel, never filenames. */
export function serverSupportModules(directory: string): Set<string> {
  const names = new Set<string>();
  const serverEntry = parseFile(path.join(directory, "server.ts"));
  for (const statement of serverEntry?.statements ?? []) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      (statement.exportClause &&
        ts.isNamedExports(statement.exportClause) &&
        statement.exportClause.elements.length > 0 &&
        statement.exportClause.elements.every((element) => element.isTypeOnly))
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith("./")) {
      const local = specifier.slice(2);
      if (!local.includes("/")) names.add(path.basename(local).replace(SOURCE_FILE, ""));
    }
  }

  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return names;
  }
  const locals = new Map<string, ModuleDependency[]>();
  for (const entry of entries) {
    if (!SOURCE_FILE.test(entry) || entry === "index.ts" || entry === "server.ts") continue;
    const source = parseFile(path.join(directory, entry));
    if (!source) continue;
    const stem = entry.replace(SOURCE_FILE, "");
    const dependencies = moduleDependencies(source).filter((dependency) => dependency.runtime);
    locals.set(stem, dependencies);
    if (dependencies.some(({ specifier }) => isServerOnlySpecifier(specifier))) names.add(stem);
  }

  // A sibling importing another server-only sibling is itself server-only.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [stem, dependencies] of locals) {
      if (names.has(stem)) continue;
      if (
        dependencies.some(({ specifier }) => {
          if (!specifier.startsWith("./")) return false;
          const local = specifier.slice(2);
          return !local.includes("/") && names.has(local.replace(SOURCE_FILE, ""));
        })
      ) {
        names.add(stem);
        changed = true;
      }
    }
  }
  return names;
}
