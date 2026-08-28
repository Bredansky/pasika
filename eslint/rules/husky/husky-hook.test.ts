import { describe, huskyRuleTester } from "./rule-tester";
import { huskyHookRule } from "./husky-hook";

void describe("A repository MUST configure .husky/pre-commit to run lint-staged and npm run typecheck, with a prepare script that runs husky.", () => {
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [
      // cwd is the repo, whose .husky/pre-commit runs lint-staged + typecheck
      { code: '{"scripts":{"prepare":"husky"}}', filename: "/repo/package.json" },
    ],
    invalid: [
      { code: '{"scripts":{"prepare":"npm run build"}}',
        filename: "/repo/package.json",
        errors: [{ message: 'package.json "prepare" script must run husky (e.g. "prepare": "husky").' }],
      },
    ],
  });
});