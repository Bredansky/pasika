/**
 * ESLint rule: pasika/stable-external-store-subscribe
 *
 * An inline subscribe callback changes identity on each render, causing
 * useSyncExternalStore to unsubscribe and resubscribe repeatedly.
 *
 * @see docs/next-codebase-guide/rules/react-runtime-safety-rule.md
 */
import type { Rule } from "eslint";

export const stableExternalStoreSubscribeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Use a stable subscribe function with useSyncExternalStore." },
  },
  create(context) {
    if (!/\.[jt]sx?$/.test(context.filename)) return {};
    return {
      CallExpression(node) {
        const callee = node.callee;
        const isHook =
          (callee.type === "Identifier" && callee.name === "useSyncExternalStore") ||
          (callee.type === "MemberExpression" &&
            !callee.computed &&
            callee.object.type === "Identifier" &&
            callee.object.name === "React" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "useSyncExternalStore");
        if (!isHook) return;
        const subscribe = node.arguments[0];
        if (subscribe?.type !== "ArrowFunctionExpression" && subscribe?.type !== "FunctionExpression") return;
        context.report({
          node: subscribe,
          message:
            "Pass a stable subscribe function to useSyncExternalStore (module-level or useCallback), not an inline function recreated each render.",
        });
      },
    };
  },
};
