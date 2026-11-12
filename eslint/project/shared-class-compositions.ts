/**
 * Resolve shared static Tailwind class compositions through named imports,
 * re-export barrels, and local const/cn chains. Reuse the JSX class-reuse
 * project's index rather than treating exported styling strings as components.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { resolveSpecifier, type ProjectIndex } from "./index";

// Explicitly shared styling strings are intentional contracts, even when short.
const MIN_SHARED_CLASSES = 2;

interface Binding {
  file: string;
  name: string;
}

interface Reexport extends Binding {
  exported: string;
}

interface ModuleInfo {
  source: ts.SourceFile;
  values: Map<string, ts.Expression>;
  imports: Map<string, Binding>;
  exports: Map<string, string>;
  reexports: Reexport[];
  stars: string[];
}

interface StaticClasses {
  origin: string;
  name: string;
  classes: string[];
}

export interface SharedClassOccurrence {
  file: string;
  line: number;
  column: number;
  tag: string;
  symbol: string;
  classes: string[];
}

export interface SharedClassReuse {
  occurrence: SharedClassOccurrence;
  original: SharedClassOccurrence;
}

function moduleInfo(
  file: string,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
): ModuleInfo | undefined {
  if (cache.has(file)) return cache.get(file);
  try {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const result: ModuleInfo = {
      source,
      values: new Map(),
      imports: new Map(),
      exports: new Map(),
      reexports: [],
      stars: [],
    };
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) {
        const exported = (ts.getModifiers(statement) ?? []).some((item) => item.kind === ts.SyntaxKind.ExportKeyword);
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
          const name = declaration.name.text;
          result.values.set(name, declaration.initializer);
          if (exported) result.exports.set(name, name);
        }
      } else if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const target = resolveSpecifier(file, statement.moduleSpecifier.text, index.sourceRoot);
        const named = statement.importClause?.namedBindings;
        if (!target || !named || !ts.isNamedImports(named)) continue;
        for (const element of named.elements) {
          result.imports.set(element.name.text, {
            file: target,
            name: element.propertyName?.text ?? element.name.text,
          });
        }
      } else if (ts.isExportDeclaration(statement)) {
        const target =
          statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
            ? resolveSpecifier(file, statement.moduleSpecifier.text, index.sourceRoot)
            : undefined;
        if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            const local = element.propertyName?.text ?? element.name.text;
            if (target) result.reexports.push({ file: target, name: local, exported: element.name.text });
            else result.exports.set(element.name.text, local);
          }
        } else if (target && !statement.exportClause) {
          result.stars.push(target);
        }
      }
    }
    cache.set(file, result);
    return result;
  } catch {
    cache.set(file, undefined);
    return undefined;
  }
}

function staticText(expression: ts.Expression, info: ModuleInfo, visited: Set<string>): string | undefined {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isParenthesizedExpression(expression)) return staticText(expression.expression, info, visited);
  if (ts.isIdentifier(expression)) {
    if (visited.has(expression.text)) return undefined;
    const value = info.values.get(expression.text);
    if (!value) return undefined;
    visited.add(expression.text);
    const result = staticText(value, info, visited);
    visited.delete(expression.text);
    return result;
  }
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    if (expression.expression.text !== "cn" && expression.expression.text !== "clsx") return undefined;
    const parts: string[] = [];
    for (const argument of expression.arguments) {
      if (ts.isSpreadElement(argument)) return undefined;
      const value = staticText(argument, info, visited);
      if (value === undefined) return undefined;
      parts.push(value);
    }
    return parts.join(" ");
  }
  return undefined;
}

function resolveExport(
  file: string,
  name: string,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
  seen: Set<string>,
): StaticClasses | undefined {
  const key = `${file}\u0000${name}`;
  if (seen.has(key)) return undefined;
  seen.add(key);
  const info = moduleInfo(file, index, cache);
  if (!info) return undefined;
  const localName = info.exports.get(name);
  if (localName) {
    const initializer = info.values.get(localName);
    const text = initializer ? staticText(initializer, info, new Set([localName])) : undefined;
    if (text !== undefined) {
      const classes = [...new Set(text.split(/\s+/u).filter(Boolean))].sort();
      if (classes.length >= MIN_SHARED_CLASSES) return { origin: file, name: localName, classes };
    }
    const imported = info.imports.get(localName);
    if (imported) return resolveExport(imported.file, imported.name, index, cache, seen);
  }
  for (const reexport of info.reexports) {
    if (reexport.exported !== name) continue;
    const target = resolveExport(reexport.file, reexport.name, index, cache, seen);
    if (target) return target;
  }
  for (const target of info.stars) {
    const found = resolveExport(target, name, index, cache, seen);
    if (found) return found;
  }
  return undefined;
}

function usagesInFile(
  file: string,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
): SharedClassOccurrence[] {
  const info = moduleInfo(file, index, cache);
  if (!info) return [];
  const result: SharedClassOccurrence[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(info.source);
      if (/^[a-z][a-z0-9-]*$/u.test(tag)) {
        const attribute = node.attributes.properties.find(
          (item) => ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === "className",
        );
        if (
          attribute &&
          ts.isJsxAttribute(attribute) &&
          attribute.initializer &&
          ts.isJsxExpression(attribute.initializer)
        ) {
          const expression = attribute.initializer.expression;
          if (expression) {
            const identified = new Set<string>();
            const visitedLocals = new Set<string>();
            const collect = (part: ts.Node): void => {
              if (ts.isIdentifier(part)) {
                const imported = info.imports.get(part.text);
                const resolved = imported
                  ? resolveExport(imported.file, imported.name, index, cache, new Set())
                  : undefined;
                if (resolved) {
                  const symbol = `${resolved.origin}\u0000${resolved.name}`;
                  if (!identified.has(symbol)) {
                    identified.add(symbol);
                    const location = info.source.getLineAndCharacterOfPosition(attribute.getStart(info.source));
                    result.push({
                      file,
                      line: location.line + 1,
                      column: location.character,
                      tag,
                      symbol,
                      classes: resolved.classes,
                    });
                  }
                } else if (!visitedLocals.has(part.text)) {
                  const local = info.values.get(part.text);
                  if (local) {
                    visitedLocals.add(part.text);
                    collect(local);
                    visitedLocals.delete(part.text);
                  }
                }
                return;
              }
              ts.forEachChild(part, collect);
            };
            collect(expression);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(info.source);
  return result;
}

/** Duplicate exported class contracts used to style separate native JSX elements. */
export function sharedClassReuses(index: ProjectIndex): Map<string, SharedClassReuse[]> {
  const cache = new Map<string, ModuleInfo | undefined>();
  const bySymbol = new Map<string, SharedClassOccurrence[]>();
  for (const file of [...index.modules.keys()].sort()) {
    if (!/\.(?:tsx|jsx)$/u.test(file) || /\.(?:test|spec)\.(?:tsx|jsx)$/u.test(file)) continue;
    for (const occurrence of usagesInFile(file, index, cache)) {
      const members = bySymbol.get(occurrence.symbol) ?? [];
      members.push(occurrence);
      bySymbol.set(occurrence.symbol, members);
    }
  }
  const matches = new Map<string, SharedClassReuse[]>();
  for (const members of bySymbol.values()) {
    if (new Set(members.map((member) => member.file)).size < 2) continue;
    for (const occurrence of members.slice(1)) {
      const original = members.find((member) => member.file !== occurrence.file);
      if (!original) continue;
      const entries = matches.get(occurrence.file) ?? [];
      entries.push({ occurrence, original });
      matches.set(occurrence.file, entries);
    }
  }
  return matches;
}
