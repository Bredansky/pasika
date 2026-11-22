import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeTokenOrderRule } from "./theme-token-order";

const group = "/* Group: features/home/banner.tsx */";
const consumer = 'const styles = "bg-a bg-b shadow-a shadow-b badge";';

function check(css: string, errors: RegExp[] = [], output?: string, stylesheet = "app/styles/globals.css"): void {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-group-spacing-")));
  const filename = path.join(root, "src", stylesheet);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, css);
  const component = path.join(root, "src/features/home/banner.tsx");
  mkdirSync(path.dirname(component), { recursive: true });
  writeFileSync(component, consumer);
  const previous = process.cwd();
  process.chdir(root);
  try {
    tailwindRuleTester.run("theme-token-order", themeTokenOrderRule, {
      valid: errors.length === 0 ? [{ filename, code: css }] : [],
      invalid:
        errors.length > 0
          ? [{ filename, code: css, errors: errors.map((message) => ({ message })), ...(output ? { output } : {}) }]
          : [],
    });
  } finally {
    process.chdir(previous);
  }
}

void describe("CSS consumer group comments MUST immediately precede their first definition without blank lines, and consecutive @theme or :root declarations in the same group MUST NOT be separated by blank lines.", () => {
  const headingError = /A CSS consumer group comment must immediately precede its first definition/u;
  const declarationError = /CSS declarations in the same consumer group must not contain separating blank lines/u;

  check(
    `@theme inline {\n  ${group}\n\n  --color-a: red;\n  --color-b: blue;\n}`,
    [headingError],
    `@theme inline {\n  ${group}\n  --color-a: red;\n  --color-b: blue;\n}`,
  );

  check(
    `@theme inline {\n  ${group}\n  --color-a: red;\n\n  --color-b: blue;\n}`,
    [declarationError],
    `@theme inline {\n  ${group}\n  --color-a: red;\n  --color-b: blue;\n}`,
  );

  check(
    `@theme inline {\n  ${group}\n\n  --color-a: red;\n\n  --color-b: blue;\n}`,
    [headingError, declarationError],
    `@theme inline {\n  ${group}\n  --color-a: red;\n  --color-b: blue;\n}`,
  );

  check(
    `@theme inline {\n  ${group}\n  --shadow-a:\n    0 1px 2px red,\n    0 2px 4px blue;\n\n  --shadow-b: 0 4px 8px black;\n}`,
    [declarationError],
    `@theme inline {\n  ${group}\n  --shadow-a:\n    0 1px 2px red,\n    0 2px 4px blue;\n  --shadow-b: 0 4px 8px black;\n}`,
  );

  check(
    `@theme inline {\r\n  ${group}\r\n\r\n  --color-a: red;\r\n  --color-b: blue;\r\n}`,
    [headingError],
    `@theme inline {\r\n  ${group}\r\n  --color-a: red;\r\n  --color-b: blue;\r\n}`,
  );

  check(`${group}\n\n@utility badge { @apply block; }`, [headingError], `${group}\n@utility badge { @apply block; }`);

  check(
    `@theme inline {\n  ${group}\n\n  --color-a: red;\n}`,
    [headingError],
    `@theme inline {\n  ${group}\n  --color-a: red;\n}`,
    "app/styles/home.css",
  );

  // Whitespace surrounding independent groups, comments and nested constructs is meaningful.
  check(
    `@theme inline {\n  ${group}\n  --color-a: red;\n\n  /* Keep this note with the next token. */\n  --color-b: blue;\n}`,
  );
  check(`@theme inline {\n  ${group}\n  /* A note on the first token. */\n  --color-a: red;\n  --color-b: blue;\n}`);
  check(`@theme inline {\n  ${group}\n  --color-a: red;\n\n  /* A separate section. */\n  --color-b: blue;\n}`);
  check(`@theme inline {\n  ${group}\n  --color-a: red;\n  --color-b: blue;\n}`);
  check(
    `@theme inline {\n  ${group}\n  --color-a: var(--color-a);\n  --color-b: var(--color-b);\n}\n:root {\n  ${group}\n\n  --color-a: red;\n\n  --color-b: blue;\n}`,
    [headingError, declarationError],
    `@theme inline {\n  ${group}\n  --color-a: var(--color-a);\n  --color-b: var(--color-b);\n}\n:root {\n  ${group}\n  --color-a: red;\n  --color-b: blue;\n}`,
  );
});
