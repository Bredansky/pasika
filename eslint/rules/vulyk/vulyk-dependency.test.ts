import { describe, vulykRuleTester } from "./rule-tester";
import { vulykDependencyRule } from "./vulyk-dependency";

const cases = {
  valid: [
    {
      code: `{ "devDependencies": { "vulyk": "0.15.0" } }`,
    },
  ],
  invalid: [
    {
      code: `{ "name": "app" }`,
      errors: [{ message: "vulyk must be listed in package.json as a devDependency." }],
    },
    {
      code: `{ "dependencies": { "vulyk": "0.15.0" } }`,
      errors: [{ message: "vulyk must be listed in devDependencies, not dependencies." }],
    },
    {
      code: `{ "dependencies": { "vulyk": "0.15.0" }, "devDependencies": { "vulyk": "0.15.0" } }`,
      errors: [{ message: "vulyk must be listed in devDependencies, not dependencies." }],
    },
  ],
};

void describe("A repository adopting the framework MUST list `vulyk` in `devDependencies` rather than `dependencies` so `vulyk.config.ts` is typechecked and the repository resolves a pinned CLI.", () => {
  vulykRuleTester.run("vulyk-dependency", vulykDependencyRule, cases);
});

void describe("`vulyk` MUST be listed in `devDependencies` rather than `dependencies` so `vulyk.config.ts` is typechecked and the repository resolves a pinned CLI.", () => {
  vulykRuleTester.run("vulyk-dependency-policy", vulykDependencyRule, cases);
});
