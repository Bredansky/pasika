/**
 * ESLint rule: pasika/no-render-ref-dom-calls
 *
 * React render must remain pure. An imperative DOM call through a ref belongs
 * in an event handler or an effect, never in the component's render path.
 *
 * @see docs/next-codebase-guide/rules/react-render-purity-rule.md
 */
import type { Rule } from "eslint";
import type * as ESTree from "estree";

const IMPERATIVE_DOM_METHODS = new Set([
  "pause",
  "play",
  "focus",
  "blur",
  "scrollIntoView",
  "scrollTo",
  "load",
  "submit",
]);

function memberName(node: ESTree.MemberExpression): string | undefined {
  if (node.computed) {
    return node.property.type === "Literal" && typeof node.property.value === "string"
      ? node.property.value
      : undefined;
  }
  return node.property.type === "Identifier" ? node.property.name : undefined;
}

function isRefDomCall(node: ESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== "MemberExpression" || !IMPERATIVE_DOM_METHODS.has(memberName(callee) ?? "")) return false;
  const receiver = callee.object;
  return receiver.type === "MemberExpression" && memberName(receiver) === "current";
}

function isDirectlyInComponentRender(ancestors: readonly ESTree.Node[]): boolean {
  // A nested event handler, effect or callback is not executed during render.
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index];
    if (!ancestor) continue;
    if (
      ancestor.type !== "FunctionDeclaration" &&
      ancestor.type !== "FunctionExpression" &&
      ancestor.type !== "ArrowFunctionExpression"
    ) {
      continue;
    }
    const parent = ancestors[index - 1];
    let name: string | undefined;
    if (ancestor.type === "FunctionDeclaration" || ancestor.type === "FunctionExpression") {
      name = ancestor.id?.name;
    } else if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
      name = parent.id.name;
    }
    return name !== undefined && /^[A-Z]/.test(name);
  }
  return false;
}

export const noRenderRefDomCallsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Do not call imperative DOM methods through refs during React render." },
  },
  create(context) {
    if (!/\.[jt]sx$/.test(context.filename)) return {};
    return {
      CallExpression(node) {
        if (!isRefDomCall(node)) return;
        if (!isDirectlyInComponentRender(context.sourceCode.getAncestors(node))) return;
        context.report({
          node,
          message:
            "Do not invoke DOM methods on ref.current during React render. Move the side effect to an event handler or useEffect.",
        });
      },
    };
  },
};
