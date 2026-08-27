import { describe, jsonRuleTester } from "./rule-tester";
import { noCacheFlagRule } from "./no-cache-flag";

void describe("A lint command MUST NOT pass ESLint's --cache flag, because rules that compare a file against the rest of the tree need every file in the run.", () => {
  jsonRuleTester.run("no-cache-flag", noCacheFlagRule, {
    valid: [
      // Plain lint script without --cache
      {
        code: `{ "scripts": { "lint": "eslint ." } }`,
      },
      // fix script without --cache
      {
        code: `{ "scripts": { "fix": "eslint . --fix" } }`,
      },
      // --cache in a non-lint script is not this rule's concern
      {
        code: `{ "scripts": { "test": "vitest --cache" } }`,
      },
      // No scripts section at all
      {
        code: `{ "name": "app" }`,
      },
    ],
    invalid: [
      {
        code: `{ "scripts": { "lint": "eslint . --cache" } }`,
        errors: [
          {
            message:
              "Lint scripts must not pass ESLint's --cache flag because cross-file rules require every file in the run.",
          },
        ],
      },
      {
        code: `{ "scripts": { "fix": "eslint . --fix --cache" } }`,
        errors: [
          {
            message:
              "Lint scripts must not pass ESLint's --cache flag because cross-file rules require every file in the run.",
          },
        ],
      },
    ],
  });
});
