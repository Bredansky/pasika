import { describe, ruleTester } from "../rule-tester";
import { withResponseHelperRule } from "./with-response-helper";

const DOC = "See docs/pasika-adoption-guide/rules/with-response-helper-rule.md";
const ROUTE = "src/app/api/orders/route.ts";

const WRAPPED_HANDLER = `import { withResponse } from "pasika/with-response";

export const POST = withResponse(createOrderResponseSchema, async (request: NextRequest) => {
  const order = await createOrder(request);

  return { message: "Order created.", data: order, status: 201 };
});
`;

void describe("The withResponse a route handler is wrapped in MUST be imported from pasika/with-response.", () => {
  ruleTester.run("with-response-helper", withResponseHelperRule, {
    valid: [
      { filename: ROUTE, code: WRAPPED_HANDLER },
      {
        // A re-export of the package entry hands the same wrapper on.
        filename: "src/utils/index.ts",
        code: 'export { withResponse } from "pasika/with-response";',
      },
    ],
    invalid: [
      {
        // The repository's own wrapper: a route whose failures answer as it decides.
        filename: ROUTE,
        code: 'import { withResponse } from "@/utils/with-response";',
        errors: [{ message: `withResponse must be imported from pasika/with-response. ${DOC}` }],
      },
      {
        filename: ROUTE,
        code: 'import { wrapRoute as withResponse } from "@/utils/with-response";',
        errors: [{ message: `withResponse must be imported from pasika/with-response. ${DOC}` }],
      },
      {
        filename: "src/utils/index.ts",
        code: 'export { withResponse } from "./with-response";',
        errors: [{ message: `withResponse must be imported from pasika/with-response. ${DOC}` }],
      },
    ],
  });
});

void describe("A repository MUST NOT declare a withResponse of its own.", () => {
  ruleTester.run("with-response-helper", withResponseHelperRule, {
    valid: [{ filename: ROUTE, code: WRAPPED_HANDLER }],
    invalid: [
      {
        filename: "src/utils/with-response.ts",
        code: 'import { HttpError } from "pasika/http-error";\n\nexport function withResponse(responseSchema, handler) {\n  return async (...args) => handler(...args);\n}',
        errors: [
          {
            message: `A repository must not declare its own withResponse; import it from pasika/with-response. ${DOC}`,
          },
        ],
      },
      {
        filename: "src/utils/with-response.ts",
        code: "export const withResponse = (responseSchema, handler) => async (...args) => handler(...args);",
        errors: [
          {
            message: `A repository must not declare its own withResponse; import it from pasika/with-response. ${DOC}`,
          },
        ],
      },
    ],
  });
});
