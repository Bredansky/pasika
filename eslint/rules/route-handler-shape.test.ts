import { describe, ruleTester, srcFile } from "../rule-tester";
import { routeHandlerShapeRule } from "./route-handler-shape";

const MUST_BE_WRAPPED = (name: string): string =>
  `Handler "${name}" must be wrapped in withResponse. See docs/next-codebase-guide/rules/route-handler-rule.md`;
const NO_TRY = (name: string): string =>
  `Handler "${name}" contains a try statement of its own; delegate that to a function it calls. ` +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";
const NO_LOOP = (name: string): string =>
  `Handler "${name}" contains a loop of its own; delegate that to a function it calls. ` +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";
const NO_IF = (name: string): string =>
  `Handler "${name}" contains an if statement of its own; delegate that to a function it calls. ` +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";
const NOT_IMPORTED = (name: string, calledName: string): string =>
  `Handler "${name}" calls "${calledName}", which is declared in route.ts instead of imported. ` +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";

void describe("An HTTP method handler exported from `route.ts` MUST be wrapped in `withResponse`.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // The canonical pipeline: withResponse wrapping withUserId wrapping the handler.
      {
        code: `export const POST = withResponse(
          renderApiResponseDataSchema,
          withUserId(async (userId, request: NextRequest) => {
            const orders = await parseRenderPayload(request, orderSchema);
            const { jobIds } = await dispatchRenderJobs(userId, orders);
            return { message: "Dispatched.", data: jobIds };
          }),
        );`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // A re-exported handler reference isn't a recognizable function, so
      // there is nothing to check.
      {
        code: `export const POST = someImportedHandler;`,
        filename: srcFile("app/api/webhook/route.ts"),
      },
      // A route.ts export that is not an HTTP method is not this rule's concern.
      {
        code: `export function absolutizeMediaUrls(order) {
          return order;
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // Code outside route.ts is not this rule's concern.
      {
        code: `export async function GET(request: NextRequest) {
          return NextResponse.json({ status: "ok" });
        }`,
        filename: srcFile("utils/instagram.ts"),
      },
    ],
    invalid: [
      // A bare function declaration, never wrapped by any call.
      {
        code: `export async function GET(request: NextRequest) {
          const result = await getStatus();
          return NextResponse.json({ status: result });
        }`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: MUST_BE_WRAPPED("GET") }],
      },
      // A bare arrow function, never wrapped by any call.
      {
        code: `export const GET = async (request: NextRequest) => {
          return NextResponse.json({ status: "ok" });
        };`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: MUST_BE_WRAPPED("GET") }],
      },
      // Wrapped by a call, but not withResponse.
      {
        code: `export const GET = withUserId(async (userId, request: NextRequest) => {
          return NextResponse.json({ status: "ok" });
        });`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: MUST_BE_WRAPPED("GET") }],
      },
      // withErrors alone no longer satisfies the boundary requirement.
      {
        code: `export const GET = withErrors(withUserAccount(async (account): Promise<NextResponse> => {
          const storedCredentials = await listCredentials(account.id);
          return NextResponse.json(storedCredentials);
        }));`,
        filename: srcFile("app/api/credentials/route.ts"),
        errors: [{ message: MUST_BE_WRAPPED("GET") }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain a `try` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      {
        code: `export const POST = withResponse(schema, withUserId(async (userId, request: NextRequest) => {
          const orders = await parseRenderPayload(request, orderSchema);
          const { jobIds } = await dispatchRenderJobs(userId, orders);
          return { message: "Dispatched.", data: jobIds };
        }));`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // A try/catch in a callback passed to another call is that
      // callback's own try, not the handler's.
      {
        code: `export const POST = withResponse(schema, async (request: NextRequest) => {
          const body = await request.json();
          const ids = body.orders.map((order) => {
            try {
              return order.id;
            } catch {
              return "";
            }
          });
          return { message: "OK.", data: ids };
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      {
        code: `export const POST = withResponse(schema, withUserId(async (userId, request: NextRequest) => {
          try {
            const { jobIds } = await dispatchRenderJobs(userId, request);
            return { message: "Dispatched.", data: jobIds };
          } catch (error) {
            throw new HttpError(String(error), 500);
          }
        }));`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NO_TRY("POST") }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain a loop in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      {
        code: `export const GET = withResponse(schema, async (request: NextRequest) => {
          const status = await getStatus();
          return { message: "OK.", data: status };
        });`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // A loop in a callback passed to another call is that callback's
      // own loop, not the handler's.
      {
        code: `export const POST = withResponse(schema, async (request: NextRequest) => {
          const body = await request.json();
          const ids = body.orders.map((order) => {
            for (const layer of order.layers) {
              layer.url = layer.url;
            }
            return order.id;
          });
          return { message: "OK.", data: ids };
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      {
        code: `export const POST = withResponse(schema, withUserId(async (userId, request: NextRequest) => {
          const body = await request.json();
          const jobIds: string[] = [];
          for (const order of body.orders) {
            jobIds.push(await createLegacyPublication(order));
          }
          return { message: "OK.", data: jobIds };
        }));`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NO_LOOP("POST") }],
      },
    ],
  });
});

void describe("A handler wrapped in `withResponse` MUST NOT contain an `if` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // A concise arrow body has no block to scan for control flow.
      {
        code: `export const GET = withResponse(schema, async () => ({ message: "OK.", data: true }));`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // An if in a callback passed to another call is that callback's
      // own branch, not the handler's.
      {
        code: `export const POST = withResponse(schema, async (request: NextRequest) => {
          const body = await request.json();
          const ids = body.orders.map((order) => {
            if (!order.id) return "";
            return order.id;
          });
          return { message: "OK.", data: ids };
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      {
        code: `export const GET = withResponse(schema, withUserAccount(async (account, request: NextRequest) => {
          const id = request.nextUrl.searchParams.get("id");
          if (!id) {
            throw new HttpError("Missing id", 400);
          }
          const publication = await getPublicationById(id);
          return { message: "Found.", data: publication.status };
        }));`,
        filename: srcFile("app/api/post-status/route.ts"),
        errors: [{ message: NO_IF("GET") }],
      },
    ],
  });
});

void describe("A function that a handler wrapped in `withResponse` calls MUST be imported, not declared in `route.ts`.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // dispatchRenderJobs is imported, not declared in this file.
      {
        code: `import { dispatchRenderJobs } from "@/utils/instagram";
        export const POST = withResponse(schema, withUserId(async (userId, request: NextRequest) => {
          const { jobIds } = await dispatchRenderJobs(userId, request);
          return { message: "Dispatched.", data: jobIds };
        }));`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // A locally declared function that the handler never calls is not this rule's concern.
      {
        code: `function unusedHelper() {
          return null;
        }
        export const GET = withResponse(schema, async () => {
          const status = await getStatus();
          return { message: "OK.", data: status };
        });`,
        filename: srcFile("app/api/health/route.ts"),
      },
    ],
    invalid: [
      // A function declared in route.ts itself, called from the handler.
      {
        code: `async function dispatchWithRetry(orders) {
          try {
            return await dispatchGithubWorkflowRequest(orders);
          } catch (error) {
            throw new HttpError("Failed to dispatch.", 500);
          }
        }
        export const POST = withResponse(schema, withUserId(async (userId, request: NextRequest) => {
          const orders = await parseRenderPayload(request, orderSchema);
          const result = await dispatchWithRetry(orders);
          return { message: "Dispatched.", data: result };
        }));`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NOT_IMPORTED("POST", "dispatchWithRetry") }],
      },
      // A const arrow function declared in route.ts itself, called from the handler.
      {
        code: `const dispatchWithRetry = async (orders) => {
          return await dispatchGithubWorkflowRequest(orders);
        };
        export const POST = withResponse(schema, async (request: NextRequest) => {
          const orders = await parseRenderPayload(request, orderSchema);
          const result = await dispatchWithRetry(orders);
          return { message: "Dispatched.", data: result };
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NOT_IMPORTED("POST", "dispatchWithRetry") }],
      },
    ],
  });
});
