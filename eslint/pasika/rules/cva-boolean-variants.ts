/**
 * ESLint rule: pasika/cva-boolean-variants
 *
 * Enforces correct placement of boolean appearance props:
 * - If a boolean variant appears in both CVA and cn(), report it —
 *   it belongs in exactly one place.
 *
 * @see docs/styling-guide/rules/component-variant-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

interface CvaInfo {
  variantNames: Set<string>;
  compoundVariants: Set<string>;
}

function extractCvaInfo(node: any): CvaInfo | undefined {
  if (node.type !== "CallExpression" || node.callee?.type !== "Identifier" || node.callee.name !== "cva") {
    return undefined;
  }

  const variantNames = new Set<string>();
  const compoundVariants = new Set<string>();

  const options = node.arguments[1];
  if (options?.type !== "ObjectExpression") return { variantNames, compoundVariants };

  for (const prop of options.properties) {
    if (prop.type !== "Property") continue;
    const keyName: string | undefined = prop.key?.type === "Identifier" ? prop.key.name : undefined;

    if (keyName === "variants" && prop.value?.type === "ObjectExpression") {
      for (const vProp of prop.value.properties) {
        if (vProp.type !== "Property") continue;
        const vName: string | undefined = vProp.key?.type === "Identifier" ? vProp.key.name : undefined;
        if (vName) variantNames.add(vName);
      }
    }

    if (keyName === "compoundVariants" && prop.value?.type === "ArrayExpression") {
      for (const entry of prop.value.elements) {
        if (entry?.type !== "ObjectExpression") continue;
        for (const cvProp of entry.properties) {
          if (cvProp.type !== "Property") continue;
          const cvName: string | undefined = cvProp.key?.type === "Identifier" ? cvProp.key.name : undefined;
          if (cvName && variantNames.has(cvName)) {
            compoundVariants.add(cvName);
          }
        }
      }
    }
  }

  return { variantNames, compoundVariants };
}

export const cvaBooleanVariantsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce correct boolean variant placement between CVA and cn().",
    },
  },
  create(context) {
    const cvaInfos: CvaInfo[] = [];

    return {
      // Collect all cva() calls in the file
      CallExpression(node: any) {
        const info = extractCvaInfo(node);
        if (info) cvaInfos.push(info);
      },

      // Detect boolean && "class" patterns anywhere inside a className attribute
      "JSXAttribute[name.name='className'] LogicalExpression[operator='&&']"(node: any) {
        if (cvaInfos.length === 0) return;

        const left = node.left;
        const right = node.right;

        // Right side should be a string literal (class name)
        if (right?.type !== "Literal" || typeof right.value !== "string") {
          return;
        }

        // Left side should be an identifier (boolean prop)
        if (left?.type !== "Identifier") return;

        const propName: string = left.name;

        // Check if this prop is also a CVA variant
        for (const info of cvaInfos) {
          if (info.variantNames.has(propName)) {
            context.report({
              node,
              message:
                `Boolean prop "${propName}" is used as a standalone conditional in cn() ` +
                "but is also defined as a CVA variant. Move it to one place: " +
                "either CVA (with both true/false treatments) or cn() (standalone). " +
                "See docs/styling-guide/rules/component-variant-rule.md",
            });
          }
        }
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- re-enable after AST node access block */
