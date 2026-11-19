/**
 * ESLint rule: pasika/accessible-click-target
 *
 * Clickable non-interactive JSX surfaces must expose an appropriate role,
 * keyboard interaction and focusability. Native controls are preferred.
 *
 * @see docs/next-codebase-guide/rules/react-runtime-safety-rule.md
 */
import type { Rule } from "eslint";
import type * as ESTree from "estree";

type JsxOpening = ESTree.Node & {
  name?: { type?: string; name?: string };
  attributes?: { type: string; name?: { name?: string }; value?: { type?: string; value?: unknown } | null }[];
};

const NATIVE_INTERACTIVE = new Set(["button", "input", "select", "textarea", "summary", "details", "option"]);
const INTERACTIVE_ROLES = new Set(["button", "link", "checkbox", "switch", "radio", "tab", "menuitem", "option"]);

function attribute(node: JsxOpening, name: string): NonNullable<JsxOpening["attributes"]>[number] | undefined {
  return node.attributes?.find((item) => item.type === "JSXAttribute" && item.name?.name === name);
}

export const accessibleClickTargetRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require clickable non-interactive JSX elements to support keyboard and focus access." },
  },
  create(context) {
    if (!/\.[jt]sx$/.test(context.filename)) return {};
    return {
      JSXOpeningElement(node: JsxOpening) {
        if (!attribute(node, "onClick")) return;
        const name = node.name?.name;
        if (name && (NATIVE_INTERACTIVE.has(name) || (name === "a" && attribute(node, "href")))) return;
        // Custom components may implement the correct behavior internally.
        // Inspect them only when they explicitly claim a non-interactive role.
        const isNative = typeof name === "string" && /^[a-z]/.test(name);
        const role = attribute(node, "role");
        const roleValue = role?.value?.type === "Literal" ? role.value.value : undefined;
        if (!isNative && typeof roleValue !== "string") return;
        if (isNative && role && roleValue === undefined) return;
        const hasRole = typeof roleValue === "string" && INTERACTIVE_ROLES.has(roleValue);
        if (hasRole && attribute(node, "tabIndex") && (attribute(node, "onKeyDown") || attribute(node, "onKeyUp"))) {
          return;
        }
        context.report({
          node,
          message:
            "A clickable non-interactive surface needs an interactive role, keyboard handler and focusability; prefer a native button or link.",
        });
      },
    };
  },
};
