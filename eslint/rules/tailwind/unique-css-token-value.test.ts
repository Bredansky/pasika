import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { describe, tailwindRuleTester } from "./rule-tester";
import { normalizedColor, uniqueCssTokenValueRule } from "./unique-css-token-value";

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
  "l.css": "@theme { --color-brand-canvas: #2563eb; --color-brand-edge: #2563eb; }",
  "m.css": "@theme inline { --color-purple-ink: rebeccapurple; --color-ice-edge: aliceblue; }",
  "n.css": "@theme inline { --color-purple-copy-ink: #663399; --color-ice-copy-edge: #f0f8ff; }",
  "o.css":
    "@theme inline { --primary: 290 80% 65%; --color-primary-canvas: hsl(var(--primary)); --color-primary-edge: hsl(var(--primary)); --color-primary-solid-ink: hsl(var(--primary)); }",
  "p.css": "@theme inline { --color-primary: hsl(290 80% 65%); }",
};
const root = fixture(files);
process.chdir(root);

function atFile(name: keyof typeof files): { code: string; filename: string } {
  return { code: files[name], filename: path.join(root, "src", "app", "styles", name) };
}

void describe("Distinct `@theme inline` tokens and default `:root` properties MUST NOT share equivalent static CSS values. Equivalent HEX, RGB, HSL, and named colors MUST be compared without rounding or changing precision.", () => {
  tailwindRuleTester.run("unique-css-token-value", uniqueCssTokenValueRule, {
    valid: [atFile("a.css"), atFile("e.css"), atFile("f.css"), atFile("g.css")],
    invalid: [
      {
        ...atFile("l.css"),
        errors: [
          {
            message: `Token "--color-brand-edge" duplicates the value of "--color-brand-canvas" in app${path.sep}styles${path.sep}l.css:1; reuse one design token.`,
          },
        ],
      },
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

void describe("Distinct `@theme inline` tokens and default `:root` properties MUST NOT share equivalent static CSS values. Equivalent HEX, RGB, HSL, and named colors MUST be compared without rounding or changing precision.", () => {
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

void describe("Distinct `@theme inline` tokens and default `:root` properties MUST NOT share equivalent static CSS values. Equivalent HEX, RGB, HSL, and named colors MUST be compared without rounding or changing precision.", () => {
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
      {
        ...atFile("n.css"),
        errors: [
          {
            message: `Token "--color-purple-copy-ink" duplicates the value of "--color-purple-ink" in app${path.sep}styles${path.sep}m.css:1; reuse one design token.`,
          },
          {
            message: `Token "--color-ice-copy-edge" duplicates the value of "--color-ice-edge" in app${path.sep}styles${path.sep}m.css:1; reuse one design token.`,
          },
        ],
      },
    ],
  });
});

void describe("Fixed HSL palette primitives must not be wrapped by redundant Tailwind color tokens.", () => {
  tailwindRuleTester.run("unique-css-token-value:wrapped-hsl", uniqueCssTokenValueRule, {
    valid: [atFile("p.css")],
    invalid: [
      {
        ...atFile("o.css"),
        errors: [
          {
            message:
              'Color token "--color-primary-canvas" unnecessarily wraps fixed HSL primitive "--primary"; define a single --color-* token with hsl(...) directly and reuse it across utility roles.',
          },
          {
            message:
              'Color token "--color-primary-edge" unnecessarily wraps fixed HSL primitive "--primary"; define a single --color-* token with hsl(...) directly and reuse it across utility roles.',
          },
          {
            message:
              'Color token "--color-primary-solid-ink" unnecessarily wraps fixed HSL primitive "--primary"; define a single --color-* token with hsl(...) directly and reuse it across utility roles.',
          },
        ],
      },
    ],
  });
});

void describe("Exact static color comparison never changes CSS format or rounds alpha and fractional channels.", () => {
  it.each([
    ["#fff", "srgb:255,255,255/1"],
    ["#fffa", `srgb:255,255,255/${String(170 / 255)}`],
    ["#ff00ff", "srgb:255,0,255/1"],
    ["#000000ff", "srgb:0,0,0/1"],
    ["rgb(255,255,255)", "srgb:255,255,255/1"],
    ["rgba(255, 0, 0, 0.5)", "srgb:255,0,0/0.5"],
    ["rgb(100% 0% 100% / 50%)", "srgb:255,0,255/0.5"],
    ["hsl(0 0% 100%)", "srgb:255,255,255/1"],
    ["hsl(0 100% 50%)", "srgb:255,0,0/1"],
    ["hsl(60 100% 50%)", "srgb:255,255,0/1"],
    ["hsl(120 100% 50%)", "srgb:0,255,0/1"],
    ["hsl(180 100% 50%)", "srgb:0,255,255/1"],
    ["hsl(240 100% 50%)", "srgb:0,0,255/1"],
    ["hsl(300 100% 50%)", "srgb:255,0,255/1"],
    ["hsl(-60 100% 50%)", "srgb:255,0,255/1"],
    ["hsl(360 100% 50%)", "srgb:255,0,0/1"],
    ["hsla(0, 100%, 50%, 0.5)", "srgb:255,0,0/0.5"],
    ["red", "srgb:255,0,0/1"],
    ["magenta", "srgb:255,0,255/1"],
    ["rebeccapurple", "srgb:102,51,153/1"],
    ["aliceblue", "srgb:240,248,255/1"],
    ["darkslategrey", "srgb:47,79,79/1"],
  ])("recognizes the exact identity of %s", (source, expected) => {
    expect(normalizedColor(source)).toBe(expected);
  });

  it.each([
    "rgb(0 0)",
    "rgb(300 0 0)",
    "rgb(0 0 -1)",
    "rgb(var(--runtime))",
    "rgb(bad 0 0)",
    "rgba(1 2 3 / 120%)",
    "rgba(0 0 0 / -20%)",
    "hsl(0 33% 37%)",
    "hsl(1turn 100% 50%)",
    "hsl(0 101% 50%)",
    "hsl(0 100 50%)",
    "hsl(0 100% 50% / 110%)",
    "color(display-p3 1 0 0)",
    "var(--color-runtime)",
    "rgb(1 2 3 / invalid)",
    "constructor",
    "toString",
  ])("avoids guessing or rounding for %s", (source) => {
    expect(normalizedColor(source)).toBeUndefined();
  });

  it("preserves non-equivalent alpha precision", () => {
    expect(normalizedColor("#00000080")).not.toBe(normalizedColor("rgba(0,0,0,0.5)"));
    expect(normalizedColor("rgb(50.5% 0% 0%)")).toBe(`srgb:${String((50.5 * 255) / 100)},0,0/1`);
  });
});
