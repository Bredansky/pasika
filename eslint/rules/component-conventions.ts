import path from "node:path";
import ts from "typescript";

export interface ComponentInfo {
  name: string;
  declaration: ts.FunctionDeclaration | ts.VariableDeclaration;
  smart: boolean;
}

const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);
const isHookCallName = (name: string): boolean => /^use[A-Z]/.test(name);
const isHandlerName = (name: string): boolean => /^handle[A-Z]/.test(name);

function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function namedExportedLocalNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier || !statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;

    for (const element of statement.exportClause.elements) {
      names.add((element.propertyName ?? element.name).text);
    }
  }

  return names;
}

function containsJsx(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function containsDataFetch(node: ts.Node): boolean {
  let found = false;

  const visit = (child: ts.Node): void => {
    if (found) return;

    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "zodFetch") {
      found = true;
      return;
    }

    ts.forEachChild(child, visit);
  };

  ts.forEachChild(node, visit);
  return found;
}

function isComponentTagName(tagName: ts.JsxTagNameExpression): boolean {
  if (ts.isIdentifier(tagName)) return isPascalCase(tagName.text);
  if (ts.isPropertyAccessExpression(tagName)) {
    let root: ts.Expression = tagName.expression;
    while (ts.isPropertyAccessExpression(root)) root = root.expression;
    return ts.isIdentifier(root) && isPascalCase(root.text);
  }
  return false;
}

function containsOwnedHandlerProp(node: ts.Node): boolean {
  const handlerNames = new Set<string>();

  const collectHandlers = (child: ts.Node): void => {
    if (
      ts.isVariableDeclaration(child) &&
      ts.isIdentifier(child.name) &&
      isHandlerName(child.name.text) &&
      child.initializer &&
      (ts.isArrowFunction(child.initializer) ||
        ts.isFunctionExpression(child.initializer) ||
        (ts.isCallExpression(child.initializer) &&
          ts.isPropertyAccessExpression(child.initializer.expression) &&
          child.initializer.expression.name.text === "useCallback") ||
        (ts.isCallExpression(child.initializer) &&
          ts.isIdentifier(child.initializer.expression) &&
          child.initializer.expression.text === "useCallback"))
    ) {
      handlerNames.add(child.name.text);
    } else if (ts.isFunctionDeclaration(child) && child.name && isHandlerName(child.name.text)) {
      handlerNames.add(child.name.text);
    }

    ts.forEachChild(child, collectHandlers);
  };

  ts.forEachChild(node, collectHandlers);
  if (handlerNames.size === 0) return false;

  let found = false;
  const findPassedHandler = (child: ts.Node): void => {
    if (found) return;

    let attributes: ts.JsxAttributes | undefined;
    let tagName: ts.JsxTagNameExpression | undefined;
    if (ts.isJsxElement(child)) {
      attributes = child.openingElement.attributes;
      tagName = child.openingElement.tagName;
    } else if (ts.isJsxSelfClosingElement(child)) {
      attributes = child.attributes;
      tagName = child.tagName;
    }

    if (attributes && tagName && isComponentTagName(tagName)) {
      for (const property of attributes.properties) {
        if (!ts.isJsxAttribute(property) || !ts.isIdentifier(property.name) || !/^on[A-Z]/.test(property.name.text)) {
          continue;
        }
        const initializer = property.initializer;
        if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) continue;
        if (ts.isIdentifier(initializer.expression) && handlerNames.has(initializer.expression.text)) {
          found = true;
          return;
        }
      }
    }

    ts.forEachChild(child, findPassedHandler);
  };

  ts.forEachChild(node, findPassedHandler);
  return found;
}

function isSmartComponent(node: ts.Node): boolean {
  return containsDataFetch(node) || containsOwnedHandlerProp(node);
}

function componentFromFunction(node: ts.FunctionDeclaration): ComponentInfo | undefined {
  const name = node.name?.text;
  if (!name || !isPascalCase(name) || !containsJsx(node)) return undefined;
  return { name, declaration: node, smart: isSmartComponent(node) };
}

function componentFromVariable(node: ts.VariableDeclaration): ComponentInfo | undefined {
  if (!ts.isIdentifier(node.name) || !isPascalCase(node.name.text)) return undefined;
  const initializer = node.initializer;
  if (!initializer || (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer))) return undefined;
  if (!containsJsx(initializer)) return undefined;
  return {
    name: node.name.text,
    declaration: node,
    smart: isSmartComponent(initializer),
  };
}

