import { describe, packageJsonRuleTester } from "./rule-tester";
import { lintSetupRule } from "./lint-setup";

const LINT_SCRIPT = { lint: "eslint ." };
const STAGED_ESLINT = { "*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}": "eslint --fix" };

void describe("A repository MUST declare a lint script in package.json that runs ESLint across the repository.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [
      { code: JSON.stringify({ scripts: LINT_SCRIPT, "lint-staged": STAGED_ESLINT }) },
      {
        code: JSON.stringify({
          scripts: { lint: "npx eslint . --max-warnings 0" },
          "lint-staged": { "*.ts": ["prettier --write", "npx eslint --fix"] },
        }),
      },
    ],
    invalid: [
      {
        code: JSON.stringify({ "lint-staged": STAGED_ESLINT }),
        errors: [
          {
            message:
              'package.json must declare a "lint" script that runs ESLint across the repository (e.g. "eslint .").',
          },
        ],
      },
      {
        code: JSON.stringify({ scripts: { lint: "eslint src" }, "lint-staged": STAGED_ESLINT }),
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

void describe("A repository MUST configure lint-staged in package.json to run ESLint directly for staged JavaScript or TypeScript files.", () => {
  packageJsonRuleTester.run("lint-setup", lintSetupRule, {
    valid: [{ code: JSON.stringify({ scripts: LINT_SCRIPT, "lint-staged": STAGED_ESLINT }) }],
    invalid: [
      {
        code: JSON.stringify({ scripts: LINT_SCRIPT }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
        ],
      },
      {
        code: JSON.stringify({ scripts: LINT_SCRIPT, "lint-staged": { "*.ts": "npm run lint" } }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
        ],
      },
      {
        code: JSON.stringify({ scripts: LINT_SCRIPT, "lint-staged": { "*.md": "eslint --fix" } }),
        errors: [
          { message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files." },
        ],
      },
    ],
  });
});
