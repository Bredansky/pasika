import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cssEntryPointRule } from "./css-entry-point";
import { describe, tailwindRuleTester } from "./rule-tester";

/** <p>Builds a temp fixture project with the given files under `src/`.</p> */
function buildFixture(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-entry-point-")));
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, "src", relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  return root;
}

const srcPath = (root: string, relativePath: string): string => path.join(root, "src", relativePath);

const ENTRY = `@import "tailwindcss";\n`;

void describe("Project stylesheets MUST live under `src/app/styles/`, and the global stylesheet entry point MUST be `src/app/styles/globals.css`.", () => {
  // A Tailwind entry point outside src/app/styles is misplaced.
  const misplacedEntry = buildFixture({
    "app/globals.css": ENTRY,
    "app/layout.tsx": `import "./globals.css";
`,
  });
  process.chdir(misplacedEntry);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(misplacedEntry, "app/globals.css"),
        errors: [{ message: "The global stylesheet entry point must be src/app/styles/globals.css." }],
      },
    ],
  });

  // Project CSS belongs under src/app/styles even when globals imports it directly.
  const misplacedStylesheet = buildFixture({
    "app/styles/globals.css": `${ENTRY}@import "../legacy.css";
`,
    "app/layout.tsx": `import "./styles/globals.css";
`,
    "app/legacy.css": `:root {
  --spacing: 0.25rem;
}
`,
  });
  process.chdir(misplacedStylesheet);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: `:root {
  --spacing: 0.25rem;
}
`,
        filename: srcPath(misplacedStylesheet, "app/legacy.css"),
        errors: [{ message: "Project stylesheets must live under src/app/styles/." }],
      },
    ],
  });
});

