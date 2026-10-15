import { describe, ruleTester, srcFile } from "../rule-tester";
import { apiContractRule } from "./api-contract";

const DOC = "See docs/pasika-adoption-guide/rules/api-contract-rule.md";

void describe("A schema-validated JSON API contract MUST be created with `defineApiContract` imported from `pasika/api-contract`.", () => {
  void describe("A call to `defineApiContract` MUST initialize an exported named value.", () => {
    ruleTester.run("api-contract", apiContractRule, {
      valid: [
        {
          filename: srcFile("schemas/orders.ts"),
          code: `import { defineApiContract } from "pasika/api-contract";
import { HttpMethod } from "pasika/http-method";
export const ordersApiContract = defineApiContract({
  method: HttpMethod.Get,
  path: "/api/orders",
  responseSchema: ordersSchema,
});`,
        },
      ],
      invalid: [
        {
          filename: srcFile("schemas/orders.ts"),
          code: `import { defineApiContract } from "@/utils/api-contract";
export const ordersApiContract = defineApiContract({ method, path, responseSchema });`,
          errors: [
            {
              message: `defineApiContract must be imported from pasika/api-contract. ${DOC}`,
            },
          ],
        },
        {
          filename: srcFile("schemas/orders.ts"),
          code: `import { defineApiContract } from "pasika/api-contract";
const ordersApiContract = defineApiContract({ method, path, responseSchema });`,
          errors: [
            {
              message: `A call to defineApiContract must initialize an exported named contract. ${DOC}`,
            },
          ],
        },
        {
          filename: srcFile("schemas/orders.ts"),
          code: `export const ordersApiContract = { method, path, responseSchema };`,
          errors: [
            {
              message: `An exported *ApiContract value must be created with defineApiContract. ${DOC}`,
            },
          ],
        },
      ],
    });
  });
});

void describe("A JSON route wrapped in `withResponse` MUST receive an imported API contract rather than a bare response schema or an inline contract.", () => {
  ruleTester.run("api-contract", apiContractRule, {
    valid: [
      {
        filename: srcFile("app/api/orders/route.ts"),
        code: `import { ordersApiContract } from "@/schemas";
export const GET = withResponse(ordersApiContract, async () => ({ data: await listOrders() }));`,
      },
      {
        filename: srcFile("app/api/file/route.ts"),
        code: `export const GET = withResponse(async () => ({ body: stream, status: 200 }));`,
      },
    ],
    invalid: [
      {
        filename: srcFile("app/api/orders/route.ts"),
        code: `export const GET = withResponse(ordersSchema, async () => ({ data: await listOrders() }));`,
        errors: [{ message: `withResponse must receive an imported API contract for a JSON route. ${DOC}` }],
      },
      {
        filename: srcFile("app/api/orders/route.ts"),
        code: `import { defineApiContract } from "pasika/api-contract";
export const GET = withResponse(
  defineApiContract({ method, path: "/api/orders", responseSchema: ordersSchema }),
  async () => ({ data: await listOrders() }),
);`,
        errors: [
          { message: `withResponse must receive an imported API contract for a JSON route. ${DOC}` },
          { message: `A call to defineApiContract must initialize an exported named contract. ${DOC}` },
        ],
      },
    ],
  });
});

void describe("A mock that exports `apiRoutePath` MUST derive it from an imported API contract through `contract.path`.", () => {
  void describe("That mock MUST validate successful JSON with the same contract's `responseSchema`.", () => {
    ruleTester.run("api-contract", apiContractRule, {
      valid: [
        {
          filename: srcFile("features/mocks/orders-mock.ts"),
          code: `import { ordersApiContract } from "@/schemas";
export const apiRoutePath = ordersApiContract.path;
export function handleGet() {
  return Response.json(ordersApiContract.responseSchema.parse([{ id: "1" }]));
}`,
        },
      ],
      invalid: [
        {
          filename: srcFile("features/mocks/orders-mock.ts"),
          code: `import { ordersApiContract } from "@/schemas";
export const apiRoutePath = "/api/orders";
export function handleGet() {
  return Response.json(ordersApiContract.responseSchema.parse([{ id: "1" }]));
}`,
          errors: [
            {
              message: `A mock apiRoutePath must come from an imported API contract through contract.path. ${DOC}`,
            },
          ],
        },
        {
          filename: srcFile("features/mocks/orders-mock.ts"),
          code: `import { ordersApiContract } from "@/schemas";
export const apiRoutePath = ordersApiContract.path;
export function handleGet() {
  return Response.json([{ id: "1" }]);
}`,
          errors: [
            {
              message: `A mock must validate successful JSON with the same API contract responseSchema. ${DOC}`,
            },
          ],
        },
        {
          filename: srcFile("features/mocks/orders-mock.ts"),
          code: `import { ordersApiContract, usersApiContract } from "@/schemas";
export const apiRoutePath = ordersApiContract.path;
export function handleGet() {
  return Response.json(usersApiContract.responseSchema.parse([{ id: "1" }]));
}`,
          errors: [
            {
              message: `A mock must validate successful JSON with the same API contract responseSchema. ${DOC}`,
            },
          ],
        },
      ],
    });
  });
});

void describe("A `zodFetch` call that names a request or response schema MUST use an imported API contract through its `contract` option. When the contract property name differs from the exported contract name, the value MUST stay qualified through an imported namespace or contract collection.", () => {
  ruleTester.run("api-contract", apiContractRule, {
    valid: [
      {
        filename: srcFile("features/orders/load-orders.ts"),
        code: `import * as apiContracts from "@/schemas";
return zodFetch({ contract: apiContracts.ordersApiContract });`,
      },
      {
        filename: srcFile("features/files/relay-file.ts"),
        code: `return zodFetch({ url: "https://api.example.com/file" });`,
      },
    ],
    invalid: [
      {
        filename: srcFile("features/orders/load-orders.ts"),
        code: `return zodFetch({ url: "/api/orders", responseSchema: ordersSchema });`,
        errors: [
          {
            message: `A schema-validated request must use an imported API contract through zodFetch({ contract }). ${DOC}`,
          },
        ],
      },
      {
        filename: srcFile("features/orders/load-orders.ts"),
        code: `const ordersApiContract = getContract();
return zodFetch({ contract: ordersApiContract });`,
        errors: [
          {
            message: `A schema-validated request must use an imported API contract through zodFetch({ contract }). ${DOC}`,
          },
        ],
      },
      {
        filename: srcFile("features/orders/load-orders.ts"),
        code: `const apiContracts = { ordersApiContract };
return zodFetch({ contract: apiContracts.ordersApiContract });`,
        errors: [
          {
            message: `A schema-validated request must use an imported API contract through zodFetch({ contract }). ${DOC}`,
          },
        ],
      },
    ],
  });
});
