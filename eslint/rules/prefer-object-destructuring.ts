/**
 * ESLint rule: pasika/prefer-object-destructuring
 *
 * Require locals that directly read an object property to use object
 * destructuring. When one block reads multiple properties from the same
 * object, require those reads to share one destructuring declaration.
 *
 * @see docs/next-codebase-guide/rules/redundant-aliases-rule.md
 */
import type { Rule } from "eslint";
import type { Identifier, MemberExpression, Node, Property, VariableDeclaration, VariableDeclarator } from "estree";
import { contractOwnershipResolver, type ContractOwnershipResolver } from "./contract-ownership";

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

interface ScopeDestructuring {
  pattern: Node;
  propertyNames: Set<string>;
}

interface DirectMemberUsage {
  member: MemberExpression;
  propertyName: string;
}

interface ScopeObjectUsage {
  propertyNames: Set<string>;
  directMembers: DirectMemberUsage[];
  destructuring?: ScopeDestructuring;
}

interface UsageScope {
  node: Node;
  objects: Map<string, ScopeObjectUsage>;
}

function hasTypeAnnotation(identifier: Identifier): boolean {
  return "typeAnnotation" in identifier && identifier.typeAnnotation !== undefined;
}

function directPropertyBinding(context: Rule.RuleContext, declarator: VariableDeclarator): PropertyBinding | undefined {
  if (declarator.id.type !== "Identifier" || hasTypeAnnotation(declarator.id)) return undefined;
  if (declarator.init?.type !== "MemberExpression") return undefined;

  const member = declarator.init;
  if (member.computed || member.optional || member.property.type !== "Identifier") return undefined;
  if (!memberCanBecomeLocal(member)) return undefined;
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

function isGroupedUsageSource(source: Node): boolean {
  return source.type === "Identifier" || source.type === "ThisExpression";
}

function rootIdentifierName(node: Node): string | undefined {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.object.type === "Super") return undefined;
  return rootIdentifierName(node.object);
}

function isCompliantLocalName(propertyName: string): boolean {
  return !propertyName.includes("_");
}

function propertyNameOf(node: Node): string | undefined {
  if (node.type !== "Property" || node.computed) return undefined;
  if (node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "Literal" && typeof node.key.value === "string") return node.key.value;
  return undefined;
}

interface DirectMapping {
  property: Property;
  sourceMember: MemberExpression;
  targetName: string;
}

function renamedDirectMapping(context: Rule.RuleContext, member: MemberExpression): DirectMapping | undefined {
  let current: Node = member;
  const ancestors = context.sourceCode.getAncestors(member);

  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (!parent) break;

    if (parent.type === "MemberExpression" && parent.object === current) {
      current = parent;
      continue;
    }

    if (parent.type !== "Property" || parent.value !== current) return undefined;

    const targetName = propertyNameOf(parent);
    const sourceName = !current.computed && current.property.type === "Identifier" ? current.property.name : undefined;
    if (targetName === undefined || sourceName === undefined || targetName === sourceName) return undefined;

    return { property: parent, sourceMember: current, targetName };
  }

  return undefined;
}

function memberCanBecomeLocal(member: MemberExpression): boolean {
  if (rootIdentifierName(member) === "locales") return false;
  return member.property.type === "Identifier" && isCompliantLocalName(member.property.name);
}

function directMappingRequiresQualifiedAccess(
  context: Rule.RuleContext,
  ownershipResolver: ContractOwnershipResolver | undefined,
  member: MemberExpression,
): boolean {
  const mapping = renamedDirectMapping(context, member);
  if (!mapping || !ownershipResolver) return false;

  const sourceResolution = ownershipResolver.sourceMember(mapping.sourceMember);
  const targetResolution = ownershipResolver.targetProperty(mapping.property, mapping.targetName);
  return sourceResolution.kind === "data-contract" || targetResolution.kind === "data-contract";
}

function memberCanBeDestructured(
  context: Rule.RuleContext,
  ownershipResolver: ContractOwnershipResolver | undefined,
  member: MemberExpression,
): boolean {
  return memberCanBecomeLocal(member) && !directMappingRequiresQualifiedAccess(context, ownershipResolver, member);
}

