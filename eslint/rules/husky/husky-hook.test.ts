import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { huskyHookRule } from "./husky-hook";
import { describe, huskyRuleTester } from "./rule-tester";

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

const COVERAGE_CHECK = "npm run test:unit:coverage";
const VITEST_GUARD = "git diff --exit-code -- vitest.config.ts || exit 1";
const COVERAGE_STEP = `${COVERAGE_CHECK}
${VITEST_GUARD}`;
const VULYK_STEPS = `npx vulyk sync
npx vulyk agents
npx vulyk stage
`;

// Has lint-staged, typecheck, coverage, and libyear — everything but lint:prune.
const BASE_HOOK = `npx lint-staged
npm run typecheck
${COVERAGE_STEP}
npx libyear --limit-major-individual=1
`;
// Every named script the rule can require.
const FULL_HOOK = `npx lint-staged
npm run typecheck
npm run lint:prune
git add eslint-suppressions.json
${COVERAGE_STEP}
npx libyear --limit-major-individual=1
`;
// Missing typecheck while retaining the coverage check.
const NO_TYPECHECK_HOOK = `npx lint-staged
${COVERAGE_STEP}
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

void describe("A repository declaring `test:requirements` MUST run it as a named script in `.husky/pre-commit`.", () => {
  const scripts = { ...BASE_SCRIPTS, "test:requirements": "tsx scripts/coverage.ts" };
  const missing = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(missing));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts }),
        filename: missing,
        errors: [{ message: ".husky/pre-commit must run npm run test:requirements." }],
      },
    ],
  });

  const present = buildFixture(BASE_HOOK.replace("npm run typecheck", "npm run typecheck\nnpm run test:requirements"));
  process.chdir(path.dirname(present));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts }), filename: present }],
    invalid: [],
  });
});

void describe("A repository MUST configure .husky/pre-commit to run lint-staged.", () => {
  const withLintStaged = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withLintStaged));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withLintStaged }],
    invalid: [],
  });

  // lint-staged is absent from the hook entirely
  const withoutLintStaged = buildFixture(
    `npm run typecheck\n${COVERAGE_STEP}\nnpx libyear --limit-major-individual=1\n`,
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
  const withoutLibyear = buildFixture(`npx lint-staged\nnpm run typecheck\n${COVERAGE_STEP}\n`);
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

void describe("A repository MUST run `npm run test:unit:coverage` in `.husky/pre-commit`.", () => {
  const withCoverage = buildFixture(BASE_HOOK);
  process.chdir(path.dirname(withCoverage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: withCoverage }],
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
    `npx lint-staged\nnpm run typecheck\nnpm run lint:prune\n${COVERAGE_STEP}\nnpx libyear --limit-major-individual=1\n`,
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

void describe("A repository with `vulyk.config.ts` MUST run its pinned `npx vulyk sync` and `npx vulyk agents` before `lint-staged` in `.husky/pre-commit`.", () => {
  const fixture = buildFixture(VULYK_STEPS + BASE_HOOK);
  writeFileSync(path.join(path.dirname(fixture), "vulyk.config.ts"), "export default {};");
  process.chdir(path.dirname(fixture));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: fixture }],
    invalid: [],
  });

  const missing = buildFixture(BASE_HOOK);
  writeFileSync(path.join(path.dirname(missing), "vulyk.config.ts"), "export default {};");
  process.chdir(path.dirname(missing));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: missing,
        errors: [
          { message: ".husky/pre-commit must run npx vulyk sync and npx vulyk agents before lint-staged." },
          { message: ".husky/pre-commit must run npx vulyk stage after agents and before lint-staged." },
        ],
      },
    ],
  });
});

void describe("A repository with `vulyk.config.ts` MUST run `npx vulyk stage` after `npx vulyk agents` and before `lint-staged` in `.husky/pre-commit`.", () => {
  const missingStage = buildFixture(VULYK_STEPS.replace("npx vulyk stage\n", "") + BASE_HOOK);
  writeFileSync(path.join(path.dirname(missingStage), "vulyk.config.ts"), "export default {};");
  process.chdir(path.dirname(missingStage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: missingStage,
        errors: [{ message: ".husky/pre-commit must run npx vulyk stage after agents and before lint-staged." }],
      },
    ],
  });

  const outOfOrder = buildFixture(
    VULYK_STEPS.replace("npx vulyk agents\nnpx vulyk stage", "npx vulyk stage\nnpx vulyk agents") + BASE_HOOK,
  );
  writeFileSync(path.join(path.dirname(outOfOrder), "vulyk.config.ts"), "export default {};");
  process.chdir(path.dirname(outOfOrder));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: outOfOrder,
        errors: [{ message: ".husky/pre-commit must run npx vulyk stage after agents and before lint-staged." }],
      },
    ],
  });
});

void describe("After coverage, the hook MUST fail on unstaged `vitest.config.ts` changes so contributors explicitly review and stage them.", () => {
  // Existing hooks using the explicit if-block remain valid.
  const verboseGuard = `if ! git diff --quiet -- vitest.config.ts; then
  echo "Review and stage vitest.config.ts"
  exit 1
