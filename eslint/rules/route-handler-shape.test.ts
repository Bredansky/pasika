import { describe, ruleTester, srcFile } from "../rule-tester";
import { routeHandlerShapeRule } from "./route-handler-shape";

const NO_TRY_CATCH =
  'Handler "POST" contains a try statement of its own; delegate to a module that reports its outcome as a value ' +
  "instead. See docs/next-codebase-guide/rules/route-handler-rule.md";
const NO_LOOP =
  'Handler "POST" contains a loop of its own; delegate to a module that reports its outcome as a value instead. ' +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";
const NO_IF =
  'Handler "GET" contains an if statement of its own; delegate to a module that reports its outcome as a value ' +
  "instead. See docs/next-codebase-guide/rules/route-handler-rule.md";
const TYPED_RETURN = (name: string): string =>
  `Handler "${name}" must declare its return type as Promise<NextResponse<X>> with a concrete X. ` +
  "See docs/next-codebase-guide/rules/route-handler-rule.md";

void describe("An HTTP method handler exported from `route.ts` MUST NOT contain a `try` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // A pure pipeline: no try of its own, and a typed response return.
      {
        code: `export const POST = withUserId(async (userId, request: NextRequest): Promise<NextResponse<RenderApiResponse>> => {
          const parsed = await parseRenderPayload(request, orderSchema);
          const result = await andThen(parsed, (orders) => dispatchRenderJobs(userId, orders));
          return resultToResponse(result, ({ jobIds }) => ({ status: 200, body: { jobIds } }));
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // A try/catch in a callback passed to another call is that
      // callback's own try, not the handler's.
      {
        code: `export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
          const body = await request.json();
          const jobIds = body.orders.map((order) => {
            try {
              return order.id;
            } catch {
              return "";
            }
          });
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
      // A try/catch outside route.ts is not this rule's concern.
      {
        code: `export function absolutizeMediaUrls(order) {
          try {
            return order.layers.map((layer) => layer.url);
          } catch {
            return [];
          }
        }`,
        filename: srcFile("utils/instagram.ts"),
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
          try {
            return order.layers.map((layer) => layer.url);
          } catch {
            return [];
          }
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      // A try/catch of the handler's own.
      {
        code: `export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
          try {
            const { jobIds } = await dispatchRenderJobs(request);
            return NextResponse.json({ jobIds });
          } catch (error) {
            return NextResponse.json({ error: String(error) }, { status: 500 });
          }
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NO_TRY_CATCH }],
      },
    ],
  });
});

void describe("An HTTP method handler exported from `route.ts` MUST NOT contain a loop in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // Unwrapped function declaration, typed return, no loop.
      {
        code: `export async function GET(request: NextRequest): Promise<NextResponse<{ status: string }>> {
          const result = await getPublicationStatus(request.nextUrl.searchParams.get("id"));
          return resultToResponse(result, (publication) => ({ status: 200, body: { status: publication.status } }));
        }`,
        filename: srcFile("app/api/post-status/route.ts"),
      },
      // A loop in a callback passed to another call is that callback's
      // own loop, not the handler's.
      {
        code: `export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
          const body = await request.json();
          const jobIds = body.orders.map((order) => {
            for (const layer of order.layers) {
              layer.url = layer.url;
            }
            return order.id;
          });
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      // A loop of the handler's own.
      {
        code: `export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
          const body = await request.json();
          const jobIds: string[] = [];
          for (const order of body.orders) {
            jobIds.push(await createLegacyPublication(order));
          }
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NO_LOOP }],
      },
      // Same violation, plus a missing typed return: both are reported.
      {
        code: `export async function POST(request: NextRequest) {
          const body = await request.json();
          const jobIds: string[] = [];
          for (const order of body.orders) {
            jobIds.push(await createLegacyPublication(order));
          }
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [{ message: NO_LOOP }, { message: TYPED_RETURN("POST") }],
      },
    ],
  });
});

void describe("An HTTP method handler exported from `route.ts` MUST NOT contain an `if` statement in its body.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // A concise arrow body has no block to scan for control flow.
      {
        code: `export const GET = async (): Promise<NextResponse<{ ok: true }>> => NextResponse.json({ ok: true });`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // An if in a callback passed to another call is that callback's
      // own branch, not the handler's.
      {
        code: `export async function POST(request: NextRequest): Promise<NextResponse<{ jobIds: string[] }>> {
          const body = await request.json();
          const jobIds = body.orders.map((order) => {
            if (!order.id) return "";
            return order.id;
          });
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      // An if statement of the handler's own, wrapped by a HOC.
      {
        code: `export const GET = withUserId(async (userId, request: NextRequest): Promise<NextResponse<{ status: string }>> => {
          const id = request.nextUrl.searchParams.get("id");
          if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
          }
          const publication = await getPublicationById(id);
          return NextResponse.json({ status: publication.status });
        });`,
        filename: srcFile("app/api/post-status/route.ts"),
        errors: [{ message: NO_IF }],
      },
    ],
  });
});

void describe("An HTTP method handler exported from `route.ts` MUST declare its return type as `Promise<NextResponse<X>>` with a concrete `X`.", () => {
  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      // A typed return with a concrete response shape.
      {
        code: `export async function GET(request: NextRequest): Promise<NextResponse<{ status: string }>> {
            return NextResponse.json({ status: "ok" });
          }`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // Untyped code outside route.ts is not this rule's concern.
      {
        code: `export function absolutizeMediaUrls(order) {
            return order;
          }`,
        filename: srcFile("utils/instagram.ts"),
      },
    ],
    invalid: [
      // No return type annotation at all.
      {
        code: `export async function GET(request: NextRequest) {
            return NextResponse.json({ status: "ok" });
          }`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: TYPED_RETURN("GET") }],
      },
      // A bare `NextResponse` with no generic argument.
      {
        code: `export async function GET(request: NextRequest): Promise<NextResponse> {
            return NextResponse.json({ status: "ok" });
          }`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: TYPED_RETURN("GET") }],
      },
    ],
  });
});
