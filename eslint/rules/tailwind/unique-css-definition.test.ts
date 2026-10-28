import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { uniqueCssDefinitionRule } from "./unique-css-definition";

function fixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-definitions-")));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "src", name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  return root;
}

const canonical = [
  ":root { --layout-gap: 1rem; }",
  "@theme inline { --color-accent: var(--accent); }",
  "@utility custom-panel { @apply bg-(--panel-surface); }",
  "@keyframes fade { from { opacity: 0; } to { opacity: 1; } }",
  '@font-face { font-family: "Atlas"; font-style: normal; font-weight: 400; src: url("./atlas.woff2"); }',
].join("\n");
const scoped = [
  "@media (min-width: 40rem) { :root { --layout-gap: 2rem; } }",
  "@supports (display: grid) { @layer base { :root { --layout-gap: 3rem; } } }",
  ".dark { --layout-gap: 4rem; }",
  '@font-face { font-family: "Atlas"; font-style: normal; font-weight: 700; src: url("./atlas-bold.woff2"); }',
  '@font-face { font-family: "Atlas"; font-style: normal; font-weight: 400; unicode-range: U+0000-00FF; src: url("./atlas-latin.woff2"); }',
  "button { color: red; }",
  "button { color: blue; }",
].join("\n");
const duplicates = {
  utility: "@utility custom-panel { @apply bg-(--another-surface); }",
  theme: "@theme { --color-accent: #e53333; }",
  root: ":root { --layout-gap: 4rem; }",
  keyframes: "@keyframes fade { to { opacity: 0.5; } }",
  font: '@font-face { font-family: Atlas; font-weight: 400; font-style: normal; src: url("./other.woff2"); }',
};
const withinFile = {
  utility: "@utility repeated { @apply px-2; }\n@utility repeated { @apply px-3; }",
  theme: "@theme { --color-repeated: #fff; --color-repeated: #000; }",
  root: ":root { --repeated-gap: 1rem; }\n:root { --repeated-gap: 2rem; }",
  keyframes: "@keyframes repeated { to { opacity: 1; } }\n@keyframes repeated { to { opacity: 0; } }",
  font: '@font-face { font-family: Nova; font-weight: normal; src: url("a.woff2"); }\n@font-face { font-family: Nova; font-weight: 400; src: url("b.woff2"); }',
};
const withinFileNames = {
  utility: "repeated",
  theme: "--color-repeated",
  root: "--repeated-gap",
  keyframes: "repeated",
  font: "nova",
};
const cwd = fixture({
  "app/styles/globals.css": '@import "tailwindcss";\n@import "./a.css";',
  "app/styles/a.css": canonical,
  "app/styles/c-scoped.css": scoped,
  ...Object.fromEntries(Object.entries(duplicates).map(([kind, source]) => [`app/styles/b-${kind}.css`, source])),
  ...Object.fromEntries(Object.entries(withinFile).map(([kind, source]) => [`app/styles/d-${kind}.css`, source])),
});
function validCase(code: string, filename: string): { code: string; filename: string } {
  return { code, filename: path.join(cwd, "src/app/styles", filename) };
}
function runRule(kind: keyof typeof duplicates, label: string, name: string, checkScoped = false): void {
  const originalDirectory = process.cwd();
  process.chdir(cwd);
  try {
    tailwindRuleTester.run("unique-css-definition", uniqueCssDefinitionRule, {
      valid: [validCase(canonical, "a.css"), ...(checkScoped ? [validCase(scoped, "c-scoped.css")] : [])],
      invalid: [
        {
          code: duplicates[kind],
          filename: path.join(cwd, "src/app/styles", `b-${kind}.css`),
          errors: [
            {
              message: `${label} "${name}" is also defined in ${path.join(
                "app",
                "styles",
                "a.css",
              )}; define it in only one CSS file.`,
            },
          ],
        },
        {
          code: withinFile[kind],
          filename: path.join(cwd, "src/app/styles", `d-${kind}.css`),
          errors: [
            {
              message: `${label} "${withinFileNames[kind]}" is defined more than once in this CSS file; define it only once.`,
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
}

void describe("A custom `@utility` name MUST be defined only once across the project's CSS files, including within a single stylesheet; components MAY reuse the utility.", () => {
  runRule("utility", "Custom utility", "custom-panel");
});
void describe("Each Tailwind `@theme` variable MUST have one definition across the project's CSS files, including within a single stylesheet; distinct `@theme` variables MUST NOT share an identical static value with another `@theme` variable or a default `:root` custom property.", () => {
  runRule("theme", "Theme token", "--color-accent");
});
void describe("Each default `:root` custom property MUST have one definition across the project's CSS files, including within a single stylesheet; distinct default `:root` properties MUST NOT share an identical static value with another default `:root` property or an `@theme` variable. Intentional overrides in conditional at-rules or scoped selectors are allowed.", () => {
  runRule("root", "Default :root variable", "--layout-gap", true);
});
void describe("Each `@keyframes` name MUST have one definition across the project's CSS files, including within a single stylesheet.", () => {
  runRule("keyframes", "@keyframes", "fade");
});
void describe("Each `@font-face` signature (family, style, weight, stretch, and Unicode range) MUST have one definition across the project's CSS files, including within a single stylesheet; different faces of one family are allowed.", () => {
  runRule("font", "@font-face with matching descriptors for", "atlas", true);
});
