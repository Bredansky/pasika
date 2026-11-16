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

void describe("Client-safe extracted types and schemas MUST be imported through their folder's index.ts.", () => {
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

void describe("Server-only constants are imported through server.ts while shared constants use index.ts.", () => {
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

void describe("Runtime server entry enforcement covers every dependency form without flagging erased types", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-runtime-import-forms-"));
  const schemas = path.join(root, "src", "schemas");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(schemas, { recursive: true });
  mkdirSync(path.dirname(consumer), { recursive: true });
  writeFileSync(path.join(schemas, "index.ts"), 'export * from "./public";\n');
  writeFileSync(path.join(schemas, "public.ts"), "export type PublicShape = string;\n");
  writeFileSync(
    path.join(schemas, "private.ts"),
    'import "server-only"; export type PrivateShape = number; export const secret = 1;',
  );
  writeFileSync(path.join(schemas, "server.ts"), 'import "server-only"; export * from "./private";');
  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [
      { filename: consumer, code: 'import type { PrivateShape } from "@/schemas/private";' },
      { filename: consumer, code: 'import { type PrivateShape } from "@/schemas/private";' },
      { filename: consumer, code: 'export type { PrivateShape } from "@/schemas/private";' },
      { filename: consumer, code: 'import { secret } from "@/schemas/server";' },
      { filename: consumer, code: 'export * from "@/schemas/server";' },
      { filename: consumer, code: 'import { type PublicShape } from "@/schemas";' },
      {
        filename: consumer,
        code: '// import { secret } from "@/schemas/private";\nexport const text = "require(\\"@/schemas/private\\")";',
      },
    ],
    invalid: [
      { filename: consumer, code: 'import { secret } from "@/schemas/private";', errors: 1 },
      { filename: consumer, code: 'import { type PrivateShape, secret } from "@/schemas/private";', errors: 1 },
      { filename: consumer, code: 'export * from "@/schemas/private";', errors: 1 },
      { filename: consumer, code: 'export { secret } from "@/schemas/private";', errors: 1 },
      { filename: consumer, code: 'export const load = () => import("@/schemas/private");', errors: 1 },
      { filename: consumer, code: 'export const load = () => require("@/schemas/private");', errors: 1 },
      { filename: consumer, code: 'import type { PublicShape } from "@/schemas/public";', errors: 1 },
    ],
  });
});

void describe("Nested schemas group exposes independent shared and server entries", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-nested-server-entry-"));
  const schemas = path.join(root, "src", "schemas", "api");
  const consumer = path.join(root, "src", "features", "billing", "invoice.ts");
  mkdirSync(schemas, { recursive: true });
  mkdirSync(path.dirname(consumer), { recursive: true });
  writeFileSync(path.join(schemas, "index.ts"), 'export * from "./public";\n');
  writeFileSync(path.join(schemas, "public.ts"), "export const publicValue = 1;\n");
  writeFileSync(path.join(schemas, "private.ts"), "export const secret = 1;\n");
  writeFileSync(path.join(schemas, "server.ts"), 'import "server-only"; export * from "./private";');
  ruleTester.run("import-through-index", importThroughIndexRule, {
    valid: [
      { filename: consumer, code: 'import { publicValue } from "@/schemas/api";' },
      { filename: consumer, code: 'import { secret } from "@/schemas/api/server";' },
      { filename: path.join(schemas, "server.ts"), code: 'import { secret } from "./private";' },
    ],
    invalid: [
      {
        filename: consumer,
        code: 'import { secret } from "@/schemas/api/private";',
        errors: [{ message: /through @\/schemas\/api\/server/u }],
      },
      {
        filename: consumer,
        code: 'export const load = () => import("@/schemas/api/private");',
        errors: [{ message: /through @\/schemas\/api\/server/u }],
      },
    ],
  });
});
