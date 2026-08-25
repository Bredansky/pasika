import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester.js";
import { noUtilBarrelRule } from "./no-util-barrel.js";
import { utilFileNameRule } from "./util-file-name.js";

void describe("A utility file that exports one function MUST have a name in that function's kebab-case form.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-util-name-"));
  const utils = path.join(root, "src", "utils");
  mkdirSync(utils, { recursive: true });
  const valid = path.join(utils, "format-date.ts");
  const invalid = path.join(utils, "formatDate.ts");
  writeFileSync(valid, "export function formatDate() { return ''; }\n");
  writeFileSync(invalid, "export function formatDate() { return ''; }\n");
  ruleTester.run("util-file-name", utilFileNameRule, {
    valid: [{ code: "export function formatDate() { return ''; }", filename: valid }],
    invalid: [
      {
        code: "export function formatDate() { return ''; }",
        filename: invalid,
        errors: 1,
      },
    ],
  });
});

void describe("A utility MUST be imported directly without a barrel.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-util-barrel-"));
  const utils = path.join(root, "src", "utils");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(utils, { recursive: true });
  mkdirSync(path.dirname(consumer), { recursive: true });
  writeFileSync(path.join(utils, "index.ts"), 'export { formatDate } from "./format-date";\n');
  writeFileSync(path.join(utils, "format-date.ts"), "export function formatDate() { return ''; }\n");
  writeFileSync(consumer, "export const invoice = 1;\n");
  ruleTester.run("no-util-barrel", noUtilBarrelRule, {
    valid: [{ code: 'import { formatDate } from "@/utils/format-date";', filename: consumer }],
    invalid: [
      {
        code: 'import { formatDate } from "@/utils";',
        filename: consumer,
        errors: 1,
      },
    ],
  });
});
