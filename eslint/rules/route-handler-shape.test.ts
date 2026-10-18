import { describe, ruleTester, srcFile } from "../rule-tester";
import { routeHandlerShapeRule } from "./route-handler-shape";

const DOC = "See docs/next-codebase-guide/rules/route-handler-rule.md";
const ROUTE = srcFile("app/api/orders/route.ts");
const NAMED_HANDLER_ERROR =
  `Handler "POST" must be a named function declared in route.ts and passed by reference to withResponse; ` +
  `inline callbacks and imported handlers are not allowed. ${DOC}`;

const NAMED_HANDLER = `
async function handlePost(request: NextRequest) {
  const userId = await getUserId();
  const orders = await parseRenderPayload(request, orderSchema);
  const result = await dispatchRenderJobs(userId, orders);
  return { data: result };
}
export const POST = withResponse(apiContract, handlePost);
`;

const NAMED_HANDLER_CONST = `
const handlePost = async (request: NextRequest) => {
  const result = await dispatchRenderJobs(request);
  return { data: result };
};
export const POST = withResponse(apiContract, handlePost);
`;

function controlFlowError(phrase: string): string {
  return `Handler "POST" contains ${phrase} of its own; delegate that to a function it calls. ${DOC}`;
}

void describe("An HTTP method handler exported from `route.ts` MUST be wrapped in `withResponse`.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      { filename: ROUTE, code: NAMED_HANDLER },
      {
        filename: srcFile("utils/orders.ts"),
        code: "export async function POST() { return Response.json({}); }",
      },
    ],
    invalid: [
      {
        filename: ROUTE,
        code: "export async function GET() { return Response.json({}); }",
        errors: [{ message: `Handler "GET" must be wrapped in withResponse. ${DOC}` }],
      },
      {
        filename: ROUTE,
        code: "export const GET = withErrors(async () => Response.json({}));",
        errors: [{ message: `Handler "GET" must be wrapped in withResponse. ${DOC}` }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST be declared as a named function in `route.ts` and passed by reference, not written inline or imported from elsewhere.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      { filename: ROUTE, code: NAMED_HANDLER },
      { filename: ROUTE, code: NAMED_HANDLER_CONST },
      {
        filename: ROUTE,
        code: `export const POST = withResponse(apiContract, handlePost);
async function handlePost() { return { data: await submitPost() }; }`,
      },
    ],
    invalid: [
      {
        filename: ROUTE,
        code: "export const POST = withResponse(apiContract, async () => ({ data: await submitPost() }));",
        errors: [{ message: NAMED_HANDLER_ERROR }],
      },
      {
        filename: ROUTE,
        code: 'import { dispatchPost } from "@/features/orders"; export const POST = withResponse(apiContract, dispatchPost);',
        errors: [{ message: NAMED_HANDLER_ERROR }],
      },
      {
        filename: ROUTE,
        code: "export const POST = withResponse(apiContract, missingHandler);",
        errors: [{ message: NAMED_HANDLER_ERROR }],
      },
      {
        filename: ROUTE,
        code: "export const POST = withResponse(async function handlePost() { return { body: stream, status: 200 }; });",
        errors: [{ message: NAMED_HANDLER_ERROR }],
      },
      {
        filename: ROUTE,
        code: "const handlePost = 42; export const POST = withResponse(apiContract, handlePost);",
        errors: [{ message: NAMED_HANDLER_ERROR }],
      },
    ],
  });
});

void describe("A handler `route.ts` only re-exports MAY stay unwrapped.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      {
        filename: ROUTE,
        code: 'import { handler } from "./handler"; export { handler as GET, handler as POST };',
      },
      {
        filename: ROUTE,
        code: "const handler = NextAuth({ providers: [] }); export const GET = handler;",
      },
    ],
    invalid: [],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain a `try` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [{ filename: ROUTE, code: NAMED_HANDLER }],
    invalid: [
      {
        filename: ROUTE,
        code: `async function handlePost() {
          try { return { data: await createPost() }; }
          catch { return { data: null }; }
        }
        export const POST = withResponse(apiContract, handlePost);`,
        errors: [{ message: controlFlowError("a try statement") }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain a loop in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [{ filename: ROUTE, code: NAMED_HANDLER_CONST }],
    invalid: [
      {
        filename: ROUTE,
        code: `async function handlePost(request: NextRequest) {
          const ids = [];
          for (const item of request.items) { ids.push(item.id); }
          return { data: ids };
        }
        export const POST = withResponse(apiContract, handlePost);`,
        errors: [{ message: controlFlowError("a loop") }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain an `if` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      { filename: ROUTE, code: NAMED_HANDLER },
      {
        filename: ROUTE,
        code: `async function handlePost() {
          const ids = await processItems((item) => {
            if (item.valid) return item.id;
            return null;
          });
          return { data: ids };
        }
        export const POST = withResponse(apiContract, handlePost);`,
      },
    ],
    invalid: [
      {
        filename: ROUTE,
        code: `const handlePost = async (request: NextRequest) => {
          if (!request) throw new HttpError("Bad request", 400);
          return { data: await createPost(request) };
        };
        export const POST = withResponse(apiContract, handlePost);`,
        errors: [{ message: controlFlowError("an if statement") }],
      },
    ],
  });
});

void describe("A function that a handler wrapped in `withResponse` calls MUST be imported, not declared in `route.ts`.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      {
        filename: ROUTE,
        code: `import { createPost } from "@/features/orders";
        async function handlePost() { return { data: await createPost() }; }
        export const POST = withResponse(apiContract, handlePost);`,
      },
    ],
    invalid: [
      {
        filename: ROUTE,
        code: `async function createPost() { return null; }
        async function handlePost() { return { data: await createPost() }; }
        export const POST = withResponse(apiContract, handlePost);`,
        errors: [
          { message: `Handler "POST" calls "createPost", which is declared in route.ts instead of imported. ${DOC}` },
        ],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain a `map` operation in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [{ filename: ROUTE, code: NAMED_HANDLER }],
    invalid: [
      {
        filename: ROUTE,
        code: `async function handlePost(request: NextRequest) {
          return { data: request.items.map((item) => item.id) };
        }
        export const POST = withResponse(apiContract, handlePost);`,
        errors: [{ message: controlFlowError("a map operation") }],
      },
    ],
  });
});
