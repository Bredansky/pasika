import { describe, ruleTester } from "../rule-tester";
import { zodFetchHelperRule } from "./zod-fetch-helper";

const DOC = "See docs/pasika-adoption-guide/rules/zod-fetch-helper-rule.md";
const FILE = "src/features/publishing/utils/instagram.ts";

const THROUGH_THE_HELPER = `import { zodFetch } from "pasika/zod-fetch";

export async function fetchOrders(apiBase: string) {
  return zodFetch({ url: \`\${apiBase}/orders\`, responseSchema: ordersResponseSchema });
}
`;

void describe("A file MUST NOT call fetch.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: FILE, code: THROUGH_THE_HELPER },
      {
        // A method named `fetch` on an object of the module's own is not the global one.
        filename: FILE,
        code: "export function read(query: Query) { return client.fetch(query); }",
      },
      {
        filename: FILE,
        code: "export function fetchOrder(id: string) { return orderClient.get(id); }",
      },
    ],
    invalid: [
      {
        // The request that skipped the status check, the schema, and the failure.
        filename: FILE,
        code: "export async function fetchOrders(url: string) {\n  const response = await fetch(url);\n\n  return await response.json();\n}",
        errors: [
          { message: `fetch must not be called; make the request through zodFetch from pasika/zod-fetch. ${DOC}` },
        ],
      },
      {
        filename: FILE,
        code: "export async function fetchOrders(url: string) {\n  return await globalThis.fetch(url);\n}",
        errors: [
          { message: `fetch must not be called; make the request through zodFetch from pasika/zod-fetch. ${DOC}` },
        ],
      },
    ],
  });
});

void describe("A file that is a test — one named `*.test.*` or `*.spec.*`, or inside a `tests` folder — MAY call `fetch`.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      {
        // The global is stubbed here on purpose: a mocked CDN file is what the test asserts about.
        filename: "src/features/auth/utils/fetch-interceptor.test.ts",
        code: "export async function serve(url: string) {\n  return await fetch(url);\n}",
      },
      {
        // A spec's own setup reads the auth response's headers before the browser gets them.
        filename: "src/tests/e2e/setup.ts",
        code: 'export async function readSession(baseUrl: string) {\n  return await fetch(baseUrl + "/api/auth/session");\n}',
      },
    ],
    invalid: [],
  });
});

void describe("A file MUST import zodFetch from pasika/zod-fetch and MUST NOT declare one of its own.", () => {
  ruleTester.run("zod-fetch-helper", zodFetchHelperRule, {
    valid: [
      { filename: FILE, code: THROUGH_THE_HELPER },
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
        errors: [{ message: `A file must not declare its own zodFetch; import it from pasika/zod-fetch. ${DOC}` }],
      },
      {
        filename: FILE,
        code: 'import { zodFetch } from "@/utils/zod-fetch";',
        errors: [{ message: `zodFetch must be imported from pasika/zod-fetch. ${DOC}` }],
      },
    ],
  });
});
