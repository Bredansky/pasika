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

void describe("A `constants/` folder MUST expose shared constants through `index.ts`, defining them there when it has at most one public sibling file and re-exporting grouped public constants otherwise; imports between sibling files MUST be direct.", () => {
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

void describe("Consumers MUST import a client-safe extracted type or schema through index.ts in its types/ or schemas/ folder. Server-only schemas MUST be imported through an optional server.ts support barrel, never through index.ts; type-only imports do not create runtime client dependencies.", () => {
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

void describe("constants/, types/, and schemas/ MAY provide an optional server.ts entry. Consumers outside the folder MUST use it instead of directly importing server-only support modules. Non-barrel folders such as utils/ use direct imports, with the same transitive safety checks.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-server-support-"));
  const constants = path.join(root, "src", "constants");
  const importer = path.join(root, "src", "utils", "load-contract.ts");
  mkdirSync(constants, { recursive: true });
  mkdirSync(path.dirname(importer), { recursive: true });
  writeFileSync(path.join(constants, "index.ts"), 'export * from "./paths";\\n');
  writeFileSync(path.join(constants, "paths.ts"), 'export const route = "/api/example";\\n');
  writeFileSync(path.join(constants, "api-contracts.ts"), 'export const tokenEndpoint = "/token";\\n');
  writeFileSync(path.join(constants, "server.ts"), 'import "server-only";\\nexport * from "./api-contracts";\\n');

  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [
      { code: 'import { tokenEndpoint } from "../constants/server";', filename: importer },
      { code: 'import { tokenEndpoint } from "./api-contracts";', filename: path.join(constants, "server.ts") },
    ],
    invalid: [
      {
        code: 'import { tokenEndpoint } from "../constants/api-contracts";',
        filename: importer,
        errors: 1,
      },
      { code: 'import { route } from "../constants/paths";', filename: importer, errors: 1 },
    ],
  });
});

void describe("Independently indexed support groups MUST be imported through their own entry point.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-indexed-support-group-"));
  const schemas = path.join(root, "src", "schemas", "api");
  const importer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(schemas, { recursive: true });
  mkdirSync(path.dirname(importer), { recursive: true });
  writeFileSync(path.join(schemas, "index.ts"), 'export * from "./response";\\n');
  writeFileSync(path.join(schemas, "response.ts"), "export const responseSchema = 1;\\n");
  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [{ code: 'import { responseSchema } from "@/schemas/api";', filename: importer }],
    invalid: [{ code: 'import { responseSchema } from "@/schemas/api/response";', filename: importer, errors: 1 }],
  });
});

void describe("Server-only runtime dependencies from constants/, types/, or schemas/ MUST be imported through the folder's server.ts entry point.", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-server-schema-entry-"));
  const schemas = path.join(root, "src", "schemas");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(schemas, { recursive: true });
  mkdirSync(path.dirname(consumer), { recursive: true });
  writeFileSync(path.join(schemas, "index.ts"), "export const sharedSchema = 1;\\n");
  writeFileSync(path.join(schemas, "private.ts"), "export const privateSchema = 1;\\n");
  writeFileSync(path.join(schemas, "server.ts"), 'import "server-only";\\nexport * from "./private";\\n');

  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [{ filename: consumer, code: 'import { privateSchema } from "@/schemas/server";' }],
    invalid: [{ filename: consumer, code: 'import { privateSchema } from "@/schemas/private";', errors: 1 }],
  });
});
