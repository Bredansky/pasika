/**
 * ESLint rule: pasika/no-styling-class-alias
 *
 * Class-name enums and standalone string constants are documentation metadata at
 * most: styling must own its Tailwind utilities at the JSX/cn/CVA use site.
 * An enum used only for display text is intentionally allowed.
 *
 * @see docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { resolveSpecifier } from "../project/index";
import { typedParserServices } from "./contract-ownership";
import { sourceRootOf } from "./project-root";
import { inspectStyleValueFlows } from "./style-value-flow";

const DOC = "See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md";
const MESSAGE = `Do not use standalone class-name aliases to style elements; keep Tailwind classes at the JSX/cn/CVA use site or extract a component. ${DOC}`;
const STATIC_CVA_ALIAS_MESSAGE = `Do not define CVA wrappers without real variants in constants/ modules; keep static Tailwind classes with their styling owner. ${DOC}`;

interface Binding {
  kind: "enum" | "const";
  members?: Set<string>;
}

function isStaticString(expression: ts.Expression | undefined): boolean {
  if (!expression) return false;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return true;
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return isStaticString(expression.expression);
  }
  return false;
}

function isProductionFile(file: string, root: string): boolean {
  return (
    file.startsWith(root + path.sep) && /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

export const noStylingClassAliasRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Do not style JSX or cn/CVA compositions through standalone class-name aliases.",
    },
  },
  create(context) {
    const typed = typedParserServices(context.sourceCode.parserServices);
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!isProductionFile(file, root)) return {};

    const current = ts.createSourceFile(file, context.sourceCode.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const sourceCache = new Map<string, ts.SourceFile | undefined>([[file, current]]);
    const lookupCache = new Map<string, Binding | undefined>();
    const visited = new Set<string>();
    const localBindings = new Map<number, boolean>();
    if (!typed) {
      const aliases = new Set<number>();
      function collect(node: ts.Node): void {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isVariableDeclarationList(node.parent) &&
          node.parent.flags === ts.NodeFlags.Const &&
          isStaticString(node.initializer)
        ) {
          aliases.add(node.getStart(current));
        }
        ts.forEachChild(node, collect);
      }
      collect(current);
      for (const scope of context.sourceCode.scopeManager.scopes) {
        for (const reference of scope.references) {
          const definitions = reference.resolved?.defs ?? [];
          const start = reference.identifier.range?.[0];
          if (start === undefined || !definitions.some((definition) => definition.type !== "ImportBinding")) continue;
          localBindings.set(
            start,
            definitions.some(
              (definition) => definition.type === "Variable" && aliases.has(definition.node.range?.[0] ?? -1),
            ),
          );
        }
      }
    }

    // Resolve CVA by its import, not by variable or class-name prefixes.
    const cvaImports = new Set<string>();
    const cvaNamespaces = new Set<string>();
    for (const statement of current.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "class-variance-authority"
      ) {
        continue;
      }
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if (!binding.isTypeOnly && (binding.propertyName?.text ?? binding.name.text) === "cva") {
            cvaImports.add(binding.name.text);
          }
        }
      }
      if (bindings && ts.isNamespaceImport(bindings)) cvaNamespaces.add(bindings.name.text);
    }
    const isConstantsModule = path.relative(root, file).split(path.sep).includes("constants");

    function loadSource(target: string): ts.SourceFile | undefined {
      if (sourceCache.has(target)) return sourceCache.get(target);
      let parsed: ts.SourceFile | undefined;
      try {
        parsed = ts.createSourceFile(
          target,
          readFileSync(target, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
      } catch {
        // Unresolved import: do not guess whether it is a styling alias.
      }
      sourceCache.set(target, parsed);
      return parsed;
    }

    function lookup(target: string, name: string): Binding | undefined {
      const key = `${target}\u0000${name}`;
      if (lookupCache.has(key)) return lookupCache.get(key);
      if (visited.has(key)) return undefined;
      visited.add(key);
      const source = loadSource(target);
      let found: Binding | undefined;

      for (const statement of source?.statements ?? []) {
        if (ts.isEnumDeclaration(statement) && statement.name.text === name) {
          found = {
            kind: "enum",
            members: new Set(
              statement.members
                .filter((member) => isStaticString(member.initializer))
                .map((member) => member.name.getText(source)),
            ),
          };
          break;
        }

        if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
            if (statement.declarationList.flags === ts.NodeFlags.Const && isStaticString(declaration.initializer)) {
              found = { kind: "const" };
            }
            break;
          }
        }
        if (found) break;

        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          const targetModule = resolveSpecifier(target, statement.moduleSpecifier.text, root);
          if (!targetModule) continue;
          const elements = statement.importClause?.namedBindings;
          if (!elements || !ts.isNamedImports(elements)) continue;
          for (const specifier of elements.elements) {
            if (specifier.name.text !== name || specifier.isTypeOnly) continue;
            found = lookup(targetModule, specifier.propertyName?.text ?? name);
            break;
          }
        }

        if (
          ts.isExportDeclaration(statement) &&
          statement.moduleSpecifier &&
          ts.isStringLiteral(statement.moduleSpecifier)
        ) {
          const targetModule = resolveSpecifier(target, statement.moduleSpecifier.text, root);
          if (!targetModule) continue;
          if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            for (const specifier of statement.exportClause.elements) {
              if (specifier.name.text !== name || specifier.isTypeOnly) continue;
              found = lookup(targetModule, specifier.propertyName?.text ?? name);
              break;
            }
          } else if (!statement.exportClause) {
            found = lookup(targetModule, name);
          }
        }
        if (found) break;
      }

      visited.delete(key);
      lookupCache.set(key, found);
      return found;
    }

    const reported = new Set<number>();
    function report(node: ts.Node, message = MESSAGE): void {
      const pos = node.getStart(current);
      if (reported.has(pos)) return;
      reported.add(pos);
      const location = current.getLineAndCharacterOfPosition(pos);
      context.report({
        node: context.sourceCode.ast,
        loc: { line: location.line + 1, column: location.character },
        message,
      });
    }

    /** Reject CVA used merely to export a static class set from constants/. */
    function inspectCvaAlias(statement: ts.VariableStatement): void {
      if (!isConstantsModule || statement.parent !== current) return;
      for (const declaration of statement.declarationList.declarations) {
        let initializer = declaration.initializer;
        while (
          initializer &&
          (ts.isParenthesizedExpression(initializer) ||
            ts.isAsExpression(initializer) ||
            ts.isSatisfiesExpression(initializer))
        ) {
          initializer = initializer.expression;
        }
        if (!initializer || !ts.isCallExpression(initializer)) continue;
        const callee = initializer.expression;
        const importedCva =
          (ts.isIdentifier(callee) && cvaImports.has(callee.text)) ||
          (ts.isPropertyAccessExpression(callee) &&
            callee.name.text === "cva" &&
            ts.isIdentifier(callee.expression) &&
            cvaNamespaces.has(callee.expression.text));
        if (!importedCva) continue;

        // A nonempty variants map is real CVA configuration, not a
        // static styling alias. Do not guess about externally defined options.
        const options = initializer.arguments[1];
        if (options && !ts.isObjectLiteralExpression(options)) continue;
        const hasVariants = options?.properties.some(
          (property) =>
            ts.isPropertyAssignment(property) &&
            ((ts.isIdentifier(property.name) && property.name.text === "variants") ||
              (ts.isStringLiteral(property.name) && property.name.text === "variants")) &&
            ts.isObjectLiteralExpression(property.initializer) &&
            property.initializer.properties.length > 0,
        );
        if (!hasVariants) report(declaration, STATIC_CVA_ALIAS_MESSAGE);
      }
    }

    /** CVA variant names and defaultVariants are selectors, not CSS classes. */
    function inspectCvaOptions(node: ts.Node): void {
      if (!ts.isObjectLiteralExpression(node)) return;
      for (const entry of node.properties) {
        if (!ts.isPropertyAssignment(entry) || !ts.isIdentifier(entry.name)) continue;
        if (entry.name.text === "variants" && ts.isObjectLiteralExpression(entry.initializer)) {
          for (const variant of entry.initializer.properties) {
            if (!ts.isPropertyAssignment(variant) || !ts.isObjectLiteralExpression(variant.initializer)) continue;
            for (const option of variant.initializer.properties) {
              if (ts.isPropertyAssignment(option)) inspectStyle(option.initializer);
            }
          }
        }
        if (entry.name.text === "compoundVariants" && ts.isArrayLiteralExpression(entry.initializer)) {
          for (const item of entry.initializer.elements) {
            if (!ts.isObjectLiteralExpression(item)) continue;
            for (const property of item.properties) {
              if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
              if (property.name.text === "class" || property.name.text === "className") {
                inspectStyle(property.initializer);
              }
            }
          }
        }
      }
    }

    /** Follow class-producing values, not predicates, enum keys or variant selectors. */
    function inspectStyle(expression: ts.Node): void {
      if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
        const binding = lookup(file, expression.expression.text);
        if (binding?.kind === "enum" && binding.members?.has(expression.name.text)) report(expression);
        return;
      }
      if (ts.isIdentifier(expression)) {
        if (typed) return;
        const local = localBindings.get(expression.getStart(current));
        if (local ?? lookup(file, expression.text)?.kind === "const") report(expression);
        return;
      }
      if (ts.isConditionalExpression(expression)) {
        inspectStyle(expression.whenTrue);
        inspectStyle(expression.whenFalse);
        return;
      }
      if (ts.isBinaryExpression(expression)) {
        if (expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) {
          if (
            expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ) {
            inspectStyle(expression.left);
          } else return;
        }
        inspectStyle(expression.right);
        return;
      }
      if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
        if (expression.expression.text === "cva") {
          if (expression.arguments[0]) inspectStyle(expression.arguments[0]);
          if (expression.arguments[1]) inspectCvaOptions(expression.arguments[1]);
        } else if (expression.expression.text === "cn" || expression.expression.text === "clsx") {
          for (const argument of expression.arguments) inspectStyle(argument);
        }
        return;
      }
      if (ts.isArrayLiteralExpression(expression)) {
        for (const item of expression.elements) inspectStyle(ts.isSpreadElement(item) ? item.expression : item);
        return;
      }
      if (ts.isObjectLiteralExpression(expression)) {
        // clsx object keys name CSS classes; property values are boolean conditions.
        for (const property of expression.properties) {
          if (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name)) {
            inspectStyle(property.name.expression);
          }
        }
        return;
      }
      if (
        ts.isParenthesizedExpression(expression) ||
        ts.isAsExpression(expression) ||
        ts.isSatisfiesExpression(expression) ||
        ts.isNonNullExpression(expression)
      ) {
        inspectStyle(expression.expression);
        return;
      }
      if (ts.isTemplateExpression(expression)) {
        for (const span of expression.templateSpans) inspectStyle(span.expression);
      }
    }

    function visit(node: ts.Node): void {
      if (ts.isVariableStatement(node)) inspectCvaAlias(node);
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "className") {
        if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          inspectStyle(node.initializer.expression);
        }
        return;
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["cn", "clsx", "cva"].includes(node.expression.text)
      ) {
        inspectStyle(node);
        return;
      }
      ts.forEachChild(node, visit);
    }
    return {
      Program() {
        visit(current);
        inspectStyleValueFlows(context, ({ sink, kind, values }) => {
          if (
            values.some((value) => value.lookup || (value.indirect && value.stored)) ||
            (kind === "variant" && values.some((value) => value.indirect))
          ) {
            // Parser services use a separate AST; locate the sink by its source offset.
            const pos = sink.getStart();
            if (reported.has(pos)) return;
            reported.add(pos);
            const location = current.getLineAndCharacterOfPosition(pos);
            context.report({
              node: context.sourceCode.ast,
              loc: { line: location.line + 1, column: location.character },
              message: values.some((value) => value.lookup)
                ? `Do not select styling classes through handwritten lookup tables or helper functions; define visual choices with CVA. See docs/next-tailwind-guide/rules/component-variant-rule.md`
                : MESSAGE,
            });
          }
        });
      },
    };
  },
};
