import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, huskyRuleTester } from "./rule-tester";
import { huskyHookRule } from "./husky-hook";

void describe("A repository MUST configure .husky/pre-commit to run lint-staged and npx libyear --limit-major-individual=1.", () => {
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [
      // cwd is the repo, whose .husky/pre-commit runs lint-staged, typecheck, and libyear
      { code: '{"scripts":{"prepare":"husky","typecheck":"tsc --noEmit"}}', filename: "/repo/package.json" },
    ],
    invalid: [],
  });
});

void describe("A repository MUST declare a prepare script in package.json that runs husky.", () => {
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: '{"scripts":{"prepare":"husky","typecheck":"tsc --noEmit"}}', filename: "/repo/package.json" }],
    invalid: [
      {
        code: '{"scripts":{"prepare":"npm run build","typecheck":"tsc --noEmit"}}',
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

// Has lint-staged, typecheck, and libyear — everything but lint:prune and test:unit:coverage.
const BASE_HOOK = `npx lint-staged
npm run typecheck
npx libyear --limit-major-individual=1
`;
// Every named script the rule can require.
const FULL_HOOK = `npx lint-staged
npm run typecheck
npm run lint:prune
npm run test:unit:coverage
npx libyear --limit-major-individual=1
`;
// Missing every named script, including typecheck.
const NO_TYPECHECK_HOOK = `npx lint-staged
npx libyear --limit-major-individual=1
`;

const COMPLETE_DEV_DEPENDENCIES = { vitest: "4.1.5", "@vitest/coverage-v8": "4.1.5" };
const COMPLETE_SCRIPTS = {
  prepare: "husky",
  typecheck: "tsc --noEmit",
  "lint:prune": "eslint . --prune-suppressions",
  "test:unit:coverage": "vitest run --coverage",
};
const BASE_SCRIPTS = { prepare: "husky", typecheck: "tsc --noEmit" };

void describe("A repository MUST declare a typecheck script in package.json and run it (npm run typecheck) in .husky/pre-commit.", () => {
  const withTypecheck = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withTypecheck));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withTypecheck }],
    invalid: [],
  });

  // neither the script nor the hook's call to it are present
  const withoutTypecheck = buildFixture(NO_TYPECHECK_HOOK);
  process.chdir(path.dirname(withoutTypecheck));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: '{"scripts":{"prepare":"husky"}}',
        filename: withoutTypecheck,
        errors: [
          { message: 'package.json must declare a "typecheck" script.' },
          { message: ".husky/pre-commit must run npm run typecheck." },
        ],
      },
    ],
  });
});

void describe("A repository that tracks eslint-suppressions.json MUST declare a lint:prune script in package.json and run it (npm run lint:prune) in .husky/pre-commit.", () => {
  // no eslint-suppressions.json, so lint:prune is not required
  const noSuppressions = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(noSuppressions));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: noSuppressions }],
    invalid: [],
  });

  // eslint-suppressions.json exists, and the script + hook call both exist
  const withPrune = buildFixture(FULL_HOOK, "{}");
  process.chdir(path.dirname(withPrune));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: COMPLETE_SCRIPTS }), filename: withPrune }],
    invalid: [],
  });

  // eslint-suppressions.json exists, but neither the script nor the hook's call to it are present
  const withoutPrune = buildFixture(BASE_HOOK, "{}");
  process.chdir(path.dirname(withoutPrune));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: withoutPrune,
        errors: [
          { message: 'package.json must declare a "lint:prune" script.' },
          { message: ".husky/pre-commit must run npm run lint:prune." },
        ],
      },
    ],
  });
});

void describe("A repository that declares vitest and @vitest/coverage-v8 in devDependencies MUST declare a test:unit:coverage script in package.json and run it (npm run test:unit:coverage) in .husky/pre-commit.", () => {
  // vitest not declared, so test:unit:coverage is not required
  const noVitest = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(noVitest));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: noVitest }],
    invalid: [],
  });

  // vitest + @vitest/coverage-v8 declared, and the script + hook call both exist
  const withCoverage = buildFixture(FULL_HOOK);
  process.chdir(path.dirname(withCoverage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [
      {
        code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, devDependencies: COMPLETE_DEV_DEPENDENCIES }),
        filename: withCoverage,
      },
    ],
    invalid: [],
  });

  // vitest + @vitest/coverage-v8 declared, but neither the script nor the hook's call to it are present
  const withoutCoverage = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withoutCoverage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS, devDependencies: COMPLETE_DEV_DEPENDENCIES }),
        filename: withoutCoverage,
        errors: [
          { message: 'package.json must declare a "test:unit:coverage" script.' },
          { message: ".husky/pre-commit must run npm run test:unit:coverage." },
        ],
      },
    ],
  });
});