function objectUsage(scope: UsageScope, sourceText: string): ScopeObjectUsage {
  let usage = scope.objects.get(sourceText);
  if (!usage) {
    usage = { propertyNames: new Set(), directMembers: [] };
    scope.objects.set(sourceText, usage);
  }
  return usage;
}

function memberIsRead(context: Rule.RuleContext, member: MemberExpression): boolean {
  const parent = context.sourceCode.getAncestors(member).at(-1);
  if (!parent) return true;

  if (parent.type === "AssignmentExpression" && parent.left === member) return false;
  if (parent.type === "UpdateExpression" && parent.argument === member) return false;
  if (parent.type === "UnaryExpression" && parent.operator === "delete" && parent.argument === member) return false;
  if ((parent.type === "ForInStatement" || parent.type === "ForOfStatement") && parent.left === member) return false;
  if ((parent.type === "CallExpression" || parent.type === "NewExpression") && parent.callee === member) return false;
  if (parent.type === "TaggedTemplateExpression" && parent.tag === member) return false;

  return true;
}

function memberIsDirectVariableInitializer(context: Rule.RuleContext, member: MemberExpression): boolean {
  const parent = context.sourceCode.getAncestors(member).at(-1);
  return parent?.type === "VariableDeclarator" && parent.init === member;
}

function recordMemberUsage(
  context: Rule.RuleContext,
  scope: UsageScope | undefined,
  ownershipResolver: ContractOwnershipResolver | undefined,
  member: MemberExpression,
): void {
  if (!scope || member.computed || member.optional || member.property.type !== "Identifier") return;
  if (!memberCanBeDestructured(context, ownershipResolver, member)) return;
  if (!isGroupedUsageSource(member.object) || !memberIsRead(context, member)) return;

  const sourceText = context.sourceCode.getText(member.object);
  const usage = objectUsage(scope, sourceText);
  const propertyName = member.property.name;
  usage.propertyNames.add(propertyName);

  if (!memberIsDirectVariableInitializer(context, member)) {
    usage.directMembers.push({ member, propertyName });
  }
}

function recordDestructuringUsage(
  context: Rule.RuleContext,
  scope: UsageScope | undefined,
  declaration: VariableDeclaration,
): void {
  if (!scope) return;

  for (const declarator of declaration.declarations) {
    if (declarator.id.type !== "ObjectPattern" || !declarator.init || !isGroupedUsageSource(declarator.init)) continue;
    if (rootIdentifierName(declarator.init) === "locales") continue;

    const sourceText = context.sourceCode.getText(declarator.init);
    const usage = objectUsage(scope, sourceText);
    if (usage.directMembers.length > 0) continue;

    const propertyNames = new Set<string>();

    for (const property of declarator.id.properties) {
      if (property.type !== "Property" || property.computed || property.key.type !== "Identifier") continue;
      if (!isCompliantLocalName(property.key.name)) continue;
      propertyNames.add(property.key.name);
      usage.propertyNames.add(property.key.name);
    }

    usage.destructuring ??= { pattern: declarator.id, propertyNames };
  }
}

function scopeUsageMessage(sourceText: string, propertyNames: Set<string>): string {
  const names = [...propertyNames].map((name) => `"${name}"`).join(", ");
  return `${names} are read from "${sourceText}" in the same block. Destructure them together in one declaration. ${DOC}`;
}

function hasBinding(context: Rule.RuleContext, node: Node, name: string): boolean {
  const initialScope = context.sourceCode.getScope(node);
  if (initialScope.variables.some((variable) => variable.name === name)) return true;

  const descendantHasBinding = (scope: typeof initialScope): boolean =>
    scope.childScopes.some(
      (childScope) =>
        childScope.variables.some((variable) => variable.name === name) || descendantHasBinding(childScope),
    );

  if (descendantHasBinding(initialScope)) return true;

  for (let scope = initialScope.upper; scope !== null; scope = scope.upper) {
    if (scope.variables.some((variable) => variable.name === name)) return true;
  }
  return false;
}

function containingStatement(context: Rule.RuleContext, scopeNode: Node, node: Node): Node | undefined {
  if (scopeNode.type !== "Program" && scopeNode.type !== "BlockStatement") return undefined;

  const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);
  return scopeNode.body.find((statement) => {
    const [statementStart, statementEnd] = context.sourceCode.getRange(statement);
    return statementStart <= nodeStart && statementEnd >= nodeEnd;
  });
}

