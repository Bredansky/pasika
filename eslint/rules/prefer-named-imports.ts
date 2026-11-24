/**
 * ESLint rule: pasika/prefer-named-imports
 *
 * Require explicit dependencies when an internal namespace is only used to
 * qualify individual exports. Preserve genuine module-object usage.
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */
import type { Rule } from "eslint";

const MESSAGE =
  "Import the referenced named exports directly instead of using a namespace import. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

interface ReferenceParent {
  type: string;
  object?: unknown;
  left?: unknown;
  computed?: boolean;
  property?: { type: string; name?: string; value?: unknown };
  right?: { name?: string };
}

function isReferenceParent(value: unknown): value is ReferenceParent {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function accessesNamedExport(identifier: unknown): boolean {
  if (typeof identifier !== "object" || identifier === null || !("parent" in identifier)) return false;
  const parent = identifier.parent;
  if (!isReferenceParent(parent)) return false;

  if (parent.type === "TSQualifiedName") {
    return parent.left === identifier && parent.right?.name !== "default";
  }

  if (parent.object !== identifier) return false;
  if (parent.type === "JSXMemberExpression") return parent.property?.name !== "default";
  if (parent.type !== "MemberExpression") return false;

  const property = parent.property;
  if (!parent.computed) return property?.type === "Identifier" && property.name !== "default";
  return property?.type === "Literal" && typeof property.value === "string" && property.value !== "default";
}

export const preferNamedImportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "suggestion",
    docs: {
      description: "Prefer direct named imports for statically referenced internal exports.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !/^(?:@\/|\.{1,2}\/)/u.test(source)) return;

        const namespace = node.specifiers.find((specifier) => specifier.type === "ImportNamespaceSpecifier");
        if (!namespace) return;

        const binding = context.sourceCode
          .getDeclaredVariables(node)
          .find((variable) => variable.name === namespace.local.name);
        if (!binding || binding.references.length === 0) return;
        if (!binding.references.every((reference) => accessesNamedExport(reference.identifier))) return;

        context.report({ node: namespace, message: MESSAGE });
      },
    };
  },
};
