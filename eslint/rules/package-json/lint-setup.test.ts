import { describe, packageJsonRuleTester } from "./rule-tester";
import { lintSetupRule } from "./lint-setup";

const COMPLETE_SCRIPTS = { lint: "eslint .", format: "prettier --check ." };
const COMPLETE_LINT_STAGED = {
  "*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}": "eslint --fix",
  "*.{css,md,json}": "prettier --write",
};

void describe("A repository MUST declare a lint script in package.json that runs ESLint across the repository.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [
      { code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) },
      {
        code: JSON.stringify({
          scripts: { lint: "npx eslint . --max-warnings 0", format: "prettier --check ." },
          "lint-staged": { "*.ts": ["prettier --write", "npx eslint --fix"] },
        }),
      },
    ],
    invalid: [
      {
        code: JSON.stringify({ scripts: { format: "prettier --check ." }, "lint-staged": COMPLETE_LINT_STAGED }),
        errors: [
          {
            message:
              'package.json must declare a "lint" script that runs ESLint across the repository (e.g. "eslint .").',
          },
        ],
      },
      {
        code: JSON.stringify({
          scripts: { lint: "eslint src", format: "prettier --check ." },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message:
              'package.json must declare a "lint" script that runs ESLint across the repository (e.g. "eslint .").',
          },
        ],
      },
    ],
  });
});

void describe("A repository MUST declare a format script in package.json that runs prettier --check across the repository.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [
      { code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) },
      {
        code: JSON.stringify({
          scripts: { lint: "eslint .", format: "npx prettier --check . --ignore-unknown" },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
      },
    ],
    invalid: [
      {
        code: JSON.stringify({ scripts: { lint: "eslint ." }, "lint-staged": COMPLETE_LINT_STAGED }),
        errors: [
          {
            message: 'package.json must declare a "format" script that runs prettier --check across the repository.',
          },
        ],
      },
      {
        // writes instead of checking
        code: JSON.stringify({
          scripts: { lint: "eslint .", format: "prettier --write ." },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message: 'package.json must declare a "format" script that runs prettier --check across the repository.',
          },
        ],
      },
      {
        // scoped to one folder instead of the repository
        code: JSON.stringify({
          scripts: { lint: "eslint .", format: "prettier --check src" },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message: 'package.json must declare a "format" script that runs prettier --check across the repository.',
          },
        ],
      },
    ],
  });
});

void describe("A repository MUST configure lint-staged in package.json to run ESLint directly for staged JavaScript or TypeScript files.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [{ code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) }],
    invalid: [
      {
        code: JSON.stringify({ scripts: COMPLETE_SCRIPTS }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
          { message: "package.json lint-staged must run prettier for staged files ESLint does not already format." },
        ],
      },
      {
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": { "*.ts": "npm run lint", "*.md": "prettier --write" },
        }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
        ],
      },
      {
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": { "*.md": "eslint --fix" },
        }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
          { message: "package.json lint-staged must run prettier for staged files ESLint does not already format." },
        ],
      },
    ],
  });
});

void describe("A repository MUST configure lint-staged in package.json to run prettier for staged files ESLint does not already format.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [{ code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) }],
    invalid: [
      {
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": { "*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}": "eslint --fix" },
        }),
        errors: [
          { message: "package.json lint-staged must run prettier for staged files ESLint does not already format." },
        ],
      },
    ],
  });
});
