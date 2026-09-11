import { describe, ruleTester, srcFile } from "../rule-tester";
import { resultPipelineTypesRule } from "./result-pipeline-types";

const ANDTHEN_MUST_TYPE_RESULT =
  "andThen must type its result parameter and its next parameter's return as Result. " +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";
const RESPOND_MUST_TYPE_RESULT =
  "respond must type its result parameter as Result. See docs/next-codebase-guide/rules/route-handler-rule.md";

void describe("The project's `andThen` and `respond` helpers MUST type their `Result` parameters as `Result`, so every delegated call in a route handler's pipeline is guaranteed to return one.", () => {
  ruleTester.run("result-pipeline-types", resultPipelineTypesRule, {
    valid: [
      {
        code: `export async function andThen(result: Result<T, E>, next: (value: T) => Promise<Result<U, E>>) {
            return result.ok ? next(result.value) : result;
          }`,
        filename: srcFile("utils/result.ts"),
      },
      {
        code: `export const andThen = (result: Result<T, E>, next: (value: T) => Promise<Result<U, E>>) => {
            return result.ok ? next(result.value) : result;
          };`,
        filename: srcFile("utils/result.ts"),
      },
      {
        code: `export function respond(result: Result<T, HttpError>, onSuccess: (value: T) => Body) {
            return result.ok ? onSuccess(result.value) : null;
          }`,
        filename: srcFile("utils/respond.ts"),
      },
      // A function named andThen/respond elsewhere with an unrelated
      // purpose is not this rule's concern beyond its own signature check;
      // an unrelated function name is skipped entirely.
      {
        code: `export function processNext(result, next) {
            return next(result);
          }`,
        filename: srcFile("utils/result.ts"),
      },
    ],
    invalid: [
      {
        code: `export async function andThen(result, next: (value) => Promise<U>) {
            return result.ok ? next(result.value) : result;
          }`,
        filename: srcFile("utils/result.ts"),
        errors: [{ message: ANDTHEN_MUST_TYPE_RESULT }],
      },
      {
        code: `export async function andThen(result: Result<T, E>, next: (value: T) => Promise<U>) {
            return result.ok ? next(result.value) : result;
          }`,
        filename: srcFile("utils/result.ts"),
        errors: [{ message: ANDTHEN_MUST_TYPE_RESULT }],
      },
      {
        code: `export function respond(result, onSuccess) {
            return result.ok ? onSuccess(result.value) : null;
          }`,
        filename: srcFile("utils/respond.ts"),
        errors: [{ message: RESPOND_MUST_TYPE_RESULT }],
      },
    ],
  });
});
