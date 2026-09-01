/**
 * ESLint rule: pasika/locale-dotted-path
 *
 * A namespaced locale MUST be read through its full dotted path
 * (locales.stream.watchLiveStream) rather than destructured.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";

function isInLocalesDir(filename: string): boolean {
  const segments = path.resolve(filename).split(path.sep);
  const srcIdx = segments.lastIndexOf("src");
  return srcIdx !== -1 && segments[srcIdx + 1] === "locales";
}

function isLocalesAccess(node: ESTree.Expression): boolean {
  if (node.type === "Identifier" && node.name === "locales") {
    return true;
  }
  if (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === "locales" &&
    node.property.type === "Identifier"
  ) {
    return true;
  }
  return false;
}

export const localeDottedPathRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require reading namespaced locales through their full dotted path.",
    },
  },
  create(context) {
    if (isInLocalesDir(context.filename)) return {};

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "ObjectPattern") return;
        const init = node.init;
        if (!init || !isLocalesAccess(init)) return;

        for (const prop of node.id.properties) {
          if (prop.type !== "Property") continue;
          let valueName: string | undefined;
          if (prop.value.type === "Identifier") {
            valueName = prop.value.name;
          } else if (prop.key.type === "Identifier") {
            valueName = prop.key.name;
          }
          if (valueName) {
            context.report({
              node,
              message: `Destructuring locales.${valueName} loses the namespace; read through the full dotted path instead.`,
            });
          }
        }
      },
    };
  },
};
