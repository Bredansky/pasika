import { describe, ruleTester, srcFile } from "../rule-tester";
import { noVitestEnvironmentDirectiveRule } from "./no-vitest-environment-directive";

// Keep the pragma out of this test file as one literal: Vitest itself scans
// its source and would interpret it as a file-level environment override.
const directive = ["@vitest", "-environment"].join("");
const message = `Use the .dom.test.tsx/.dom.spec.tsx filename convention and the jsdom Vitest project instead of ${directive} directives.`;

void describe("A Next.js application MUST NOT select the Vitest environment with a per-file directive.", () => {
  ruleTester.run("no-vitest-environment-directive", noVitestEnvironmentDirectiveRule, {
    valid: [
      { filename: srcFile("features/card/card.dom.test.tsx"), code: "render(<Card />);" },
      { filename: srcFile("features/card/card.test.tsx"), code: "expect(1).toBe(1);" },
      { filename: srcFile("features/card/card.dom.spec.tsx"), code: "render(<Card />);" },
      { filename: srcFile("features/card/card.test.ts"), code: `const sample = "${directive} jsdom";` },
      { filename: srcFile("features/card/card.tsx"), code: `// ${directive} jsdom\nexport const Card = () => null;` },
      { filename: "scripts/check.ts", code: `// ${directive} jsdom\nexport const check = true;` },
    ],
    invalid: [
      {
        filename: srcFile("features/card/card.test.tsx"),
        code: `// ${directive} jsdom\nexpect(1).toBe(1);`,
        errors: [{ message }],
      },
      {
        filename: srcFile("features/card/card.dom.test.tsx"),
        code: `/* ${directive} jsdom */\nrender(<Card />);`,
        errors: [{ message }],
      },
      {
        filename: srcFile("features/card/card.spec.ts"),
        code: `// ${directive} node\nexpect(1).toBe(1);`,
        errors: [{ message }],
      },
    ],
  });
});
