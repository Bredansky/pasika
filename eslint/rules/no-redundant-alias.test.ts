import { describe, ruleTester, srcFile } from "../rule-tester";
import { noRedundantAliasRule } from "./no-redundant-alias";

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

function aliasMessage(alias: string, source: string): string {
  return `"${alias}" only renames "${source}". Use "${source}" directly or rename the original symbol and its consumers. ${doc}`;
}

function bindingAliasMessage(alias: string, source: string): string {
  return `"${alias}" renames "${source}" while creating a binding. Keep the original name and map it only at the object boundary. ${doc}`;
}

void describe("A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.", () => {
  ruleTester.run("no-redundant-alias:variables", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "const defaultStatus = ResponseStatus.Pending;",
          "const config = app.config;",
          "const missing = undefined;",
          "const result = buildResult(source);",
          "let current = initial;",
          "var legacyCurrent = initial;",
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

void describe("Destructuring MUST keep property names unchanged. When an object uses an existing variable, the property MUST have the same name and use shorthand. A property MAY use a different name when it reads directly from another object.", () => {
  ruleTester.run("no-redundant-alias:object-properties", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "const data = loadData(); const response = { data };",
          "const method = HttpMethod.Post; const contract = { method };",
          "const config = { appKey: credentials.apiKey };",
          "const row = { userAccountId: dbRow.user_account_id };",
          'const wirePayload = { "access-token": accessToken };',
          "const computedPayload = { [fieldName]: value };",
          'const literalPayload = { status: "ready", retries: 3 };',
          "const computedValue = { data: loadData() };",
          'import { HttpMethod } from "pasika/http-method"; const contract = { method: HttpMethod.Post };',
          "const loader = import('./editor').then((mod) => ({ default: mod.EditorSidebar }));",
        ].join("\n"),
        filename: srcFile("utils/example.ts"),
      },
    ],
    invalid: [
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
        errors: [
          {
            message: bindingAliasMessage("appKey", "apiKey"),
          },
        ],
      },
      {
        code: "function render({ x: left }: { x: number }) { return left; }",
        output: null,
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: bindingAliasMessage("left", "x"),
          },
        ],
      },
      {
        code: "const data = loadData(); const response = { data: data };",
        output: "const data = loadData(); const response = { data };",
        filename: srcFile("utils/example.ts"),
        errors: [
          {
            message: `Use property shorthand for "data". ${doc}`,
          },
        ],
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
