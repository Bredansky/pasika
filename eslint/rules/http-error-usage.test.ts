import { describe, ruleTester, srcFile } from "../rule-tester";
import { httpErrorUsageRule } from "./http-error-usage";

const MUST_THROW =
  "A constructed HttpError must be thrown, not returned. See docs/next-codebase-guide/rules/route-handler-rule.md";

void describe("A constructed `HttpError` MUST be thrown, not returned.", () => {
  ruleTester.run("http-error-usage", httpErrorUsageRule, {
    valid: [
      {
        code: `function readGithubDispatchConfig() {
          if (!pat) {
            throw new HttpError("Server not configured.", 500);
          }
          return pat;
        }`,
        filename: srcFile("utils/dispatch-github-workflow.ts"),
      },
      // Returning an unrelated value is not this rule's concern.
      {
        code: `function readGithubDispatchConfig() {
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
        code: `function readGithubDispatchConfig() {
          if (!pat) {
            return new HttpError("Server not configured.", 500);
          }
          return pat;
        }`,
        filename: srcFile("utils/dispatch-github-workflow.ts"),
        errors: [{ message: MUST_THROW }],
      },
    ],
  });
});
