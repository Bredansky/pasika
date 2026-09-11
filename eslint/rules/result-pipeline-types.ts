/**
 * ESLint rule: pasika/result-pipeline-types
 *
 * The project's andThen and respond helpers MUST type their Result-carrying
 * parameters and return values as Result. andThen's own runtime behavior and
 * respond's own runtime behavior can look correct while their declared types
 * are loose enough that nothing forces a route handler's delegated calls to
 * actually be Result-typed — the guarantee andThen and respond exist to
 * provide only holds if their signatures say so.
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

/** A parameter's `: T` annotation, from the typescript-eslint parser. */
interface TypedParam {
  typeAnnotation?: { typeAnnotation?: TypeNode } | null;
}

function hasTypeAnnotation(param: ESTree.Pattern): param is ESTree.Pattern & TypedParam {
  return "typeAnnotation" in param;
}

function paramType(param: ESTree.Pattern | undefined): TypeNode | undefined {
  if (!param || !hasTypeAnnotation(param)) return undefined;
  return param.typeAnnotation?.typeAnnotation;
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

function isFunctionLike(
  node: ESTree.Node,
): node is ESTree.ArrowFunctionExpression | ESTree.FunctionExpression | ESTree.FunctionDeclaration {
  return (
    node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration"
  );
}

const DOC_LINK = "See docs/next-codebase-guide/rules/route-handler-rule.md";

function checkHelper(
  context: Rule.RuleContext,
  node: Rule.Node,
  params: ESTree.Pattern[],
  checkParams: (params: ESTree.Pattern[]) => boolean,
  message: string,
): void {
  if (!checkParams(params)) {
    context.report({ node, message: `${message} ${DOC_LINK}` });
  }
}

export const resultPipelineTypesRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require andThen and respond to type their Result-carrying parameters and return values as Result.",
    },
  },
  create(context) {
    function checkNamed(node: Rule.Node, name: string, params: ESTree.Pattern[]): void {
      if (name === "andThen") {
        checkHelper(
          context,
          node,
          params,
          (p) => referencesResultType(paramType(p[0])) && referencesResultType(paramType(p[1])),
          "andThen must type its result parameter and its next parameter's return as Result.",
        );
      }
      if (name === "respond") {
        checkHelper(
          context,
          node,
          params,
          (p) => referencesResultType(paramType(p[0])),
          "respond must type its result parameter as Result.",
        );
      }
    }

    return {
      FunctionDeclaration(node) {
        const name = node.id.name;
        if (name === "andThen" || name === "respond") checkNamed(node, name, node.params);
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;
        const name = node.id.name;
        if (name !== "andThen" && name !== "respond") return;
        if (node.init && isFunctionLike(node.init)) checkNamed(node, name, node.init.params);
      },
    };
  },
};
