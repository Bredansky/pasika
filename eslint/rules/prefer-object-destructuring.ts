/**
 * ESLint rule: pasika/prefer-object-destructuring
 *
 * Require locals that directly read an object property to use object
 * destructuring. Adjacent declarations from the same simple source are
 * combined when doing so preserves evaluation semantics.
 *
 * @see docs/next-codebase-guide/rules/redundant-aliases-rule.md
 */
import type { Rule } from "eslint";
import type { Identifier, MemberExpression, Node, VariableDeclaration, VariableDeclarator } from "estree";

const DOC = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

interface PropertyBinding {
  declarator: VariableDeclarator;
  member: MemberExpression;
  propertyName: string;
  localName: string;
  source: Node;
  sourceText: string;
  bindingText: string;
}

function hasTypeAnnotation(identifier: Identifier): boolean {
  return "typeAnnotation" in identifier && identifier.typeAnnotation !== undefined;
}

function directPropertyBinding(context: Rule.RuleContext, declarator: VariableDeclarator): PropertyBinding | undefined {
  if (declarator.id.type !== "Identifier" || hasTypeAnnotation(declarator.id)) return undefined;
  if (declarator.init?.type !== "MemberExpression") return undefined;

  const member = declarator.init;
  if (member.computed || member.optional || member.property.type !== "Identifier" || member.object.type === "Super") {
    return undefined;
  }
  if (context.sourceCode.getCommentsInside(declarator).length > 0) return undefined;

  const propertyName = member.property.name;
  const localName = declarator.id.name;
  const source = member.object;
  const sourceText = context.sourceCode.getText(source);

  return {
    declarator,
    member,
    propertyName,
    localName,
    source,
    sourceText,
    bindingText: propertyName === localName ? propertyName : `${propertyName}: ${localName}`,
  };
}

function canGroupSource(source: Node): boolean {
  return source.type === "Identifier" || source.type === "ThisExpression";
}

function whitespaceKeepsStatementsAdjacent(text: string): boolean {
  if (text.trim() !== "") return false;
  return (text.match(/\n/gu) ?? []).length <= 1;
}

function groupedDeclarations(
  context: Rule.RuleContext,
  declaration: VariableDeclaration,
  firstBinding: PropertyBinding,
): { declaration: VariableDeclaration; binding: PropertyBinding }[] {
  if (declaration.declarations.length !== 1 || !canGroupSource(firstBinding.source)) {
    return [{ declaration, binding: firstBinding }];
  }

  const parent = context.sourceCode.getAncestors(declaration).at(-1);
  if (parent?.type !== "Program" && parent?.type !== "BlockStatement") {
    return [{ declaration, binding: firstBinding }];
  }

  const body = parent.body;
  const startIndex = body.indexOf(declaration);
  if (startIndex < 0) return [{ declaration, binding: firstBinding }];

  const group = [{ declaration, binding: firstBinding }];
  const seenProperties = new Set([firstBinding.propertyName]);

  for (let index = startIndex + 1; index < body.length; index += 1) {
    const nextNode = body[index];
    const previous = group.at(-1)?.declaration;
    if (!previous || nextNode?.type !== "VariableDeclaration" || nextNode.kind !== declaration.kind) break;
    if (nextNode.declarations.length !== 1) break;

    const nextDeclarator = nextNode.declarations[0];
    if (!nextDeclarator) break;

    const nextBinding = directPropertyBinding(context, nextDeclarator);
    if (nextBinding?.sourceText !== firstBinding.sourceText) break;
    if (!canGroupSource(nextBinding.source) || seenProperties.has(nextBinding.propertyName)) break;

    const [, previousEnd] = context.sourceCode.getRange(previous);
    const [nextStart] = context.sourceCode.getRange(nextNode);
    const gap = context.sourceCode.text.slice(previousEnd, nextStart);
    if (!whitespaceKeepsStatementsAdjacent(gap)) break;

    group.push({ declaration: nextNode, binding: nextBinding });
    seenProperties.add(nextBinding.propertyName);
  }

  return group;
}

function declarationTerminator(context: Rule.RuleContext, declaration: VariableDeclaration): string {
  return context.sourceCode.getText(declaration).trimEnd().endsWith(";") ? ";" : "";
}

function singleMessage(binding: PropertyBinding): string {
  return `"${binding.localName}" is derived directly from "${binding.sourceText}.${binding.propertyName}". Use object destructuring. ${DOC}`;
}

function groupMessage(bindings: PropertyBinding[]): string {
  const firstBinding = bindings[0];
  if (!firstBinding) return `Use object destructuring. ${DOC}`;

  const names = bindings.map(({ localName }) => `"${localName}"`).join(", ");
  return `${names} are derived directly from properties of "${firstBinding.sourceText}". Use object destructuring. ${DOC}`;
}

export const preferObjectDestructuringRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: {
      description: "Require locals derived directly from object properties to use object destructuring.",
    },
  },
  create(context) {
    const grouped = new Set<VariableDeclaration>();

    return {
      VariableDeclaration(node) {
        if (grouped.has(node)) return;

        const bindings = node.declarations
          .map((declarator) => directPropertyBinding(context, declarator))
          .filter((binding): binding is PropertyBinding => binding !== undefined);
        if (bindings.length === 0) return;

        const firstBinding = bindings[0];
        if (!firstBinding) return;

        if (node.declarations.length === 1 && bindings.length === 1) {
          const group = groupedDeclarations(context, node, firstBinding);

          if (group.length > 1) {
            for (const item of group.slice(1)) grouped.add(item.declaration);

            const groupBindings = group.map(({ binding }) => binding);
            const lastDeclaration = group.at(-1)?.declaration;
            if (!lastDeclaration) return;

            context.report({
              node,
              message: groupMessage(groupBindings),
              fix(fixer) {
                const [start] = context.sourceCode.getRange(node);
                const [, end] = context.sourceCode.getRange(lastDeclaration);
                const terminator = declarationTerminator(context, lastDeclaration);
                const pattern = groupBindings.map(({ bindingText }) => bindingText).join(", ");

                return fixer.replaceTextRange(
                  [start, end],
                  `${node.kind} { ${pattern} } = ${firstBinding.sourceText}${terminator}`,
                );
              },
            });
            return;
          }
        }

        for (const binding of bindings) {
          context.report({
            node: binding.declarator,
            message: singleMessage(binding),
            fix(fixer) {
              return fixer.replaceText(binding.declarator, `{ ${binding.bindingText} } = ${binding.sourceText}`);
            },
          });
        }
      },
    };
  },
};
