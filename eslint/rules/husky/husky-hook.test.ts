import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, huskyRuleTester } from "./rule-tester";
import { huskyHookRule } from "./husky-hook";

void describe("A repository MUST declare a prepare script in package.json that runs husky.", () => {
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [
      {
        code: '{"scripts":{"prepare":"husky","typecheck":"tsc --noEmit","test:unit:coverage":"vitest run --coverage"}}',
        filename: "/repo/package.json",
      },
    ],
    invalid: [
      {
        code: '{"scripts":{"prepare":"npm run build","typecheck":"tsc --noEmit","test:unit:coverage":"vitest run --coverage"}}',
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
  writeFileSync(path.join(root, "vitest.config.ts"), "export default {};");
  if (suppressions !== undefined) writeFileSync(path.join(root, "eslint-suppressions.json"), suppressions);
  return path.join(root, "package.json");
}

const COVERAGE_RATCHET = `npm run test:unit:coverage
git add vitest.config.ts`;

// Has lint-staged, typecheck, coverage, and libyear — everything but lint:prune.
const BASE_HOOK = `npx lint-staged
npm run typecheck
${COVERAGE_RATCHET}
npx libyear --limit-major-individual=1
`;
// Every named script the rule can require.
const FULL_HOOK = `npx lint-staged
npm run typecheck
npm run lint:prune
git add eslint-suppressions.json
${COVERAGE_RATCHET}
npx libyear --limit-major-individual=1
`;
// Missing typecheck while retaining the coverage ratchet.
const NO_TYPECHECK_HOOK = `npx lint-staged
${COVERAGE_RATCHET}
npx libyear --limit-major-individual=1
`;

const COMPLETE_SCRIPTS = {
  prepare: "husky",
  typecheck: "tsc --noEmit",
  "test:unit:coverage": "vitest run --coverage",
  "lint:prune": "eslint . --prune-suppressions",
};
const BASE_SCRIPTS = {
  prepare: "husky",
  typecheck: "tsc --noEmit",
  "test:unit:coverage": "vitest run --coverage",
};

void describe("A repository MUST configure .husky/pre-commit to run lint-staged.", () => {
  const withLintStaged = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withLintStaged));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withLintStaged }],
    invalid: [],
  });

  // lint-staged is absent from the hook entirely
  const withoutLintStaged = buildFixture(
    `npm run typecheck\n${COVERAGE_RATCHET}\nnpx libyear --limit-major-individual=1\n`,
  );
  process.chdir(path.dirname(withoutLintStaged));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: withoutLintStaged,
        errors: [{ message: ".husky/pre-commit must run lint-staged." }],
      },
    ],
  });
});

void describe("A repository MUST configure .husky/pre-commit to run npx libyear --limit-major-individual=1.", () => {
  const withLibyear = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withLibyear));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withLibyear }],
    invalid: [],
  });

  // libyear is absent from the hook entirely
  const withoutLibyear = buildFixture(`npx lint-staged\nnpm run typecheck\n${COVERAGE_RATCHET}\n`);
  process.chdir(path.dirname(withoutLibyear));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: withoutLibyear,
        errors: [{ message: ".husky/pre-commit must run npx libyear --limit-major-individual=1." }],
      },
    ],
  });
});

void describe("A repository MUST run npm run test:unit:coverage in .husky/pre-commit, then stage its auto-updated Vitest config.", () => {
  const withRatchet = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withRatchet));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withRatchet }],
    invalid: [],
  });

  const withoutCoverage = buildFixture(`npx lint-staged\nnpm run typecheck\nnpx libyear --limit-major-individual=1\n`);
  process.chdir(path.dirname(withoutCoverage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: '{"scripts":{"prepare":"husky","typecheck":"tsc --noEmit"}}',
        filename: withoutCoverage,
        errors: [
          { message: 'package.json must declare a "test:unit:coverage" script.' },
          { message: ".husky/pre-commit must run npm run test:unit:coverage." },
          {
            message: ".husky/pre-commit must stage an auto-updated vitest.config.ts after coverage.",
          },
        ],
      },
    ],
  });

  const withoutRatchet = buildFixture(
    `npx lint-staged\nnpm run typecheck\nnpm run test:unit:coverage\nnpx libyear --limit-major-individual=1\n`,
  );
  process.chdir(path.dirname(withoutRatchet));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: withoutRatchet,
        errors: [
          {
            message: ".husky/pre-commit must stage an auto-updated vitest.config.ts after coverage.",
          },
        ],
      },
    ],
  });
});

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
        code: '{"scripts":{"prepare":"husky","test:unit:coverage":"vitest run --coverage"}}',
        filename: withoutTypecheck,
        errors: [
          { message: 'package.json must declare a "typecheck" script.' },
          { message: ".husky/pre-commit must run npm run typecheck." },
        ],
      },
    ],
  });
});

void describe("A repository that tracks eslint-suppressions.json MUST declare a lint:prune script in package.json, run it (npm run lint:prune) in .husky/pre-commit, and then stage the suppression file.", () => {
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
          { message: ".husky/pre-commit must stage eslint-suppressions.json after pruning suppressions." },
        ],
      },
    ],
  });

  const withoutSuppressionRatchet = buildFixture(
    `npx lint-staged\nnpm run typecheck\nnpm run lint:prune\n${COVERAGE_RATCHET}\nnpx libyear --limit-major-individual=1\n`,
    "{}",
  );
  process.chdir(path.dirname(withoutSuppressionRatchet));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: COMPLETE_SCRIPTS }),
        filename: withoutSuppressionRatchet,
        errors: [{ message: ".husky/pre-commit must stage eslint-suppressions.json after pruning suppressions." }],
      },
    ],
  });
});
