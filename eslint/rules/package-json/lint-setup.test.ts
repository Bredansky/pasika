import { describe, packageJsonRuleTester } from "./rule-tester";
import { lintSetupRule } from "./lint-setup";

const COMPLETE_SCRIPTS = {
  lint: "eslint .",
  "lint:staged": "eslint --fix",
  format: "prettier --check .",
  "format:staged": "prettier --write",
};
const COMPLETE_LINT_STAGED = {
  "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint:staged --",
  "*.{css,json,md}": ["npm run lint:staged --", "npm run format:staged --"],
};

void describe("A repository MUST declare a lint script in package.json that runs ESLint across the repository.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [
      { code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) },
      {
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, lint: "npx eslint . --max-warnings 0" },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
      },
    ],
    invalid: [
      {
        code: JSON.stringify({
          scripts: { "lint:staged": "eslint --fix", format: "prettier --check .", "format:staged": "prettier --write" },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message:
              'package.json must declare a "lint" script that runs ESLint across the repository (e.g. "eslint .").',
          },
        ],
      },
      {
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, lint: "eslint src" },
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
          scripts: { ...COMPLETE_SCRIPTS, format: "npx prettier --check . --ignore-unknown" },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
      },
    ],
    invalid: [
      {
        // writes instead of checking
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, format: "prettier --write ." },
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
          scripts: { ...COMPLETE_SCRIPTS, format: "prettier --check src" },
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

void describe("A repository MUST declare a lint:staged script in package.json that runs ESLint with no repository-wide argument, and configure lint-staged to run it (npm run lint:staged --) for staged JavaScript, TypeScript, CSS, Markdown, and JSON files.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [{ code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) }],
    invalid: [
      {
        // lint:staged script missing entirely, and lint-staged has no entry for it either
        code: JSON.stringify({
          scripts: { lint: "eslint .", format: "prettier --check .", "format:staged": "prettier --write" },
          "lint-staged": { "*.{css,json,md}": "npm run format:staged --" },
        }),
        errors: [
          {
            message:
              'package.json must declare a "lint:staged" script that runs ESLint with no repository-wide argument (e.g. "eslint --fix").',
          },
          {
            message:
              'package.json lint-staged must run "npm run lint:staged --" for staged JavaScript, TypeScript, CSS, Markdown, and JSON files.',
          },
        ],
      },
      {
        // lint:staged carries the same repository-wide argument as lint
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, "lint:staged": "eslint --fix ." },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message:
              'package.json must declare a "lint:staged" script that runs ESLint with no repository-wide argument (e.g. "eslint --fix").',
          },
        ],
      },
      {
        // lint-staged reuses the repository-wide "lint" script instead of "lint:staged"
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": {
            "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint --",
            "*.{css,json,md}": "npm run format:staged --",
          },
        }),
        errors: [
          {
            message:
              'package.json lint-staged must run "npm run lint:staged --" for staged JavaScript, TypeScript, CSS, Markdown, and JSON files.',
          },
        ],
      },
      {
        // source files are linted, but Markdown/JSON/CSS bypass ESLint
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": {
            "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint:staged --",
            "*.{css,json,md}": "npm run format:staged --",
          },
        }),
        errors: [
          {
            message:
              'package.json lint-staged must run "npm run lint:staged --" for staged JavaScript, TypeScript, CSS, Markdown, and JSON files.',
          },
        ],
      },
    ],
  });
});

void describe("A repository MUST declare a format:staged script in package.json that runs prettier with no repository-wide argument, and configure lint-staged to run it (npm run format:staged --) for staged CSS, Markdown, and JSON files.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [{ code: JSON.stringify({ scripts: COMPLETE_SCRIPTS, "lint-staged": COMPLETE_LINT_STAGED }) }],
    invalid: [
      {
        // format:staged script missing entirely, and lint-staged has no entry for it either
        code: JSON.stringify({
          scripts: { lint: "eslint .", "lint:staged": "eslint --fix", format: "prettier --check ." },
          "lint-staged": {
            "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint:staged --",
            "*.{css,json,md}": "npm run lint:staged --",
          },
        }),
        errors: [
          {
            message:
              'package.json must declare a "format:staged" script that runs prettier with no repository-wide argument (e.g. "prettier --write").',
          },
          {
            message:
              'package.json lint-staged must run "npm run format:staged --" for staged CSS, Markdown, and JSON files.',
          },
        ],
      },
      {
        // format:staged carries the same repository-wide argument as format
        code: JSON.stringify({
          scripts: { ...COMPLETE_SCRIPTS, "format:staged": "prettier --write ." },
          "lint-staged": COMPLETE_LINT_STAGED,
        }),
        errors: [
          {
            message:
              'package.json must declare a "format:staged" script that runs prettier with no repository-wide argument (e.g. "prettier --write").',
          },
        ],
      },
      {
        // lint-staged reuses the repository-wide "format" script instead of "format:staged"
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": {
            "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": "npm run lint:staged --",
            "*.{css,json,md}": ["npm run lint:staged --", "npm run format --"],
          },
        }),
        errors: [
          {
            message:
              'package.json lint-staged must run "npm run format:staged --" for staged CSS, Markdown, and JSON files.',
          },
        ],
      },
      {
        // format:staged exists, but is wired only to source files
        code: JSON.stringify({
          scripts: COMPLETE_SCRIPTS,
          "lint-staged": {
            "*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}": ["npm run lint:staged --", "npm run format:staged --"],
            "*.{css,json,md}": "npm run lint:staged --",
          },
        }),
        errors: [
          {
            message:
              'package.json lint-staged must run "npm run format:staged --" for staged CSS, Markdown, and JSON files.',
          },
        ],
      },
    ],
  });
});
