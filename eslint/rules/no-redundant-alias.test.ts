import tsParser from "@typescript-eslint/parser";
import { vi } from "vitest";
import { CwdAwareRuleTester, describe, ruleTester, srcFile } from "../rule-tester";
import { noRedundantAliasRule } from "./no-redundant-alias";

vi.setConfig({ testTimeout: 30_000 });

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

function aliasMessage(alias: string, source: string): string {
  return `"${alias}" only renames "${source}". Use "${source}" directly or rename the original symbol and its consumers. ${doc}`;
}

function bindingAliasMessage(alias: string, source: string): string {
  return `"${alias}" renames "${source}" while creating a binding. Keep the original name and map it only at the object boundary. ${doc}`;
}

function semanticMappingMessage(propertyName: string, sourcePropertyName: string): string {
  return `"${propertyName}" maps from "${sourcePropertyName}" between first-party contracts. Use one canonical field name across the contracts. ${doc}`;
}

function unknownContractOwnershipMessage(propertyName: string, sourcePropertyName: string): string {
  return `Cannot determine contract ownership for mapping "${propertyName}" from "${sourcePropertyName}". Define or propagate a concrete contract, make the boundary schema explicit, or connect a mirrored external schema to its defineApiContract. ${doc}`;
}

const typedRuleTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
      projectService: {
        allowDefaultProject: ["src/utils/*.ts"],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 16,
      },
      tsconfigRootDir: process.cwd(),
    },
  },
});
void describe("A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.", () => {
  ruleTester.run("no-redundant-alias:variables", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "const missing = undefined;",
          "const result = buildResult(source);",
          "let current = initial;",
          "var legacyCurrent = initial;",
          "const localShape = { alias: source.value };",
        ].join("\n"),
        filename: srcFile("utils/example.ts"),
      },
      {
        code: "declare const handler: unknown; export const GET = handler; export const POST = handler;",
        filename: srcFile("app/api/example/route.ts"),
      },
    ],
    invalid: [
      {
        code: "declare const PlatformClient: unknown; const ApiClient = PlatformClient;",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: aliasMessage("ApiClient", "PlatformClient"),
          },
        ],
      },
      {
        code: "function run(value: string) { const localValue = value; return localValue; }",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: aliasMessage("localValue", "value"),
          },
        ],
      },
      {
        code: "function run() { const results = getResults(); const data = results; return { data }; }",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: aliasMessage("data", "results"),
          },
        ],
      },
      {
        code: "const method = HttpMethod.Post;",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("method", "HttpMethod.Post"),
          },
        ],
      },
      {
        code: 'const appKey = credentials["apiKey"];',
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("appKey", 'credentials["apiKey"]'),
          },
        ],
      },
      {
        code: "const appKey = credentials.apiKey;",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("appKey", "credentials.apiKey"),
          },
        ],
      },
      {
        code: "const errorMessage = locales.editor.missingRenderJobIds;",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("errorMessage", "locales.editor.missingRenderJobIds"),
          },
        ],
      },
    ],
  });
});

void describe("An import MUST NOT rename an imported symbol.", () => {
  ruleTester.run("no-redundant-alias:imports", noRedundantAliasRule, {
    valid: [
      {
        code: 'import { Toaster } from "sonner";',
        filename: srcFile("utils/example.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { Toaster as Sonner } from "sonner";',
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("Sonner", "Toaster"),
          },
        ],
      },
    ],
  });
});

void describe("An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.", () => {
  ruleTester.run("no-redundant-alias:exports", noRedundantAliasRule, {
    valid: [
      {
        code: "const defaultSliderMin = 6; export { defaultSliderMin };",
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'export { defaultSliderMin } from "./slider";',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'export { defaultSliderMin as "text-size-slider-min" };',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'export { handler as GET, handler as POST } from "./handler";',
        filename: srcFile("app/api/example/route.ts"),
      },
    ],
    invalid: [
      {
        code: "const defaultSliderMin = 6; export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: aliasMessage("TEXT_SIZE_SLIDER_MIN", "defaultSliderMin"),
          },
        ],
      },
      {
        code: 'export { defaultSliderMax as TEXT_SIZE_SLIDER_MAX } from "./slider";',
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: aliasMessage("TEXT_SIZE_SLIDER_MAX", "defaultSliderMax"),
          },
        ],
      },
    ],
  });
});

