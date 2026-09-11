/**
 * ESLint rule: pasika/result-pipeline-types
 *
 * The project's ok, err, andThen, and respond helpers MUST type their
 * Result-carrying parameters and return values as Result. Each helper's own
 * runtime behavior can look correct while its declared types are loose
 * enough that nothing forces a route handler's delegated calls to actually
 * be Result-typed — the guarantee these helpers exist to provide only holds
 * if their signatures say so.
 *
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** A TSTypeReference or TSFunctionType, as seen by the typescript-eslint parser. */
interface TypeNode {
  type?: string;
  typeName?: { type?: string; name?: string };
  typeArguments?: { params?: TypeNode[] };
  returnType?: { typeAnnotation?: TypeNode } | null;
}

/** A parameter's or function's `: T` annotation, from the typescript-eslint parser. */
interface Typed {
  typeAnnotation?: { typeAnnotation?: TypeNode } | null;
}

function isTyped(node: object): node is Typed {
  return "typeAnnotation" in node;
}

function paramType(param: ESTree.Pattern | undefined): TypeNode | undefined {
  if (!param || !isTyped(param)) return undefined;
  return param.typeAnnotation?.typeAnnotation;
}

/** A function's declared `: T` return type, from the typescript-eslint parser. */
interface ReturnTyped {
  returnType?: { typeAnnotation?: TypeNode } | null;
}

function hasReturnType(node: object): node is ReturnTyped {
  return "returnType" in node;
}

function functionReturnType(fn: ESTree.Node): TypeNode | undefined {
  if (!hasReturnType(fn)) return undefined;
  return fn.returnType?.typeAnnotation;
}

/** Whether a type node mentions `Result`, unwrapping `Promise<...>` and function return types. */
function referencesResultType(node: TypeNode | undefined): boolean {
  if (!node) return false;
  if (node.type === "TSTypeReference") {
    if (node.typeName?.name === "Result") return true;
    return (node.typeArguments?.params ?? []).some(referencesResultType);
  }
  if (node.type === "TSFunctionType") {
    return referencesResultType(node.returnType?.typeAnnotation);
  }
  return false;
}

type FunctionLike = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression | ESTree.FunctionDeclaration;

function isFunctionLike(node: ESTree.Node): node is FunctionLike {
  return (
    node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration"
  );
}

const DOC_LINK = "See docs/next-codebase-guide/rules/route-handler-rule.md";

function checkHelper(context: Rule.RuleContext, node: Rule.Node, isResultTyped: boolean, message: string): void {
  if (!isResultTyped) {
    context.report({ node, message: `${message} ${DOC_LINK}` });
  }
}

export const resultPipelineTypesRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require ok, err, andThen, and respond to type their Result-carrying values as Result.",
    },
  },
  create(context) {
    function checkNamed(node: Rule.Node, name: string, fn: FunctionLike): void {
      if (name === "ok") {
        checkHelper(context, node, referencesResultType(functionReturnType(fn)), "ok must type its return as Result.");
      }
      if (name === "err") {
        checkHelper(context, node, referencesResultType(functionReturnType(fn)), "err must type its return as Result.");
      }
      if (name === "andThen") {
        checkHelper(
          context,
          node,
          referencesResultType(paramType(fn.params[0])) && referencesResultType(paramType(fn.params[1])),
          "andThen must type its result parameter and its next parameter's return as Result.",
        );
      }
      if (name === "respond") {
        checkHelper(
          context,
          node,
          referencesResultType(paramType(fn.params[0])),
          "respond must type its result parameter as Result.",
        );
      }
    }

    const trackedNames = new Set(["ok", "err", "andThen", "respond"]);

    return {
      FunctionDeclaration(node) {
        const name = node.id.name;
        if (trackedNames.has(name)) checkNamed(node, name, node);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (!trackedNames.has(name)) return;
        if (node.init && isFunctionLike(node.init)) checkNamed(node, name, node.init);
      },
    };
  },
};
