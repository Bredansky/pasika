import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { cssEntryPointRule } from "./css-entry-point";

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

void describe("The global stylesheet entry point MUST be imported by exactly one module (the root layout). Project CSS MAY live in that entry point; every other stylesheet MUST be reachable from it via @import, and any other stylesheet holding project CSS MUST be imported by the entry point directly.", () => {
  // One entry, imported once by the root layout, with a stylesheet it imports.
  const valid = buildFixture({
    "globals.css": `${ENTRY}@import "./theme.css";\n`,
    "theme.css": `@theme {\n  --*: initial;\n}\n`,
    "app/layout.tsx": `import "./../globals.css";\n`,
  });
  process.chdir(valid);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [
      // The entry point registered and imported exactly once, importing theme.css.
      { code: `${ENTRY}@import "./theme.css";\n`, filename: srcPath(valid, "globals.css") },
      // A stylesheet the entry point imports directly may hold project CSS.
      { code: `@theme {\n  --*: initial;\n}\n`, filename: srcPath(valid, "theme.css") },
    ],
    invalid: [],
  });

  // A stray stylesheet the entry point neither imports nor reaches.
  const stray = buildFixture({
    "globals.css": ENTRY,
    "app/layout.tsx": `import "./../globals.css";\n`,
    "stray.css": `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n`,
  });
  process.chdir(stray);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n`,
        filename: srcPath(stray, "stray.css"),
        errors: [
          {
            message:
              "Project CSS may only live in a stylesheet the global entry point imports directly; route it through a direct import or into the entry point.",
          },
        ],
      },
    ],
  });

  // Project CSS two hops from the entry: the midpoint is a direct child, but
  // the deep stylesheet holding CSS is not reached directly by the entry.
  const transitive = buildFixture({
    "globals.css": `${ENTRY}@import "./base.css";\n`,
    "app/layout.tsx": `import "./../globals.css";\n`,
    "base.css": `@import "./deep.css";\n`,
    "deep.css": `:root {\n  --spacing: 0.25rem;\n}\n`,
  });
  process.chdir(transitive);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [
      // The direct child is import-only and reaches deep.css.
      { code: `@import "./deep.css";\n`, filename: srcPath(transitive, "base.css") },
    ],
    invalid: [
      {
        code: `:root {\n  --spacing: 0.25rem;\n}\n`,
        filename: srcPath(transitive, "deep.css"),
        errors: [
          {
            message:
              "Project CSS may only live in a stylesheet the global entry point imports directly; route it through a direct import or into the entry point.",
          },
        ],
      },
    ],
  });

  // Two stylesheets register Tailwind — only one may be the entry point.
  const multiGlobal = buildFixture({
    "globals.css": ENTRY,
    "editor.css": ENTRY,
  });
  process.chdir(multiGlobal);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(multiGlobal, "editor.css"),
        errors: [{ message: "Only one stylesheet may register Tailwind as the global entry point." }],
      },
    ],
  });

  // The entry point is never imported by a module.
  const noImport = buildFixture({
    "globals.css": ENTRY,
  });
  process.chdir(noImport);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(noImport, "globals.css"),
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
  const twoImports = buildFixture({
    "globals.css": ENTRY,
    "app/layout.tsx": `import "./../globals.css";\n`,
    "app/other.tsx": `import "./../globals.css";\n`,
  });
  process.chdir(twoImports);
  tailwindRuleTester.run("css-entry-point", cssEntryPointRule, {
    valid: [],
    invalid: [
      {
        code: ENTRY,
        filename: srcPath(twoImports, "globals.css"),
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