void describe("Destructuring MUST keep property names unchanged.", () => {
  describe("When an object uses an existing variable as a property value, the property MUST use the same name and shorthand form.", () => {
    describe("A direct data-contract field mapping whose names are not convention-equivalent MUST map to or from a contract controlled by an external service, third-party package, or runtime platform.", () => {
      describe("Mappings between data contracts controlled by this repository MUST preserve one canonical field name.", () => {
        describe("A direct field mapping MAY qualify the source field name with the source object's name.", () => {
          typedRuleTester.run("no-redundant-alias:object-properties", noRedundantAliasRule, {
            valid: [
              {
                code: [
                  "declare function loadData(): unknown;",
                  "declare const HttpMethod: { Post: string };",
                  "declare const credentials: { accessToken: string };",
                  "declare const fieldName: string;",
                  "declare const value: unknown;",
                  "declare const source: { [key: number]: string };",
                  "const numericKey = { 1: value };",
                  "const indexedValue = { value: source[0] };",
                  "const data = loadData(); const response = { data };",
                  "const contract = { method: HttpMethod.Post };",
                  'const wirePayload = { "access-token": credentials.accessToken };',
                  "const computedPayload = { [fieldName]: value };",
                  'const literalPayload = { status: "ready", retries: 3 };',
                  "const computedValue = { data: loadData() };",
                  "const loader = import('./editor').then((mod) => ({ default: mod.EditorSidebar }));",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  "interface Row { user_account_id: string; created_at: string }",
                  "interface ApiCredential { userAccountId: string; createdAt: string }",
                  "function map(row: Row): ApiCredential {",
                  "  return { userAccountId: row.user_account_id, createdAt: row.created_at };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/account.ts"),
              },
              {
                code: [
                  "interface Failure { detail: string }",
                  "function failureOf(error: Error): Failure {",
                  "  return { detail: error.message };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  "interface LocalSource { sourceName: string }",
                  "interface LocalTarget { targetName: string }",
                  "function mapLocal(source: LocalSource): LocalTarget {",
                  "  return { targetName: source.sourceName };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  "interface ListenerConfig { runOnce: boolean }",
                  "function optionsOf(config: ListenerConfig): AddEventListenerOptions {",
                  "  return { once: config.runOnce };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import type { RequestOptions } from "node:http";',
                  "interface HostConfig { host: string }",
                  "function optionsOf(config: HostConfig): RequestOptions {",
                  "  return { hostname: config.host };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import type { Stats } from "node:fs";',
                  "interface FileMetadata { createdAt: Date }",
                  "function metadataOf(stats: Stats): FileMetadata {",
                  "  return { createdAt: stats.birthtime };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const textSchema = z.string();",
                  "const schemas = { textSchema };",
                  "const payloadSchema = z.object({ content: schemas.textSchema });",
                  "void payloadSchema;",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  "declare const contract: { path: string };",
                  "const mock = { apiRoutePath: contract.path };",
                  "void mock;",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const fileSchema = z.object({ id: z.string(), type: z.string() });",
                  "const layerSchema = z.object({ fileId: z.string(), fileType: z.string() });",
                  "type File = z.infer<typeof fileSchema>;",
                  "type Layer = z.infer<typeof layerSchema>;",
                  "function layerOf(file: File): Layer {",
                  "  return { fileId: file.id, fileType: file.type };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "const requestSchema = z.object({ caption: z.string() });",
                  "const apiSchemas = { requestSchema };",
                  'defineApiContract({ method: HttpMethod.Post, path: "https://api.example.com/send", requestSchema: apiSchemas.requestSchema, responseSchema: z.undefined() });',
                  "interface EditorPayload { text: string }",
                  "function adapt(payload: EditorPayload): z.infer<typeof requestSchema> {",
                  "  return { caption: payload.text };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "const responseSchema = z.object({ file_id: z.string() });",
                  'defineApiContract({ method: HttpMethod.Get, path: "https://api.example.com/files", responseSchema });',
                  "type ExternalFile = z.infer<typeof responseSchema>;",
                  "interface FileModel { id: string }",
                  "function adapt(file: ExternalFile): FileModel {",
                  "  return { id: file.file_id };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "const requestSchema = z.object({ caption: z.string() });",
                  'defineApiContract({ method: HttpMethod.Post, "path": "https://api.example.com/quoted", requestSchema, responseSchema: z.undefined() });',
                  "interface EditorPayload { text: string }",
                  "function adapt(payload: EditorPayload): z.infer<typeof requestSchema> {",
                  "  return { caption: payload.text };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import * as contracts from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  'const path = "https://api.example.com/bridge";',
                  "const apiSchemas = {",
                  "  requestSchema: z.object({ caption: z.string() }),",
                  "  responseSchema: z.object({ file_id: z.string() }),",
                  "};",
                  'contracts.defineApiContract({ method: HttpMethod.Post, path, requestSchema: apiSchemas.requestSchema, responseSchema: apiSchemas["responseSchema"] });',
                  "interface EditorPayload { text: string }",
                  "interface FileModel { id: string }",
                  "function outbound(payload: EditorPayload): z.infer<typeof apiSchemas.requestSchema> {",
                  "  return { caption: payload.text };",
                  "}",
                  "function inbound(file: z.infer<typeof apiSchemas.responseSchema>): FileModel {",
                  "  return { id: file.file_id };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "const sourceSchema = z.object({ legacyName: z.string() });",
                  "const requestSchema = z.object({ canonicalName: z.string() });",
                  'defineApiContract({ method: HttpMethod.Post, path: "/api/internal", requestSchema, responseSchema: z.undefined() });',
                  'defineApiContract({ method: HttpMethod.Post, path: "https://api.example.com/external", requestSchema, responseSchema: z.undefined() });',
                  "function map(source: z.infer<typeof sourceSchema>): z.infer<typeof requestSchema> {",
                  "  return { canonicalName: source.legacyName };",
                  "}",
                ].join("\n"),
                filename: srcFile("utils/example.ts"),
              },
            ],
            invalid: [
              {
                code: [
                  'import { z } from "zod";',
                  "const sourceSchema = z.object({ legacyName: z.string() });",
                  "const targetSchema = z.object({ legacyName: z.string(), canonicalName: z.string() });",
                  "type Source = z.infer<typeof sourceSchema>;",
                  "type Target = z.infer<typeof targetSchema>;",
                  "function map(source: Source): Target {",
                  '  return { legacyName: "kept", canonicalName: source.legacyName };',
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: semanticMappingMessage("canonicalName", "legacyName") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "const sourceSchema = z.object({ legacyName: z.string() });",
                  "const requestSchema = z.object({ canonicalName: z.string() });",
                  'defineApiContract({ method: HttpMethod.Post, path: "/api/internal", requestSchema, responseSchema: z.undefined() });',
                  "function map(source: z.infer<typeof sourceSchema>): z.infer<typeof requestSchema> {",
                  "  return { canonicalName: source.legacyName };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: semanticMappingMessage("canonicalName", "legacyName") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  'import { defineApiContract } from "../../helpers/api-contract";',
                  'import { HttpMethod } from "../../constants/http-method";',
                  "declare function endpoint(): string;",
                  "const sourceSchema = z.object({ legacyName: z.string() });",
                  "const requestSchema = z.object({ canonicalName: z.string() });",
                  "defineApiContract({ method: HttpMethod.Post, path: endpoint(), requestSchema, responseSchema: z.undefined() });",
                  "function map(source: z.infer<typeof sourceSchema>): z.infer<typeof requestSchema> {",
                  "  return { canonicalName: source.legacyName };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: unknownContractOwnershipMessage("canonicalName", "legacyName") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const rawCredentialsSchema = z.object({ accessTokenSecret: z.string() });",
                  "type RawCredentials = z.infer<typeof rawCredentialsSchema>;",
                  "interface Credentials { accessSecret: string }",
                  "function map(rawCredentials: RawCredentials): Credentials {",
                  '  return { accessSecret: rawCredentials["accessTokenSecret"] };',
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/twitter.ts"),
                errors: [{ message: semanticMappingMessage("accessSecret", "accessTokenSecret") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const sourceSchema = z.object({ legacyName: z.string() });",
                  "type Source = z.infer<typeof sourceSchema>;",
                  "interface TargetA { canonicalName: string }",
                  "interface TargetB { canonicalName: string; marker?: boolean }",
                  "function map(source: Source): TargetA | TargetB {",
                  "  return { canonicalName: source.legacyName };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: semanticMappingMessage("canonicalName", "legacyName") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const rawCredentialsSchema = z.object({ accessTokenSecret: z.string() });",
                  "type RawCredentials = z.infer<typeof rawCredentialsSchema>;",
                  "interface Credentials { accessSecret: string }",
                  "function map(rawCredentials: RawCredentials): Credentials {",
                  "  return { accessSecret: rawCredentials.accessTokenSecret };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/twitter.ts"),
                errors: [{ message: semanticMappingMessage("accessSecret", "accessTokenSecret") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const rawCredentialsSchema = z.object({ accessTokenSecret: z.string() });",
                  "type RawCredentials = z.infer<typeof rawCredentialsSchema>;",
                  "interface Credentials { accessSecret: string }",
                  "declare const rawCredentials: RawCredentials;",
                  "const credentials: Credentials = { accessSecret: rawCredentials.accessTokenSecret };",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/twitter.ts"),
                errors: [{ message: semanticMappingMessage("accessSecret", "accessTokenSecret") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const sourceSchema = z.object({ file_id: z.string() });",
                  "type Source = z.infer<typeof sourceSchema>;",
                  "function map(source: Source) {",
                  "  return { id: source.file_id };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: unknownContractOwnershipMessage("id", "file_id") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const targetSchema = z.object({ id: z.string() });",
                  "type Target = z.infer<typeof targetSchema>;",
                  "function map(source: any): Target {",
                  "  return { id: source.file_id };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: unknownContractOwnershipMessage("id", "file_id") }],
              },
              {
                code: [
                  'import { z } from "zod";',
                  "const sourceSchema = z.object({ text: z.string() });",
                  "const looseSchema = z.object({}).loose();",
                  "type Source = z.infer<typeof sourceSchema>;",
                  "function map(source: Source): z.infer<typeof looseSchema> {",
                  "  return { caption: source.text };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: unknownContractOwnershipMessage("caption", "text") }],
              },
              {
                code: "const results = loadData(); const response = { data: results };",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"data" maps the local "results". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: "const { apiKey: appKey } = credentials;",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: bindingAliasMessage("appKey", "apiKey") }],
              },
              {
                code: 'const { apiKey: appKey = "" } = credentials;',
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: bindingAliasMessage("appKey", "apiKey") }],
              },
              {
                code: "function render({ x: left }: { x: number }) { return left; }",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [{ message: bindingAliasMessage("left", "x") }],
              },
              {
                code: 'const wirePayload = { "access-token": accessToken };',
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"access-token" maps the local "accessToken". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: "const data = loadData(); const response = { data: data };",
                output: "const data = loadData(); const response = { data };",
                filename: srcFile("utils/example.ts"),
                errors: [{ message: `Use property shorthand for "data". ${doc}` }],
              },
              {
                code: "const { id } = params; const input = { credentialId: id };",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"credentialId" maps the local "id". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: [
                  "function credentialsOf(rawCredentials: { accessTokenSecret: string }) {",
                  "  const { accessTokenSecret } = rawCredentials;",
                  "  if (!accessTokenSecret) throw new Error();",
                  "  return { accessSecret: accessTokenSecret };",
                  "}",
                ].join("\n"),
                output: null,
                filename: srcFile("utils/twitter.ts"),
                errors: [
                  {
                    message: `"accessSecret" maps the local "accessTokenSecret". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: "const positionSchema = createSchema(); const textLayer = { position: positionSchema }; const mediaLayer = { position: positionSchema };",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"position" maps the local "positionSchema". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                  {
                    message: `"position" maps the local "positionSchema". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: "export const routePostResultsSchema = createSchema(); const contract = { responseSchema: routePostResultsSchema };",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"responseSchema" maps the local "routePostResultsSchema". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
              {
                code: "function run(mode: Mode) { return { backgroundMode: mode }; }",
                output: null,
                filename: srcFile("utils/example.ts"),
                errors: [
                  {
                    message: `"backgroundMode" maps the local "mode". Keep the local name or map directly from its source object instead. ${doc}`,
                  },
                ],
              },
            ],
          });
        });
      });
    });
  });
});

void describe("It MUST be possible to determine who controls both sides of a renamed contract field.", () => {
  typedRuleTester.run("no-redundant-alias:unknown-contract-ownership", noRedundantAliasRule, {
    valid: [],
    invalid: [
      {
        code: [
          'import { z } from "zod";',
          "const sourceSchema = z.object({ file_id: z.string() });",
          "type Source = z.infer<typeof sourceSchema>;",
          "function map(source: Source) {",
          "  return { id: source.file_id };",
          "}",
        ].join("\n"),
        output: null,
        filename: srcFile("utils/example.ts"),
        errors: [{ message: unknownContractOwnershipMessage("id", "file_id") }],
      },
    ],
  });
});

void describe("A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.", () => {
  ruleTester.run("no-redundant-alias:types", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "type BrandedIdentifier = string & { readonly __brand: unique symbol };",
          "type OptionalIdentifier = string | undefined;",
          'type ApiCredential = PlatformCredentialApi & { source: "api" };',
          "type Generic<T> = Box<T>;",
          "type Specialized = Box<string>;",
          "type Derived = typeof source;",
        ].join("\n"),
        filename: srcFile("types/example.ts"),
      },
    ],
    invalid: [
      {
        code: [
          "type FlagKeys = string;",
          "type Count = number;",
          "type Enabled = boolean;",
          "type Token = symbol;",
          "type Size = bigint;",
          "type Empty = null;",
          "type Missing = undefined;",
        ].join("\n"),
        filename: srcFile("types/example.ts"),
        errors: [
          { message: aliasMessage("FlagKeys", "string") },
          { message: aliasMessage("Count", "number") },
          { message: aliasMessage("Enabled", "boolean") },
          { message: aliasMessage("Token", "symbol") },
          { message: aliasMessage("Size", "bigint") },
          { message: aliasMessage("Empty", "null") },
          { message: aliasMessage("Missing", "undefined") },
        ],
      },
      {
        code: "type ApiCredential = PlatformCredentialApi;",
        filename: srcFile("types/example.ts"),
        errors: [
          {
            message: aliasMessage("ApiCredential", "PlatformCredentialApi"),
          },
        ],
      },
      {
        code: "type ApiCredential = Platform.ApiCredential;",
        filename: srcFile("types/example.ts"),
        errors: [
          {
            message: aliasMessage("ApiCredential", "Platform.ApiCredential"),
          },
        ],
      },
    ],
  });
});

void describe("An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.", () => {
  ruleTester.run("no-redundant-alias:interfaces", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "interface ApiResponse extends PlatformResponse { receivedAt: Date }",
          "interface Generic<T> extends Box<T> {}",
          "interface Specialized extends Box<string> {}",
          "interface Combined extends First, Second {}",
        ].join("\n"),
        filename: srcFile("types/example.ts"),
      },
    ],
    invalid: [
      {
        code: "interface ApiResponse extends PlatformResponse {}",
        filename: srcFile("types/example.ts"),
        errors: [
          {
            message: aliasMessage("ApiResponse", "PlatformResponse"),
          },
        ],
      },
      {
        code: "interface ApiResponse extends Platform.Response {}",
        filename: srcFile("types/example.ts"),
        errors: [
          {
            message: aliasMessage("ApiResponse", "Platform.Response"),
          },
        ],
      },
    ],
  });
});
