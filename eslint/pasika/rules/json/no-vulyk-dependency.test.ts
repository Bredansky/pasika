import { describe, jsonRuleTester } from "./rule-tester.js";
import { noVulykDependencyRule } from "./no-vulyk-dependency.js";

void describe("Vulyk MUST NOT be added to package.json in order to run its CLI.", () => {
  jsonRuleTester.run("no-vulyk-dependency", noVulykDependencyRule, {
    valid: [
      // No vulyk anywhere
      {
        code: `{ "name": "app" }`,
      },
      // Vulyk absent from both dependency sections
      {
        code: `{ "devDependencies": { "eslint": "^9.0.0" } }`,
      },
      // Ephemeral invocation in scripts is fine
      {
        code: `{ "scripts": { "sync": "npx vulyk@latest sync" } }`,
      },
    ],
    invalid: [
      {
        code: `{ "dependencies": { "vulyk": "^1.0.0" } }`,
        errors: [
          {
            message: 'Vulyk must not be a package.json dependency. Run it as "npx vulyk@latest" instead.',
          },
        ],
      },
      {
        code: `{ "devDependencies": { "vulyk": "^1.0.0" } }`,
        errors: [
          {
            message: 'Vulyk must not be a package.json dependency. Run it as "npx vulyk@latest" instead.',
          },
        ],
      },
    ],
  });
});

void describe("Vulyk MUST run as an ephemeral command such as npx vulyk@latest.", () => {
  jsonRuleTester.run("no-vulyk-dependency", noVulykDependencyRule, {
    valid: [
      // No vulyk dependency means it is run ephemerally
      {
        code: `{ "name": "app" }`,
      },
      {
        code: `{ "devDependencies": { "typescript": "^5.0.0" } }`,
      },
    ],
    invalid: [
      {
        code: `{ "dependencies": { "vulyk": "latest" } }`,
        errors: [
          {
            message: 'Vulyk must not be a package.json dependency. Run it as "npx vulyk@latest" instead.',
          },
        ],
      },
    ],
  });
});
