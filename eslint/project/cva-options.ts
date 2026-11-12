/**
 * Project-local, conservative analysis of component CVA values.
 * Only a statically provable closed set is considered dead. Dynamic props,
 * unresolvable component imports, and indirect calls make a dimension unknown.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { isProductionSource } from "./semantic-literals";
import { resolveSpecifier, type ProjectIndex } from "./index";

export interface ProjectSources {
  sources: Map<string, ts.SourceFile>;
  enums: Map<string, Map<string, Map<string, string>>>;
  index: ProjectIndex;
}
const cache = new WeakMap<ProjectIndex, ProjectSources>();

export function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

export function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const match = object.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && propertyName(p.name) === name,
  );
  return match?.initializer;
}

export function parseProject(index: ProjectIndex): ProjectSources {
  const cached = cache.get(index);
  if (cached) return cached;
  const sources = new Map<string, ts.SourceFile>();
  const enums = new Map<string, Map<string, Map<string, string>>>();
  for (const file of index.modules.keys()) {
    if (!isProductionSource(file, index.sourceRoot)) continue;
    try {
      const code = readFileSync(file, "utf8");
      const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      sources.set(file, source);
      const localEnums = new Map<string, Map<string, string>>();
      for (const stmt of source.statements) {
        if (!ts.isEnumDeclaration(stmt)) continue;
        const members = new Map<string, string>();
        for (const member of stmt.members) {
          const name = propertyName(member.name);
          if (name && member.initializer && ts.isStringLiteral(member.initializer)) {
            members.set(name, member.initializer.text);
          }
        }
        localEnums.set(stmt.name.text, members);
      }
      enums.set(file, localEnums);
    } catch {
      // Unreadable modules cannot prove an option is unused.
    }
  }
  const result = { sources, enums, index };
  cache.set(index, result);
  return result;
}

function localConstants(source: ts.SourceFile): Map<string, ts.Expression> {
  const constants = new Map<string, ts.Expression>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.declarationList.getText(source).startsWith("const ")) continue;
    for (const decl of statement.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.initializer) constants.set(decl.name.text, decl.initializer);
    }
  }
  return constants;
}

function bindingContains(binding: ts.BindingName, name: string): boolean {
  if (ts.isIdentifier(binding)) return binding.text === name;
  return binding.elements.some((element) => ts.isBindingElement(element) && bindingContains(element.name, name));
}

/** A function parameter or local declaration cannot be inferred from a file-level constant. */
function locallyShadowed(node: ts.Node, name: string): boolean {
  let ancestor = node.parent;
  while (!ts.isSourceFile(ancestor)) {
    if (ts.isFunctionLike(ancestor) && ancestor.parameters.some((parameter) => bindingContains(parameter.name, name))) {
      return true;
    }
    if (
      ts.isBlock(ancestor) &&
      ancestor.statements.some((statement) => {
        if (!ts.isVariableStatement(statement)) return false;
        return statement.declarationList.declarations.some((declaration) => bindingContains(declaration.name, name));
      })
    ) {
      return true;
    }
    ancestor = ancestor.parent;
  }
  return false;
}

function declaredEnum(
  file: string,
  name: string,
  sources: ProjectSources,
  visited = new Set<string>(),
): Map<string, string> | undefined {
  const key = `${file}\0${name}`;
  if (visited.has(key)) return undefined;
  visited.add(key);
  const own = sources.enums.get(file)?.get(name);
  if (own) return own;
  const source = sources.sources.get(file);
  if (!source) return undefined;
  const matches: Map<string, string>[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const target = resolveSpecifier(file, statement.moduleSpecifier.text, sources.index.sourceRoot);
    if (!target) continue;
    let forwarded = name;
    if (statement.exportClause) {
      if (!ts.isNamedExports(statement.exportClause)) continue;
      const exported = statement.exportClause.elements.find((element) => element.name.text === name);
      if (!exported) continue;
      forwarded = exported.propertyName?.text ?? exported.name.text;
    }
    const resolved = declaredEnum(target, forwarded, sources, new Set(visited));
    if (resolved) matches.push(resolved);
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function enumMember(
  expression: ts.PropertyAccessExpression,
  source: ts.SourceFile,
  sources: ProjectSources,
): string | undefined {
  if (!ts.isIdentifier(expression.expression) || locallyShadowed(expression.expression, expression.expression.text)) {
    return undefined;
  }
  const name = expression.expression.text;
  const currentFile = path.resolve(source.fileName);
  const own = sources.enums.get(currentFile)?.get(name);
  if (own) return own.get(expression.name.text);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const items = statement.importClause?.namedBindings;
    if (!items || !ts.isNamedImports(items)) continue;
    const item = items.elements.find((element) => element.name.text === name && !element.isTypeOnly);
    if (!item) continue;
    const target = resolveSpecifier(currentFile, statement.moduleSpecifier.text, sources.index.sourceRoot);
    if (!target) return undefined;
    return declaredEnum(target, item.propertyName?.text ?? item.name.text, sources)?.get(expression.name.text);
  }
  return undefined;
}

/** Known finite values, undefined when there may be any runtime value. */
export function staticValues(
  expression: ts.Expression,
  source: ts.SourceFile,
  sources: ProjectSources,
  seen = new Set<string>(),
): Set<string> | undefined {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return new Set([expression.text]);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return new Set(["true"]);
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return new Set(["false"]);
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return staticValues(expression.expression, source, sources, seen);
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    const value = enumMember(expression, source, sources);
    return value === undefined ? undefined : new Set([value]);
  }
  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text) || locallyShadowed(expression, expression.text)) return undefined;
    const initializer = localConstants(source).get(expression.text);
    if (!initializer) return undefined;
    return staticValues(initializer, source, sources, new Set([...seen, expression.text]));
  }
  if (ts.isConditionalExpression(expression)) {
    const yes = staticValues(expression.whenTrue, source, sources, seen);
    const no = staticValues(expression.whenFalse, source, sources, seen);
    if (!yes || !no) return undefined;
    return new Set([...yes, ...no]);
  }
  return undefined;
}

