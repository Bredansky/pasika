import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cssConsumerGroupsRule } from "./css-consumer-groups";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Opt-in CSS consumer groups MUST name their consuming components and sort definitions alphabetically.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-consumers-")));
  const cssFile = path.join(fixture, "src", "app", "styles", "home.css");
  const hero = path.join(fixture, "src", "components", "hero.tsx");
  const card = path.join(fixture, "src", "components", "card.tsx");
  mkdirSync(path.dirname(cssFile), { recursive: true });
  mkdirSync(path.dirname(hero), { recursive: true });
  writeFileSync(hero, '<div className="bg-brand alpha beta shared" />');
  writeFileSync(card, '<div className="shared" />');
  writeFileSync(cssFile, "");

  const previous = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("css-consumer-groups", cssConsumerGroupsRule, {
      valid: [
        {
          filename: cssFile,
          code: [
            "/* @pasika-component-groups */",
            "@theme inline {",
            "  /* Group: src/components/hero.tsx */",
            "  --color-brand: #123456;",
            "}",
          ].join("\n"),
        },
        {
          filename: cssFile,
          code: "/* @pasika-component-groups */\n/* Group: global */\n.orphan { color: white; }",
        },
        {
          filename: cssFile,
          code: [
            "/* @pasika-component-groups */",
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
          code: "/* @pasika-component-groups */\n/* src/components/hero.tsx */\n@utility alpha { @apply [display:block]; }",
        },
        {
          filename: cssFile,
          code: "/* @pasika-component-groups */\n/* Group: global */\n:root { --theme-label: blue; }",
        },
        {
          filename: cssFile,
          code: "@utility alpha { @apply [display:block]; }",
        },
      ],
      invalid: [
        {
          filename: cssFile,
          code: [
            "/* @pasika-component-groups */",
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
            "/* @pasika-component-groups */",
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
          code: [
            "/* @pasika-component-groups */",
            "/* Group: src/components/card.tsx */",
            "@utility alpha { @apply [display:block]; }",
          ].join("\n"),
          output: [
            "/* @pasika-component-groups */",
            "/* Group: src/components/hero.tsx */",
            "@utility alpha { @apply [display:block]; }",
          ].join("\n"),
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
            "/* @pasika-component-groups */",
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
          code: "/* @pasika-component-groups */\n@utility alpha { @apply [display:block]; }",
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
