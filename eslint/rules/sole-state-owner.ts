/**
 * ESLint rule: pasika/sole-state-owner
 *
 * A component MUST extract a named component when one part of its JSX
 * contains every JSX expression, callback, and effect that reads one state
 * hook's value or calls its updater. The rule inspects each exported component:
 * when a `useState` hook is read or its updater is called only inside JSX, and
 * every such occurrence falls within one contiguous run of the returned JSX's
 * top-level children — while at least one sibling child never touches the hook —
 * that run is a self-contained part that should own the hook, so extraction is
 * required.
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
    if (ts.isBindingElement(parent) || ts.isPropertyAccessExpression(parent) || ts.isShorthandPropertyAssignment(parent)) {
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
function topLevelJsxChildren(initial: ts.Expression | undefined): {
  root: ts.Node;
  children: ts.JsxChild[];
} | undefined {
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

/** Walk a JSX child, collecting positions/effects that use a given hook. */
function collectUsesIn(child: ts.Node, hook: Hook): { positions: ts.Node[]; count: number } {
  const positions: ts.Node[] = [];
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (isHookUsage(node, hook)) {
      positions.push(node);
      count += 1;
    }
    // Stop descending into a nested component declaration (a separate component
    // defined inline); arrow/function expressions used as JSX props or callbacks
    // are part of this JSX part and must keep walking.
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(child);
  return { positions, count };
}

export const soleStateOwnerRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require extracting a JSX part that is the sole owner of a useState hook as a named component.",
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
 * Returns the size of the maximal contiguous run of top-level JSX children
 * that together hold every JSX-side use of the hook, provided that uses are
 * confined to JSX and do not span discontiguous children. `totalTopLevel` is
 * the number of top-level JSX children.
 */
function analyzeSoleOwner(
  declaration: ts.Node,
  hook: Hook,
): { run: number; totalTopLevel: number } | undefined {
  const body = ts.isFunctionDeclaration(declaration) ? declaration.body : undefined;
  if (!body || !ts.isBlock(body)) return undefined;

  const returns: ts.ReturnStatement[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
    if (ts.isReturnStatement(node)) returns.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);

  // Only a single return form is analyzable; multiple return paths with
  // different outer elements are beyond this rule's scope.
  if (returns.length !== 1) return undefined;
  const single = returns[0];
  if (!single?.expression || !ts.isExpression(single.expression)) return undefined;
  const returnExpression = single.expression;

  const root = topLevelJsxChildren(returnExpression);
  if (!root || root.children.length === 0) return undefined;

  const totalTopLevel = root.children.length;
  const usagePerChild = root.children.map((child) => collectUsesIn(child, hook));

  // Every use must be inside JSX and assigned to a top-level child.
  const outsideJsx = usesOutsideJsx(declaration, hook, root.children);
  if (outsideJsx) return undefined;

  // Find the maximal contiguous run of children that contains all hook uses.
  const usedLabels = usagePerChild.map((u) => u.count > 0);
  const firstUsed = usedLabels.findIndex((v) => v);
  const lastUsed = usedLabels.lastIndexOf(true);
  if (firstUsed === -1 || lastUsed === -1) return undefined;

  // All uses must be within the [firstUsed, lastUsed] contiguous window.
  const windowHasUnused = usedLabels.slice(firstUsed, lastUsed + 1).some((v) => !v);
  if (windowHasUnused) return undefined;

  const run = lastUsed - firstUsed + 1;
  // At least one top-level child must sit outside the run (the parent keeps
  // content that does not touch the hook).
  const hasOutside = firstUsed > 0 || lastUsed < totalTopLevel - 1;
  if (!hasOutside) return undefined;

  return { run, totalTopLevel };
}

/**
 * Whether the hook value/updater is used anywhere outside the returned JSX's
 * top-level children (e.g. in a standalone effect or callback body in the
 * component body). Such uses make the extraction not solely JSX-confined.
 */
function usesOutsideJsx(declaration: ts.Node, hook: Hook, children: ts.Node[]): boolean {
  let outside = false;
  const visit = (node: ts.Node): void => {
    if (outside) return;
    if (node !== declaration && (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))) return;
    if (isHookUsage(node, hook)) {
      // A use is "outside JSX" if it is not underneath one of the top-level children.
      let current: ts.Node = node;
      let isInJsxChild = false;
      while (!ts.isSourceFile(current)) {
        if (children.includes(current)) {
          isInJsxChild = true;
          break;
        }
        current = current.parent;
      }
      if (!isInJsxChild) outside = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration);
  return outside;
}