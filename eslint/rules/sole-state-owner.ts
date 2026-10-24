/**
 * ESLint rule: pasika/sole-state-owner
 *
 * A component MUST extract a named component when one part of its JSX
 * contains every JSX expression, callback, and effect that reads one state
 * hook's value or calls its updater. The rule inspects each exported component:
 * when a useState hook (and any simply derived local constants) is consumed
 * only by one nested JSX section while other sibling sections are independent,
 * that section should own the hook. Decorative separators may bridge related
 * JSX children; effects and unsafe derived computations remain outside scope.
 *
 * @see docs/next-codebase-guide/rules/sole-state-owner-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { parseComponentInfo } from "./component-conventions";

interface Hook {
  value: string;
  updater: string;
}

/** The `useState` hooks declared anywhere in a component body. */
function findStateHooks(node: ts.Node): Hook[] {
  const hooks: Hook[] = [];
  const visit = (child: ts.Node): void => {
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === "useState") {
      if (ts.isVariableDeclaration(child.parent)) {
        const { name } = child.parent;
        if (ts.isArrayBindingPattern(name) && name.elements.length >= 2) {
          const value = name.elements[0];
          const updater = name.elements[1];
          if (value && updater && ts.isBindingElement(value) && ts.isBindingElement(updater)) {
            const valueName = value.name;
            const updaterName = updater.name;
            if (ts.isIdentifier(valueName) && ts.isIdentifier(updaterName)) {
              hooks.push({ value: valueName.text, updater: updaterName.text });
            }
          }
        }
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return hooks;
}

/** Whether a node refers to the hook value (read) or calls the updater. */
function isHookUsage(node: ts.Node, hook: Hook): "value" | "updater" | undefined {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === hook.updater) {
    return "updater";
  }
  // A value read is an identifier in expression position — not the binding
  // declaration `const [isHelpOpen] = …` nor a property-access base.
  if (ts.isIdentifier(node) && node.text === hook.value) {
    const parent = node.parent;
    if (
      (ts.isBindingElement(parent) && parent.name === node) ||
      (ts.isVariableDeclaration(parent) && parent.name === node) ||
      (ts.isParameter(parent) && parent.name === node) ||
      (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      (ts.isPropertyAssignment(parent) && parent.name === node)
    ) {
      return undefined;
    }
    // `isHelpOpen` on the left of `isHelpOpen && …` is a read.
    return "value";
  }
  return undefined;
}

/**
 * The top-level JSX children of a returned JSX element/fragment, and the
 * root JSX node's kind. Returns an empty array when the return is not a
 * simple <tag>...children...</tag>.
 */
function topLevelJsxChildren(initial: ts.Expression | undefined):
  | {
      root: ts.Node;
      children: ts.JsxChild[];
    }
  | undefined {
  if (!initial) return undefined;
  // Unwrap `return (...)` parentheses around the JSX.
  let expression = initial;
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
  if (ts.isJsxFragment(expression)) {
    // A fragment with no outer tag still has its direct children.
    const children = expression.children.filter(
      (c): c is ts.JsxElement | ts.JsxExpression => !ts.isJsxText(c) && !ts.isJsxSpreadAttribute(c),
    );
    return { root: expression, children };
  }
  if (ts.isJsxElement(expression)) {
    const children = expression.children.filter(
      (c): c is ts.JsxElement | ts.JsxExpression => !ts.isJsxText(c) && !ts.isJsxSpreadAttribute(c),
    );
    return { root: expression, children };
  }
  return undefined;
}

/** A conservative subset of expressions whose value can move with an owning UI component. */
function isSimpleDerivedExpression(node: ts.Node): boolean {
  if (
    ts.isNewExpression(node) ||
    ts.isAwaitExpression(node) ||
    ts.isYieldExpression(node) ||
    ts.isDeleteExpression(node) ||
    ts.isTaggedTemplateExpression(node) ||
    ts.isBlock(node)
  ) {
    return false;
  }

  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (
      !ts.isPropertyAccessExpression(callee) ||
      !new Set(["filter", "map", "find", "findIndex", "some", "every", "slice", "includes"]).has(callee.name.text)
    ) {
      return false;
    }
  }
  if (ts.isArrowFunction(node) && ts.isBlock(node.body)) return false;
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator >= ts.SyntaxKind.FirstAssignment && operator <= ts.SyntaxKind.LastAssignment) return false;
  }
  if (
    (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
    (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
  ) {
    return false;
  }

  let safe = true;
  ts.forEachChild(node, (child) => {
    if (!isSimpleDerivedExpression(child)) safe = false;
  });
  return safe;
}

/** A name is a read only when it is not a declaration or property name. */
function isIdentifierRead(node: ts.Node, names: ReadonlySet<string>): boolean {
  if (!ts.isIdentifier(node) || !names.has(node.text)) return false;
  const parent = node.parent;
  return !(
    (ts.isBindingElement(parent) && parent.name === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node)
  );
}

function containsNamedRead(node: ts.Node, names: ReadonlySet<string>): boolean {
  if (isIdentifierRead(node, names)) return true;
  return ts.forEachChild(node, (child) => containsNamedRead(child, names)) ?? false;
}

interface DerivedState {
  names: Set<string>;
  allowedInitializers: Set<ts.Node>;
}

/** Follow local, immutable, side-effect-free aliases of the state (e.g. a filtered product list). */
function findDerivedState(body: ts.Block, hook: Hook): DerivedState {
  const names = new Set([hook.value]);
  const allowedInitializers = new Set<ts.Node>();
  for (const statement of body.statements) {
    if (!ts.isVariableStatement(statement) || statement.declarationList.flags !== ts.NodeFlags.Const) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      if (!containsNamedRead(declaration.initializer, names)) continue;
      if (!isSimpleDerivedExpression(declaration.initializer)) continue;
      names.add(declaration.name.text);
      allowedInitializers.add(declaration.initializer);
    }
  }
  return { names, allowedInitializers };
}

