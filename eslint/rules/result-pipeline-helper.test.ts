import { describe, ruleTester, srcFile } from "../rule-tester";
import { resultPipelineHelperRule } from "./result-pipeline-helper";

const DOC_LINK = "See docs/next-codebase-guide/rules/result-pipeline-rule.md";

void describe("The project's `ok` helper MUST return `{ ok: true, value }`.", () => {
  ruleTester.run("result-pipeline-helper", resultPipelineHelperRule, {
    valid: [
      {
        code: `export function ok(value) {
          return { ok: true, value };
        }`,
        filename: srcFile("utils/result.ts"),
      },
      {
        code: `export const ok = (value) => ({ ok: true, value });`,
        filename: srcFile("utils/result.ts"),
      },
    ],
    invalid: [
      {
        code: `export function ok(value) {
          return { success: true, value };
        }`,
        filename: srcFile("utils/result.ts"),
        errors: [{ message: `ok must return { ok: true, value }. ${DOC_LINK}` }],
      },
    ],
  });
});

void describe("The project's `err` helper MUST return `{ ok: false, error }`.", () => {
  ruleTester.run("result-pipeline-helper", resultPipelineHelperRule, {
    valid: [
      {
        code: `export function err(error) {
          return { ok: false, error };
        }`,
        filename: srcFile("utils/result.ts"),
      },
    ],
    invalid: [
      {
        code: `export function err(error) {
          return { success: false, error };
        }`,
        filename: srcFile("utils/result.ts"),
        errors: [{ message: `err must return { ok: false, error }. ${DOC_LINK}` }],
      },
    ],
  });
});

void describe("The project's `andThen` helper MUST run its next step only once the previous outcome's `ok` is true.", () => {
  ruleTester.run("result-pipeline-helper", resultPipelineHelperRule, {
    valid: [
      {
        code: `export async function andThen(result, next) {
          return result.ok ? next(result.value) : result;
        }`,
        filename: srcFile("utils/result.ts"),
      },
    ],
    invalid: [
      {
        code: `export async function andThen(result, next) {
          return next(result.value);
        }`,
        filename: srcFile("utils/result.ts"),
        errors: [
          { message: `andThen must branch on the previous step's .ok before running its next step. ${DOC_LINK}` },
        ],
      },
    ],
  });
});

void describe("The project's `HttpError` class MUST extend `Error` and carry a `status`.", () => {
  ruleTester.run("result-pipeline-helper", resultPipelineHelperRule, {
    valid: [
      {
        code: `export class HttpError extends Error {
          constructor(message, status) {
            super(message);
            this.status = status;
          }
        }`,
        filename: srcFile("utils/http-error.ts"),
      },
      // A class named HttpError outside this project's convention still
      // must satisfy the shape; a differently named error class is not
      // this rule's concern.
      {
        code: `export class ValidationError extends Error {}`,
        filename: srcFile("utils/http-error.ts"),
      },
    ],
    invalid: [
      {
        code: `export class HttpError extends Error {}`,
        filename: srcFile("utils/http-error.ts"),
        errors: [{ message: `HttpError must extend Error and carry a status. ${DOC_LINK}` }],
      },
      {
        code: `export class HttpError {
          constructor(message, status) {
            this.message = message;
            this.status = status;
          }
        }`,
        filename: srcFile("utils/http-error.ts"),
        errors: [{ message: `HttpError must extend Error and carry a status. ${DOC_LINK}` }],
      },
    ],
  });
});

void describe("The project's `respond` helper MUST branch on `ok` and resolve through `NextResponse.json`.", () => {
  ruleTester.run("result-pipeline-helper", resultPipelineHelperRule, {
    valid: [
      {
        code: `export function respond(result, onSuccess) {
          if (!result.ok) {
            return NextResponse.json({ error: result.error.message }, { status: result.error.status });
          }
          const { body, status } = onSuccess(result.value);
          return NextResponse.json(body, { status });
        }`,
        filename: srcFile("utils/respond.ts"),
      },
    ],
    invalid: [
      {
        code: `export function respond(result, onSuccess) {
          const { body, status } = onSuccess(result.value);
          return NextResponse.json(body, { status });
        }`,
        filename: srcFile("utils/respond.ts"),
        errors: [{ message: `respond must branch on .ok and resolve through NextResponse.json. ${DOC_LINK}` }],
      },
    ],
  });
});
