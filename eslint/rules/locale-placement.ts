/**
 * ESLint rule: pasika/locale-placement
 *
 * Enforces flat dictionaries and consumer-based locale placement:
 * single-feature keys stay in that feature, all other keys are global.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { segmentsOf } from "../project/ccf";
import { getProjectIndex, resolveSpecifier } from "../project/index";
import { readLocaleDefinitions } from "./locale-definitions";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/locales-rule.md";

function localeAccesses(file: string): { namespace: string; key?: string }[] {
  const contents = readFileSync(file, "utf8");
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, kind);
  const accesses: { namespace: string; key?: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const receiver = node.expression;
      if (
        ts.isPropertyAccessExpression(receiver) &&
        ts.isIdentifier(receiver.expression) &&
        receiver.expression.text === "locales"
      ) {
        accesses.push({ namespace: receiver.name.text, key: node.name.text });
      } else if (
        ts.isIdentifier(receiver) &&
        receiver.text === "locales" &&
        !(ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node)
      ) {
        accesses.push({ namespace: node.name.text });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return accesses;
}

export const localePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce locale placement from consumer folders, with cross-scope strings in global.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};
    const localesFile = [...index.modules.keys()].find((candidate) => {
      const parts = segmentsOf(candidate, sourceRoot);
      return parts.length === 2 && parts[0] === "locales" && parts[1] === "index.ts";
    });
    if (!localesFile || file !== localesFile) return {};

    const { definitions, errors } = readLocaleDefinitions(localesFile);
    const findings = [...errors];
    const globalKeys = definitions.get("global")?.keys;
    const consumers = new Map<string, Set<string>>();

    for (const [candidateFile, module] of index.modules) {
      if (candidateFile === localesFile) continue;
      const candidateSegments = segmentsOf(candidateFile, sourceRoot);
      if (candidateSegments[0] !== "locales") {
        const bypassesIndex = module.imports.some((moduleImport) => {
          const resolved = resolveSpecifier(candidateFile, moduleImport.specifier, sourceRoot);
          if (!resolved) return false;
          const target = segmentsOf(resolved, sourceRoot);
          return target[0] === "locales" && target.length > 1 && target[1] !== "index.ts";
        });
        if (bypassesIndex) findings.push(`Locale dictionaries must be imported through src/locales/index.ts. ${DOC}`);
      }
      const importsLocales = module.imports.some(
        (moduleImport) => resolveSpecifier(candidateFile, moduleImport.specifier, sourceRoot) === localesFile,
      );
      if (!importsLocales) continue;

      for (const { namespace, key } of localeAccesses(candidateFile)) {
        if (key) {
          if (!definitions.get(namespace)?.keys.has(key) || namespace === "global") {
            findings.push(`Locale locales.${namespace}.${key} is not defined in a feature dictionary. ${DOC}`);
          }
        } else if (definitions.has(namespace)) {
          findings.push(`Locale access locales.${namespace} must include a feature key. ${DOC}`);
        } else if (!globalKeys?.has(namespace)) {
          findings.push(`Locale locales.${namespace} is not defined in the global dictionary. ${DOC}`);
        }
        const access = key ? `${namespace}.${key}` : `global.${namespace}`;
        const used = consumers.get(access) ?? new Set<string>();
        used.add(candidateFile);
        consumers.set(access, used);
      }
    }

    for (const [namespace, definition] of definitions) {
      const folder = namespace.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      for (const key of definition.keys) {
        const used = [...(consumers.get(`${namespace}.${key}`) ?? [])];
        if (used.length === 0) continue;
        const featureOf = (candidate: string): string | undefined => {
          const parts = segmentsOf(candidate, sourceRoot);
          return parts[0] === "features" ? parts[1] : undefined;
        };
        if (namespace === "global") {
          const features = new Set(used.map(featureOf));
          const feature = [...features][0];
          if (features.size === 1 && feature !== undefined) {
            findings.push(
              `Locale locales.${key} is consumed only by src/features/${feature}/; move it into that feature dictionary. ${DOC}`,
            );
          }
        } else if (used.some((candidate) => featureOf(candidate) !== folder)) {
          findings.push(
            `Locale locales.${namespace}.${key} is used outside src/features/${folder}/; move it into global. ${DOC}`,
          );
        }
      }
    }

    const translations = new Map<string, Set<string>>();
    for (const [namespace, definition] of definitions) {
      for (const [key, value] of definition.values) {
        const entries = translations.get(value) ?? new Set<string>();
        entries.add(`${namespace}.${key}`);
        translations.set(value, entries);
      }
    }
    for (const [value, entries] of translations) {
      const namespaces = new Set([...entries].map((entry) => entry.split(".")[0]));
      if (namespaces.size > 1) {
        findings.push(
          `Locale text ${JSON.stringify(value)} is duplicated across dictionaries (${[...entries].join(", ")}); reuse one global key. ${DOC}`,
        );
      }
    }

    if (findings.length === 0) return {};
    return {
      Program(node) {
        for (const message of findings) context.report({ node, message });
      },
    };
  },
};
