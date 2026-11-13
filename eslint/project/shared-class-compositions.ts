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
  destructured: Map<string, { source: ts.Expression; member: string }>;
  enums: Map<string, Map<string, string>>;
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
      destructured: new Map(),
      enums: new Map(),
      imports: new Map(),
      exports: new Map(),
      reexports: [],
      stars: [],
    };
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) {
        const exported = (ts.getModifiers(statement) ?? []).some((item) => item.kind === ts.SyntaxKind.ExportKeyword);
        for (const declaration of statement.declarationList.declarations) {
          if (!declaration.initializer) continue;
          if (ts.isObjectBindingPattern(declaration.name)) {
            for (const element of declaration.name.elements) {
              if (!ts.isIdentifier(element.name) || element.dotDotDotToken) continue;
              const key = element.propertyName ?? element.name;
              if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
              result.destructured.set(element.name.text, {
                source: declaration.initializer,
                member: key.text,
              });
            }
            continue;
          }
          if (!ts.isIdentifier(declaration.name)) continue;
          const name = declaration.name.text;
          result.values.set(name, declaration.initializer);
          if (exported) result.exports.set(name, name);
        }
      } else if (ts.isEnumDeclaration(statement)) {
        const members = new Map<string, string>();
        for (const member of statement.members) {
          if (
            (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) &&
            member.initializer &&
            ts.isStringLiteral(member.initializer)
          ) {
            members.set(member.name.text, member.initializer.text);
          }
        }
        result.enums.set(statement.name.text, members);
        if ((ts.getModifiers(statement) ?? []).some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) {
          result.exports.set(statement.name.text, statement.name.text);
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

/** Resolve an imported string enum without guessing dynamic computed keys. */
function enumMember(
  file: string,
  name: string,
  member: string,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
  seen: Set<string>,
): string | undefined {
  const key = `${file}\u0000${name}.${member}`;
  if (seen.has(key)) return undefined;
  seen.add(key);
  const info = moduleInfo(file, index, cache);
  if (!info) return undefined;
  const local = info.exports.get(name);
  if (local) {
    const value = info.enums.get(local)?.get(member);
    if (value !== undefined) return value;
    const imported = info.imports.get(local);
    if (imported) return enumMember(imported.file, imported.name, member, index, cache, seen);
  }
  for (const entry of info.reexports) {
    if (entry.exported !== name) continue;
    const value = enumMember(entry.file, entry.name, member, index, cache, seen);
    if (value !== undefined) return value;
  }
  for (const target of info.stars) {
    const value = enumMember(target, name, member, index, cache, seen);
    if (value !== undefined) return value;
  }
  return undefined;
}

function staticText(
  expression: ts.Expression,
  info: ModuleInfo,
  visited: Set<string>,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
): string | undefined {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression)
  ) {
    return staticText(expression.expression, info, visited, index, cache);
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    const receiver = expression.expression.text;
    const member = expression.name.text;
    const local = info.enums.get(receiver)?.get(member);
    if (local !== undefined) return local;
    const imported = info.imports.get(receiver);
    if (imported) return enumMember(imported.file, imported.name, member, index, cache, new Set());
    return objectMemberText(expression.expression, member, info, visited, index, cache);
  }
  if (ts.isElementAccessExpression(expression)) {
    const member = staticText(expression.argumentExpression, info, visited, index, cache);
    if (member === undefined) return undefined;
    return objectMemberText(expression.expression, member, info, visited, index, cache);
  }
  if (ts.isIdentifier(expression)) {
    if (visited.has(expression.text)) return undefined;
    const value = info.values.get(expression.text);
    const binding = info.destructured.get(expression.text);
    if (!value && !binding) return undefined;
    visited.add(expression.text);
    let result: string | undefined;
    if (value) result = staticText(value, info, visited, index, cache);
    else if (binding) result = objectMemberText(binding.source, binding.member, info, visited, index, cache);
    visited.delete(expression.text);
    return result;
  }
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    if (expression.expression.text !== "cn" && expression.expression.text !== "clsx") return undefined;
    const parts: string[] = [];
    for (const argument of expression.arguments) {
      if (ts.isSpreadElement(argument)) return undefined;
      const value = staticText(argument, info, visited, index, cache);
      if (value === undefined) return undefined;
      parts.push(value);
    }
    return parts.join(" ");
  }
  return undefined;
}

/** Only literal object members are class contracts; unknown computed entries stay dynamic. */
function objectMemberText(
  expression: ts.Expression,
  member: string,
  info: ModuleInfo,
  visited: Set<string>,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
): string | undefined {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression)
  ) {
    return objectMemberText(expression.expression, member, info, visited, index, cache);
  }
  if (ts.isIdentifier(expression)) {
    if (visited.has(expression.text)) return undefined;
    const value = info.values.get(expression.text);
    if (!value) return undefined;
    visited.add(expression.text);
    const result = objectMemberText(value, member, info, visited, index, cache);
    visited.delete(expression.text);
    return result;
  }
  if (!ts.isObjectLiteralExpression(expression)) return undefined;
  for (const entry of expression.properties) {
    if (!ts.isPropertyAssignment(entry) && !ts.isShorthandPropertyAssignment(entry)) continue;
    const key = entry.name;
    let propertyName: string | undefined;
    if (ts.isIdentifier(key) || ts.isStringLiteral(key) || ts.isNumericLiteral(key)) propertyName = key.text;
    else if (ts.isComputedPropertyName(key)) propertyName = staticText(key.expression, info, visited, index, cache);
    if (propertyName !== member) continue;
    return staticText(ts.isPropertyAssignment(entry) ? entry.initializer : entry.name, info, visited, index, cache);
  }
  return undefined;
}

