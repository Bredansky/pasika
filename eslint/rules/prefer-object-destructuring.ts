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

interface DestructuringSelection {
  declaration: VariableDeclaration;
  source: Node;
  sourceText: string;
  bindingTexts: string[];
  localNames: string[];
  propertyNames: string[];
}

function hasTypeAnnotation(identifier: Identifier): boolean {
  return "typeAnnotation" in identifier && identifier.typeAnnotation !== undefined;
}

function directPropertyBinding(context: Rule.RuleContext, declarator: VariableDeclarator): PropertyBinding | undefined {
  if (declarator.id.type !== "Identifier" || hasTypeAnnotation(declarator.id)) return undefined;
  if (declarator.init?.type !== "MemberExpression") return undefined;

  const member = declarator.init;
  if (member.computed || member.optional || member.property.type !== "Identifier") return undefined;
  if (context.sourceCode.getCommentsInside(declarator).length > 0) return undefined;

  const propertyName = member.property.name;
  const localName = declarator.id.name;
  if (propertyName !== localName) return undefined;

  const source = member.object;
  const sourceText = context.sourceCode.getText(source);

  return {
    declarator,
    member,
    propertyName,
    localName,
    source,
    sourceText,
    bindingText: propertyName,
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
  if (declaration.declarations.length !== 1) {
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
    if (seenProperties.has(nextBinding.propertyName)) break;

    const [, previousEnd] = context.sourceCode.getRange(previous);
    const [nextStart] = context.sourceCode.getRange(nextNode);
    const gap = context.sourceCode.text.slice(previousEnd, nextStart);
    if (!whitespaceKeepsStatementsAdjacent(gap)) break;

    group.push({ declaration: nextNode, binding: nextBinding });
    seenProperties.add(nextBinding.propertyName);
  }

  return group;
}

function destructuringSelection(
  context: Rule.RuleContext,
  declaration: VariableDeclaration,
): DestructuringSelection | undefined {
  if (declaration.declarations.length !== 1) return undefined;

  const declarator = declaration.declarations[0];
  if (declarator?.id.type !== "ObjectPattern" || !declarator.init) return undefined;
  if (context.sourceCode.getCommentsInside(declarator).length > 0) return undefined;

  const bindingTexts: string[] = [];
  const localNames: string[] = [];
  const propertyNames: string[] = [];

  for (const property of declarator.id.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.key.type !== "Identifier" ||
      property.value.type !== "Identifier" ||
      property.key.name !== property.value.name
    ) {
      return undefined;
    }

    bindingTexts.push(context.sourceCode.getText(property));
    localNames.push(property.value.name);
    propertyNames.push(property.key.name);
  }

  if (bindingTexts.length === 0) return undefined;

  return {
    declaration,
    source: declarator.init,
    sourceText: context.sourceCode.getText(declarator.init),
    bindingTexts,
    localNames,
    propertyNames,
  };
}

function groupedDestructuringSelections(
  context: Rule.RuleContext,
  first: DestructuringSelection,
): DestructuringSelection[] {
  const parent = context.sourceCode.getAncestors(first.declaration).at(-1);
  if (parent?.type !== "Program" && parent?.type !== "BlockStatement") return [first];

  const body = parent.body;
  const startIndex = body.indexOf(first.declaration);
  if (startIndex < 0) return [first];

  const group = [first];
  const seenProperties = new Set(first.propertyNames);

  for (let index = startIndex + 1; index < body.length; index += 1) {
    const nextNode = body[index];
    const previous = group.at(-1)?.declaration;
    if (!previous || nextNode?.type !== "VariableDeclaration" || nextNode.kind !== first.declaration.kind) break;

    const next = destructuringSelection(context, nextNode);
    if (next?.sourceText !== first.sourceText) break;
    if (next.propertyNames.some((propertyName) => seenProperties.has(propertyName))) break;

    const [, previousEnd] = context.sourceCode.getRange(previous);
    const [nextStart] = context.sourceCode.getRange(nextNode);
    const gap = context.sourceCode.text.slice(previousEnd, nextStart);
    if (!whitespaceKeepsStatementsAdjacent(gap)) break;

    group.push(next);
    for (const propertyName of next.propertyNames) seenProperties.add(propertyName);
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
  if (!firstBinding) return `Use one object destructuring declaration. ${DOC}`;

  const names = bindings.map(({ localName }) => `"${localName}"`).join(", ");
  return `${names} are derived directly from properties of "${firstBinding.sourceText}". Use one object destructuring declaration. ${DOC}`;
}

function repeatedDestructuringMessage(group: DestructuringSelection[]): string {
  const first = group[0];
  if (!first) return `Combine repeated destructuring into one declaration. ${DOC}`;

  const names = group
    .flatMap(({ localNames }) => localNames)
    .map((name) => `"${name}"`)
    .join(", ");
  return `${names} destructure the same source "${first.sourceText}" repeatedly. Combine them into one object destructuring declaration. ${DOC}`;
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

        const selection = destructuringSelection(context, node);
        if (selection) {
          const group = groupedDestructuringSelections(context, selection);
          if (group.length <= 1) return;

          for (const item of group.slice(1)) grouped.add(item.declaration);

          const lastDeclaration = group.at(-1)?.declaration;
          if (!lastDeclaration) return;

          context.report({
            node,
            message: repeatedDestructuringMessage(group),
            fix(fixer) {
              if (!canGroupSource(selection.source)) return null;

              const [start] = context.sourceCode.getRange(node);
              const [, end] = context.sourceCode.getRange(lastDeclaration);
              const terminator = declarationTerminator(context, lastDeclaration);
              const pattern = group.flatMap(({ bindingTexts }) => bindingTexts).join(", ");

              return fixer.replaceTextRange(
                [start, end],
                `${node.kind} { ${pattern} } = ${selection.sourceText}${terminator}`,
              );
            },
          });
          return;
        }

        const bindings = node.declarations
          .map((declarator) => directPropertyBinding(context, declarator))
          .filter((binding): binding is PropertyBinding => binding !== undefined);
        if (bindings.length === 0) return;

        const firstBinding = bindings[0];
        if (!firstBinding) return;

        const sameSourceBindings =
          bindings.length > 1 &&
          bindings.length === node.declarations.length &&
          bindings.every(({ sourceText }) => sourceText === firstBinding.sourceText) &&
          new Set(bindings.map(({ propertyName }) => propertyName)).size === bindings.length;

        if (sameSourceBindings) {
          context.report({
            node,
            message: groupMessage(bindings),
            fix(fixer) {
              if (!canGroupSource(firstBinding.source) || context.sourceCode.getCommentsInside(node).length > 0) {
                return null;
              }

              const terminator = declarationTerminator(context, node);
              const pattern = bindings.map(({ bindingText }) => bindingText).join(", ");
              return fixer.replaceText(node, `${node.kind} { ${pattern} } = ${firstBinding.sourceText}${terminator}`);
            },
          });
          return;
        }

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
                if (!canGroupSource(firstBinding.source)) return null;

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
          if (!canGroupSource(binding.source)) continue;

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
