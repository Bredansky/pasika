import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { stylesheetOrderingRule } from "./stylesheet-ordering";

const ORDER_ERROR =
  "Global stylesheet sections must be ordered: Tailwind import, one @theme inline block, feature imports, @custom-variant, :root/@variant, custom utilities, base styles, keyframes.";
const DUPLICATE_THEME_ERROR =
  "globals.css must use one @theme inline block for the reset and all global tokens; merge the theme blocks.";
const RESET_FIRST_ERROR =
  "The --*: initial reset must be the first declaration in the globals.css @theme inline block.";
const LATE_RESET_ERROR =
  "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.";

void describe("The global stylesheet entry point MUST order the Tailwind import, one `@theme inline` block containing `--*: initial` as its first declaration and all global tokens, feature stylesheet imports, `@custom-variant` definitions, `:root` variables and `@variant` overrides, custom utilities, base styles, and keyframes.", () => {
  const globals = path.resolve("src/app/styles/globals.css");
  const partial = path.resolve("src/app/styles/home.css");

  tailwindRuleTester.run("stylesheet-ordering", stylesheetOrderingRule, {
    valid: [
      {
        filename: globals,
        code: `@import "tailwindcss";

@theme inline {
  --*: initial;
  --radius-base: 8px;
  --color-base-canvas: #f8fafc;
  --color-base-ink: #0f172a;
  --color-primary-canvas: var(--color-primary-canvas);
  --font-sans: var(--font-inter, Arial);
}

@import "./home.css";
@import "./player.css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  --color-primary-canvas: #ffffff;

  @variant dark {
    --color-primary-canvas: #18181b;
  }
}

@utility clip-trapezoid {
  @apply [clip-path:polygon(0_0,_100%_0,_95%_100%,_5%_100%)];
}

@layer base {
  body {
    @apply bg-base-canvas text-base-ink;
  }
}

@keyframes fade {
  to { opacity: 1; }
}`,
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; --color-base-canvas: white; }\n@import "./home.css";',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { /* defaults */ --*: initial; --radius-base: 8px; }\n@import "./home.css";',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial }\n@import "./home.css";',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; --color-primary-canvas: var(--color-primary-canvas); }\n:root { --color-primary-canvas: white; @variant dark { --color-primary-canvas: black; } }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; --color-primary-canvas: white; }\n@utility badge { @apply inline; }',
      },
      {
        filename: partial,
        code: "@theme inline { --color-home-canvas: #123456; }\n@keyframes home-fade { to { opacity: 1; } }",
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@import "./home.css";\n:root { --font-body: Arial; }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@media (prefers-color-scheme: dark) { :root { --card-gap: 12px; } }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n.card { --card-gap: 12px; }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@supports (display: grid) { @container (width > 300px) { .card { --card-gap: 12px; } } }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@media (prefers-color-scheme: dark) { .card { color: blue; } }',
      },
    ],
    invalid: [
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@theme inline { --radius-base: 8px; }\n@import "./home.css";',
        errors: [{ message: DUPLICATE_THEME_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@import "./home.css";\n@theme inline { --color-primary-canvas: white; }',
        errors: [{ message: DUPLICATE_THEME_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --radius-base: 8px; --*: initial; }\n@import "./home.css";',
        errors: [{ message: RESET_FIRST_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --radius-base: 8px; --*: initial; }',
        errors: [{ message: RESET_FIRST_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme inline { --*: initial; --radius-base: 8px; }',
        errors: [{ message: LATE_RESET_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme inline { --radius-base: 8px; }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@theme inline { --*: initial; }\n@import "tailwindcss";',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n:root { --color-primary-canvas: white; }\n@theme inline { --*: initial; --color-primary-canvas: var(--color-primary-canvas); }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@custom-variant dark (&:where([data-theme="dark"] *));\n@theme inline { --*: initial; }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@utility badge { @apply inline; }\n@import "./home.css";',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@import "./home.css";\n@import "tailwindcss";',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n:root { --radius-base: 8px; }\n@import "./home.css";',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@keyframes fade { to { opacity: 1; } }\n@utility badge { @apply inline; }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { --*: initial; }\n@layer base { body { @apply bg-base-canvas; } }\n:root { --color-primary-canvas: white; }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@media (max-width: 600px) { .card { --card-gap: 8px; } }\n@theme inline { --*: initial; }',
        errors: [{ message: ORDER_ERROR }],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@supports (display: grid) { .card { --card-gap: 8px; } }\n@theme inline { --*: initial; }',
        errors: [{ message: ORDER_ERROR }],
      },
    ],
  });
});