function resolveExport(
  file: string,
  name: string,
  index: ProjectIndex,
  cache: Map<string, ModuleInfo | undefined>,
  seen: Set<string>,
  member?: string,
): StaticClasses | undefined {
  const key = `${file}\u0000${name}${member === undefined ? "" : `.${member}`}`;
  if (seen.has(key)) return undefined;
  seen.add(key);
  const info = moduleInfo(file, index, cache);
  if (!info) return undefined;
  const localName = info.exports.get(name);
  if (localName) {
    const initializer = info.values.get(localName);
    let text: string | undefined;
    if (initializer) {
      if (member === undefined) text = staticText(initializer, info, new Set([localName]), index, cache);
      else text = objectMemberText(initializer, member, info, new Set([localName]), index, cache);
    }
    if (text !== undefined) {
      const classes = [...new Set(text.split(/\s+/u).filter(Boolean))].sort();
      if (classes.length >= MIN_SHARED_CLASSES) {
        return { origin: file, name: member === undefined ? localName : `${localName}.${member}`, classes };
      }
    }
    const imported = info.imports.get(localName);
    if (imported) return resolveExport(imported.file, imported.name, index, cache, seen, member);
  }
  for (const entry of info.reexports) {
    if (entry.exported !== name) continue;
    const target = resolveExport(entry.file, entry.name, index, cache, seen, member);
    if (target) return target;
  }
  for (const target of info.stars) {
    const found = resolveExport(target, name, index, cache, seen, member);
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

  const resolveMember = (expression: ts.Expression, member: string, seen: Set<string>): StaticClasses | undefined => {
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression)
    ) {
      return resolveMember(expression.expression, member, seen);
    }
    if (!ts.isIdentifier(expression) || seen.has(expression.text)) return undefined;
    seen.add(expression.text);
    const imported = info.imports.get(expression.text);
    if (imported) return resolveExport(imported.file, imported.name, index, cache, new Set(), member);
    const local = info.values.get(expression.text);
    if (local && ts.isIdentifier(local)) return resolveMember(local, member, seen);
    // Local exported maps should also have a stable, property-specific origin.
    return resolveExport(file, expression.text, index, cache, new Set(), member);
  };

  const collectClasses = (expression: ts.Node, tag: string, locationNode: ts.Node): void => {
    const identified = new Set<string>();
    const visitedLocals = new Set<string>();
    const collect = (part: ts.Node): void => {
      if (ts.isPropertyAccessExpression(part) || ts.isElementAccessExpression(part)) {
        const member = ts.isPropertyAccessExpression(part)
          ? part.name.text
          : staticText(part.argumentExpression, info, new Set(), index, cache);
        const resolved = member === undefined ? undefined : resolveMember(part.expression, member, new Set());
        if (resolved) {
          record(resolved);
          return;
        }
      }
      if (ts.isIdentifier(part)) {
        const imported = info.imports.get(part.text);
        const resolved = imported ? resolveExport(imported.file, imported.name, index, cache, new Set()) : undefined;
        if (resolved) {
          record(resolved);
        } else if (!visitedLocals.has(part.text)) {
          const destructured = info.destructured.get(part.text);
          const local = info.values.get(part.text);
          if (destructured || local) {
            visitedLocals.add(part.text);
            if (destructured) {
              const found = resolveMember(destructured.source, destructured.member, new Set());
              if (found) record(found);
            } else if (local) {
              collect(local);
            }
            visitedLocals.delete(part.text);
          }
        }
        return;
      }
      ts.forEachChild(part, collect);
    };
    const record = (resolved: StaticClasses): void => {
      const symbol = `${resolved.origin}\u0000${resolved.name}`;
      if (identified.has(symbol)) return;
      identified.add(symbol);
      const location = info.source.getLineAndCharacterOfPosition(locationNode.getStart(info.source));
      result.push({
        file,
        line: location.line + 1,
        column: location.character,
        tag,
        symbol,
        classes: resolved.classes,
      });
    };
    collect(expression);
  };

  const inClassName = (node: ts.Node): boolean => {
    let parent = node.parent;
    while (!ts.isSourceFile(parent)) {
      if (ts.isJsxAttribute(parent) && ts.isIdentifier(parent.name) && parent.name.text === "className") return true;
      parent = parent.parent;
    }
    return false;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attribute = node.attributes.properties.find(
        (item) => ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === "className",
      );
      if (
        attribute &&
        ts.isJsxAttribute(attribute) &&
        attribute.initializer &&
        ts.isJsxExpression(attribute.initializer) &&
        attribute.initializer.expression
      ) {
        collectClasses(attribute.initializer.expression, node.tagName.getText(info.source), attribute);
      }
    }
    // Composition helpers can be used inside cva() before the JSX className is assembled.
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "cn" || node.expression.text === "clsx") &&
      !inClassName(node)
    ) {
      for (const argument of node.arguments) collectClasses(argument, `${node.expression.text}()`, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(info.source);
  // A styling helper may be reachable both from cva() and from the final JSX expression.
  // Count the class contract only once per source file, at its earliest use.
  const unique = new Map<string, SharedClassOccurrence>();
  for (const occurrence of result) {
    const previous = unique.get(occurrence.symbol);
    if (!previous || occurrence.line < previous.line) unique.set(occurrence.symbol, occurrence);
  }
  return [...unique.values()];
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
