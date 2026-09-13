import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester } from "../rule-tester";
import { withResponseHelperRule } from "./with-response-helper";

const DOC = "See docs/pasika-adoption-guide/rules/with-response-helper-rule.md";
const CONFIG = "export default [];\n";

/** The canonical beats, inside the function the helper returns. */
const CANONICAL_BODY = `    try {
      const { message, data } = await handler(...args);
      return NextResponse.json({ data: responseSchema.parse(data), message });
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ data: null, message: error.message }, { status: error.status });
      }
      throw error;
    }`;

function bodyWith(changes: [string, string][] = []): string {
  let text = CANONICAL_BODY;
  for (const [from, to] of changes) text = text.replace(from, to);
  return text;
}

const declaration = (body: string): string => `import { NextResponse } from "next/server";
import { HttpError } from "./http-error";

export function withResponse(responseSchema, handler) {
  return async (...args) => {
${body}
  };
}
`;

const arrow = (body: string): string => `export const withResponse = (responseSchema, handler) => async (...args) => {
${body}
};
`;

const message = (beat: string): string => `withResponse ${beat}. ${DOC}`;

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
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-with-response-helper-")));
  temps.push(root);
  writeFileSync(path.join(root, "eslint.config.ts"), CONFIG);
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, "src", relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  return { root, config: path.join(root, "eslint.config.ts") };
}

void describe("A repository MUST define a withResponse helper.", () => {
  const withHelper = makeProject({ "utils/with-response.ts": declaration(CANONICAL_BODY) });
  // A tree with source but no helper anywhere: the index has modules and none
  // of them exports `withResponse`.
  const withoutHelper = makeProject({
    "utils/format-date.ts": "export function formatDate(value: Date): string { return value.toISOString(); }\n",
  });

  ruleTester.run("with-response-helper", withResponseHelperRule, {
    valid: [{ filename: withHelper.config, code: CONFIG }],
    invalid: [
      {
        filename: withoutHelper.config,
        code: CONFIG,
        errors: [{ message: `A repository must define a withResponse helper. ${DOC}` }],
      },
    ],
  });
});

void describe("The withResponse helper MUST await the handler, validate its returned data through the response schema, answer a thrown HttpError at error.status with { data: null, message }, and rethrow anything else.", () => {
  const { root } = makeProject({ "utils/with-response.ts": declaration(CANONICAL_BODY) });
  const definition = path.join(root, "src", "utils", "with-response.ts");

  ruleTester.run("with-response-helper", withResponseHelperRule, {
    valid: [
      { filename: definition, code: declaration(CANONICAL_BODY) },
      { filename: definition, code: arrow(CANONICAL_BODY) },
    ],
    invalid: [
      {
        // No await: a rejected handler promise would never be caught.
        filename: definition,
        code: declaration(bodyWith([["await handler(...args)", "handler(...args)"]])),
        errors: [{ message: message("must await the handler") }],
      },
      {
        // The handler's data goes straight out, unvalidated.
        filename: definition,
        code: declaration(bodyWith([["responseSchema.parse(data)", "data"]])),
        errors: [{ message: message("must validate the handler's returned data through the response schema") }],
      },
      {
        // Anything thrown, modeled or not, becomes the response.
        filename: definition,
        code: declaration(bodyWith([["error instanceof HttpError", "error"]])),
        errors: [{ message: message("must check the caught error with instanceof HttpError") }],
      },
      {
        // No data key, so the response is missing the shape the client reads.
        filename: definition,
        code: declaration(bodyWith([["{ data: null, message: error.message }", "{ message: error.message }"]])),
        errors: [{ message: message("must answer a thrown HttpError with { data: null, message }") }],
      },
      {
        // The failure's own status is dropped.
        filename: definition,
        code: declaration(bodyWith([["{ status: error.status }", "{ status: 500 }"]])),
        errors: [{ message: message("must answer at the caught error's status") }],
      },
      {
        // A non-HttpError is swallowed instead of surfacing.
        filename: definition,
        code: declaration(bodyWith([["      throw error;\n", ""]])),
        errors: [{ message: message("must rethrow a caught error that is not an HttpError") }],
      },
    ],
  });
});
