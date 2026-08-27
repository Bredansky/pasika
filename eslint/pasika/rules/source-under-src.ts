/**
 * ESLint rule: pasika/source-under-src
 *
 * Enforces that application source lives under `src/`. The rule reports any
 * linted JS/TS module whose path is outside `src/`, unless it is a config
 * file, a declaration file, or lives in a tooling directory.
 *
 * @see docs/code-organization-guide/rules/application-structure-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

/** Root-level directories that do not hold application source. */
const NON_SOURCE_ROOT_DIRS = new Set([
  ".agents",
  ".cache",
  ".github",
  ".husky",
  ".next",
  ".tmp",
  ".turbo",
  ".vercel",
  ".vulyk",
  "__tests__",
  "assets",
  "bin",
  "build",
  "cli",
  "coverage",
  "dist",
  "docs",
  "enforcement",
  "eslint",
  "node_modules",
  "public",
  "static",
  "test",
  "tests",
  "tmp",
  "vendor",
]);

const MODULE_EXTENSION = /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;
const CONFIG_FILE = /^[\w.-]+\.config\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;
const DECLARATION_FILE = /\.d\.(?:cjs|cts|mts|ts)$/;

export const sourceUnderSrcRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Report application source files that live outside src/.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    if (!MODULE_EXTENSION.test(filename)) return {};

    const relative = path.relative(process.cwd(), filename).replace(/\\/g, "/");
    if (relative === "src" || relative.startsWith("src/")) return {};

    const topLevel = relative.split("/")[0] ?? "";
    if (NON_SOURCE_ROOT_DIRS.has(topLevel)) return {};

    // A file directly at the repository root is not application source when it
    // is configuration (eslint.config.ts, tsup.config.ts), a declaration file
    // (next-env.d.ts), or a dotfile (.eslintrc.js).
    if (!relative.includes("/")) {
      const basename = path.basename(filename);
      if (CONFIG_FILE.test(basename) || DECLARATION_FILE.test(basename) || basename.startsWith(".")) return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message: `Application source must live under src/. Move "${relative}" under src/.`,
        });
      },
    };
  },
};
