import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { importThroughIndexRule } from "./import-through-index";

function project(): { root: string; consumer: string } {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-import-index-"));
  const support = path.join(root, "src", "features", "billing", "constants");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(support, { recursive: true });
  writeFileSync(path.join(support, "index.ts"), 'export { maxRetries } from "./retry";\n');
  writeFileSync(path.join(support, "retry.ts"), "export const maxRetries = 3;\n");
  writeFileSync(consumer, "export const invoice = maxRetries;\n");
  return { root, consumer };
}

void describe("Consumers MUST import an extracted constant through the index.ts in that constant's constants/ folder.", () => {
  const { root, consumer } = project();
  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [{ code: 'import { maxRetries } from "./constants";', filename: consumer }],
    invalid: [
      {
        code: 'import { maxRetries } from "./constants/retry";',
        filename: consumer,
        errors: 1,
      },
    ],
  });
  void root;
});

void describe("Consumers MUST import an extracted type or schema through the index.ts in that type or schema's types/ or schemas/ folder.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-import-index-types-"));
  const support = path.join(root, "src", "features", "billing", "types");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(support, { recursive: true });
  writeFileSync(path.join(support, "index.ts"), 'export { Invoice } from "./invoice";\n');
  writeFileSync(path.join(support, "invoice.ts"), "export type Invoice = string;\n");
  writeFileSync(consumer, "export const invoice = 1;\n");
  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [{ code: 'import type { Invoice } from "./types";', filename: consumer }],
    invalid: [{ code: 'import type { Invoice } from "./types/invoice";', filename: consumer, errors: 1 }],
  });
});
