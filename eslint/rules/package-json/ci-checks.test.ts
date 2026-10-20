import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ciChecksRule } from "./ci-checks";
import { describe, packageJsonRuleTester } from "./rule-tester";

const CHECKS = [
  "on:",
  "  pull_request:",
  "  push:",
  "    branches: [main]",
  "jobs:",
  "  validate:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@v6",
  "      - run: npm ci",
  "      - run: npm run format",
  "      - run: npm run lint",
  "      - run: npm run typecheck",
  "      - run: npm run test:unit:coverage:check",
  "      - run: npm run build",
].join("\n");

const SCRIPTS = {
  format: "prettier --check .",
  lint: "eslint .",
  typecheck: "tsc --noEmit",
  "test:unit:coverage": "vitest run --coverage",
  "test:unit:coverage:check":
    "npm run test:unit:coverage -- --coverage.thresholds.autoUpdate=false && git diff --exit-code -- vitest.config.ts",
  "test:requirements": "tsx scripts/coverage.ts",
  build: "tsup",
};
const PACKAGE_JSON = JSON.stringify({ scripts: SCRIPTS });

function fixture(checks?: string): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-ci-checks-")));
  if (checks !== undefined) {
    const dir = path.join(root, ".github", "workflows");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "quality.yaml"), checks);
  }
  return path.join(root, "package.json");
}

void describe("A repository using GitHub Actions MUST run validation for pull requests and pushes to a named branch.", () => {
  const complete = fixture(CHECKS);
  process.chdir(path.dirname(complete));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [{ filename: complete, code: PACKAGE_JSON }],
    invalid: [],
  });

  const missing = fixture(CHECKS.replace("  pull_request:\n", ""));
  process.chdir(path.dirname(missing));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: missing,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions must run shared checks for pull requests and branch pushes." }],
      },
    ],
  });

  const eventsWithoutBranches = fixture(
    CHECKS.replace("on:\n  pull_request:\n  push:\n    branches: [main]", "on: [pull_request, push]"),
  );
  process.chdir(path.dirname(eventsWithoutBranches));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: eventsWithoutBranches,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions must run shared checks for pull requests and branch pushes." }],
      },
    ],
  });

  const withoutGitHub = fixture();
  process.chdir(path.dirname(withoutGitHub));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [{ filename: withoutGitHub, code: PACKAGE_JSON }],
    invalid: [],
  });
});

void describe("A repository using GitHub Actions MUST check out the source and install dependencies with npm ci before validation.", () => {
  const missingCheckout = fixture(CHECKS.replace("      - uses: actions/checkout@v6\n", ""));
  process.chdir(path.dirname(missingCheckout));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: missingCheckout,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions checks must check out the repository before running npm scripts." }],
      },
    ],
  });

  const lateInstall = fixture(
    CHECKS.replace("      - run: npm ci\n", "").replace(
      "      - run: npm run build",
      "      - run: npm run build\n      - run: npm ci",
    ),
  );
  process.chdir(path.dirname(lateInstall));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: lateInstall,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions checks must install dependencies with npm ci." }],
      },
    ],
  });

  const missingInstall = fixture(CHECKS.replace("      - run: npm ci\n", ""));
  process.chdir(path.dirname(missingInstall));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: missingInstall,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions checks must install dependencies with npm ci." }],
      },
    ],
  });
});

void describe("A repository using GitHub Actions MUST run npm run format, npm run lint, npm run typecheck, and npm run test:unit:coverage:check; if a build script exists, CI MUST also run npm run build.", () => {
  const missingCoverage = fixture(
    CHECKS.replace("      - run: npm run test:unit:coverage:check", "      - run: npm run test:unit:coverage"),
  );
  process.chdir(path.dirname(missingCoverage));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: missingCoverage,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions checks must run npm run test:unit:coverage:check." }],
      },
    ],
  });

  const missingBuild = fixture(CHECKS.replace("      - run: npm run build", ""));
  process.chdir(path.dirname(missingBuild));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: missingBuild,
        code: PACKAGE_JSON,
        errors: [{ message: "GitHub Actions checks must run npm run build." }],
      },
    ],
  });

  const noBuildScript = fixture(CHECKS.replace("      - run: npm run build", ""));
  process.chdir(path.dirname(noBuildScript));
  const { build: _build, ...appScripts } = SCRIPTS;
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [{ filename: noBuildScript, code: JSON.stringify({ scripts: appScripts }) }],
    invalid: [],
  });
});

void describe("A repository using GitHub Actions MUST declare test:unit:coverage:check as a script that disables coverage threshold auto-updates and checks the Git diff after running aggregate coverage.", () => {
  const broken = fixture(CHECKS);
  process.chdir(path.dirname(broken));
  packageJsonRuleTester.run("ci-checks", ciChecksRule, {
    valid: [],
    invalid: [
      {
        filename: broken,
        code: JSON.stringify({
          scripts: { ...SCRIPTS, "test:unit:coverage:check": "npm run test:unit:coverage" },
        }),
        errors: [
          {
            message:
              "package.json must declare test:unit:coverage:check that runs coverage with autoUpdate=false and verifies no Git diff.",
          },
        ],
      },
    ],
  });
});
