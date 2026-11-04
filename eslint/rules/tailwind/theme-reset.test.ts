import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeResetRule } from "./theme-reset";

void describe("The global stylesheet MUST reset Tailwind's default theme with `--*: initial` in `@theme inline` in `globals.css`, before importing feature stylesheets; feature stylesheets MUST NOT declare that reset.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-reset-global-")));
  const filename = (name: string): string => path.join(fixture, "src", "app", "styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("home.css"), "@theme { --*: initial; --color-home-canvas: #123456; }");

  const missingReset = "globals.css must reset Tailwind's default theme with --*: initial inside @theme inline.";
  const misplacedReset =
    "Only globals.css may reset Tailwind's default theme with --*: initial; remove it from feature stylesheets.";

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("theme-reset", themeResetRule, {
      valid: [
        { filename: filename("globals.css"), code: "@theme inline { --*: initial; }" },
        { filename: filename("globals.css"), code: "@theme inline { --*: initial }" },
        { filename: filename("globals.css"), code: "@theme inline { --*: initial; --spacing: 0.25rem; }" },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@import "./home.css";',
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --*: initial; --color-base-canvas: #fff; }",
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --*: initial; --animate-pulse: pulse 2s infinite; @keyframes pulse { 50% { opacity: 0.5; } } }",
        },
        { filename: filename("home.css"), code: "@theme inline { --color-home-canvas: #123456; }" },
        {
          filename: filename("home.css"),
          code: "@theme inline { /* --*: initial; */ --color-home-canvas: #123456; }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme { --*: initial; }",
          errors: [{ message: missingReset }],
        },
        {
          filename: filename("globals.css"),
          // The imported home.css contains a reset, but that cannot substitute for globals.css.
          code: '@import "tailwindcss";\n@import "./home.css";',
          errors: [{ message: missingReset }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme { --color-base-canvas: #fff; }",
          errors: [{ message: missingReset }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme { --*: unset; --color-base-canvas: #fff; }",
          errors: [{ message: missingReset }],
        },
        {
          filename: filename("home.css"),
          code: "@theme { --*: initial; }",
          errors: [{ message: misplacedReset }],
        },
        {
          filename: filename("home.css"),
          code: "@theme inline { --*: initial; }",
          errors: [{ message: misplacedReset }],
        },
        {
          filename: filename("home.css"),
          code: "@theme { --*: initial }",
          errors: [{ message: misplacedReset }],
        },
        {
          filename: filename("home.css"),
          code: "@theme { --*: initial; --color-home-canvas: #123456; }",
          errors: [{ message: misplacedReset }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
