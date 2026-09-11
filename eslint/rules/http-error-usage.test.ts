import { describe, ruleTester, srcFile } from "../rule-tester";
import { httpErrorUsageRule } from "./http-error-usage";

const MUST_THROW =
  "An HttpError constructed inside a withResponse pipeline must be thrown, not returned. " +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";

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
    ],
  });
});
