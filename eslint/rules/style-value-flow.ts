/**
 * Resolve class-producing values from typed styling sinks. Follow declarations,
 * object projections and local return values, never predicates or selector keys.
 */
import type { Rule } from "eslint";
import ts from "typescript";
import { typedParserServices } from "./contract-ownership";
import { reactCreateElementClassValues } from "./react-create-element";

type Key = string | undefined;
type Bindings = ReadonlyMap<ts.Symbol, ts.Expression>;
type SinkKind = "style" | "variant";

interface ClassValue {
  text: string;
  stored: boolean;
  node: ts.Node;
  indirect: boolean;
  lookup: boolean;
}

interface StyleFlow {
  sink: ts.Node;
  kind: SinkKind;
  values: ClassValue[];
}

const classHelpers = new Set(["cn", "clsx", "twMerge", "twJoin"]);

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function isProjectDeclaration(node: ts.Node): boolean {
  const source = node.getSourceFile();
  return !source.isDeclarationFile && !source.fileName.replaceAll("\\", "/").includes("/node_modules/");
}

function isValueAssignment(node: ts.Node): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) &&
    [
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken,
      ts.SyntaxKind.BarBarEqualsToken,
      ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      ts.SyntaxKind.QuestionQuestionEqualsToken,
    ].includes(node.operatorToken.kind) &&
    ts.isIdentifier(node.left)
  );
}

function executionScope(node: ts.Node): ts.Node {
  let current = node.parent;
  while (!ts.isFunctionLike(current) && !ts.isSourceFile(current)) current = current.parent;
  return current;
}

/** A plain assignment in a containing statement list replaces earlier candidates. */
function replacesEarlierValues(write: ts.BinaryExpression, read: ts.Identifier): boolean {
  if (
    write.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !ts.isExpressionStatement(write.parent) ||
    executionScope(write) !== executionScope(read)
  ) {
    return false;
  }
  const block = write.parent.parent;
  if (!ts.isBlock(block) && !ts.isSourceFile(block)) return false;
  let current: ts.Node = read;
  while (!ts.isSourceFile(current)) {
    if (current.parent === block) return write.parent.end <= current.getStart();
    current = current.parent;
  }
  return false;
}

/** A class literal stored outside a composition call is a standalone alias. */
function isStoredClass(node: ts.Node): boolean {
  let current = node;
  while (!ts.isSourceFile(current)) {
    const parent = current.parent;
    if (ts.isVariableDeclaration(parent)) {
      return parent.initializer === current && ts.isVariableDeclarationList(parent.parent);
    }
    if (isValueAssignment(parent)) return parent.right === current;
    if (ts.isEnumMember(parent)) return parent.initializer === current;
    if (
      ts.isCallExpression(parent) ||
      ts.isFunctionLike(parent) ||
      ts.isJsxAttribute(parent) ||
      ts.isStatement(parent)
    ) {
      return false;
    }
    current = parent;
  }
  return false;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let node = expression;
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    node = node.expression;
  }
  return node;
}

