import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import { configBaselineRule } from "./config-baseline";

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });

void describe("A repository MUST take its lint, format, and TypeScript configuration from zirka and its rules from pasika rather than restating them locally.", () => {
  ruleTester.run("config-baseline", configBaselineRule, {
    valid: [
      {
        filename: "eslint.config.ts",
        code: `import { styleguide } from "zirka"; export default styleguide({}).eslintConfig;`,
      },
    ],
    invalid: [
      {
        filename: "eslint.config.ts",
        code: `export default {};`,
        errors: [{ message: "ESLint config must reference zirka. Use the pasika/zirka baseline configuration." }],
      },
    ],
  });

  // Non-eslint-config files should not trigger the rule
  void it("ignores non-eslint-config files", () => {
    const linter = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });
    linter.run("config-baseline", configBaselineRule, {
      valid: [{ filename: "src/app.ts", code: `console.log("hello");` }],
      invalid: [],
    });
  });
});
