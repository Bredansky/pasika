import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester } from "../rule-tester";
import { cnHelperRule } from "./cn-helper";

const DOC = "See docs/pasika-adoption-guide/rules/cn-helper-rule.md";

const CONFIG = "export default [];\n";

const CANONICAL = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
`;

const UNRELATED = "export function formatDate(value: Date): string { return value.toISOString(); }\n";

/**
 * The existence half reads the tree from disk, so each fixture is a real
 * project: an eslint config at its root, and the modules the rule indexes
 * under `src/`.
 */
const temps: string[] = [];
afterAll(() => {
  for (const temp of temps) rmSync(temp, { recursive: true, force: true });
});

interface Project {
  root: string;
  config: string;
}

function makeProject(files: Record<string, string>): Project {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-cn-helper-")));
  temps.push(root);
  writeFileSync(path.join(root, "eslint.config.ts"), CONFIG);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, "src", relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  return { root, config: path.join(root, "eslint.config.ts") };
}

void describe("A repository MUST define a cn helper.", () => {
  const withHelper = makeProject({ "utils/cn.ts": CANONICAL });
  // A tree with source but no helper anywhere: the index has modules and none
  // of them exports `cn`.
  const withoutHelper = makeProject({ "utils/format-date.ts": UNRELATED });

  ruleTester.run("cn-helper", cnHelperRule, {
    valid: [{ filename: withHelper.config, code: CONFIG }],
    invalid: [
      {
        filename: withoutHelper.config,
        code: CONFIG,
        errors: [{ message: `A repository must define a cn helper. ${DOC}` }],
      },
    ],
  });
});

void describe("The cn helper MUST return twMerge(clsx(...)).", () => {
  const { root } = makeProject({ "utils/cn.ts": CANONICAL });
  const definition = path.join(root, "src", "utils", "cn.ts");

  ruleTester.run("cn-helper", cnHelperRule, {
    valid: [
      { filename: definition, code: CANONICAL },
      {
        filename: definition,
        code: 'import { clsx } from "clsx"; import { twMerge } from "tailwind-merge"; export const cn = (...inputs) => twMerge(clsx(inputs));',
      },
    ],
    invalid: [
      {
        // clsx only: no conflict resolution at all.
        filename: definition,
        code: 'import { clsx } from "clsx"; export const cn = (...inputs) => clsx(inputs);',
        errors: [{ message: `cn must return twMerge(clsx(...)). ${DOC}` }],
      },
      {
        // twMerge only: nothing builds the conditional class string.
        filename: definition,
        code: 'import { twMerge } from "tailwind-merge"; export const cn = (...inputs) => twMerge(inputs);',
        errors: [{ message: `cn must return twMerge(clsx(...)). ${DOC}` }],
      },
      {
        // Both names present, but composed in the wrong direction.
        filename: definition,
        code: "export function cn(...inputs) { const merged = twMerge(inputs); return clsx(merged); }",
        errors: [{ message: `cn must return twMerge(clsx(...)). ${DOC}` }],
      },
    ],
  });
});
