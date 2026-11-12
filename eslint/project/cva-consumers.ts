/**
 * Conservative project-wide JSX usage accounting for CVA component options.
 *
 * @see docs/next-tailwind-guide/rules/component-variant-rule.md
 */
import ts from "typescript";
import { parseProject, propertyName, staticValues } from "./cva-options";
import { resolveSpecifier, symbolKey, type ProjectIndex } from "./index";

function forwardsTo(
  file: string,
  symbol: string,
  target: string,
  index: ProjectIndex,
  seen = new Set<string>(),
): boolean {
  const key = `${file}\0${symbol}`;
  if (seen.has(key)) return false;
  seen.add(key);
  if (file === target) return index.modules.get(file)?.exports.some((item) => item.name === symbol) ?? false;
  const module = index.modules.get(file);
  if (!module) return false;
  return module.reexports.some((exp) => {
    if (exp.names.length && !exp.names.includes(symbol)) return false;
    const resolved = resolveSpecifier(file, exp.specifier, index.sourceRoot);
    return resolved ? forwardsTo(resolved, symbol, target, index, seen) : false;
  });
}

interface Consumption {
  used: Map<string, Set<string>>;
  unknown: Set<string>;
  seen: number;
}

/**
 * Collect JSX uses of an imported component. Dynamic prop expressions only
 * invalidate their own dimension; JSX spreads invalidate all dimensions.
 */
export function consumedOptions(
  index: ProjectIndex,
  componentFile: string,
  componentName: string,
  variants: Map<string, Map<string, ts.Node>>,
  defaults: Map<string, string | undefined>,
): Consumption {
  const sources = parseProject(index);
  const used = new Map([...variants.keys()].map((name) => [name, new Set<string>()]));
  const unknown = new Set<string>();
  let seen = 0;
  for (const [file, source] of sources.sources) {
    const fileVisits = { count: 0 };
    const aliases = new Set<string>();
    let namespaceAlias = false;
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const resolved = resolveSpecifier(file, statement.moduleSpecifier.text, index.sourceRoot);
      if (!resolved || !forwardsTo(resolved, componentName, componentFile, index)) continue;
      const imports = statement.importClause?.namedBindings;
      if (imports && ts.isNamedImports(imports)) {
        for (const item of imports.elements) {
          if ((item.propertyName?.text ?? item.name.text) === componentName) aliases.add(item.name.text);
        }
      }
      if (imports && ts.isNamespaceImport(imports)) namespaceAlias = true;
    }
    if (file === componentFile) aliases.add(componentName);
    if (namespaceAlias) for (const name of variants.keys()) unknown.add(name);
    if (aliases.size === 0) {
      // A consumer discovered through a barrel/alias but not statically
      // resolved to a named import can still use the component dynamically.
      if (index.symbolConsumers.get(symbolKey(componentFile, componentName))?.has(file)) {
        for (const name of variants.keys()) unknown.add(name);
      }
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (file !== componentFile && ts.isIdentifier(node) && aliases.has(node.text)) {
        const parent = node.parent;
        const inImport = ts.isImportSpecifier(parent) || ts.isImportClause(parent);
        const inJsxTag =
          (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxClosingElement(parent)) &&
          parent.tagName === node;
        if (!inImport && !inJsxTag) for (const name of variants.keys()) unknown.add(name);
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (!ts.isIdentifier(node.tagName) || !aliases.has(node.tagName.text)) {
          ts.forEachChild(node, visit);
          return;
        }
        fileVisits.count++;
        const attrs = node.attributes.properties;
        const spread = attrs.some(ts.isJsxSpreadAttribute);
        for (const category of variants.keys()) {
          if (spread) {
            unknown.add(category);
            continue;
          }
          const attr = attrs.find(
            (item): item is ts.JsxAttribute =>
              ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === category,
          );
          if (!attr) {
            const fallback = defaults.get(category);
            if (defaults.has(category) && fallback === undefined) unknown.add(category);
            else if (fallback !== undefined) used.get(category)?.add(fallback);
            continue;
          }
          let value: Set<string> | undefined;
          if (!attr.initializer) value = new Set(["true"]);
          else if (ts.isStringLiteral(attr.initializer)) value = new Set([attr.initializer.text]);
          else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
            value = staticValues(attr.initializer.expression, source, sources);
          }
          if (!value) unknown.add(category);
          else for (const choice of value) used.get(category)?.add(choice);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    seen += fileVisits.count;
  }
  return { used, unknown, seen };
}

/** Component parameter defaults override CVA defaults before style selection. */
export function componentParameterDefaults(
  index: ProjectIndex,
  file: string,
  componentName: string,
): Map<string, string | undefined> {
  const project = parseProject(index);
  const source = project.sources.get(file);
  const defaults = new Map<string, string | undefined>();
  if (!source) return defaults;
  for (const statement of source.statements) {
    let parameter: ts.ParameterDeclaration | undefined;
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === componentName) {
      parameter = statement.parameters[0];
    } else if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (entry) => ts.isIdentifier(entry.name) && entry.name.text === componentName,
      );
      const expression = declaration?.initializer;
      if (expression && (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression))) {
        parameter = expression.parameters[0];
      }
    }
    if (!parameter || !ts.isObjectBindingPattern(parameter.name)) continue;
    for (const element of parameter.name.elements) {
      if (!ts.isIdentifier(element.name) || !element.initializer) continue;
      const name = element.propertyName ? propertyName(element.propertyName) : element.name.text;
      if (!name) continue;
      const values = staticValues(element.initializer, source, project);
      defaults.set(name, values?.size === 1 ? [...values][0] : undefined);
    }
  }
  return defaults;
}
