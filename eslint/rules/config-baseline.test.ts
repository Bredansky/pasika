import { describe, ruleTester } from "../rule-tester";
import { configBaselineRule } from "./config-baseline";

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
});