function statementIndentation(context: Rule.RuleContext, statement: Node): string {
  const [start] = context.sourceCode.getRange(statement);
  const lineStart = context.sourceCode.text.lastIndexOf("\n", start - 1) + 1;
  return context.sourceCode.text.slice(lineStart, start);
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
  if (rootIdentifierName(declarator.init) === "locales") return undefined;
  if (context.sourceCode.getCommentsInside(declarator).length > 0) return undefined;

  const bindingTexts: string[] = [];
  const localNames: string[] = [];
  const propertyNames: string[] = [];

  for (const property of declarator.id.properties) {
    if (
      property.type !== "Property" ||
      property.computed ||
      property.key.type !== "Identifier" ||
      !isCompliantLocalName(property.key.name) ||
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
      description: "Require related object-property reads to use one object destructuring declaration.",
    },
  },
  create(context) {
    const ownershipResolver = contractOwnershipResolver(context);
    const grouped = new Set<VariableDeclaration>();
    const usageScopes: (UsageScope | undefined)[] = [];

    const currentUsageScope = (): UsageScope | undefined => usageScopes.at(-1);

    const enterUsageScope = (node: Node): void => {
      usageScopes.push({ node, objects: new Map() });
    };

    const enterUsageBarrier = (): void => {
      usageScopes.push(undefined);
    };

    const exitUsageScope = (): void => {
      const scope = usageScopes.pop();
      if (!scope) return;

      for (const [sourceText, usage] of scope.objects) {
        if (usage.propertyNames.size < 2 || usage.directMembers.length === 0) continue;

        const firstDirectUsage = usage.directMembers[0];
        if (!firstDirectUsage) continue;
        const { member: firstDirectMember } = firstDirectUsage;
        const propertyNames = [...usage.propertyNames];
        const missingPropertyNames = propertyNames.filter(
          (propertyName) => !usage.destructuring?.propertyNames.has(propertyName),
        );
        if (missingPropertyNames.some((propertyName) => hasBinding(context, firstDirectMember, propertyName))) {
          continue;
        }

        context.report({
          node: firstDirectMember,
          message: scopeUsageMessage(sourceText, usage.propertyNames),
          fix(fixer) {
            const memberFixes = usage.directMembers.map(({ member, propertyName }) =>
              fixer.replaceText(member, propertyName),
            );

            if (usage.destructuring) {
              if (missingPropertyNames.length === 0) return memberFixes;

              const patternText = context.sourceCode.getText(usage.destructuring.pattern);
              const closeIndex = patternText.lastIndexOf("}");
              const beforeClose = patternText.slice(0, closeIndex);
              const contentEnd = beforeClose.trimEnd().length;
              const trailingWhitespace = beforeClose.slice(contentEnd);
              const separator = usage.destructuring.propertyNames.size > 0 ? ", " : "";
              const replacement = `${beforeClose.slice(0, contentEnd)}${separator}${missingPropertyNames.join(", ")}${trailingWhitespace}${patternText.slice(closeIndex)}`;
              return [fixer.replaceText(usage.destructuring.pattern, replacement), ...memberFixes];
            }

            const statement = containingStatement(context, scope.node, firstDirectMember);
            if (!statement) return null;

            const indentation = statementIndentation(context, statement);
            const declaration = `const { ${propertyNames.join(", ")} } = ${sourceText};\n${indentation}`;
            return [fixer.insertTextBefore(statement, declaration), ...memberFixes];
          },
        });
      }
    };

    return {
      Program: enterUsageScope,
      "Program:exit": exitUsageScope,
      BlockStatement: enterUsageScope,
      "BlockStatement:exit": exitUsageScope,
      FunctionDeclaration: enterUsageBarrier,
      "FunctionDeclaration:exit": exitUsageScope,
      FunctionExpression: enterUsageBarrier,
      "FunctionExpression:exit": exitUsageScope,
      ArrowFunctionExpression: enterUsageBarrier,
      "ArrowFunctionExpression:exit": exitUsageScope,
      MemberExpression(node) {
        recordMemberUsage(context, currentUsageScope(), ownershipResolver, node);
      },
      VariableDeclaration(node) {
        recordDestructuringUsage(context, currentUsageScope(), node);
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