export function cvaOptions(
  source: ts.SourceFile,
  index: ProjectIndex,
): { name: string; variants: Map<string, Map<string, ts.Node>>; defaults: Map<string, string | undefined> }[] {
  const sources = parseProject(index);
  const results: {
    name: string;
    variants: Map<string, Map<string, ts.Node>>;
    defaults: Map<string, string | undefined>;
  }[] = [];
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer || !ts.isCallExpression(decl.initializer)) continue;
      if (!ts.isIdentifier(decl.initializer.expression) || decl.initializer.expression.text !== "cva") continue;
      const config = decl.initializer.arguments[1];
      if (!config || !ts.isObjectLiteralExpression(config)) continue;
      const variantsExpr = property(config, "variants");
      if (!variantsExpr || !ts.isObjectLiteralExpression(variantsExpr)) continue;
      const variants = new Map<string, Map<string, ts.Node>>();
      for (const group of variantsExpr.properties) {
        if (!ts.isPropertyAssignment(group)) continue;
        const groupName = propertyName(group.name);
        if (!groupName || !ts.isObjectLiteralExpression(group.initializer)) continue;
        const options = new Map<string, ts.Node>();
        for (const choice of group.initializer.properties) {
          if (!ts.isPropertyAssignment(choice) && !ts.isShorthandPropertyAssignment(choice)) {
            options.clear();
            break;
          }
          let key = propertyName(choice.name);
          if (!key && ts.isComputedPropertyName(choice.name)) {
            const names = staticValues(choice.name.expression, source, sources);
            if (names?.size === 1) key = [...names][0];
          }
          if (!key) {
            options.clear();
            break;
          }
          options.set(key, choice);
        }
        if (options.size >= 2) variants.set(groupName, options);
      }
      if (!variants.size) continue;
      const defaults = new Map<string, string | undefined>();
      const defaultsExpr = property(config, "defaultVariants");
      if (defaultsExpr && ts.isObjectLiteralExpression(defaultsExpr)) {
        for (const entry of defaultsExpr.properties) {
          if (!ts.isPropertyAssignment(entry)) continue;
          const name = propertyName(entry.name);
          if (!name) continue;
          const value = staticValues(entry.initializer, source, sources);
          defaults.set(name, value?.size === 1 ? [...value][0] : undefined);
        }
      }
      results.push({ name: decl.name.text, variants, defaults });
    }
  }
  return results;
}

export function owningComponent(source: ts.SourceFile, index: ProjectIndex, cvaName: string): string | undefined {
  const exported =
    index.modules.get(path.resolve(source.fileName))?.exports.filter((x) => x.kind === "component") ?? [];
  const candidates: string[] = [];
  for (const symbol of exported) {
    for (const statement of source.statements) {
      let body: ts.Node | undefined;
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === symbol.name) body = statement.body;
      if (ts.isVariableStatement(statement)) {
        const decl = statement.declarationList.declarations.find(
          (d) => ts.isIdentifier(d.name) && d.name.text === symbol.name,
        );
        body = decl?.initializer;
      }
      if (!body) continue;
      const visit = (node: ts.Node): boolean => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === cvaName) {
          return true;
        }
        return ts.forEachChild(node, visit) ?? false;
      };
      if (visit(body)) candidates.push(symbol.name);
    }
  }
  return candidates.length === 1 ? candidates[0] : undefined;
}
