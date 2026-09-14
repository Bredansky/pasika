import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { zodFetchHelperRule } from "./zod-fetch-helper";

const DOC = "See docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";
const CONFIG = "export default [];\n";

/** The canonical beats: the status decides, the schema validates, the body stays a body. */
const CANONICAL_BODY = `  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ZodFetchError(response.status, response.statusText, await response.text());
  }

  if (!responseSchema) {
    return { body: response.body, status: response.status, headers: response.headers };
  }

  return responseSchema.parse(await response.json());`;

function bodyWith(changes: [string, string][] = []): string {
  let text = CANONICAL_BODY;
  for (const [from, to] of changes) text = text.replace(from, to);
  return text;
}

const declaration = (body: string): string => `import { HttpError } from "./http-error";

export async function zodFetch({ url, init, responseSchema }) {
${body}
}
`;

const arrow = (body: string): string => `export const zodFetch = async ({ url, init, responseSchema }) => {
${body}
};
`;

const message = (beat: string): string => `zodFetch ${beat}. ${DOC}`;

/**
 * The existence half reads the tree from disk, so each fixture is a real
 * project: an eslint config at its root, and the modules the rule indexes
 * under `src/`.
 */
const temps: string[] = [];
afterAll(() => {
  for (const temp of temps) rmSync(temp, { recursive: true, force: true });
});

interface Project {
  config: string;
  root: string;
}

function makeProject(files: Record<string, string>): Project {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-zod-fetch-helper-")));
  temps.push(root);
  writeFileSync(path.join(root, "eslint.config.ts"), CONFIG);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, "src", relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  return { root, config: path.join(root, "eslint.config.ts") };
}

void describe("A repository MUST define a `zodFetch` helper, and `fetch` MUST NOT be called outside it.", () => {
  const withHelper = makeProject({ "utils/zod-fetch.ts": declaration(CANONICAL_BODY) });
  // A tree with source but no helper anywhere: the index has modules and none
  // of them exports `zodFetch`.
  const withoutHelper = makeProject({
    "utils/format-date.ts": "export function formatDate(value: Date): string { return value.toISOString(); }\n",
  });

  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: withHelper.config, code: CONFIG },
      // A module that reaches the helper is not this rule's concern.
      {
        filename: srcFile("utils/releases.ts"),
        code: `import { zodFetch } from "../utils";\n\nexport async function getRelease() {\n  return await zodFetch({ url: "https://api.example.com/releases/latest", responseSchema: releaseSchema });\n}\n`,
      },
    ],
    invalid: [
      {
        filename: withoutHelper.config,
        code: CONFIG,
        errors: [{ message: `A repository must define a zodFetch helper. ${DOC}` }],
      },
      // A module that calls fetch itself skips the helper entirely.
      {
        filename: srcFile("features/publishing/utils/instagram.ts"),
        code: `export async function publishContainer(containerId: string) {\n  const response = await fetch("https://graph.facebook.com/me/media_publish");\n  return await response.json();\n}\n`,
        errors: [{ message: `fetch must not be called outside the zodFetch helper. ${DOC}` }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST read the response status and throw an error carrying the status an upstream failure reported.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) },
      // The same beats, written over HTTP status codes rather than `ok`.
      {
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(bodyWith([["if (!response.ok) {", "if (response.status >= 400) {"]])),
      },
    ],
    invalid: [
      {
        // The failure path never asks whether the response succeeded.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(bodyWith([["if (!response.ok) {", "if (options.strict) {"]])),
        errors: [{ message: message("must read the response status") }],
      },
      {
        // Every upstream failure becomes the same fixed status.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              "throw new ZodFetchError(response.status, response.statusText, await response.text())",
              'throw new ZodFetchError(502, "Bad Gateway", "")',
            ],
          ]),
        ),
        errors: [{ message: message("must throw an error carrying the status the upstream reported") }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST validate a JSON body through the response schema before returning it.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [{ filename: srcFile("utils/zod-fetch.ts"), code: arrow(CANONICAL_BODY) }],
    invalid: [
      {
        // The decoded body is handed back unvalidated.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(bodyWith([["responseSchema.parse(await response.json())", "await response.json()"]])),
        errors: [{ message: message("must validate the JSON body through the response schema") }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST hand back the body, status, and headers of a response it does not decode, without consuming the body.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [{ filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) }],
    invalid: [
      {
        // The response's body is dropped, so a caller that relays it has nothing to pass on.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              "return { body: response.body, status: response.status, headers: response.headers };",
              "return { status: response.status, headers: response.headers };",
            ],
          ]),
        ),
        errors: [{ message: message("must hand back the body of a response it does not decode") }],
      },
    ],
  });
});
