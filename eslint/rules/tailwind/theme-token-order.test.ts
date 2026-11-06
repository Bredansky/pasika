import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeTokenOrderRule } from "./theme-token-order";

const globals = path.resolve("src/app/styles/globals.css");
const feature = path.resolve("src/app/styles/home.css");

void describe("Global `@theme inline` tokens MUST be ordered by purpose-based groups, with keys sorted alphabetically within each group.", () => {
  tailwindRuleTester.run("theme-token-order", themeTokenOrderRule, {
    valid: [
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  /* Color primitives */
  --accent: 330 85% 60%;
  --primary: 290 80% 65%;
  /* Semantic colors */
  --color-accent-canvas: hsl(var(--accent));
  --color-primary-canvas: hsl(var(--primary));
  /* Fixed and brand colors */
  --color-twitch-canvas: #9146ff;
  /* Typography */
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.5;
  /* Spacing and sizing */
  --spacing: 0.25rem;
  --spacing-panel: 12px;
  /* Animations */
  --animate-fade: fade 2s linear infinite;
}`,
      },
      {
        filename: globals,
        code: "@theme inline { --*: initial; --spacing: 0.25rem; }",
      },
      {
        filename: feature,
        code: `@theme inline {
  --spacing-home: 14px;
  --color-home-canvas: #123456;
}`,
      },
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  /* Typography */
  --text-sm: 0.875rem;
  --text-sm--line-height: calc(1.25 / 0.875);
}`,
      },
    ],
    invalid: [
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  --color-accent-canvas: white;
  --spacing: 0.25rem;
}`,
        errors: [{ message: "Global theme tokens must use named purpose-group section comments." }],
      },
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  /* Spacing and sizing */
  --spacing-panel: 12px;
  /* Font families */
  --font-sans: Arial;
}`,
        errors: [
          {
            message:
              'Theme token "--font-sans" belongs to "Font families", which must appear before "Spacing and sizing".',
          },
        ],
      },
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  /* Semantic colors */
  --color-primary-canvas: hsl(var(--primary));
  --color-accent-canvas: hsl(var(--accent));
}`,
        errors: [
          {
            message:
              'Theme tokens in "Semantic colors" must be alphabetical: "--color-accent-canvas" goes before "--color-primary-canvas".',
          },
        ],
      },
      {
        filename: globals,
        code: `@theme inline {
  --*: initial;
  /* Semantic colors */
  --color-accent-canvas: hsl(var(--accent));
  /* Spacing and sizing */
  --font-sans: Arial;
}`,
        errors: [{ message: 'Theme token "--font-sans" belongs under the "Font families" section comment.' }],
      },
    ],
  });
});
