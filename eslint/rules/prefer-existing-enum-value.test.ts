import { mkdtempSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { CwdAwareRuleTester, describe } from "../rule-tester";
import { preferExistingEnumValueRule } from "./prefer-existing-enum-value";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-existing-enum-")));
process.chdir(root);
const src = path.join(root, "src");
const file = (name: string, code: string): { filename: string; code: string } => {
  const filename = path.join(src, name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
};
writeFileSync(
  path.join(root, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      baseUrl: ".",
      paths: { "@/*": ["src/*"] },
    },
    include: ["src/**/*.ts"],
  }),
);
file(
  "constants/draft-columns.ts",
  ['export enum DraftColumnEnum { Id = "id", ChannelSourceId = "channel_source_id", CreatedAt = "created_at" }'].join(
    "\n",
  ),
);
file("constants/publication-columns.ts", 'export enum PublicationColumnEnum { Id = "id", Status = "status" }');
file(
  "constants/routes.ts",
  [
    'export enum ApiRoute { Post = "/api/post", TelegramWebhook = "/api/telegram/webhook", AuthPrefix = "/api/auth/" }',
  ].join("\n"),
);
file(
  "constants/index.ts",
  ['export * from "./draft-columns";', 'export * from "./publication-columns";', 'export * from "./routes";'].join(
    "\n",
  ),
);

const typedTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { projectService: true, tsconfigRootDir: root },
  },
});

const doc = "See docs/next-codebase-guide/rules/constants-rule.md";
function diagnostic(member: string, raw: string, slot: string): string {
  return `Use ${member} instead of the raw string "${raw}" in this ${slot}. ${doc}`;
}

void describe("A database column-selector call or local API route path MUST use an imported enum member instead of a matching raw string when exactly one imported enum member expresses that value in the same domain.", () => {
  typedTester.run("prefer-existing-enum-value", preferExistingEnumValueRule, {
    valid: [
      file(
        "features/publishing/canonical.ts",
        [
          'import { DraftColumnEnum, ApiRoute } from "@/constants";',
          "declare const query: { eq: (name: string, value: string) => unknown; order: (name: string) => unknown };",
          'query.eq(DraftColumnEnum.ChannelSourceId, "source");',
          "query.order(DraftColumnEnum.CreatedAt);",
          "const contract = { path: ApiRoute.Post };",
        ].join("\n"),
      ),
      file(
        "features/publishing/not-imported.ts",
        [
          "declare const query: { eq: (name: string, value: string) => unknown };",
          'query.eq("channel_source_id", "source");',
        ].join("\n"),
      ),
      file(
        "features/publishing/unrelated-strings.ts",
        [
          'import { DraftColumnEnum, ApiRoute } from "@/constants";',
          'const message = "channel_source_id";',
          'const status = "new";',
          'const payload = { description: "/api/post", endpoint: "https://api.example.com" };',
          'const array = ["/api/post", "channel_source_id"];',
          'const url = { pathname: "/unknown" };',
        ].join("\n"),
      ),
      file(
        "features/publishing/ambiguous.ts",
        [
          'import { DraftColumnEnum, PublicationColumnEnum } from "@/constants";',
          "declare const query: { eq: (name: string, value: string) => unknown };",
          'query.eq("id", "x");',
        ].join("\n"),
      ),
      file(
        "features/publishing/other-domain.ts",
        [
          'import { ApiRoute } from "@/constants";',
          "declare const query: { eq: (name: string, value: string) => unknown };",
          'query.eq("/api/post", "x");',
        ].join("\n"),
      ),
      file(
        "features/publishing/draft.test.ts",
        [
          'import { DraftColumnEnum } from "@/constants";',
          "declare const query: { eq: (name: string, value: string) => unknown };",
          'query.eq("channel_source_id", "x");',
        ].join("\n"),
      ),
    ],
    invalid: [
      {
        ...file(
          "features/publishing/raw-columns.ts",
          [
            'import { DraftColumnEnum } from "@/constants";',
            "declare const query: { eq: (name: string, value: string) => unknown; order: (name: string) => unknown };",
            'query.eq("channel_source_id", "x").toString();',
            'query.order("created_at");',
          ].join("\n"),
        ),
        errors: [
          { message: diagnostic("DraftColumnEnum.ChannelSourceId", "channel_source_id", "column selector") },
          { message: diagnostic("DraftColumnEnum.CreatedAt", "created_at", "column selector") },
        ],
      },
      {
        ...file(
          "features/publishing/raw-api-route.ts",
          [
            'import { ApiRoute } from "@/constants";',
            'const contract = { path: "/api/post" };',
            "declare const request: { nextUrl: { pathname: string } };",
            'const webhook = request.nextUrl.pathname === "/api/telegram/webhook";',
            'const auth = request.nextUrl.pathname.startsWith("/api/auth/");',
          ].join("\n"),
        ),
        errors: [
          { message: diagnostic("ApiRoute.Post", "/api/post", "route path") },
          { message: diagnostic("ApiRoute.TelegramWebhook", "/api/telegram/webhook", "route path") },
          { message: diagnostic("ApiRoute.AuthPrefix", "/api/auth/", "route path") },
        ],
      },
      {
        ...file(
          "features/publishing/renamed-import.ts",
          [
            'import { DraftColumnEnum as Columns } from "@/constants";',
            "declare const query: { eq: (name: string, value: string) => unknown };",
            'query.eq("channel_source_id", "x");',
          ].join("\n"),
        ),
        errors: [{ message: diagnostic("Columns.ChannelSourceId", "channel_source_id", "column selector") }],
      },
    ],
  });
});
