import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeModeRule } from "./theme-mode";

const GLOBAL = '@import "tailwindcss";\n@theme { --*: initial; }\n';
const DARK = '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));';
const MIDNIGHT = '@custom-variant theme-midnight (&:where([data-theme="midnight"], [data-theme="midnight"] *));';
const WRONG_MODE =
  'Theme variant "theme-midnight" must match both [data-theme="midnight"] and its descendants with &:where(...).';
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

void describe("Appearance modes MUST use `data-theme` and a canonical `@custom-variant` in `globals.css` (`dark` for dark mode, `theme-<mode>` otherwise) targeting the themed element and its descendants; direct `[data-theme]` style rules, `.dark` selectors, and CSS `prefers-color-scheme` queries MUST NOT style modes.", () => {
  const root = fixture();
  const globals = path.join(root, "src", "app", "styles", "globals.css");
  const home = path.join(root, "src", "app", "styles", "home.css");
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
          code: `${GLOBAL}@custom-variant theme-ocean (&:where([data-theme=ocean], [data-theme=ocean] *));`,
        },
        { filename: globals, code: `${GLOBAL}@custom-variant hocus (&:hover, &:focus);` },
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
          code: `${GLOBAL}@custom-variant dark (&:where(.dark, .dark *));`,
          errors: [{ message: WRONG_DARK }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant theme-midnight (&:where([data-theme="midnight"] *));`,
          errors: [{ message: WRONG_MODE }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant theme-midnight (&:where([data-theme="ocean"], [data-theme="ocean"] *));`,
          errors: [{ message: WRONG_MODE }],
        },
        {
          filename: globals,
          code: `${GLOBAL}@custom-variant midnight (&:where([data-theme="midnight"], [data-theme="midnight"] *));`,
          errors: [{ message: 'A data-theme variant must be named dark or theme-<mode>, not "midnight".' }],
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
    "features/home/ui.tsx": 'export const ui = <div className="dark:bg-base-canvas theme-midnight:text-base-ink" />;',
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
                'Theme utility prefix "theme-midnight:" requires a matching @custom-variant in globals.css; Tailwind\'s default media-based dark mode is not allowed.',
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(original);
  }
});
