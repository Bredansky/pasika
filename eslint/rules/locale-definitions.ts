/**
 * Parse locale modules for the locale-placement rule. The public dictionary
 * contains named imported dictionaries, not inline strings or spreads.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface LocaleDefinition {
  namespace: string;
  file: string;
  keys: Set<string>;
}
export interface LocaleDefinitions {
  definitions: Map<string, LocaleDefinition>;
  errors: string[];
}

const camelCase = (name: string): string => name.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase());

function unwrap(expression: ts.Expression): ts.Expression {
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return unwrap(expression.expression);
  }
  return expression;
}

function exportedDictionary(source: ts.SourceFile, name: string): ts.ObjectLiteralExpression | undefined {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = (ts.getModifiers(statement) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    // TypeScript declaration-list flags are a bitmask.
    // eslint-disable-next-line no-bitwise -- TypeScript declaration-list flags use a bitmask.
    if (!exported || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    if (statement.declarationList.declarations.length !== 1) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        const value = unwrap(declaration.initializer);
        if (ts.isObjectLiteralExpression(value)) return value;
      }
    }
  }
  return undefined;
}

function propertyName(property: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(property) || ts.isStringLiteral(property)) return property.text;
  return undefined;
}

function expectedPath(localesRoot: string, namespace: string): string {
  const kebab = namespace.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return path.join(localesRoot, `${kebab}.ts`);
}

function validateDictionary(file: string, namespace: string, errors: string[]): Set<string> {
  const keys = new Set<string>();
  if (!existsSync(file)) {
    errors.push(`Missing locale dictionary for ${namespace}.`);
    return keys;
  }
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const dictionary = exportedDictionary(source, namespace);
  if (!dictionary || source.statements.length !== 1) {
    errors.push(`Locale module ${file} must contain only an exported const ${namespace} string dictionary.`);
    return keys;
  }
  for (const property of dictionary.properties) {
    if (!ts.isPropertyAssignment(property)) {
      errors.push(`Locale dictionary ${namespace} must use explicit string properties.`);
      continue;
    }
    const name = propertyName(property.name);
    const value = unwrap(property.initializer);
    if (
      !name ||
      !/^[a-z][a-zA-Z0-9]*$/.test(name) ||
      keys.has(name) ||
      (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value))
    ) {
      errors.push(`Locale dictionary ${namespace} has an invalid, duplicate, or non-string key.`);
      continue;
    }
    keys.add(name);
  }
  return keys;
}

export function readLocaleDefinitions(indexFile: string): LocaleDefinitions {
  const definitions = new Map<string, LocaleDefinition>();
  const errors: string[] = [];
  const root = path.dirname(indexFile);
  const source = ts.createSourceFile(
    indexFile,
    readFileSync(indexFile, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports = new Map<string, string>();

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const named = statement.importClause?.namedBindings;
      if (!named || !ts.isNamedImports(named)) {
        errors.push("Locale index imports must use named imports.");
        continue;
      }
      for (const element of named.elements) {
        if (element.propertyName || imports.has(element.name.text)) {
          errors.push("Locale index must import dictionaries by their original names without aliases.");
        }
        imports.set(element.name.text, statement.moduleSpecifier.text);
      }
    } else if (!ts.isVariableStatement(statement)) {
      errors.push("Locale index may contain only imports and the exported locales dictionary.");
    }
  }

  const dictionary = exportedDictionary(source, "locales");
  if (!dictionary || source.statements.filter(ts.isVariableStatement).length !== 1) {
    errors.push("Locale index must export a single const locales dictionary.");
    return { definitions, errors };
  }

  for (const property of dictionary.properties) {
    let name: string | undefined;
    let value: string | undefined;
    if (ts.isSpreadAssignment(property)) {
      if (!ts.isIdentifier(property.expression) || property.expression.text !== "global") {
        errors.push("Locale index may only spread the global dictionary.");
        continue;
      }
      name = "global";
      value = "global";
    } else if (ts.isShorthandPropertyAssignment(property)) {
      name = property.name.text;
      value = name;
    } else if (ts.isPropertyAssignment(property)) {
      name = propertyName(property.name);
      const initial = unwrap(property.initializer);
      if (ts.isIdentifier(initial)) value = initial.text;
    }

    if (!name || !value || name !== value || definitions.has(name) || !/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      errors.push("Locale index must expose feature dictionaries by name and spread only global, without aliases.");
      continue;
    }
    if (name === "global" && !ts.isSpreadAssignment(property)) {
      errors.push("Locale index must spread global keys into the top level.");
      continue;
    }
    if (name !== "global") {
      const folder = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      if (!existsSync(path.join(root, "..", "features", folder))) {
        errors.push(`Locale namespace ${name} must belong to a feature at src/features/${folder}/.`);
        continue;
      }
    }
    const expected = expectedPath(root, name);
    const actualImport = imports.get(name);
    if (!actualImport || path.resolve(root, actualImport + (path.extname(actualImport) ? "" : ".ts")) !== expected) {
      errors.push(`Locale namespace ${name} must import its dictionary from ${path.relative(root, expected)}.`);
      continue;
    }
    definitions.set(name, { namespace: name, file: expected, keys: validateDictionary(expected, name, errors) });
  }

  for (const imported of imports.keys()) {
    if (!definitions.has(imported)) {
      errors.push(`Imported locale dictionary ${imported} is not exposed in locales.`);
    }
  }

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      errors.push(
        `Locale dictionaries must live directly in src/locales/; nested folder ${entry.name} is not allowed.`,
      );
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      entry.name !== "index.ts" &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      const name = camelCase(entry.name.slice(0, -3));
      if (!definitions.has(name) && !imports.has(name)) {
        errors.push(`Locale module ${entry.name} is not exposed in locales.`);
      }
    }
  }

  const global = definitions.get("global");
  if (global) {
    for (const key of global.keys) {
      if (definitions.has(key)) {
        errors.push(`Global locale key ${key} conflicts with a feature namespace.`);
      }
    }
  }
  return { definitions, errors };
}
