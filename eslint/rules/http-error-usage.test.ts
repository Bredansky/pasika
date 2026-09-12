import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { httpErrorUsageRule } from "./http-error-usage";

const DOC = "docs/next-codebase-guide/rules/route-handler-rule.md";

const MUST_THROW = `An HttpError constructed inside a withResponse pipeline must be thrown, not returned. See ${DOC}`;

const THROWS_OTHER = (name: string): string =>
  `A delegated module must throw an HttpError for a failure it reports, not "${name}". See ${DOC}`;

/**
 * One pipeline: `route.ts` reaches `publisher`, `legacy-publisher`, and
 * `publishing-error`, and nothing reaches the hook or `orphan`. The rule reads
 * the tree from disk, so each fixture is a real project.
 */
const PIPELINE: Record<string, string> = {
  "app/api/publish/route.ts": [
    'import { publish } from "@/utils/publisher";',
    'import { publishLegacy } from "@/utils/legacy-publisher";',
    'import { publishAgain } from "@/utils/publishing-error";',
    "",
    "export const POST = withResponse(",
    "  publishSchema,",
    "  withUserId(async (userId: string) => ({",
    '    message: "Published.",',
    "    data: [await publish(userId), await publishLegacy(userId), await publishAgain(userId)],",
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

  // No route reaches either of these.
  "features/editor/hooks/use-draft.ts":
    'export function useDraft(id: string) {\n  if (!id) {\n    throw new Error("Draft missing");\n  }\n  return id;\n}\n',
  "utils/orphan.ts":
    'export function orphan(id: string) {\n  if (!id) {\n    throw new Error("Orphan");\n  }\n  return id;\n}\n',
};

const temps: string[] = [];
afterAll(() => {
  for (const temp of temps) rmSync(temp, { recursive: true, force: true });
});

// realpath: on macOS the temp dir is a symlink, and the rule resolves its source
// root from the working directory, so the two spellings have to agree.
function makeTree(files: Record<string, string>): {
  root: string;
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
  return {
    root,
    file: (relativePath) => path.join(root, "src", relativePath),
    read: (relativePath) => files[relativePath] ?? "",
  };
}

void describe("An `HttpError` constructed inside a `withResponse` pipeline MUST be thrown, not returned.", () => {
  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      {
        code: `async function requireUserId() {
          const session = await getServerSession(authOptions);
          if (!session?.user?.id) {
            throw new HttpError("Unauthorized", 401);
          }
          return session.user.id;
        }`,
        filename: srcFile("utils/require-session.ts"),
      },
      // A concise arrow body whose error is thrown rather than handed back.
      {
        code: `const requireUserId = async () => { throw new HttpError("Unauthorized", 401); };`,
        filename: srcFile("utils/require-session.ts"),
      },
      // Throwing an unrelated error is not this rule's concern.
      {
        code: `async function requireUserId() {
          const session = await getServerSession(authOptions);
          if (!session?.user?.id) {
            throw new Error("Unauthorized");
          }
          return session.user.id;
        }`,
        filename: srcFile("utils/require-session.ts"),
      },
    ],
    invalid: [
      {
        code: `async function requireUserId() {
          const session = await getServerSession(authOptions);
          if (!session?.user?.id) {
            return new HttpError("Unauthorized", 401);
          }
          return session.user.id;
        }`,
        filename: srcFile("utils/require-session.ts"),
        errors: [{ message: MUST_THROW }],
      },
      // A concise arrow body hands the error back with no return statement at all.
      {
        code: `const requireUserId = async () => new HttpError("Unauthorized", 401);`,
        filename: srcFile("utils/require-session.ts"),
        errors: [{ message: MUST_THROW }],
      },
      // The handed-back value sits behind a condition.
      {
        code: `async function requireUserId(id: string) {
          return id ? id : new HttpError("Missing id", 400);
        }`,
        filename: srcFile("utils/require-session.ts"),
        errors: [{ message: MUST_THROW }],
      },
      // The error is wrapped in the promise the caller awaits.
      {
        code: `async function requireUserId() {
          return Promise.resolve(new HttpError("Unauthorized", 401));
        }`,
        filename: srcFile("utils/require-session.ts"),
        errors: [{ message: MUST_THROW }],
      },
    ],
  });
});

void describe("A delegated module MUST report a failure by throwing an `HttpError`, not another error type.", () => {
  const { root, file, read } = makeTree(PIPELINE);
  // The rule resolves its source root from the working directory, exactly as it
  // does in a repository, so this tree becomes the project for these cases.
  process.chdir(root);

  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      // HttpError itself, in a module the route reaches.
      { code: read("utils/publisher.ts"), filename: file("utils/publisher.ts") },
      // The route, whose own failures are HttpErrors too.
      { code: read("app/api/publish/route.ts"), filename: file("app/api/publish/route.ts") },
      // Outside the pipeline: a hook no handler calls.
      { code: read("features/editor/hooks/use-draft.ts"), filename: file("features/editor/hooks/use-draft.ts") },
      // Outside the pipeline: a module placed under utils/ that no route imports.
      { code: read("utils/orphan.ts"), filename: file("utils/orphan.ts") },
    ],
    invalid: [
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
});
