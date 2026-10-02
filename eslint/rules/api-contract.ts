/**
 * ESLint rule: pasika/api-contract
 *
 * Schema-validated JSON APIs have one exported contract that owns their method,
 * path, request schema, and response schema. Routes and clients import that
 * contract instead of rebuilding one side of it locally.
 *
 * @see docs/pasika-adoption-guide/rules/api-contract-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";

const HELPER = "defineApiContract";
const ENTRY = "pasika/api-contract";
const DOC = "docs/pasika-adoption-guide/rules/api-contract-rule.md";
const TEST_FILE = /(?:^|[\\/])(?:__tests__|tests)[\\/]|[.](?:test|spec)[.][cm]?[jt]sx?$/;

const DECLARED = `A repository must not declare its own ${HELPER}; import it from ${ENTRY}. See ${DOC}`;
const IMPORTED = `${HELPER} must be imported from ${ENTRY}. See ${DOC}`;
const EXPORTED = `A call to ${HELPER} must initialize an exported named contract. See ${DOC}`;
const DEFINED = `An exported *ApiContract value must be created with ${HELPER}. See ${DOC}`;
const ROUTE_IMPORTED = `withResponse must receive an imported API contract for a JSON route. See ${DOC}`;
const CLIENT_CONTRACT = `A schema-validated request must use an imported API contract through zodFetch({ contract }). See ${DOC}`;
const MOCK_PATH = `A mock apiRoutePath must come from an imported API contract through contract.path. See ${DOC}`;
const MOCK_RESPONSE = `A mock must validate successful JSON with the same API contract responseSchema. See ${DOC}`;

function isNamed(node: ESTree.Node | null | undefined, name: string): boolean {
  return node?.type === "Identifier" && node.name === name;
}

function importedBindings(program: ESTree.Program): Set<string> {
  const names = new Set<string>();

  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) {
      names.add(specifier.local.name);
    }
  }

  return names;
}

function memberPropertyName(node: ESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string") {
    return node.property.value;
  }
  return undefined;
}

function importedContractMember(
  expression: ESTree.Expression | null | undefined,
  propertyName: string,
  imports: Set<string>,
): string | undefined {
  if (
    expression?.type !== "MemberExpression" ||
    memberPropertyName(expression) !== propertyName ||
    expression.object.type !== "Identifier" ||
    !imports.has(expression.object.name)
  ) {
    return undefined;
  }

  return expression.object.name;
}

function responseSchemaParserContract(
  callee: ESTree.Expression | ESTree.Super,
  imports: Set<string>,
): string | undefined {
  if (callee.type === "Super" || callee.type !== "MemberExpression" || memberPropertyName(callee) !== "parse") {
    return undefined;
  }
  if (callee.object.type !== "MemberExpression" || memberPropertyName(callee.object) !== "responseSchema") {
    return undefined;
  }
  if (callee.object.object.type !== "Identifier" || !imports.has(callee.object.object.name)) return undefined;
  return callee.object.object.name;
}

function objectProperty(object: ESTree.ObjectExpression, name: string): ESTree.Property | undefined {
  return object.properties.find(
    (property): property is ESTree.Property =>
      property.type === "Property" &&
      !property.computed &&
      ((property.key.type === "Identifier" && property.key.name === name) ||
        (property.key.type === "Literal" && property.key.value === name)),
  );
}

function isExportedVariable(context: Rule.RuleContext, node: ESTree.VariableDeclarator): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  return ancestors.at(-2)?.type === "ExportNamedDeclaration";
}

function isExportedDefinition(context: Rule.RuleContext, node: ESTree.CallExpression): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  const declarator = ancestors.at(-1);
  const declaration = ancestors.at(-2);
  const exported = ancestors.at(-3);

  return (
    declarator?.type === "VariableDeclarator" &&
    declarator.init === node &&
    declarator.id.type === "Identifier" &&
    declaration?.type === "VariableDeclaration" &&
    exported?.type === "ExportNamedDeclaration"
  );
}

export const apiContractRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require schema-validated JSON routes and clients to reuse one exported API contract instead of restating schemas.",
    },
  },
  create(context) {
    if (TEST_FILE.test(context.filename)) return {};

    const imports = importedBindings(context.sourceCode.ast);
    let mockContract: { name: string; node: ESTree.Node } | undefined;
    const mockResponseContracts = new Set<string>();

    return {
      ImportDeclaration(node) {
        if (node.source.value === ENTRY) return;

        for (const specifier of node.specifiers) {
          if (isNamed(specifier.local, HELPER)) {
            context.report({ node: specifier, message: IMPORTED });
          }
        }
      },

      FunctionDeclaration(node) {
        if (isNamed(node.id, HELPER)) context.report({ node, message: DECLARED });
      },

      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") return;

        if (node.id.name === HELPER) {
          context.report({ node, message: DECLARED });
          return;
        }

        if (node.id.name.endsWith("ApiContract") && isExportedVariable(context, node)) {
          const isFactoryCall = node.init?.type === "CallExpression" && isNamed(node.init.callee, HELPER);
          if (!isFactoryCall) {
            context.report({ node, message: DEFINED });
            return;
          }
        }

        if (node.id.name !== "apiRoutePath") return;
        const contractName = importedContractMember(node.init, "path", imports);
        if (!contractName) {
          context.report({ node, message: MOCK_PATH });
          return;
        }

        mockContract = { name: contractName, node };
      },

      CallExpression(node) {
        const responseContract = responseSchemaParserContract(node.callee, imports);
        if (responseContract) mockResponseContracts.add(responseContract);

        if (isNamed(node.callee, HELPER) && !isExportedDefinition(context, node)) {
          context.report({ node, message: EXPORTED });
          return;
        }

        if (isNamed(node.callee, "withResponse") && path.basename(context.filename) === "route.ts") {
          const contract = node.arguments[0];
          if (
            contract &&
            contract.type !== "SpreadElement" &&
            contract.type !== "ArrowFunctionExpression" &&
            contract.type !== "FunctionExpression" &&
            (contract.type !== "Identifier" || !imports.has(contract.name))
          ) {
            context.report({ node: contract, message: ROUTE_IMPORTED });
          }
          return;
        }

        if (!isNamed(node.callee, "zodFetch")) return;
        const options = node.arguments[0];
        if (options?.type !== "ObjectExpression") return;

        const contractProperty = objectProperty(options, "contract");
        if (contractProperty) {
          const value = contractProperty.value;
          if (!(value.type === "Identifier" && imports.has(value.name))) {
            context.report({ node: value, message: CLIENT_CONTRACT });
          }
          return;
        }

        const responseSchemaProperty = objectProperty(options, "responseSchema");
        const requestSchemaProperty = objectProperty(options, "requestSchema");
        const schemaProperty = responseSchemaProperty ?? requestSchemaProperty;
        if (schemaProperty) {
          context.report({ node: schemaProperty, message: CLIENT_CONTRACT });
        }
      },

      "Program:exit"() {
        if (mockContract && !mockResponseContracts.has(mockContract.name)) {
          context.report({ node: mockContract.node, message: MOCK_RESPONSE });
        }
      },
    };
  },
};