/**
 * Find component definitions in a `.tsx` source.
 *
 * By default, only exported components are returned, which is what filename and
 * placement rules look for. Pass `includeNonExported` to collect every component
 * definition, exported or private, so a rule can enforce a one-component-per-file
 * limit that also counts the components a file keeps to itself.
 */
export function parseComponentInfo(
  text: string,
  filename: string,
  options?: { includeNonExported?: boolean },
): ComponentInfo[] {
  const sourceFile = ts.createSourceFile(path.resolve(filename), text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const components: ComponentInfo[] = [];
  const namedExports = namedExportedLocalNames(sourceFile);

  for (const statement of sourceFile.statements) {
    const statementExported = isExported(statement);

    if (ts.isFunctionDeclaration(statement)) {
      const name = statement.name?.text;
      if (!options?.includeNonExported && !statementExported && (!name || !namedExports.has(name))) continue;
      const component = componentFromFunction(statement);
      if (component) components.push(component);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
        if (!options?.includeNonExported && !statementExported && (!name || !namedExports.has(name))) continue;
        const component = componentFromVariable(declaration);
        if (component) components.push(component);
      }
    }
  }

  return components;
}

export interface JsxReturningDeclaration {
  name: string;
  line: number;
  column: number;
}

/**
 * Find every top-level function or const whose body returns JSX, regardless of
 * casing. Unlike {@link parseComponentInfo}, this does not require the name to
 * already be PascalCase, so a casing rule can flag the ones that are not.
 */
export function findJsxReturningDeclarations(text: string, filename: string): JsxReturningDeclaration[] {
  const sourceFile = ts.createSourceFile(path.resolve(filename), text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const results: JsxReturningDeclaration[] = [];

  const record = (identifier: ts.Identifier, body: ts.Node): void => {
    if (isHookCallName(identifier.text) || !containsJsx(body)) return;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(identifier.getStart(sourceFile));
    results.push({ name: identifier.text, line: line + 1, column: character });
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      record(statement.name, statement);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const initializer = declaration.initializer;
        if (!initializer || (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer))) continue;
        record(declaration.name, initializer);
      }
    }
  }

  return results;
}

export interface SimpleRoot {
  tagName: string;
  attributes: ts.JsxAttributeLike[];
}

function jsxTagName(element: ts.JsxElement | ts.JsxSelfClosingElement): string | undefined {
  const tagName = ts.isJsxElement(element) ? element.openingElement.tagName : element.tagName;
  return ts.isIdentifier(tagName) ? tagName.text : undefined;
}

function rootFromExpression(expression: ts.Expression): SimpleRoot | undefined {
  // `return (<div />)` wraps the JSX in a ParenthesizedExpression, which is the
  // formatting prettier produces for multi-line returns. Unwrap it so the rule
  // sees the actual root element instead of reporting "no single outer element"
  // for every conventionally formatted component.
  let unwrapped = expression;
  while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;
  if (ts.isJsxSelfClosingElement(unwrapped)) {
    const tagName = jsxTagName(unwrapped);
    if (!tagName?.startsWith(tagName[0]?.toLowerCase() ?? "")) return undefined;
    return { tagName, attributes: [...unwrapped.attributes.properties] };
  }
  if (ts.isJsxElement(unwrapped)) {
    const tagName = jsxTagName(unwrapped);
    if (!tagName?.startsWith(tagName[0]?.toLowerCase() ?? "")) return undefined;
    return { tagName, attributes: [...unwrapped.openingElement.attributes.properties] };
  }
  return undefined;
}

export function findSimpleRoot(component: ComponentInfo, _text: string, _filename: string): SimpleRoot | undefined {
  const declaration = component.declaration;
  let body: ts.ConciseBody | undefined;
  if (ts.isFunctionDeclaration(declaration)) body = declaration.body;
  else if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) body = declaration.initializer.body;
  else if (declaration.initializer && ts.isFunctionExpression(declaration.initializer)) {
    body = declaration.initializer.body;
  }
  if (!body) return undefined;

  if (!ts.isBlock(body)) return rootFromExpression(body);

  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);
  // `return null` renders nothing, so it does not count as a rendered result:
  // a component that guards `if (condition) return null;` and otherwise renders
  // one element still has exactly one outer DOM element in every rendered
  // result, and the element must carry the data-testid.
  const rendered = returns.filter((statement) => statement.expression?.kind !== ts.SyntaxKind.NullKeyword);
  const roots = rendered
    .map((statement) =>
      statement.expression && ts.isExpression(statement.expression)
        ? rootFromExpression(statement.expression)
        : undefined,
    )
    .filter((root): root is SimpleRoot => root !== undefined);
  // Every rendered result must resolve to the same outer tag: a component that
  // branches (if/else or ternary) into different DOM trees still has one outer
  // element when every branch renders the same tag, and that tag carries the
  // data-testid. If the branches differ, there is no single outer element.
  if (roots.length !== rendered.length || roots.length === 0) return undefined;
  const firstTag = roots[0]?.tagName;
  if (roots.some((root) => root.tagName !== firstTag)) return undefined;
  return roots[0];
}

