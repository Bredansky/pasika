import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { uniqueUtilityDefinitionRule } from "./unique-utility-definition";

function fixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-owners-")));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, "src", name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

void describe("Every custom @utility name MUST have one stylesheet owner across the project CSS files.", () => {
  const duplicate = fixture({
    "app/styles/globals.css": '@import "tailwindcss";\n@import "./a.css";\n@import "./b.css";',
    "app/styles/a.css": "@utility surface-panel { @apply bg-red-500; }",
    "app/styles/b.css": "@utility surface-panel { @apply bg-blue-500; }",
  });
  const originalDirectory = process.cwd();
  process.chdir(duplicate);
  try {
    tailwindRuleTester.run("unique-utility-definition", uniqueUtilityDefinitionRule, {
      valid: [
        {
          code: "@utility surface-panel { @apply bg-red-500; }",
          filename: path.join(duplicate, "src/app/styles/a.css"),
        },
      ],
      invalid: [
        {
          code: "@utility surface-panel { @apply bg-blue-500; }",
          filename: path.join(duplicate, "src/app/styles/b.css"),
          errors: [
            {
              message: `Custom utility "surface-panel" is also defined in ${path.join("app", "styles", "a.css")}; one utility must have one stylesheet owner.`,
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
