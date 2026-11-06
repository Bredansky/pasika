import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeTokenOrderRule } from "./theme-token-order";

void describe("CSS definitions MUST be grouped by consuming component paths, with groups and definitions sorted alphabetically.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-consumers-")));
  const cssFile = path.join(fixture, "src", "app", "styles", "home.css");
  const outsideSrc = path.join(fixture, "styles", "global.css");
  const hero = path.join(fixture, "src", "components", "hero.tsx");
  const card = path.join(fixture, "src", "components", "card.tsx");
  mkdirSync(path.dirname(cssFile), { recursive: true });
  mkdirSync(path.dirname(outsideSrc), { recursive: true });
  mkdirSync(path.dirname(hero), { recursive: true });
  writeFileSync(hero, '<div className="bg-brand alpha beta shared" />');
  writeFileSync(card, '<div className="shared" />');
  writeFileSync(cssFile, "");

  const previous = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("theme-token-order", themeTokenOrderRule, {
      valid: [
        {
          filename: cssFile,
          code: ["@theme inline {", "  /* Group: src/components/hero.tsx */", "  --color-brand: #123456;", "}"].join(
            "\n",
          ),
        },
        {
          filename: cssFile,
          code: "/* Group: global */\n.orphan { color: white; }",
        },
        {
          filename: cssFile,
          code: [
            "/* Group: src/components/card.tsx, src/components/hero.tsx */",
            "@utility shared { @apply [display:grid]; }",
            "/* Group: src/components/hero.tsx */",
            "@utility alpha { @apply [display:block]; }",
            "@utility beta { @apply [display:inline]; }",
            "/* Group: global */",
            "@keyframes shimmer { to { opacity: 0; } }",
          ].join("\n"),
        },
        {
          filename: cssFile,
          code: "/* src/components/hero.tsx */\n@utility alpha { @apply [display:block]; }",
        },
        {
          filename: cssFile,
          code: "/* Group: global */\n:root { --theme-label: blue; }",
        },
        {
          filename: outsideSrc,
          code: "/* Group: global */\n@keyframes fade { to { opacity: 0; } }",
        },
        {
          filename: outsideSrc,
          code: "/* Group: global */\n@font-face { font-family: Example; src: url(example.woff2); }",
        },
        {
          filename: cssFile,
          code: "/* Group: src/components/hero.tsx */\n@utility alpha { @apply [display:block]; }",
        },
      ],
      invalid: [
        {
          filename: outsideSrc,
          code: "@keyframes fade { to { opacity: 0; } }",
          errors: [
            { message: 'CSS definition "fade" requires a component-path group comment (or /* Group: global */).' },
          ],
        },
        {
          filename: cssFile,
          code: [
            "/* Group: src/components/hero.tsx */",
            "@utility alpha { @apply [display:block]; }",
            "/* Group: src/components/card.tsx, src/components/hero.tsx */",
            "@utility shared { @apply [display:grid]; }",
          ].join("\n"),
          errors: [{ message: "CSS consumer groups in utility must be ordered alphabetically by path." }],
        },
        {
          filename: cssFile,
          code: [
            "/* Group: src/components/hero.tsx */",
            "@utility alpha { @apply [display:block]; }",
            "@utility shared { @apply [display:grid]; }",
          ].join("\n"),
          errors: [
            {
              message:
                'CSS definition "shared" belongs to group "src/components/card.tsx, src/components/hero.tsx", not "src/components/hero.tsx".',
            },
          ],
        },
        {
          filename: cssFile,
          code: ["/* Group: src/components/card.tsx */", "@utility alpha { @apply [display:block]; }"].join("\n"),
          output: ["/* Group: src/components/hero.tsx */", "@utility alpha { @apply [display:block]; }"].join("\n"),
          errors: [
            {
              message:
                'CSS definition "alpha" belongs to group "src/components/hero.tsx", not "src/components/card.tsx".',
            },
          ],
        },
        {
          filename: cssFile,
          code: [
            "/* Group: src/components/hero.tsx */",
            "@utility beta { @apply [display:inline]; }",
            "@utility alpha { @apply [display:block]; }",
          ].join("\n"),
          errors: [
            {
              message:
                'CSS definitions in group "src/components/hero.tsx" must be alphabetical: "alpha" comes before "beta".',
            },
          ],
        },
        {
          filename: cssFile,
          code: "@utility alpha { @apply [display:block]; }",
          errors: [
            { message: 'CSS definition "alpha" requires a component-path group comment (or /* Group: global */).' },
          ],
        },
      ],
    });
  } finally {
    process.chdir(previous);
  }
});
