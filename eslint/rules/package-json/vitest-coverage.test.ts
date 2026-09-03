import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, packageJsonRuleTester } from "./rule-tester";
import { vitestCoverageRule } from "./vitest-coverage";

/** Builds a temp fixture project's root, with the given vitest.config.ts content. */
function buildFixture(vitestConfig?: string): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-vitest-coverage-")));
  if (vitestConfig !== undefined) writeFileSync(path.join(root, "vitest.config.ts"), vitestConfig);
  return root;
}

const RATCHETED_CONFIG = `import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      thresholds: { lines: 9, statements: 9, functions: 8, branches: 6 },
    },
  },
});
`;

const ZEROED_CONFIG = `import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: { lines: 0, statements: 0, functions: 0, branches: 0 },
    },
  },
});
`;

const COMPLETE_DEV_DEPENDENCIES = { vitest: "4.1.5", "@vitest/coverage-v8": "4.1.5" };
const COMPLETE_SCRIPTS = { "test:unit": "vitest run", "test:unit:coverage": "vitest run --coverage" };
const COMPLETE_MANIFEST = { scripts: COMPLETE_SCRIPTS, devDependencies: COMPLETE_DEV_DEPENDENCIES };

// Every case in this file reads a vitest config from context.cwd, so each
// fixture with distinct config content needs its own chdir before the Linter
// (recreated once per `.run()` call) captures process.cwd().
const ratcheted = buildFixture(RATCHETED_CONFIG);
process.chdir(ratcheted);

void describe("A repository MUST declare vitest and @vitest/coverage-v8 in devDependencies.", () => {
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [
      {
        code: JSON.stringify(COMPLETE_MANIFEST),
        filename: path.join(ratcheted, "package.json"),
      },
    ],
    invalid: [
      {
        code: JSON.stringify({ scripts: COMPLETE_SCRIPTS }),
        filename: path.join(ratcheted, "package.json"),
        errors: [
          { message: "vitest must be listed in package.json as a devDependency." },
          { message: "@vitest/coverage-v8 must be listed in package.json as a devDependency." },
        ],
      },
      {
        // only one package missing
        code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, devDependencies: { vitest: "4.1.5" } }),
        filename: path.join(ratcheted, "package.json"),
        errors: [{ message: "@vitest/coverage-v8 must be listed in package.json as a devDependency." }],
      },
    ],
  });
});

void describe("A repository MUST declare a test:unit script in package.json that runs Vitest without coverage.", () => {
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [{ code: JSON.stringify(COMPLETE_MANIFEST), filename: path.join(ratcheted, "package.json") }],
    invalid: [
      {
        code: JSON.stringify({
          scripts: { "test:unit:coverage": "vitest run --coverage" },
          devDependencies: COMPLETE_DEV_DEPENDENCIES,
        }),
        filename: path.join(ratcheted, "package.json"),
        errors: [{ message: 'package.json must declare a "test:unit" script that runs Vitest without coverage.' }],
      },
      {
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, "test:unit": "vitest run --coverage" },
          devDependencies: COMPLETE_DEV_DEPENDENCIES,
        }),
        filename: path.join(ratcheted, "package.json"),
        errors: [{ message: 'package.json must declare a "test:unit" script that runs Vitest without coverage.' }],
      },
    ],
  });
});

void describe("A repository MUST declare a test:unit:coverage script in package.json that runs Vitest with coverage.", () => {
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [{ code: JSON.stringify(COMPLETE_MANIFEST), filename: path.join(ratcheted, "package.json") }],
    invalid: [
      {
        code: JSON.stringify({ scripts: { "test:unit": "vitest run" }, devDependencies: COMPLETE_DEV_DEPENDENCIES }),
        filename: path.join(ratcheted, "package.json"),
        errors: [
          { message: 'package.json must declare a "test:unit:coverage" script that runs Vitest with coverage.' },
        ],
      },
      {
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, "test:unit:coverage": "vitest run" },
          devDependencies: COMPLETE_DEV_DEPENDENCIES,
        }),
        filename: path.join(ratcheted, "package.json"),
        errors: [
          { message: 'package.json must declare a "test:unit:coverage" script that runs Vitest with coverage.' },
        ],
      },
    ],
  });
});

void describe("A repository MUST configure its vitest config with a coverage threshold above zero for lines, functions, branches, and statements.", () => {
  // cwd is still `ratcheted` from the block above.
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [
      {
        code: JSON.stringify(COMPLETE_MANIFEST),
        filename: path.join(ratcheted, "package.json"),
      },
    ],
    invalid: [],
  });

  const noConfig = buildFixture();
  process.chdir(noConfig);
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [],
    invalid: [
      {
        // no vitest config file at all
        code: JSON.stringify(COMPLETE_MANIFEST),
        filename: path.join(noConfig, "package.json"),
        errors: [
          {
            message:
              "No vitest config found. Create one with a coverage threshold above zero for lines, functions, branches, and statements.",
          },
        ],
      },
    ],
  });

  const zeroed = buildFixture(ZEROED_CONFIG);
  process.chdir(zeroed);
  packageJsonRuleTester.run("vitest-coverage", vitestCoverageRule, {
    valid: [],
    invalid: [
      {
        // every threshold left at zero
        code: JSON.stringify(COMPLETE_MANIFEST),
        filename: path.join(zeroed, "package.json"),
        errors: [
          { message: "vitest.config.ts must set a coverage threshold above zero for lines." },
          { message: "vitest.config.ts must set a coverage threshold above zero for functions." },
          { message: "vitest.config.ts must set a coverage threshold above zero for branches." },
          { message: "vitest.config.ts must set a coverage threshold above zero for statements." },
        ],
      },
    ],
  });
});
