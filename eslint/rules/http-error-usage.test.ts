import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester } from "../rule-tester";
import { httpErrorUsageRule } from "./http-error-usage";

const DOC = "docs/next-codebase-guide/rules/route-handler-rule.md";

const HANDS_ERROR_BACK = `A delegated module must throw the HttpError it reports a failure with, not return it. See ${DOC}`;

const THROWS_OTHER = (name: string): string =>
  `A delegated module must report a failure by throwing an HttpError, not "${name}". See ${DOC}`;

/**
 * One pipeline: `route.ts` reaches `publisher`, `legacy-publisher`,
 * `publishing-error`, and `require-session`; nothing reaches the hook, `orphan`,
 * or `orphan-session`. The rule reads the tree from disk, so each fixture is a
 * real project.
 */
const PIPELINE: Record<string, string> = {
  "app/api/publish/route.ts": [
    'import { publish } from "@/utils/publisher";',
    'import { publishLegacy } from "@/utils/legacy-publisher";',
    'import { publishAgain } from "@/utils/publishing-error";',
    'import { requireUserId } from "@/utils/require-session";',
    "",
    "export const POST = withResponse(",
    "  publishSchema,",
    "  withUserId(async (userId: string) => ({",
    '    message: "Published.",',
    "    data: [",
    "      await requireUserId(userId),",
    "      await publish(userId),",
    "      await publishLegacy(userId),",
    "      await publishAgain(userId),",
    "    ],",
    "  })),",
    ");",
    "",
  ].join("\n"),

  "utils/http-error.ts":
    "export class HttpError extends Error {\n  constructor(\n    message: string,\n    public readonly status: number,\n  ) {\n    super(message);\n  }\n}\n",
  "utils/domain-errors.ts":
    'import { HttpError } from "./http-error";\n\nexport class NotFoundError extends HttpError {}\n',

  // Failures that are HttpErrors, one directly and one through a class declared
  // in another module.
  "utils/publisher.ts": [
    'import { HttpError } from "./http-error";',
    'import { NotFoundError } from "./domain-errors";',
    "",
    "export class DraftLockedError extends NotFoundError {}",
    "",
    "export async function publish(id: string): Promise<string> {",
    "  if (!id) {",
    '    throw new HttpError("Missing id", 400);',
    "  }",
    '  if (id === "locked") {',
    '    throw new DraftLockedError("Draft is locked");',
    "  }",
    "  return id;",
    "}",
    "",
  ].join("\n"),

  "utils/require-session.ts": [
    'import { HttpError } from "./http-error";',
    "",
    "export async function requireUserId(session: { userId?: string } | null): Promise<string> {",
    "  if (!session?.userId) {",
    '    throw new HttpError("Unauthorized", 401);',
    "  }",
    "  return session.userId;",
    "}",
    "",
  ].join("\n"),

  // A failure `withResponse` cannot recognize.
  "utils/legacy-publisher.ts": [
    'import { HttpError } from "./http-error";',
    "",
    "export async function publishLegacy(id: string): Promise<string> {",
    "  if (!id) {",
    '    throw new Error("Failed to publish");',
    "  }",
    "  return id;",
    "}",
    "",
  ].join("\n"),

  // A failure with its own name that still is not an HttpError.
  "utils/publishing-error.ts": [
    'import { HttpError } from "./http-error";',
    "",
    "export class PublishingError extends Error {}",
    "",
    "export async function publishAgain(id: string): Promise<string> {",
    "  if (!id) {",
    '    throw new PublishingError("Failed to publish again");',
    "  }",
    '  throw new HttpError("Missing id", 400);',
    "}",
    "",
  ].join("\n"),

  // No route reaches any of these. The hook's body is an expression, so the
  // arrow visitor has to decide about it before anything else.
  "features/editor/hooks/use-draft.ts": "export const useDraft = (id: string) => id;\n",
  "utils/orphan.ts":
    'export function orphan(id: string) {\n  if (!id) {\n    throw new Error("Orphan");\n  }\n  return id;\n}\n',
  "utils/orphan-session.ts": [
    'import { HttpError } from "./http-error";',
    "",
    "export function orphanSession(id: string) {",
    "  if (!id) {",
    '    return new HttpError("Orphan", 400);',
    "  }",
    "  return id;",
    "}",
    "",
  ].join("\n"),
};

const temps: string[] = [];
afterAll(() => {
  for (const temp of temps) rmSync(temp, { recursive: true, force: true });
});

// realpath: on macOS the temp dir is a symlink, and the rule resolves its source
// root from the working directory, so the two spellings have to agree.
/** A tree with no `src/` at all: nothing to reach, so nothing is delegated. */
function makeBareTree(): { file: string } {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-http-error-usage-bare-")));
  temps.push(root);
  process.chdir(root);
  return { file: path.join(root, "module.ts") };
}

