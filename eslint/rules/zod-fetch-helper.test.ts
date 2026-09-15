import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { clearProjectIndex } from "../project/index";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { zodFetchHelperRule } from "./zod-fetch-helper";

const DOC = "See docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";
const CONFIG = "export default [];\n";

/**
 * The failure path: the status decides, and the body is read so the error can
 * carry what the upstream answered with.
 */
const FAILURE_BODY = `  if (!response.ok) {
    const body = await response.text();

    throw new HttpError(\`Request failed with status \${String(response.status)}\`, response.status, body);
  }`;

/** The canonical beats: the status decides, the schema validates, the body stays a body. */
const CANONICAL_BODY = `  const response = await fetch(url, init);

${FAILURE_BODY}

  if (!responseSchema) {
    const streamed = streamBody.safeParse(response.body);

    if (!streamed.success) {
      throw new HttpError("The upstream answered without a body to relay.", response.status);
    }

    return { body: streamed.data, status: response.status, headers: response.headers };
  }

  return responseSchema.parse(await response.json());`;

function bodyWith(changes: [string, string][] = []): string {
  let text = CANONICAL_BODY;
  for (const [from, to] of changes) text = text.replace(from, to);
  return text;
}

/** Replaces the failure path as a whole, so a variant reads as one decision. */
function bodyWithFailure(changes: [string, string][]): string {
  let failure = FAILURE_BODY;
  for (const [from, to] of changes) failure = failure.replace(from, to);
  return bodyWith([[FAILURE_BODY, failure]]);
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
  // Every case writes its own tree, so nothing the index memoized describes this one.
  clearProjectIndex();
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
              `throw new HttpError(\`Request failed with status \${String(response.status)}\`, response.status, body);`,
              `throw new HttpError(\`Request failed with status \${String(response.status)}\`, 502, body);`,
            ],
            [
              'throw new HttpError("The upstream answered without a body to relay.", response.status)',
              'throw new HttpError("The upstream answered without a body to relay.", 502)',
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
    valid: [
      { filename: srcFile("utils/zod-fetch.ts"), code: arrow(CANONICAL_BODY) },
      // The same beats written against an options object, so the check reads the
      // call rather than the names this module happened to destructure.
      {
        filename: srcFile("utils/zod-fetch.ts"),
        code: `import { HttpError } from "./http-error";

export async function zodFetch(options) {
  const response = await fetch(options.url, options.init);

  if (!response.ok) {
    const body = await response.text();

    throw new HttpError(\`Request failed with status \${String(response.status)}\`, response.status, body);
  }

  if (!options.responseSchema) {
    return { body: options.streamBody.parse(response.body), status: response.status, headers: response.headers };
  }

  return options.responseSchema.parse(await response.json());
}
`,
      },
    ],
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

void describe("The `zodFetch` helper MUST carry the body a failed response answered with on the error it throws.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) },
      // The same beat, with the read written at the throw rather than bound first.
      {
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWithFailure([
            [
              `    const body = await response.text();\n\n    throw new HttpError(\`Request failed with status \${String(response.status)}\`, response.status, body);`,
              `    throw new HttpError(\`Request failed with status \${String(response.status)}\`, response.status, await response.text());`,
            ],
          ]),
        ),
      },
    ],
    invalid: [
      {
        // The failure leaves with its status and nothing the upstream answered
        // with, so a log line has no body and a caller has nothing to name.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(bodyWithFailure([[", response.status, body);", ", response.status);"]])),
        errors: [{ message: message("must carry the body a failed response answered with") }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST hand back the body, status, and headers of the response when the caller named no response schema.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) },
      // The same hand-back, with the stream named once and returned as it is —
      // a name the failure path also uses, on a body it reads for itself.
      {
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              `    const streamed = streamBody.safeParse(response.body);\n\n    if (!streamed.success) {\n      throw new HttpError("The upstream answered without a body to relay.", response.status);\n    }\n\n    return { body: streamed.data, status: response.status, headers: response.headers };`,
              `    const body = streamBody.parse(response.body);\n\n    return { body, status: response.status, headers: response.headers };`,
            ],
          ]),
        ),
      },
    ],
    invalid: [
      {
        // The response's body is dropped, so a caller that relays it has nothing to pass on.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              "return { body: streamed.data, status: response.status, headers: response.headers };",
              "return { status: response.status, headers: response.headers };",
            ],
          ]),
        ),
        errors: [{ message: message("must hand back the body of a response it does not decode") }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST NOT decode the body it hands back.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [{ filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) }],
    invalid: [
      {
        // The read is bound to a name, and that name is what the caller receives.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              "    return { body: streamed.data, status: response.status, headers: response.headers };",
              `    const decoded = await response.json();

    return { body: decoded, status: response.status, headers: response.headers };`,
            ],
          ]),
        ),
        errors: [{ message: message("must not decode the body it hands back") }],
      },
      {
        // The read is written at the return, so the caller receives it directly.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              "    return { body: streamed.data, status: response.status, headers: response.headers };",
              "    return { body: await response.json(), status: response.status, headers: response.headers };",
            ],
          ]),
        ),
        errors: [{ message: message("must not decode the body it hands back") }],
      },
    ],
  });
});

void describe("The `zodFetch` helper MUST parse the body it hands back as a stream before returning it.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [{ filename: srcFile("utils/zod-fetch.ts"), code: declaration(CANONICAL_BODY) }],
    invalid: [
      {
        // The body is handed on as it arrived, so a caller that relays it gets
        // whatever the field held rather than a stream it can pass on.
        filename: srcFile("utils/zod-fetch.ts"),
        code: declaration(
          bodyWith([
            [
              `    const streamed = streamBody.safeParse(response.body);

    if (!streamed.success) {
      throw new HttpError("The upstream answered without a body to relay.", response.status);
    }

    return { body: streamed.data, status: response.status, headers: response.headers };`,
              "    return { body: response.body, status: response.status, headers: response.headers };",
            ],
          ]),
        ),
        errors: [{ message: message("must parse the body it hands back as a stream") }],
      },
    ],
  });
});
