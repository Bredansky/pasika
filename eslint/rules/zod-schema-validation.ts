/**
 * ESLint rule: pasika/zod-schema-validation
 *
 * Runtime validation MUST use Zod schemas rather than ad hoc type guards.
 *
 * A hand-written type predicate over `unknown` or `any` is ad hoc validation:
 * it re-implements, by hand, what a Zod schema's `safeParse` decides. The rule
 * reports a function whose return type is a type predicate guarding an
 * `unknown`/`any` parameter and whose body never delegates to a schema
 * (`schema.safeParse(x)`, `schema.parse(x)`, or `schema.assert(x)`).
 *
 * @see docs/repository-policy.md
 */

import type { Rule } from "eslint";

/**
 * Loose structural types: the parser is @typescript-eslint, whose node shapes
 * are richer than `estree`'s, so only the fields the rule reads are named.
 */
interface FunctionLike {
  type?: string;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  returnType?: {
    typeAnnotation?: { type?: string; parameterName?: { type?: string; name?: string } };
  } | null;
  params?: unknown[];
  body?: unknown;
}

/** Non-schema objects whose `.parse` is not a Zod schema call. */
const NON_SCHEMA_OBJECTS = new Set(["JSON", "Date", "Number"]);

/** Zod's schema-delegating methods. */
const SCHEMA_METHODS = new Set(["safeParse", "parse", "assert"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTypePredicate(node: FunctionLike): boolean {
  return node.returnType?.typeAnnotation?.type === "TSTypePredicate";
}

/** Whether any parameter is annotated `unknown` or `any` — a runtime boundary value. */
function guardsUnknown(node: FunctionLike): boolean {
  return (node.params ?? []).some((param) => {
    if (!isRecord(param)) return false;
    const typeAnnotation = param.typeAnnotation;
    if (!isRecord(typeAnnotation)) return false;
    const annotation = typeAnnotation.typeAnnotation;
    if (!isRecord(annotation)) return false;
    return annotation.type === "TSUnknownKeyword" || annotation.type === "TSAnyKeyword";
  });
}

/** Whether the subtree contains a `schema.safeParse(x)`-style call. */
function delegatesToSchema(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(delegatesToSchema);
  if (!isRecord(node)) return false;
  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (isRecord(callee) && callee.type === "MemberExpression") {
      const property = callee.property;
      const object = callee.object;
      if (
        isRecord(property) &&
        property.type === "Identifier" &&
        typeof property.name === "string" &&
        SCHEMA_METHODS.has(property.name) &&
        // A named object is only a schema if it is not a known non-schema
        // object (JSON.parse, Date.parse, ...); any other callee (a call, a
        // member chain) is a delegation to whatever returns it.
        !(
          isRecord(object) &&
          object.type === "Identifier" &&
          typeof object.name === "string" &&
          NON_SCHEMA_OBJECTS.has(object.name)
        )
      ) {
        return true;
      }
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "callee" || key === "parent") continue;
    if (delegatesToSchema(node[key])) return true;
  }
  return false;
}

export const zodSchemaValidationRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require Zod schemas for runtime validation instead of hand-written type guards.",
    },
  },
  create(context) {
    function checkFunction(node: FunctionLike): void {
      if (!isTypePredicate(node)) return;
      if (!guardsUnknown(node)) return;
      if (delegatesToSchema(node.body)) return;
      context.report({
        loc: node.loc ?? { line: 1, column: 0 },
        message:
          "This hand-written type guard validates an unknown value ad hoc. " +
          "Use a Zod schema instead: schema.safeParse(value) returns a discriminated result " +
          "whose .success narrows the type. See docs/repository-policy.md",
      });
    }

    return {
      FunctionDeclaration(node) {
        checkFunction(node);
      },
      FunctionExpression(node) {
        checkFunction(node);
      },
      ArrowFunctionExpression(node) {
        checkFunction(node);
      },
    };
  },
};
