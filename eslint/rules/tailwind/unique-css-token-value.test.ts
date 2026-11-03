import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { uniqueCssTokenValueRule } from "./unique-css-token-value";

function fixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-token-values-")));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "src", "app", "styles", name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  return root;
}

const files = {
  "a.css": "@theme { --color-page-canvas: #ffffff; --spacing-card: 1rem; }",
  "b.css": "@theme { --color-card-canvas: #FFF; }",
  "c.css": ":root { --spacing-panel: 1rem; }",
  "d.css": "@theme { --color-tag-ink: #222222; --color-pill-ink: #222222; }",
  "e.css": [
    ":root { --color-runtime-canvas: #123456; }",
    "@theme inline { --color-runtime-canvas: var(--color-runtime-canvas); }",
    "@media (min-width: 40rem) { :root { --color-runtime-canvas: #ffffff; } }",
    ".dark { --color-runtime-canvas: #ffffff; }",
  ].join("\n"),
  "f.css": "@theme { --color-commented-ink: #aabbcc; /* --color-fake-ink: #aabbcc; */ }",
  "g.css": "@theme inline { --color-a-canvas: var(--shared); --color-b-canvas: var(--shared); }",
  "h.css": "@theme { --color-rgb-ink: rgb(255 255 255); }",
  "i.css": "@theme { --color-hsl-ink: hsl(0 0% 100%); }",
  "j.css": "@theme { --color-alpha-one: rgba(0, 0, 0, 0.5); }",
  "k.css": "@theme { --color-alpha-two: #00000080; }",
};
const root = fixture(files);
process.chdir(root);

function atFile(name: keyof typeof files): { code: string; filename: string } {
  return { code: files[name], filename: path.join(root, "src", "app", "styles", name) };
}

void describe("Distinct `@theme` tokens and default `:root` properties MUST NOT share the same static CSS value.", () => {
  tailwindRuleTester.run("unique-css-token-value", uniqueCssTokenValueRule, {
    valid: [atFile("a.css"), atFile("e.css"), atFile("f.css"), atFile("g.css")],
    invalid: [
      {
        ...atFile("b.css"),
        errors: [
          {
            message: `Token "--color-card-canvas" duplicates the value of "--color-page-canvas" in app${
              path.sep
            }styles${path.sep}a.css:1; reuse one design token.`,
          },
        ],
      },
      {
        ...atFile("c.css"),
        errors: [
          {
            message: `Token "--spacing-panel" duplicates the value of "--spacing-card" in app${path.sep}styles${
              path.sep
            }a.css:1; reuse one design token.`,
          },
        ],
      },
      {
        ...atFile("d.css"),
        errors: [
          {
            message: `Token "--color-pill-ink" duplicates the value of "--color-tag-ink" in app${path.sep}styles${
              path.sep
            }d.css:1; reuse one design token.`,
          },
        ],
      },
    ],
  });
});

void describe("Distinct `@theme` tokens and default `:root` properties MUST NOT share the same static CSS value.", () => {
  tailwindRuleTester.run("unique-css-token-value:root", uniqueCssTokenValueRule, {
    valid: [atFile("e.css")],
    invalid: [
      {
        ...atFile("c.css"),
        errors: [
          {
            message: `Token "--spacing-panel" duplicates the value of "--spacing-card" in app${path.sep}styles${path.sep}a.css:1; reuse one design token.`,
          },
        ],
      },
    ],
  });
});

void describe("Equivalent fixed colors in different syntaxes (such as HEX, RGB, HSL, or named colors) MUST reuse the same token or a semantic alias when equivalence can be established without rounding or changing precision.", () => {
  tailwindRuleTester.run("unique-css-token-value-colors", uniqueCssTokenValueRule, {
    valid: [atFile("j.css"), atFile("k.css")],
    invalid: [
      {
        ...atFile("h.css"),
        errors: [
          {
            message: `Token "--color-rgb-ink" duplicates the value of "--color-page-canvas" in app${path.sep}styles${path.sep}a.css:1; reuse one design token.`,
          },
        ],
      },
      {
        ...atFile("i.css"),
        errors: [
          {
            message: `Token "--color-hsl-ink" duplicates the value of "--color-page-canvas" in app${path.sep}styles${path.sep}a.css:1; reuse one design token.`,
          },
        ],
      },
    ],
  });
});
