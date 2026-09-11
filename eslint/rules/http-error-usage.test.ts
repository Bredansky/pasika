import { describe, ruleTester, srcFile } from "../rule-tester";
import { httpErrorUsageRule } from "./http-error-usage";

const MUST_USE_ERR =
  "A constructed HttpError must be reported through err, not thrown. " +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";

void describe("A function that constructs an `HttpError` MUST report it through `err`, not `throw` it.", () => {
  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      {
        code: `function checkConfigured(pat) {
          if (!pat) {
            return err(new HttpError("Server not configured.", 500));
          }
          return ok(pat);
        }`,
        filename: srcFile("utils/dispatch-github-workflow.ts"),
      },
      // Throwing an unrelated error is not this rule's concern.
      {
        code: `function checkConfigured(pat) {
          if (!pat) {
            throw new Error("Server not configured.");
          }
          return pat;
        }`,
        filename: srcFile("utils/dispatch-github-workflow.ts"),
      },
    ],
    invalid: [
      {
        code: `function checkConfigured(pat) {
          if (!pat) {
            throw new HttpError("Server not configured.", 500);
          }
          return pat;
        }`,
        filename: srcFile("utils/dispatch-github-workflow.ts"),
        errors: [{ message: MUST_USE_ERR }],
      },
    ],
  });
});
