/**
 * Shared RuleTester wiring for the rule fixture tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import path from "node:path";
import { describe, it } from "node:test";
import { Linter, RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

RuleTester.describe = describe;
RuleTester.it = it;

/**
 * A RuleTester that captures ESLint's `cwd` at run time.
 *
 * Parika's cross-file rules resolve `src/` against ESLint's `cwd` option
 * (`context.cwd`). ESLint's Linter captures that value once, in its constructor;
 * a plain RuleTester constructs its Linter eagerly at import time. Fixture tests
 * `chdir` to a temp tree *after* importing the harness, so a Linter born at
 * import time would have its `cwd` frozen to the wrong directory. Recreating the
 * Linter on every `run()` lets it read the current `process.cwd()` (our fixture
 * root) instead, matching how rules behave when ESLint is launched from the repo.
 */
export class CwdAwareRuleTester extends RuleTester {
  // The base RuleTester constructor creates this Linter; the public type omits it.
  declare linter: Linter;

  override run(...args: Parameters<RuleTester["run"]>): void {
    const [ruleName, rule, tests] = args;
    // A fresh Linter captures the current process.cwd() (our fixture root) on
    // every run, instead of the one frozen at import time before the chdir.
    this.linter = new Linter({ configType: "flat" });
    super.run(ruleName, rule, tests);
  }
}

export const ruleTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

/** Absolute path inside the repository's notional `src/`, which the path-based rules resolve against. */
export function srcFile(relativePath: string): string {
  return path.resolve("src", relativePath);
}

export { describe };
