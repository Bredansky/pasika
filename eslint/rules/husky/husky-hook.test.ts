import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, huskyRuleTester } from "./rule-tester";
import { huskyHookRule } from "./husky-hook";

void describe("A repository MUST configure .husky/pre-commit to run lint-staged, npm run typecheck, and npx libyear --limit-major-individual=1, with a prepare script that runs husky.", () => {
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [
      // cwd is the repo, whose .husky/pre-commit runs lint-staged + typecheck
      { code: '{"scripts":{"prepare":"husky"}}', filename: "/repo/package.json" },
    ],
    invalid: [
      {
        code: '{"scripts":{"prepare":"npm run build"}}',
        filename: "/repo/package.json",
        errors: [{ message: 'package.json "prepare" script must run husky (e.g. "prepare": "husky").' }],
      },
    ],
  });
});

/** Builds a temp fixture project's package.json path, with the given .husky/pre-commit and eslint-suppressions.json content. */
function buildFixture(preCommit: string, suppressions?: string): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-husky-hook-")));
  mkdirSync(path.join(root, ".husky"), { recursive: true });
  writeFileSync(path.join(root, ".husky", "pre-commit"), preCommit);
  if (suppressions !== undefined) writeFileSync(path.join(root, "eslint-suppressions.json"), suppressions);
  return path.join(root, "package.json");
}

const BASE_HOOK = "npx lint-staged\nnpm run typecheck\nnpx libyear --limit-major-individual=1\n";
const RATCHET_HOOK = `npx lint-staged
npm run typecheck
if [ -f eslint-suppressions.json ]; then
  npx eslint . --prune-suppressions
  if [ "$CI" = "true" ]; then
    git diff --exit-code eslint-suppressions.json
  else
    git add eslint-suppressions.json
  fi
fi
npx libyear --limit-major-individual=1
`;

void describe("A repository that tracks eslint-suppressions.json MUST prune it between the typecheck and the drift check, staging the shrink locally and failing instead on any diff when $CI is true.", () => {
  // no eslint-suppressions.json, so the ratchet is not required
  const noSuppressions = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(noSuppressions));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: '{"scripts":{"prepare":"husky"}}', filename: noSuppressions }],
    invalid: [],
  });

  // eslint-suppressions.json exists and the hook prunes + ratchets it
  const ratcheted = buildFixture(RATCHET_HOOK, "{}");
  process.chdir(path.dirname(ratcheted));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: '{"scripts":{"prepare":"husky"}}', filename: ratcheted }],
    invalid: [],
  });

  // eslint-suppressions.json exists but the hook never prunes or ratchets it
  const unratcheted = buildFixture(BASE_HOOK, "{}");
  process.chdir(path.dirname(unratcheted));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: '{"scripts":{"prepare":"husky"}}',
        filename: unratcheted,
        errors: [
          { message: ".husky/pre-commit must prune eslint-suppressions.json (eslint . --prune-suppressions)." },
          { message: ".husky/pre-commit must fail on any eslint-suppressions.json diff in CI ($CI = true)." },
          { message: ".husky/pre-commit must stage the eslint-suppressions.json shrink locally." },
        ],
      },
    ],
  });
});
