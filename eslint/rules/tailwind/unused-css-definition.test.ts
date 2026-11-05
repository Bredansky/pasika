import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { unusedCssDefinitionRule } from "./unused-css-definition";

const GLOBALS = [
  '@import "tailwindcss";',
  "@theme inline {",
  "  --*: initial;",
  "  --spacing: 0.25rem;",
  "  --breakpoint-md: 48rem;",
  "  --font-sans: Arial, sans-serif;",
  "  --color-used-canvas: #ffffff;",
  "  --color-used-in-css: #eeeeee;",
  "  --color-used-in-js: #cccccc;",
  "  --color-unused-ink: #111111;",
  "  --animate-wave: wave 1s ease-in-out infinite;",
  "}",
  "@utility primary-surface { @apply bg-(--primary-canvas); }",
  "@utility secondary-surface { @apply bg-(--secondary-canvas); }",
  "@utility dead-surface { @apply bg-(--dead-canvas); }",
  "@utility primary { @apply px-1; }",
  "@keyframes wave { to { opacity: 1; } }",
  "@keyframes from-css { to { opacity: 0.5; } }",
  "@keyframes from-js { to { opacity: 0.5; } }",
  "@keyframes unused-slide { to { transform: translateX(1px); } }",
].join("\n");

const FEATURE = [
  ".badge { animation: from-css 2s linear; color: var(--color-used-in-css); }",
  "@apply secondary-surface;",
  "@utility orphan-feature { @apply px-2; }",
].join("\n");

const FIXTURE: Record<string, string> = {
  "app/styles/globals.css": GLOBALS,
  "app/styles/feature.css": FEATURE,
  "components/demo.tsx": [
    'export const cls = "bg-used-canvas animate-wave md:text-lg primary-surface";',
    'export const animation = "from-js";',
    'export const cssVariable = "--color-used-in-js";',
  ].join("\n"),
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unused-css-definition-")));
for (const [relativePath, content] of Object.entries(FIXTURE)) {
  const filename = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content);
}
process.chdir(root);

const globalsPath = path.join(root, "src", "app", "styles", "globals.css");
const featurePath = path.join(root, "src", "app", "styles", "feature.css");
const removeUnused = (code: string): string =>
  code
    .replace("  --color-unused-ink: #111111;\n", "")
    .replace("@utility dead-surface { @apply bg-(--dead-canvas); }\n", "")
    .replace("@utility primary { @apply px-1; }\n", "")
    .replace("@keyframes unused-slide { to { transform: translateX(1px); } }", "");

void describe("Custom `@utility` declarations, non-foundational `@theme inline` tokens, and custom `@keyframes` MUST have a static reference in project CSS or source; unused definitions MUST be removed.", () => {
  tailwindRuleTester.run("unused-css-definition", unusedCssDefinitionRule, {
    valid: [{ code: removeUnused(GLOBALS), filename: globalsPath }],
    invalid: [
      {
        code: GLOBALS,
        filename: globalsPath,
        errors: [
          { message: 'Theme token "--color-unused-ink" is never referenced by project CSS or source.' },
          { message: 'Custom utility "dead-surface" is never referenced by project CSS or source.' },
          { message: 'Custom utility "primary" is never referenced by project CSS or source.' },
          { message: '@keyframes "unused-slide" is never referenced by project CSS or source.' },
        ],
      },
      {
        code: FEATURE,
        filename: featurePath,
        errors: [{ message: 'Custom utility "orphan-feature" is never referenced by project CSS or source.' }],
      },
    ],
  });
});