fi`;
  const legacy = buildFixture(BASE_HOOK.replace(VITEST_GUARD, verboseGuard));
  process.chdir(path.dirname(legacy));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [{ code: JSON.stringify({ scripts: BASE_SCRIPTS }), filename: legacy }],
    invalid: [],
  });

  // The shorter command must explicitly exit, and it must appear after coverage.
  const missingExit = buildFixture(BASE_HOOK.replace(VITEST_GUARD, "git diff --exit-code -- vitest.config.ts"));
  process.chdir(path.dirname(missingExit));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: missingExit,
        errors: [{ message: ".husky/pre-commit must reject unstaged vitest.config.ts changes after coverage." }],
      },
    ],
  });

  const beforeCoverage = buildFixture(BASE_HOOK.replace(COVERAGE_STEP, `${VITEST_GUARD}\n${COVERAGE_CHECK}`));
  process.chdir(path.dirname(beforeCoverage));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: beforeCoverage,
        errors: [{ message: ".husky/pre-commit must reject unstaged vitest.config.ts changes after coverage." }],
      },
    ],
  });

  const missingGuard = buildFixture(BASE_HOOK.replace(VITEST_GUARD, ""));
  process.chdir(path.dirname(missingGuard));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: missingGuard,
        errors: [{ message: ".husky/pre-commit must reject unstaged vitest.config.ts changes after coverage." }],
      },
    ],
  });

  const autoStaged = buildFixture(`${BASE_HOOK}git add vitest.config.ts\n`);
  process.chdir(path.dirname(autoStaged));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: autoStaged,
        errors: [{ message: ".husky/pre-commit must not auto-stage vitest.config.ts." }],
      },
    ],
  });
});

void describe("The hook MUST NOT automatically stage `vitest.config.ts`.", () => {
  const file = buildFixture(`${BASE_HOOK}git add vitest.config.ts\n`);
  process.chdir(path.dirname(file));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: file,
        errors: [{ message: ".husky/pre-commit must not auto-stage vitest.config.ts." }],
      },
    ],
  });
});

void describe("Bulk staging cannot silently include generated outputs.", () => {
  const file = buildFixture(`${VULYK_STEPS}${BASE_HOOK}git add -A\n`);
  writeFileSync(path.join(path.dirname(file), "vulyk.config.ts"), "export default {};");
  process.chdir(path.dirname(file));
  huskyRuleTester.run("husky-hook", huskyHookRule, {
    valid: [],
    invalid: [
      {
        code: JSON.stringify({ scripts: BASE_SCRIPTS }),
        filename: file,
        errors: [{ message: ".husky/pre-commit must not auto-stage vitest.config.ts." }],
      },
    ],
  });
});
