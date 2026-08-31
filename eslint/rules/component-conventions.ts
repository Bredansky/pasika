import path from "node:path";
import ts from "typescript";

export interface ComponentInfo {
  name: string;
  declaration: ts.FunctionDeclaration | ts.VariableDeclaration;
  smart: boolean;
}

const isPascalCase = (name: string): boolean => /^[A-Z][A-Za-z0-9]*$/.test(name);
const isHookCallName = (name: string): boolean => /^use[A-Z]/.test(name);

function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
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

function containsSmartCall(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(child)) {
      const expression = child.expression;
      let name = "";
      if (ts.isIdentifier(expression)) {
        name = expression.text;
      } else if (ts.isPropertyAccessExpression(expression)) {
        name = expression.name.text;
      }
      if (isHookCallName(name)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function isAsyncFunction(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): boolean {
  return (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword);
}

function componentFromFunction(node: ts.FunctionDeclaration): ComponentInfo | undefined {
  const name = node.name?.text;
  if (!name || !isPascalCase(name) || !containsJsx(node)) return undefined;
  // Async server components fetch data (server-side), which is what makes a
  // component smart; the hook-based detector misses them.
  return { name, declaration: node, smart: containsSmartCall(node) || isAsyncFunction(node) };
}

function componentFromVariable(node: ts.VariableDeclaration): ComponentInfo | undefined {
  if (!ts.isIdentifier(node.name) || !isPascalCase(node.name.text)) return undefined;
  const initializer = node.initializer;
  if (!initializer || (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer))) return undefined;
  if (!containsJsx(initializer)) return undefined;
  return {
    name: node.name.text,
    declaration: node,
    smart: containsSmartCall(initializer),
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

  for (const statement of sourceFile.statements) {
    const exported = isExported(statement);
    if (!exported && !options?.includeNonExported) continue;
    if (ts.isFunctionDeclaration(statement)) {
      const component = componentFromFunction(statement);
      if (component) components.push(component);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const component = componentFromVariable(declaration);
        if (component) components.push(component);
      }
    }
  }

  return components;
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
    .map((statement) => (statement.expression && ts.isExpression(statement.expression) ? rootFromExpression(statement.expression) : undefined))
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
