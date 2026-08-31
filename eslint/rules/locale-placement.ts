/**
 * ESLint rule: pasika/locale-placement
 *
 * Locales read by files in more than one feature folder or by src/shared/,
 * src/compositions/, src/app/, or root support folders MUST live at the top
 * level of locales. Locales read only by files in one feature folder MUST live
 * in an object with the camelCase form of its feature folder name. The rule
 * reads which keys the tree uses, because a single file cannot see them.
 *
 * @see docs/code-organization-guide/rules/locales-rule.md
 */

import path from "node:path";
import { readFileSync } from "node:fs";
import type { Rule } from "eslint";
import ts from "typescript";
import { getProjectIndex, resolveSpecifier } from "../project/index";
import { describeConsumers, segmentsOf, SUPPORT_FOLDERS } from "../project/ccf";
import { sourceRootOf } from "./project-root";

/** The first segment of a `locales.<key>` read. */
const LOCALE_ACCESS = /\blocales\.(?<key>[A-Za-z_$][\w$]*)/g;

const camelCase = (name: string): string => name.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase());

const FORCED_TOP_LEVEL = new Set(["app", "shared", "compositions", "config"]);

/** A file whose own folder decides the locale scope: app/shared/compositions/config or a root support folder. */
function forcesTopLevel(segments: string[]): boolean {
  return FORCED_TOP_LEVEL.has(segments[0] ?? "") || SUPPORT_FOLDERS.has(segments[0] ?? "");
}

interface Placement {
  kind: "top" | "nested";
  line: number;
}

/**
 * Where each top-level key of the exported `locales` object lives: directly on
 * the object ("top") or as a namespaced object ("nested").
 */
function localePlacement(text: string): Map<string, Placement> | undefined {
  const sourceFile = ts.createSourceFile("locales.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExported = (ts.getModifiers(statement) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!isExported) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "locales") continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) continue;
      const placement = new Map<string, Placement>();
      for (const property of declaration.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        let name: string | undefined;
        if (ts.isIdentifier(property.name)) name = property.name.text;
        else if (ts.isStringLiteral(property.name)) name = property.name.text;
        if (name === undefined) continue;
        const line = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1;
        placement.set(name, {
          kind: ts.isObjectLiteralExpression(property.initializer) ? "nested" : "top",
          line,
        });
      }
      return placement;
    }
  }
  return undefined;
}

export const localePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require shared locales at the top level and single-feature locales in a namespaced object.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    // The named locales object lives in src/locales/index.ts; the rule reports
    // on that file, because the fix is in the definition.
    const localesFile = [...index.modules.keys()].find((candidate) => {
      const candidateSegments = segmentsOf(candidate, sourceRoot);
      return candidateSegments.length === 2 && candidateSegments[0] === "locales" && candidateSegments[1]?.startsWith("index.");
    });
    if (!localesFile || file !== localesFile) return {};

    const placement = localePlacement(readFileSync(localesFile, "utf8"));
    if (!placement) return {};

    const keyReaders = new Map<string, Set<string>>();
    const keyFeatures = new Map<string, Set<string>>();
    const keyForcedTopLevel = new Set<string>();

    for (const [candidateFile, module] of index.modules) {
      if (candidateFile === localesFile) continue;
      const importsLocales = module.imports.some(
        (moduleImport) => resolveSpecifier(candidateFile, moduleImport.specifier, sourceRoot) === localesFile,
      );
      if (!importsLocales) continue;

      const candidateSegments = segmentsOf(candidateFile, sourceRoot);
      for (const match of readFileSync(candidateFile, "utf8").matchAll(LOCALE_ACCESS)) {
        const key = match.groups?.key;
        if (key === undefined) continue;
        const readers = keyReaders.get(key) ?? new Set<string>();
        readers.add(candidateFile);
        keyReaders.set(key, readers);

        if (candidateSegments[0] === "features" && candidateSegments.length >= 2) {
          const features = keyFeatures.get(key) ?? new Set<string>();
          features.add(candidateSegments[1] ?? "");
          keyFeatures.set(key, features);
        } else if (forcesTopLevel(candidateSegments)) {
          keyForcedTopLevel.add(key);
        }
      }
    }

    const findings: { line: number; message: string }[] = [];

    for (const [key, readers] of keyReaders) {
      const features = keyFeatures.get(key) ?? new Set<string>();
      const shared = features.size > 1 || keyForcedTopLevel.has(key);
      const current = placement.get(key);

      if (shared) {
        if (current?.kind === "nested") {
          findings.push({
            line: current.line,
            message:
              `Locale "${key}" is read by ${describeConsumers([...readers], sourceRoot)} and must live ` +
              "at the top level of locales. See docs/code-organization-guide/rules/locales-rule.md",
          });
        }
        continue;
      }

      if (features.size !== 1) continue;
      const featureName = [...features][0] ?? "";
      const expected = camelCase(featureName);

      if (current?.kind === "top") {
        findings.push({
          line: current.line,
          message:
            `Locale "${key}" is read only by the ${featureName} feature; it must live in an object ` +
            `named "${expected}". See docs/code-organization-guide/rules/locales-rule.md`,
        });
      } else if (current?.kind === "nested" && key !== expected) {
        findings.push({
          line: current.line,
          message:
            `Locale "${key}" is read only by the ${featureName} feature; it must live in an object ` +
            `named "${expected}", not "${key}". See docs/code-organization-guide/rules/locales-rule.md`,
        });
      }
    }

    if (findings.length === 0) return {};

    return {
      Program(node) {
        for (const finding of findings) {
          context.report({ node, loc: { line: finding.line, column: 0 }, message: finding.message });
        }
      },
    };
  },
};
