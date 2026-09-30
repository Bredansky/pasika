import { describe, ruleTester, srcFile } from "../rule-tester";
import { noRedundantAliasRule } from "./no-redundant-alias";

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

function aliasMessage(alias: string, source: string): string {
  return `"${alias}" only renames "${source}". Use "${source}" directly or rename the original symbol and its consumers. ${doc}`;
}

void describe("A `const` variable declaration whose initializer is another symbol identifier MUST NOT introduce a second name for that symbol unless Next.js requires a specific exported name.", () => {
  ruleTester.run("no-redundant-alias:variables", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "const defaultStatus = ResponseStatus.Pending;",
          "const config = app.config;",
          "const missing = undefined;",
          "const result = buildResult(source);",
          "const { value: localValue } = source;",
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

void describe("A type alias that directly names one non-generic type MUST NOT introduce a second name for that type.", () => {
  ruleTester.run("no-redundant-alias:types", noRedundantAliasRule, {
    valid: [
      {
        code: [
          "type Identifier = string;",
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
