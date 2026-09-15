import { describe, ruleTester } from "../rule-tester";
import { zodFetchHelperRule } from "./zod-fetch-helper";

const DOC = "See docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";
const MODULE = "src/features/publishing/utils/instagram.ts";

const THROUGH_THE_HELPER = `import { zodFetch } from "pasika/zod-fetch";

export async function fetchOrders(apiBase: string) {
  return zodFetch({ url: \`\${apiBase}/orders\`, responseSchema: ordersResponseSchema });
}
`;

void describe("A module MUST NOT call fetch.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: MODULE, code: THROUGH_THE_HELPER },
      {
        // A method named `fetch` on an object of the module's own is not the global one.
        filename: MODULE,
        code: "export function read(query: Query) { return client.fetch(query); }",
      },
      {
        filename: MODULE,
        code: "export function fetchOrder(id: string) { return orderClient.get(id); }",
      },
    ],
    invalid: [
      {
        // The request that skipped the status check, the schema, and the failure.
        filename: MODULE,
        code: "export async function fetchOrders(url: string) {\n  const response = await fetch(url);\n\n  return await response.json();\n}",
        errors: [
          { message: `fetch must not be called; make the request through zodFetch from pasika/zod-fetch. ${DOC}` },
        ],
      },
      {
        filename: MODULE,
        code: "export async function fetchOrders(url: string) {\n  return await globalThis.fetch(url);\n}",
        errors: [
          { message: `fetch must not be called; make the request through zodFetch from pasika/zod-fetch. ${DOC}` },
        ],
      },
    ],
  });
});

void describe("A module MUST import zodFetch from pasika/zod-fetch and MUST NOT declare one of its own.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: MODULE, code: THROUGH_THE_HELPER },
      {
        // A re-export of the package entry hands the same helper on.
        filename: "src/utils/index.ts",
        code: 'export { zodFetch } from "pasika/zod-fetch";',
      },
    ],
    invalid: [
      {
        // The repository's own copy: every call site keeps whatever this one does.
        filename: "src/utils/zod-fetch.ts",
        code: "export async function zodFetch({ url }) {\n  return await orderClient.get(url);\n}",
        errors: [{ message: `A module must not declare its own zodFetch; import it from pasika/zod-fetch. ${DOC}` }],
      },
      {
        filename: MODULE,
        code: 'import { zodFetch } from "@/utils/zod-fetch";',
        errors: [{ message: `zodFetch must be imported from pasika/zod-fetch. ${DOC}` }],
      },
    ],
  });
});