function makeTree(files: Record<string, string>): {
  file: (relativePath: string) => string;
  read: (relativePath: string) => string;
} {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-http-error-usage-")));
  temps.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, "src", relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  // The rule resolves its source root from the working directory, exactly as it
  // does in a repository, so this tree becomes the project for the cases below.
  process.chdir(root);
  return {
    file: (relativePath) => path.join(root, "src", relativePath),
    read: (relativePath) => files[relativePath] ?? "",
  };
}

void describe("A delegated module MUST report a failure by throwing an `HttpError` — never another error type, never a returned value.", () => {
  const { file, read } = makeTree(PIPELINE);

  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      // HttpError itself, plus a class extending it through the module that
      // declares the parent.
      { code: read("utils/publisher.ts"), filename: file("utils/publisher.ts") },
      // The route, whose own failures are HttpErrors too.
      { code: read("app/api/publish/route.ts"), filename: file("app/api/publish/route.ts") },
      { code: read("utils/require-session.ts"), filename: file("utils/require-session.ts") },
      // A concise arrow body whose error is thrown rather than handed back.
      {
        code: `const requireUserId = async () => { throw new HttpError("Unauthorized", 401); };`,
        filename: file("utils/require-session.ts"),
      },
      // A bare return hands nothing back at all.
      {
        code: `export function publishLater(id: string) {
          if (!id) return;
          return id;
        }`,
        filename: file("utils/require-session.ts"),
      },
      // A wrapped call that hands back an ordinary value.
      {
        code: `export function publishLater(id: string) {
          return Promise.resolve(id);
        }`,
        filename: file("utils/require-session.ts"),
      },
      // A namespaced constructor is not a class this rule can name, so it stays
      // silent rather than guess.
      {
        code: `export function publishLater(id: string) {
          return new errors.HttpError("Missing id", 400);
        }`,
        filename: file("utils/require-session.ts"),
      },
      // Outside the pipeline: a hook no handler calls.
      { code: read("features/editor/hooks/use-draft.ts"), filename: file("features/editor/hooks/use-draft.ts") },
      // Outside the pipeline: a module under utils/ that no route reaches, so
      // neither half applies — nothing awaits the call this error escapes.
      { code: read("utils/orphan.ts"), filename: file("utils/orphan.ts") },
      { code: read("utils/orphan-session.ts"), filename: file("utils/orphan-session.ts") },
    ],
    invalid: [
      // Handed back rather than thrown.
      {
        code: `async function requireUserId() {
          const session = await getServerSession(authOptions);
          if (!session?.user?.id) {
            return new HttpError("Unauthorized", 401);
          }
          return session.user.id;
        }`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      // The same mistake with no return statement at all.
      {
        code: `const requireUserId = async () => new HttpError("Unauthorized", 401);`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      // Handed back behind a condition, or behind a fallback operator.
      {
        code: `async function requireUserId(id: string) {
          return id ? id : new HttpError("Missing id", 400);
        }`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      {
        code: `async function requireUserId(id: string) {
          return (await findDraft(id)) || new HttpError("Missing id", 400);
        }`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      // Handed back through an await, which resolves to the error itself.
      {
        code: `async function requireUserId() {
          return await new HttpError("Unauthorized", 401);
        }`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      // Handed back wrapped in the promise the caller awaits.
      {
        code: `async function requireUserId() {
          return Promise.resolve(new HttpError("Unauthorized", 401));
        }`,
        filename: file("utils/require-session.ts"),
        errors: [{ message: HANDS_ERROR_BACK }],
      },
      // Thrown, but not an HttpError.
      {
        code: read("utils/legacy-publisher.ts"),
        filename: file("utils/legacy-publisher.ts"),
        errors: [{ message: THROWS_OTHER("Error") }],
      },
      {
        code: read("utils/publishing-error.ts"),
        filename: file("utils/publishing-error.ts"),
        errors: [{ message: THROWS_OTHER("PublishingError") }],
      },
    ],
  });

  // A repository with no src/ has no route to reach anything, so the rule has no
  // pipeline to judge and stays quiet either way.
  const bare = makeBareTree();
  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      {
        code: `export function publishLater(id: string) {
          if (!id) {
            throw new Error("Failed to publish");
          }
          return id;
        }`,
        filename: bare.file,
      },
      {
        code: `export function publishLater(id: string) {
          if (!id) {
            return new HttpError("Missing id", 400);
          }
          return id;
        }`,
        filename: bare.file,
      },
    ],
    invalid: [],
  });
});
