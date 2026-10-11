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

void describe("Consumers outside a `constants/` folder MUST import extracted constants through that folder's `index.ts`. Modules within the same `constants/` folder MUST import their sibling files directly to avoid circular barrel imports.", () => {
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

void describe("Modules within the same constants folder MUST import sibling files directly to avoid their own barrel.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-support-siblings-"));
  const constants = path.join(root, "src", "constants");
  const schemas = path.join(root, "src", "schemas");
  mkdirSync(constants, { recursive: true });
  mkdirSync(schemas, { recursive: true });
  writeFileSync(path.join(constants, "index.ts"), 'export * from "./routes";\\n');
  writeFileSync(path.join(constants, "routes.ts"), 'export const route = "/api/example";\\n');
  writeFileSync(path.join(constants, "api-contracts.ts"), 'export const contract = "example";\\n');
  writeFileSync(path.join(schemas, "index.ts"), 'export * from "./shared";\\n');
  writeFileSync(path.join(schemas, "shared.ts"), "export const example = 1;\\n");
  writeFileSync(path.join(schemas, "draft.ts"), "export const draft = 1;\\n");

  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [
      {
        code: 'import { route } from "./routes";',
        filename: path.join(constants, "api-contracts.ts"),
      },
      {
        code: 'import { example } from "./shared";',
        filename: path.join(schemas, "draft.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { route } from "./constants/routes";',
        filename: path.join(root, "src", "middleware.ts"),
        errors: 1,
      },
      {
        code: 'import { route } from "./index";',
        filename: path.join(constants, "api-contracts.ts"),
        errors: [
          {
            message:
              'Import sibling constants directly instead of through "./index" to avoid circular barrel imports. See the next-codebase-guide constants rule.',
          },
        ],
      },
      {
        code: 'import { route } from ".";',
        filename: path.join(constants, "api-contracts.ts"),
        errors: [
          {
            message:
              'Import sibling constants directly instead of through "." to avoid circular barrel imports. See the next-codebase-guide constants rule.',
          },
        ],
      },
    ],
  });
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
