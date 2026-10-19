/**
 * ESLint rule: pasika/locale-placement
 *
 * Enforces imported shared/compositions/feature dictionaries, namespace
 * ownership, and one public locales entry point.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { describeConsumers, segmentsOf, SUPPORT_FOLDERS } from "../project/ccf";
import { getProjectIndex, resolveSpecifier } from "../project/index";
import { readLocaleDefinitions } from "./locale-definitions";
import { sourceRootOf } from "./project-root";

const LOCALE_ACCESS = /\blocales\.(?<namespace>[A-Za-z_$][\w$]*)(?:\.(?<key>[A-Za-z_$][\w$]*))?/g;
const SHARED_FOLDERS = new Set(["shared", "app", "config"]);
const DOC = "See docs/next-codebase-guide/rules/locales-rule.md";

interface Reader {
  file: string;
  segments: string[];
}

function expectedNamespace(readers: Reader[]): string {
  const scopes = new Set<string>();
  for (const reader of readers) {
    const [folder, feature] = reader.segments;
    if (folder === "features" && feature) {
      scopes.add(feature.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase()));
    } else if (folder === "compositions") scopes.add("compositions");
    else if (SHARED_FOLDERS.has(folder ?? "") || SUPPORT_FOLDERS.has(folder ?? "")) scopes.add("shared");
    else scopes.add("shared");
  }
  return scopes.size === 1 ? ([...scopes][0] ?? "shared") : "shared";
}

export const localePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce imported locale dictionaries and shared, compositions, and feature namespace ownership.",
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
    const consumers = new Map<string, Reader[]>();

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
        if (!key) {
          findings.push(`Locale access locales.${namespace} must use a namespace and key. ${DOC}`);
          continue;
        }
        if (!definitions.get(namespace)?.keys.has(key)) {
          findings.push(`Locale locales.${namespace}.${key} is not defined in a registered dictionary. ${DOC}`);
          continue;
        }

        const name = `${namespace}.${key}`;
        const entries = consumers.get(name) ?? [];
        entries.push({ file: candidateFile, segments: segmentsOf(candidateFile, sourceRoot) });
        consumers.set(name, entries);
      }
    }

    for (const [name, readers] of consumers) {
      const currentNamespace = name.split(".")[0] ?? "";
      const expected = expectedNamespace(readers);
      if (currentNamespace === expected) continue;
      findings.push(
        `Locale ${name} is read by ${describeConsumers(
          readers.map((reader) => reader.file),
          sourceRoot,
        )} and must live in the ${expected} namespace. ${DOC}`,
      );
    }

    if (findings.length === 0) return {};
    return {
      Program(node) {
        for (const message of findings) context.report({ node, message });
      },
    };
  },
};
