/**
 * ESLint rule: pasika/locale-placement
 *
 * Enforces flat imported locale dictionaries, globally shared leaf keys,
 * feature namespaces, and a single public locales entry point.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { segmentsOf } from "../project/ccf";
import { getProjectIndex, resolveSpecifier } from "../project/index";
import { readLocaleDefinitions } from "./locale-definitions";
import { sourceRootOf } from "./project-root";

const LOCALE_ACCESS = /\blocales\.(?<namespace>[A-Za-z_$][\w$]*)(?:\.(?<key>[A-Za-z_$][\w$]*))?/g;
const DOC = "See docs/next-codebase-guide/rules/locales-rule.md";

export const localePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce flat global locales and feature namespaces without inferring ownership from consumers.",
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

      for (const match of readFileSync(candidateFile, "utf8").matchAll(LOCALE_ACCESS)) {
        const namespace = match.groups?.namespace;
        const key = match.groups?.key;
        if (!namespace) continue;
        if (key) {
          if (!definitions.get(namespace)?.keys.has(key) || namespace === "global") {
            findings.push(`Locale locales.${namespace}.${key} is not defined in a feature dictionary. ${DOC}`);
          }
        } else if (definitions.has(namespace)) {
          findings.push(`Locale access locales.${namespace} must include a feature key. ${DOC}`);
        } else if (!globalKeys?.has(namespace)) {
          findings.push(`Locale locales.${namespace} is not defined in the global dictionary. ${DOC}`);
        }
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