function literalTestIds(attributes: readonly ts.JsxAttributeLike[]): string[] {
  return attributes.flatMap((candidate) => {
    if (!ts.isJsxAttribute(candidate) || !ts.isIdentifier(candidate.name) || candidate.name.text !== "data-testid") {
      return [];
    }
    return candidate.initializer && ts.isStringLiteral(candidate.initializer) ? [candidate.initializer.text] : [];
  });
}

function combineTestIdPaths(left: string[][], right: string[][]): string[][] {
  return left.flatMap((leftPath) => right.map((rightPath) => [...leftPath, ...rightPath]));
}

function renderedTestIdPathsFromExpression(expression: ts.Expression): string[][] {
  let unwrapped = expression;
  while (ts.isParenthesizedExpression(unwrapped)) unwrapped = unwrapped.expression;

  if (ts.isConditionalExpression(unwrapped)) {
    return [
      ...renderedTestIdPathsFromExpression(unwrapped.whenTrue),
      ...renderedTestIdPathsFromExpression(unwrapped.whenFalse),
    ];
  }

  if (ts.isJsxSelfClosingElement(unwrapped)) {
    return [literalTestIds(unwrapped.attributes.properties)];
  }

  if (ts.isJsxElement(unwrapped)) {
    let paths = [literalTestIds(unwrapped.openingElement.attributes.properties)];

    for (const child of unwrapped.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
        paths = combineTestIdPaths(paths, renderedTestIdPathsFromExpression(child));
        continue;
      }

      if (ts.isJsxExpression(child) && child.expression) {
        const childExpression = child.expression;
        if (
          ts.isConditionalExpression(childExpression) ||
          ts.isJsxElement(childExpression) ||
          ts.isJsxSelfClosingElement(childExpression) ||
          ts.isJsxFragment(childExpression) ||
          ts.isParenthesizedExpression(childExpression)
        ) {
          paths = combineTestIdPaths(paths, renderedTestIdPathsFromExpression(childExpression));
        }
      }
    }

    return paths;
  }

  if (ts.isJsxFragment(unwrapped)) {
    let paths: string[][] = [[]];

    for (const child of unwrapped.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
        paths = combineTestIdPaths(paths, renderedTestIdPathsFromExpression(child));
        continue;
      }

      if (ts.isJsxExpression(child) && child.expression) {
        const childExpression = child.expression;
        if (
          ts.isConditionalExpression(childExpression) ||
          ts.isJsxElement(childExpression) ||
          ts.isJsxSelfClosingElement(childExpression) ||
          ts.isJsxFragment(childExpression) ||
          ts.isParenthesizedExpression(childExpression)
        ) {
          paths = combineTestIdPaths(paths, renderedTestIdPathsFromExpression(childExpression));
        }
      }
    }

    return paths;
  }

  return [[]];
}

export function findRenderedTestIdPaths(component: ComponentInfo): string[][] {
  const declaration = component.declaration;
  let body: ts.ConciseBody | undefined;

  if (ts.isFunctionDeclaration(declaration)) body = declaration.body;
  else if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) body = declaration.initializer.body;
  else if (declaration.initializer && ts.isFunctionExpression(declaration.initializer)) {
    body = declaration.initializer.body;
  }

  if (!body) return [];
  if (!ts.isBlock(body)) return renderedTestIdPathsFromExpression(body);

  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);

  return returns.flatMap((statement) => {
    const expression = statement.expression;
    if (!expression || expression.kind === ts.SyntaxKind.NullKeyword) return [];
    return renderedTestIdPathsFromExpression(expression);
  });
}

export function getTestId(root: SimpleRoot): { value?: string; attribute?: ts.JsxAttribute } {
  const attribute = root.attributes.find(
    (candidate): candidate is ts.JsxAttribute =>
      ts.isJsxAttribute(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === "data-testid",
  );
  if (!attribute) return {};
  const value = attribute.initializer;
  if (!value || !ts.isStringLiteral(value)) return { attribute };
  return { value: value.text, attribute };
}