export function inspectStyleValueFlows(context: Rule.RuleContext, report: (flow: StyleFlow) => void): void {
  const services = typedParserServices(context.sourceCode.parserServices);
  if (!services) return;
  const source = services.esTreeNodeToTSNodeMap.get(context.sourceCode.ast);
  if (!source || !ts.isSourceFile(source)) return;
  const checker = services.program.getTypeChecker();

  function symbolAt(node: ts.Node): ts.Symbol | undefined {
    const symbol = checker.getSymbolAtLocation(node);
    return symbol?.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  }

  // Index once per source, by symbol identity rather than variable names.
  // This is a bounded candidate-write analysis, not a control-flow interpreter.
  const assignmentCache = new Map<ts.SourceFile, Map<ts.Symbol, ts.BinaryExpression[]>>();

  function assignmentsFor(
    declaration: ts.VariableDeclaration,
    symbol: ts.Symbol,
    read: ts.Identifier,
  ): ts.BinaryExpression[] {
    const file = declaration.getSourceFile();
    let index = assignmentCache.get(file);
    if (!index) {
      const entries = new Map<ts.Symbol, ts.BinaryExpression[]>();
      function collect(node: ts.Node): void {
        if (isValueAssignment(node)) {
          const target = symbolAt(node.left);
          if (target) {
            const writes = entries.get(target) ?? [];
            writes.push(node);
            entries.set(target, writes);
          }
        }
        ts.forEachChild(node, collect);
      }
      collect(file);
      index = entries;
      assignmentCache.set(file, index);
    }
    const readScope = executionScope(read);
    const declarationScope = executionScope(declaration);
    return (index.get(symbol) ?? []).filter((write) => {
      const scope = executionScope(write);
      return (
        (scope === readScope || scope === declarationScope) &&
        (file !== read.getSourceFile() || write.end <= read.getStart())
      );
    });
  }

  function helperName(node: ts.Expression): string | undefined {
    if (!ts.isIdentifier(node) && !ts.isPropertyAccessExpression(node)) return undefined;
    const target = ts.isIdentifier(node) ? node : node.name;
    const symbol = checker.getSymbolAtLocation(target);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isImportSpecifier(declaration)) {
        const statement = declaration.parent.parent.parent;
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          const imported = declaration.propertyName?.text ?? declaration.name.text;
          const module = statement.moduleSpecifier.text;
          if (module === "class-variance-authority" && imported === "cva") return imported;
          if (["pasika/cn", "clsx", "tailwind-merge"].includes(module) && classHelpers.has(imported)) return imported;
        }
      }
      if (ts.isImportClause(declaration) && ts.isStringLiteral(declaration.parent.moduleSpecifier)) {
        if (declaration.parent.moduleSpecifier.text === "clsx") return "clsx";
      }
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const namespace = checker.getSymbolAtLocation(node.expression);
      for (const declaration of namespace?.declarations ?? []) {
        if (!ts.isNamespaceImport(declaration)) continue;
        const statement = declaration.parent.parent;
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        if (statement.moduleSpecifier.text === "class-variance-authority" && node.name.text === "cva") return "cva";
        if (
          ["clsx", "tailwind-merge", "pasika/cn"].includes(statement.moduleSpecifier.text) &&
          classHelpers.has(node.name.text)
        ) {
          return node.name.text;
        }
      }
    }
    // Preserve the established direct helper convention for unbound fixture/JS names.
    if (!symbol && ts.isIdentifier(node) && (classHelpers.has(node.text) || node.text === "cva")) return node.text;
    return undefined;
  }

  function keyOf(expression: ts.Expression): Key {
    const node = unwrap(expression);
    if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
    const type = checker.getTypeAtLocation(node);
    if (type.isStringLiteral() || type.isNumberLiteral()) return String(type.value);
    return undefined;
  }

  function trace(sink: ts.Expression, kind: SinkKind): void {
    const values: ClassValue[] = [];
    const active = new Set<ts.Node>();
    let budget = 1200;

    function walk(
      expression: ts.Expression,
      path: readonly Key[],
      bindings: Bindings,
      indirect: boolean,
      lookup: boolean,
    ): void {
      if (--budget < 0) return;
      const node = unwrap(expression);
      if (active.has(node)) return;
      active.add(node);
      try {
        if (ts.isStringLiteralLike(node)) {
          if (!path.length) values.push({ text: node.text, node, indirect, lookup, stored: isStoredClass(node) });
          return;
        }
        if (ts.isIdentifier(node)) {
          const symbol = ts.isShorthandPropertyAssignment(node.parent)
            ? checker.getShorthandAssignmentValueSymbol(node.parent)
            : symbolAt(node);
          if (!symbol) return;
          const argument = bindings.get(symbol);
          if (argument) {
            walk(argument, path, bindings, true, lookup);
            return;
          }
          for (const declaration of symbol.declarations ?? []) {
            if (!isProjectDeclaration(declaration)) continue;
            if (ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent)) {
              const start = values.length;
              const writes =
                declaration.parent.flags === ts.NodeFlags.Const ? [] : assignmentsFor(declaration, symbol, node);
              let replacement = -1;
              for (const [index, write] of writes.entries()) {
                if (replacesEarlierValues(write, node)) replacement = index;
              }
              if (replacement < 0 && declaration.initializer) {
                walk(declaration.initializer, path, bindings, true, lookup);
              }
              if (writes.length) {
                for (const write of writes.slice(Math.max(0, replacement))) {
                  walk(write.right, path, bindings, true, lookup);
                }
                const choices = values.slice(start).filter((value) => value.stored && value.text.trim());
                const distinct = new Set(choices.map((value) => value.text));
                if (
                  distinct.size > 1 &&
                  writes.some((write) => write.operatorToken.kind !== ts.SyntaxKind.PlusEqualsToken)
                ) {
                  for (const value of choices) value.lookup = true;
                }
              }
            }
            if (ts.isEnumMember(declaration) && declaration.initializer) {
              walk(declaration.initializer, path, bindings, true, lookup);
            }
          }
          return;
        }
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
          const member = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression;
          const symbol = ts.isPropertyAccessExpression(node) ? symbolAt(member) : undefined;
          const enumMember = symbol?.declarations?.find(ts.isEnumMember);
          if (enumMember?.initializer && isProjectDeclaration(enumMember)) {
            walk(enumMember.initializer, path, bindings, true, lookup);
            return;
          }
          const parameter = ts.isIdentifier(member) ? symbolAt(member) : undefined;
          const argument = parameter ? bindings.get(parameter) : undefined;
          const key = ts.isPropertyAccessExpression(node) ? node.name.text : keyOf(argument ?? member);
          const receiverType = checker.getTypeAtLocation(node.expression);
          const indexedMap =
            ts.isElementAccessExpression(node) &&
            !checker.isArrayType(receiverType) &&
            !checker.isTupleType(receiverType);
          walk(node.expression, [key, ...path], bindings, true, lookup || indexedMap || key === undefined);
          return;
        }
        if (ts.isObjectLiteralExpression(node)) {
          if (!path.length) {
            // cn/clsx objects contain class names as keys, not selector values.
            for (const property of node.properties) {
              if (!ts.isPropertyAssignment(property)) continue;
              if (ts.isComputedPropertyName(property.name)) {
                walk(property.name.expression, [], bindings, indirect, lookup);
              } else {
                const text = propertyName(property.name);
                if (text !== undefined) {
                  values.push({ text, node: property.name, indirect, lookup, stored: isStoredClass(property.name) });
                }
              }
            }
            return;
          }
          const [key, ...rest] = path;
          for (const property of node.properties) {
            if (ts.isSpreadAssignment(property)) {
              walk(property.expression, path, bindings, true, lookup);
              continue;
            }
            if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
            const name = ts.isComputedPropertyName(property.name)
              ? keyOf(property.name.expression)
              : propertyName(property.name);
            if (key !== undefined && name !== undefined && name !== key) continue;
            if (ts.isPropertyAssignment(property)) walk(property.initializer, rest, bindings, true, lookup);
            else {
              const valueSymbol = checker.getShorthandAssignmentValueSymbol(property);
              for (const declaration of valueSymbol?.declarations ?? []) {
                if (
                  ts.isVariableDeclaration(declaration) &&
                  declaration.initializer &&
                  isProjectDeclaration(declaration)
                ) {
                  walk(declaration.initializer, rest, bindings, true, lookup);
                }
              }
            }
          }
          return;
        }
        if (ts.isSpreadElement(node)) {
          walk(node.expression, path, bindings, indirect, lookup);
          return;
        }
        if (ts.isArrayLiteralExpression(node)) {
          const [key, ...rest] = path;
          for (const [index, element] of node.elements.entries()) {
            if (ts.isOmittedExpression(element)) continue;
            if (path.length && key !== undefined && key !== String(index)) continue;
            walk(
              ts.isSpreadElement(element) ? element.expression : element,
              path.length ? rest : [],
              bindings,
              indirect,
              lookup,
            );
          }
          return;
        }
        if (ts.isConditionalExpression(node)) {
          const start = values.length;
          walk(node.whenTrue, path, bindings, indirect, lookup);
          const middle = values.length;
          walk(node.whenFalse, path, bindings, indirect, lookup);
          const left = values.slice(start, middle).filter((value) => value.text.trim());
          const right = values.slice(middle).filter((value) => value.text.trim());
          if (indirect && left.some((a) => right.some((b) => a.text !== b.text))) {
            for (const value of [...left, ...right]) value.lookup = true;
          }
          return;
        }
        if (ts.isBinaryExpression(node)) {
          const operator = node.operatorToken.kind;
          if (
            operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.QuestionQuestionToken ||
            operator === ts.SyntaxKind.PlusToken
          ) {
            walk(node.left, path, bindings, indirect, lookup);
          }
          if (
            [
              ts.SyntaxKind.BarBarToken,
              ts.SyntaxKind.QuestionQuestionToken,
              ts.SyntaxKind.AmpersandAmpersandToken,
              ts.SyntaxKind.PlusToken,
            ].includes(operator)
          ) {
            walk(node.right, path, bindings, indirect, lookup);
          }
          return;
        }
        if (ts.isTemplateExpression(node)) {
          for (const span of node.templateSpans) walk(span.expression, path, bindings, indirect, lookup);
          return;
        }
        if (!ts.isCallExpression(node)) return;
        const helper = helperName(node.expression);
        if (helper === "cva") return;
        if (helper) {
          for (const argument of node.arguments) walk(argument, path, bindings, indirect, lookup);
          return;
        }
        if (
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "join" &&
          checker.isArrayType(checker.getTypeAtLocation(node.expression.expression))
        ) {
          walk(node.expression.expression, path, bindings, true, lookup);
          return;
        }
        const declaration = checker.getResolvedSignature(node)?.declaration;
        if (
          !declaration ||
          !isProjectDeclaration(declaration) ||
          !ts.isFunctionLike(declaration) ||
          !("body" in declaration) ||
          !declaration.body
        ) {
          return;
        }
        const next = new Map(bindings);
        for (const [index, parameter] of declaration.parameters.entries()) {
          if (!ts.isIdentifier(parameter.name)) continue;
          const symbol = symbolAt(parameter.name);
          const argument = node.arguments[index] ?? parameter.initializer;
          if (symbol && argument) next.set(symbol, argument);
        }
        const body = declaration.body;
        if (!ts.isBlock(body)) {
          walk(body, path, next, true, lookup);
          return;
        }
        function returns(child: ts.Node): void {
          if (ts.isReturnStatement(child) && child.expression) walk(child.expression, path, next, true, lookup);
          else if (!ts.isFunctionLike(child)) ts.forEachChild(child, returns);
        }
        ts.forEachChild(body, returns);
      } finally {
        active.delete(node);
      }
    }

    walk(sink, [], new Map(), false, false);
    if (values.some((value) => value.indirect)) report({ sink, kind, values });
  }

  function cvaOptions(options: ts.Expression): void {
    if (!ts.isObjectLiteralExpression(options)) return;
    for (const entry of options.properties) {
      if (!ts.isPropertyAssignment(entry)) continue;
      const name = propertyName(entry.name);
      if (name === "variants" && ts.isObjectLiteralExpression(entry.initializer)) {
        for (const variant of entry.initializer.properties) {
          if (!ts.isPropertyAssignment(variant) || !ts.isObjectLiteralExpression(variant.initializer)) continue;
          for (const choice of variant.initializer.properties) {
            if (ts.isPropertyAssignment(choice)) trace(choice.initializer, "variant");
            else if (ts.isShorthandPropertyAssignment(choice)) trace(choice.name, "variant");
          }
        }
      }
      if (name === "compoundVariants" && ts.isArrayLiteralExpression(entry.initializer)) {
        for (const compound of entry.initializer.elements) {
          if (!ts.isObjectLiteralExpression(compound)) continue;
          for (const property of compound.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              ["class", "className"].includes(propertyName(property.name) ?? "")
            ) {
              trace(property.initializer, "variant");
            }
          }
        }
      }
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      ["className", "class"].includes(node.name.text) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      const expression = unwrap(node.initializer.expression);
      // A recognized composition's arguments are visited individually below.
      if (!ts.isCallExpression(expression) || !helperName(expression.expression)) trace(expression, "style");
    }
    if (ts.isCallExpression(node)) {
      for (const value of reactCreateElementClassValues(context, node)) {
        const expression = unwrap(value);
        if (!ts.isCallExpression(expression) || !helperName(expression.expression)) trace(expression, "style");
      }
      const helper = helperName(node.expression);
      if (helper === "cva") {
        if (node.arguments[0]) trace(node.arguments[0], "style");
        if (node.arguments[1]) cvaOptions(node.arguments[1]);
      } else if (helper) {
        for (const argument of node.arguments) trace(argument, "style");
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

export function reportStyleFlow(context: Rule.RuleContext, node: ts.Node, message: string): void {
  const position = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
  context.report({
    node: context.sourceCode.ast,
    loc: { line: position.line + 1, column: position.character },
    message,
  });
}