function isTrackedUse(node: ts.Node, hook: Hook, names: ReadonlySet<string>): boolean {
  return isHookUsage(node, hook) !== undefined || isIdentifierRead(node, names);
}

/** Count direct and derived state references inside a JSX subtree. */
function countUsesIn(child: ts.Node, hook: Hook, names: ReadonlySet<string>): number {
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (isTrackedUse(node, hook, names)) count += 1;
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(child);
  return count;
}

function jsxChildren(node: ts.Node): ts.JsxChild[] | undefined {
  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
    return [...node.children].filter((child) => !ts.isJsxText(child));
  }
  return undefined;
}

/** A visual separator can remain inside a contiguous extracted UI section. */
function isDecorativeSeparator(node: ts.Node): boolean {
  if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxElement(node)) return false;
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  return /(?:Divider|Separator)$/.test(tagName.getText());
}

export const soleStateOwnerRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require extracting a JSX part that is the sole owner of a useState hook as a named component.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};
    const text = context.sourceCode.text;
    const components = parseComponentInfo(text, filename);

    return {
      Program(node) {
        for (const component of components) {
          const hooks = findStateHooks(component.declaration);
          for (const hook of hooks) {
            const result = analyzeSoleOwner(component.declaration, hook);
            if (!result) continue;
            const { run, totalTopLevel } = result;
            if (run === 0 || totalTopLevel === 0) continue;

            context.report({
              node,
              loc: { line: 1, column: 0 },
              message:
                `Component "${component.name}" uses state "${hook.value}" in ${String(run)} contiguous ` +
                `top-level JSX part${run === 1 ? "" : "s"}; extract that part into a named component that owns ` +
                `useState instead of reading it in the parent. ` +
                "See docs/next-codebase-guide/rules/sole-state-owner-rule.md",
            });
          }
        }
      },
    };
  },
};

/**
 * Find the deepest returned JSX section containing all uses of the state and
 * its simple derived values, with at least one independent sibling section.
 */
function analyzeSoleOwner(declaration: ts.Node, hook: Hook): { run: number; totalTopLevel: number } | undefined {
  const body = ts.isFunctionDeclaration(declaration) ? declaration.body : undefined;
  if (!body || !ts.isBlock(body)) return undefined;

  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);
  if (returns.length !== 1) return undefined;
  const expression = returns[0]?.expression;
  if (!expression || !ts.isExpression(expression)) return undefined;
  const root = topLevelJsxChildren(expression);
  if (!root) return undefined;

  const derived = findDerivedState(body, hook);
  if (usesOutsideJsx(declaration, hook, derived, root.children)) return undefined;
  const totalUses = countUsesIn(root.root, hook, derived.names);
  if (totalUses === 0) return undefined;

  const analyzeSection = (node: ts.Node): { run: number; totalTopLevel: number } | undefined => {
    const children = jsxChildren(node);
    if (!children || children.length === 0) return undefined;

    // Prefer the narrowest meaningful UI boundary, not the entire page wrapper.
    for (const child of children) {
      if (ts.isJsxElement(child) || ts.isJsxFragment(child)) {
        const inner = analyzeSection(child);
        if (inner) return inner;
      }
    }

    const counts = children.map((child) => countUsesIn(child, hook, derived.names));
    if (counts.reduce((sum, count) => sum + count, 0) !== totalUses) return undefined;
    const firstUsed = counts.findIndex((count) => count > 0);
    const lastUsed = counts.map((count) => count > 0).lastIndexOf(true);
    if (firstUsed === -1 || lastUsed === -1) return undefined;

    // Gaps are only safe to absorb when they are decorative separators.
    for (let index = firstUsed; index <= lastUsed; index += 1) {
      const child = children[index];
      if ((counts[index] ?? 0) === 0 && (child === undefined || !isDecorativeSeparator(child))) return undefined;
    }
    const hasOutside = firstUsed > 0 || lastUsed < children.length - 1;
    if (!hasOutside) return undefined;
    return { run: lastUsed - firstUsed + 1, totalTopLevel: children.length };
  };

  return analyzeSection(root.root);
}

/**
 * Reject extraction when state or a derived value has uses outside returned
 * JSX, except within the initializers of safe local derived constants.
 */
function usesOutsideJsx(declaration: ts.Node, hook: Hook, derived: DerivedState, children: ts.Node[]): boolean {
  let outside = false;
  const visit = (node: ts.Node): void => {
    if (outside) return;
    if (node !== declaration && (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))) return;
    if (isTrackedUse(node, hook, derived.names)) {
      let current: ts.Node = node;
      let allowed = false;
      while (!ts.isSourceFile(current)) {
        if (children.includes(current) || derived.allowedInitializers.has(current)) {
          allowed = true;
          break;
        }
        current = current.parent;
      }
      if (!allowed) outside = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration);
  return outside;
}