void describe("The root layout (`src/app/layout`) MUST be the sole importer of `globals.css`, which MUST directly `@import` every other project stylesheet.", () => {
  // One entry, imported once by the root layout, with a stylesheet it imports.
  const valid = buildFixture({
    "app/styles/globals.css": `${ENTRY}@import "./theme.css";\n`,
    "app/styles/theme.css": `@theme {\n  --*: initial;\n}\n`,
    "app/layout.tsx": `import "./styles/globals.css";\n`,
  });
  process.chdir(valid);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [
      // The entry point registered and imported exactly once, importing theme.css.
      { code: `${ENTRY}@import "./theme.css";\n`, filename: srcPath(valid, "app/styles/globals.css") },
      // A stylesheet the entry point imports directly may hold project CSS.
      { code: `@theme {\n  --*: initial;\n}\n`, filename: srcPath(valid, "app/styles/theme.css") },
    ],
    invalid: [],
  });

  // A stray stylesheet the entry point neither imports nor reaches.
  const stray = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/layout.tsx": `import "./styles/globals.css";\n`,
    "app/styles/stray.css": `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n`,
  });
  process.chdir(stray);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n`,
        filename: srcPath(stray, "app/styles/stray.css"),
        errors: [
          {
            message: "Every project stylesheet must be imported directly by src/app/styles/globals.css.",
          },
        ],
      },
    ],
  });

  // Project CSS two hops from the entry: the midpoint is a direct child, but
  // the deep stylesheet holding CSS is not reached directly by the entry.
  const transitive = buildFixture({
    "app/styles/globals.css": `${ENTRY}@import "./base.css";\n`,
    "app/layout.tsx": `import "./styles/globals.css";\n`,
    "app/styles/base.css": `@import "./deep.css";\n`,
    "app/styles/deep.css": `:root {\n  --spacing: 0.25rem;\n}\n`,
  });
  process.chdir(transitive);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [
      // The direct child is import-only and reaches deep.css.
      { code: `@import "./deep.css";\n`, filename: srcPath(transitive, "app/styles/base.css") },
    ],
    invalid: [
      {
        code: `:root {\n  --spacing: 0.25rem;\n}\n`,
        filename: srcPath(transitive, "app/styles/deep.css"),
        errors: [
          {
            message: "Every project stylesheet must be imported directly by src/app/styles/globals.css.",
          },
        ],
      },
    ],
  });

  // Even an import-only stylesheet must be directly imported by globals.css.
  const importOnly = buildFixture({
    "app/styles/globals.css": `${ENTRY}@import "./bridge.css";\n`,
    "app/layout.tsx": 'import "./styles/globals.css";',
    "app/styles/bridge.css": '@import "./empty.css";',
    "app/styles/empty.css": "/* no project declarations */",
  });
  process.chdir(importOnly);
  tailwindRuleTester.run("css-entry-point-direct-imports", cssEntryPointRule, {
    valid: [{ code: '@import "./empty.css";', filename: srcPath(importOnly, "app/styles/bridge.css") }],
    invalid: [
      {
        code: "/* no project declarations */",
        filename: srcPath(importOnly, "app/styles/empty.css"),
        errors: [{ message: "Every project stylesheet must be imported directly by src/app/styles/globals.css." }],
      },
    ],
  });

  const directImportOnly = buildFixture({
    "app/styles/globals.css": `${ENTRY}@import "./bridge.css";\n@import "./empty.css";\n`,
    "app/layout.tsx": 'import "./styles/globals.css";',
    "app/styles/bridge.css": '@import "./empty.css";',
    "app/styles/empty.css": "/* no project declarations */",
  });
  process.chdir(directImportOnly);
  tailwindRuleTester.run("css-entry-point-direct-imports", cssEntryPointRule, {
    valid: [
      { code: '@import "./empty.css";', filename: srcPath(directImportOnly, "app/styles/bridge.css") },
      { code: "/* no project declarations */", filename: srcPath(directImportOnly, "app/styles/empty.css") },
    ],
    invalid: [],
  });

  // Two stylesheets register Tailwind — only one may be the entry point.
  const multiGlobal = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/styles/editor.css": ENTRY,
  });
  process.chdir(multiGlobal);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(multiGlobal, "app/styles/editor.css"),
        errors: [{ message: "Only one stylesheet may register Tailwind as the global entry point." }],
      },
    ],
  });

  // The entry point is never imported by a module.
  const noImport = buildFixture({
    "app/styles/globals.css": ENTRY,
  });
  process.chdir(noImport);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(noImport, "app/styles/globals.css"),
        errors: [
          {
            message:
              "The global stylesheet entry point must be imported by exactly one module (the root layout), but it is imported by 0 module(s).",
          },
        ],
      },
    ],
  });

  // Two modules import the entry point — it must be imported exactly once.
  // A single importer is insufficient unless it is the root layout.
  const nonLayout = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/page.tsx": 'import "./styles/globals.css";',
  });
  process.chdir(nonLayout);
  tailwindRuleTester.run("css-entry-point-root-layout", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(nonLayout, "app/styles/globals.css"),
        errors: [
          {
            message: "The global stylesheet entry point must be imported by src/app/layout, not another module.",
          },
        ],
      },
    ],
  });

  // Importing a different file named globals.css does not count.
  const wrongTarget = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/styles/other/globals.css": ":root { --test: 1px; }",
    "app/layout.tsx": 'import "./styles/other/globals.css";',
  });
  process.chdir(wrongTarget);
  tailwindRuleTester.run("css-entry-point-root-layout", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(wrongTarget, "app/styles/globals.css"),
        errors: [
          {
            message:
              "The global stylesheet entry point must be imported by exactly one module (the root layout), but it is imported by 0 module(s).",
          },
        ],
      },
    ],
  });

  const aliasImport = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/layout.tsx": 'import "@/app/styles/globals.css";',
  });
  process.chdir(aliasImport);
  tailwindRuleTester.run("css-entry-point-root-layout", cssEntryPointRule, {
    valid: [{ code: ENTRY, filename: srcPath(aliasImport, "app/styles/globals.css") }],
    invalid: [],
  });

  const twoImports = buildFixture({
    "app/styles/globals.css": ENTRY,
    "app/layout.tsx": `import "./styles/globals.css";\n`,
    "app/other.tsx": `import "./styles/globals.css";\n`,
  });
  process.chdir(twoImports);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(twoImports, "app/styles/globals.css"),
        errors: [
          {
            message:
              "The global stylesheet entry point must be imported by exactly one module (the root layout), but it is imported by 2 module(s).",
          },
        ],
      },
    ],
  });
});
