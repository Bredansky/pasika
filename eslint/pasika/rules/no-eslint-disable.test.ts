import { describe, ruleTester } from "../rule-tester";
import { noEslintDisableRule } from "./no-eslint-disable";

const MESSAGE = "Do not use eslint-disable directives; fix the reported violation instead.";

void describe("Code MUST NOT use eslint-disable directives, and a reported violation MUST be fixed instead.", () => {
  ruleTester.run("no-eslint-disable", noEslintDisableRule, {
    valid: [
      {
        code: "export function HomePage() { return <div />; }\n",
        filename: "src/features/home/home-page.tsx",
      },
    ],
    invalid: [
      {
        code: "// eslint-disable-next-line no-console\nconsole.log(\"hi\");\n",
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
      {
        code: "/* eslint-disable no-unused-vars */\nconst unused = 1;\n",
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
