import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compile } from "tailwindcss";
import { expect, it } from "vitest";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeModeRule } from "./theme-mode";

const GLOBAL = '@import "tailwindcss";\n@theme { --*: initial; }\n';
const DARK = '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));';
const MIDNIGHT = '@custom-variant midnight (&:where([data-theme="midnight"], [data-theme="midnight"] *));';
const WRONG_MODE =
  'Theme variant "midnight" must match both [data-theme="midnight"] and its descendants with &:where(...).';
const WRONG_DARK = 'Theme variant "dark" must match both [data-theme="dark"] and its descendants with &:where(...).';
const DIRECT =
  "Use a data-theme @custom-variant for mode-specific styles; direct [data-theme] selectors are not allowed.";
const CLASS = "Use the data-theme @custom-variant instead of a .dark CSS selector.";
const MEDIA =
  "Use data-theme with @custom-variant for mode styling; resolve system preferences in application code, not a prefers-color-scheme CSS media query.";

function fixture(files: Record<string, string> = {}): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-mode-")));
  for (const [relative, source] of Object.entries(files)) {
    const absolute = path.join(root, "src", relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, source);
  }
  return root;
}

void describe("Appearance modes MUST use `data-theme` and a canonical `@custom-variant` in `globals.css` named for the `data-theme` value (`dark`, `midnight`, etc.) and targeting the themed element and its descendants; mode-specific CSS declarations MUST use the registered `@variant` directive instead of direct `[data-theme]` style rules, `.dark` selectors, or CSS `prefers-color-scheme` queries.", () => {
  const root = fixture({ "app/layout.tsx": '<html data-theme="ocean" />;' });
  const globals = path.join(root, "src", "app", "styles", "globals.css");
  const home = path.join(root, "src", "app", "styles", "home.css");
  mkdirSync(path.dirname(globals), { recursive: true });
  writeFileSync(globals, `${GLOBAL + DARK}\n${MIDNIGHT}`);
  const original = process.cwd();
  process.chdir(root);
  try {
    tailwindRuleTester.run("theme-mode", themeModeRule, {
      valid: [
        { filename: globals, code: `${GLOBAL + DARK}\n${MIDNIGHT}` },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`,
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant ocean (&:where([data-theme=ocean], [data-theme=ocean] *));`,
        },
        { filename: globals, code: `${GLOBAL}@custom-variant hocus (&:hover, &:focus);` },
        {
          filename: globals,
          code: `${GLOBAL + DARK}\n:root { --color-primary-canvas: white; @variant dark { --color-primary-canvas: black; } }\n@theme inline { --color-primary-canvas: var(--color-primary-canvas); }`,
        },
        {
          filename: home,
          code: ":root { --color-primary-canvas: white; @variant dark { --color-primary-canvas: black; } }",
        },
        {
          filename: home,
          code: ":root { --color-primary-canvas: white; @variant midnight { --color-primary-canvas: black; } }",
        },
        { filename: home, code: "@theme { --color-home-canvas: #123456; }" },
        {
          filename: home,
          code: ':root { --radius-control: 8px; } [data-density="compact"] { --radius-control: 4px; }',
        },
        { filename: home, code: "@media (min-width: 800px) { .card { padding: 2rem; } }" },
      ],
      invalid: [
        {
          filename: globals,
          code: `${GLOBAL}:root { @variant dark { --color-primary-canvas: black; } }`,
          errors: [{ message: 'CSS @variant "dark" requires a matching @custom-variant declaration in globals.css.' }],
        },
        {
          filename: home,
          code: ":root { @variant ocean { --color-primary-canvas: blue; } }",
          errors: [{ message: 'CSS @variant "ocean" requires a matching @custom-variant declaration in globals.css.' }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant dark (&:where(.dark, .dark *));`,
          errors: [{ message: WRONG_DARK }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant midnight (&:where([data-theme="midnight"] *));`,
          errors: [{ message: WRONG_MODE }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant midnight (&:where([data-theme="ocean"], [data-theme="ocean"] *));`,
          errors: [{ message: 'Theme variant "midnight" must be named "ocean" to match its data-theme selector.' }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant theme-midnight (&:where([data-theme="midnight"], [data-theme="midnight"] *));`,
          errors: [
            { message: 'Theme variant "theme-midnight" must be named "midnight" to match its data-theme selector.' },
          ],
        },
        {
          filename: globals,
          code: `${GLOBAL + DARK}\n${DARK}`,
          errors: [{ message: 'Theme variant "dark" is already defined in globals.css.' }],
        },
        {
          filename: home,
          code: MIDNIGHT,
          errors: [{ message: "Declare appearance-mode @custom-variant definitions in globals.css only." }],
        },
        {
          filename: home,
          code: '[data-theme="midnight"] { --color-primary-canvas: black; }',
          errors: [{ message: DIRECT }],
        },
        {
          filename: globals,
          code: ":root[data-theme=dark] { background-color: black; }",
          errors: [{ message: DIRECT }],
        },
        {
          filename: home,
          code: ".dark .card { color: white; }",
          errors: [{ message: CLASS }],
        },
        {
          filename: home,
          code: "@media (prefers-color-scheme: dark) { :root { --color-primary-canvas: black; } }",
          errors: [{ message: MEDIA }],
        },
      ],
    });
  } finally {
    process.chdir(original);
  }
});

void describe("Mode-specific Tailwind classes require their registered data-theme custom variants.", () => {
  const root = fixture({
    "features/home/ui.tsx": 'export const ui = <div className="dark:bg-base-canvas midnight:text-base-ink" />;',
    "app/layout.tsx": '<html data-theme="midnight" />;',
  });
  const globals = path.join(root, "src", "app", "styles", "globals.css");
  const original = process.cwd();
  process.chdir(root);
  try {
    tailwindRuleTester.run("theme-mode-references", themeModeRule, {
      valid: [{ filename: globals, code: `${GLOBAL + DARK}\n${MIDNIGHT}` }],
      invalid: [
        {
          filename: globals,
          code: GLOBAL,
          errors: [
            {
              message:
                'Theme utility prefix "dark:" requires a matching @custom-variant in globals.css; Tailwind\'s default media-based dark mode is not allowed.',
            },
            {
              message:
                'Theme utility prefix "midnight:" requires a matching @custom-variant in globals.css; Tailwind\'s default media-based dark mode is not allowed.',
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(original);
  }
});

it("Tailwind compiles a data-theme @variant override into a runtime semantic color", async () => {
  const input = [
    "@tailwind utilities;",
    DARK,
    ":root { --color-primary-canvas: #fafafa; @variant dark { --color-primary-canvas: #18181b; } }",
    "@theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
  ].join("\n");
  const compiled = await compile(input);
  const output = compiled.build(["bg-primary-canvas"]);
  expect(output).toContain(".bg-primary-canvas");
  expect(output).toContain("background-color: var(--color-primary-canvas)");
  expect(output).toContain("--color-primary-canvas: #fafafa");
  expect(output).toContain("--color-primary-canvas: #18181b");
  expect(output).toContain(":where([data-theme=");
  expect(output).not.toContain("@variant dark");
});

it("Tailwind compiles a bare named data-theme variant for utilities", async () => {
  const input = ["@tailwind utilities;", MIDNIGHT, "@theme { --color-midnight-canvas: #18181b; }"].join("\n");
  const compiled = await compile(input);
  const output = compiled.build(["midnight:bg-midnight-canvas"]);
  expect(output).toContain("midnight\\:bg-midnight-canvas");
  expect(output).toContain("[data-theme=");
});
