/**
 * ESLint rule: pasika/repeated-semantic-literal
 *
 * Index meaningful string and numeric literals across production modules.
 * Reuse unique canonical definitions even when not imported, otherwise suggest
 * local or shared extraction only for high-confidence repeated semantic roles.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import {
  featureOf,
  getSemanticLiteralIndex,
  isProductionSource,
  type CanonicalLiteral,
  type SemanticLiteral,
} from "../project/semantic-literals";
import { importedEnumLiteralUses } from "./imported-enum-literals";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
function canonicalMatches(use: SemanticLiteral, canonical: CanonicalLiteral, sourceRoot: string): boolean {
  if (use.kind !== canonical.kind || use.value !== canonical.value) return false;
  const name = canonical.owner ?? canonical.name;
  if (use.family === "api-route") return /route|path|endpoint/i.test(name);
  if (use.family === "column") return /column/i.test(name);
  if (use.family === "timer") return /timeout|delay|interval/i.test(name);
  if (use.family === "storage") return /key|storage/i.test(name);
  if (use.family === "event") return /event/i.test(name);
  if (use.family.startsWith("property:") || use.family.startsWith("variable:")) {
    const semanticName = use.family.split(":")[1];
    if (!semanticName || !name.toLowerCase().includes(semanticName.toLowerCase())) return false;
    const location = featureOf(canonical.file, sourceRoot);
    return (
      location === featureOf(use.file, sourceRoot) ||
      path.relative(sourceRoot, canonical.file).split(path.sep)[0] === "constants"
    );
  }
  return false;
}

function formatValue(use: SemanticLiteral): string {
  return typeof use.value === "string" ? JSON.stringify(use.value) : String(use.value);
}

function canonicalName(canonical: CanonicalLiteral): string {
  return canonical.owner ? `${canonical.owner}.${canonical.name}` : canonical.name;
}

function messageFor(
  use: SemanticLiteral,
  matches: SemanticLiteral[],
  duplicateRouteDomains: ReadonlySet<string>,
  existingRouteEnum: CanonicalLiteral | undefined,
  root: string,
): string {
  const count = new Set(matches.map((match) => match.file)).size;
  const kind = use.kind === "string" ? "string" : "numeric";
  if (use.family === "api-route" && existingRouteEnum?.owner) {
    const location = path.relative(root, existingRouteEnum.file).replaceAll(path.sep, "/");
    return `The route ${formatValue(use)} repeats; add a member to existing ${existingRouteEnum.owner} in src/${location} and reuse it. ${DOC}`;
  }
  if (count === 1) {
    return (
      `The ${kind} literal ${formatValue(use)} repeats in the same semantic role in this file. ` +
      `Extract a file-local const. ${DOC}`
    );
  }
  const placement =
    use.family === "api-route" && duplicateRouteDomains.has(use.role)
      ? "a shared enum for this closed route domain"
      : "one shared const";
  return (
    `The ${kind} literal ${formatValue(use)} repeats in ${String(count)} production files ` +
    `for the same semantic role. Extract ${placement} at the consumers' CCF and import it. ${DOC}`
  );
}

export const repeatedSemanticLiteralRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Reuse canonical string/number values or extract semantically repeated literals at their CCF.",
    },
  },
  create(context) {
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!isProductionSource(file, root)) return {};

    const project = getProjectIndex(root);
    if (!project?.modules.has(file)) return {};
    const index = getSemanticLiteralIndex(project);
    const current = index.uses.filter((entry) => entry.file === file);
    const imported = importedEnumLiteralUses(context, root);
    if (current.length === 0 && imported.length === 0) return {};

    // Only values repeated at least twice within the same semantic role count
    // towards deciding whether an API route domain offers multiple alternatives.
    const groups = new Map<string, SemanticLiteral[]>();
    for (const use of index.uses) {
      const key = `${use.kind}\u0000${String(use.value)}\u0000${use.role}`;
      const group = groups.get(key) ?? [];
      group.push(use);
      groups.set(key, group);
    }
    const duplicatedApiRoutes = new Set<string>();
    const routeValues = new Map<string, Set<string>>();
    for (const group of groups.values()) {
      const first = group[0];
      if (group.length < 2 || first?.family !== "api-route") continue;
      const values = routeValues.get(first.role) ?? new Set<string>();
      values.add(String(first.value));
      routeValues.set(first.role, values);
    }
    for (const [role, values] of routeValues) {
      if (values.size >= 2) duplicatedApiRoutes.add(role);
    }

    const routeDomains = new Map<string, CanonicalLiteral>();
    for (const canonical of index.canonicals) {
      if (canonical.owner && /^ApiRoute(?:Enum)?$/.test(canonical.owner)) {
        routeDomains.set(`${canonical.file}:${canonical.owner}`, canonical);
      }
    }
    const existingRouteEnum = routeDomains.size === 1 ? [...routeDomains.values()][0] : undefined;
    const recognized = new Set(imported.map((use) => `${String(use.line)}:${String(use.column)}`));
    return {
      Program(node) {
        for (const use of imported) {
          const relative = path.relative(root, use.sourceFile).replaceAll(path.sep, "/");
          context.report({
            node,
            loc: { line: use.line, column: use.column },
            message: `Reuse ${use.reference} from src/${relative} instead of raw ${JSON.stringify(use.value)}. ${DOC}`,
          });
        }
        for (const use of current) {
          if (recognized.has(`${String(use.line)}:${String(use.column)}`)) continue;
          const candidates = index.canonicals.filter(
            (canonical) => canonicalMatches(use, canonical, root) && canonical.file !== file,
          );
          if (candidates.length === 1) {
            const canonical = candidates[0];
            if (!canonical) continue;
            const relative = path.relative(root, canonical.file).replaceAll(path.sep, "/");
            context.report({
              node,
              loc: { line: use.line, column: use.column },
              message: `Reuse ${canonicalName(canonical)} from src/${relative} instead of raw ${formatValue(use)}. ${DOC}`,
            });
            continue;
          }
          if (candidates.length > 1) continue; // Ambiguous canonical ownership.
          const key = `${use.kind}\u0000${String(use.value)}\u0000${use.role}`;
          const peers = groups.get(key) ?? [];
          if (peers.length < 2) continue;
          // Existing repeated-numeric-value handles named numeric declarations
          // and properties; this rule handles numeric call arguments.
          if (use.kind === "number" && !use.family.startsWith("timer")) continue;
          context.report({
            node,
            loc: { line: use.line, column: use.column },
            message: messageFor(use, peers, duplicatedApiRoutes, existingRouteEnum, root),
          });
        }
      },
    };
  },
};
