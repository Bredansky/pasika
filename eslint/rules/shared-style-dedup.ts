/**
 * ESLint rule: pasika/shared-style-dedup
 *
 * A style or group of styles that two or more components use together and
 * should change together MUST become one named custom utility. Styling used by
 * only one component MUST stay in that component file as static Tailwind
 * utility classes. The rule compares className lists across the whole tree,
 * because a single file cannot see what other components use.
 *
 * @see docs/styling-guide/rules/theme-and-utility-definition-rule.md
 */

import path from "node:path";
import { readFileSync, statSync } from "node:fs";
import type { Rule } from "eslint";
import type { ProjectIndex } from "../project/index";
import { getProjectIndex } from "../project/index";
import { segmentsOf } from "../project/ccf";

/** Static className string literals; dynamic class lists are not comparable across files. */
const CLASS_NAME = /className="(?<classes>[^"]+)"/g;

let comboCache: { sourceRoot: string; fingerprint: string; combos: Map<string, Set<string>> } | undefined;

/** className combinations used by each component file, memoized per tree. */
function combosFor(index: ProjectIndex): Map<string, Set<string>> {
  const files = [...index.modules.keys()]
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".jsx"))
    .sort((left, right) => left.localeCompare(right));

  let fingerprint = "";
  for (const file of files) {
    try {
      fingerprint += String(statSync(file).mtimeMs);
    } catch {
      fingerprint += "0";
    }
  }

  if (comboCache?.sourceRoot === index.sourceRoot && comboCache.fingerprint === fingerprint) {
    return comboCache.combos;
  }

  const combos = new Map<string, Set<string>>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(CLASS_NAME)) {
      const classes = (match.groups?.classes ?? "").split(/\s+/).filter(Boolean);
      if (classes.length < 2) continue;
      const key = [...classes].sort().join(" ");
      const users = combos.get(key) ?? new Set<string>();
      users.add(file);
      combos.set(key, users);
    }
  }

  comboCache = { sourceRoot: index.sourceRoot, fingerprint, combos };
  return combos;
}

export const sharedStyleDedupRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a className combination used by two or more components to become a named custom utility.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    // Report each shared combination once, on the alphabetically first file
    // that uses it, so the whole tree produces one finding per combination.
    const combos = combosFor(index);
    const sharedHere = [...combos.entries()]
      .filter(([, users]) => users.size >= 2 && users.has(file))
      .filter(([, users]) => [...users].sort((left, right) => left.localeCompare(right))[0] === file);

    if (sharedHere.length === 0) return {};

    return {
      Program(node) {
        for (const [combo, users] of sharedHere) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            message:
              `Class combination "${combo}" is used by ${String(users.size)} components and should change ` +
              "together; create a named custom Tailwind utility for it. " +
              "See docs/styling-guide/rules/theme-and-utility-definition-rule.md",
          });
        }
      },
    };
  },
};
