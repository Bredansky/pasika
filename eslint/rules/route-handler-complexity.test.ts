import { describe, ruleTester, srcFile } from "../rule-tester";
import { routeHandlerComplexityRule } from "./route-handler-complexity";

void describe("An HTTP method handler exported from `route.ts` MUST be extracted to a named function outside `src/app/` once its imperative weight reaches two, where each awaited call other than one reading the incoming request adds one, and a loop that contains such a call adds one more.", () => {
  ruleTester.run("route-handler-complexity", routeHandlerComplexityRule, {
    valid: [
      // One external call, no loop: weight of one may stay inline.
      {
        code: `export async function GET(request) {
          const id = request.nextUrl.searchParams.get("id") ?? "";
          const publication = await getPublicationById(id);
          return NextResponse.json({ status: publication.status });
        }`,
        filename: srcFile("app/api/post-status/route.ts"),
      },
      // Reading the request body is route glue, not imperative weight.
      {
        code: `export async function POST(request) {
          const body = await request.json();
          return NextResponse.json({ ok: true, body });
        }`,
        filename: srcFile("app/api/echo/route.ts"),
      },
      // A try/catch around one delegated call does not add weight on its
      // own — this is already the thin shape the rule wants.
      {
        code: `export async function GET(request) {
          const id = request.nextUrl.searchParams.get("id") ?? "";
          try {
            const publication = await getPublicationById(id);
            return NextResponse.json({ status: publication.status });
          } catch (error) {
            return NextResponse.json({ error: String(error) }, { status: 500 });
          }
        }`,
        filename: srcFile("app/api/post-status/route.ts"),
      },
      // Complex code outside route.ts is not this rule's concern.
      {
        code: `export async function POST(request) {
          const body = await request.json();
          const jobIds = [];
          for (const order of body.orders) {
            const id = await createPublication(order);
            jobIds.push(id);
          }
          await dispatch(jobIds);
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("features/billing/invoice.ts"),
      },
      // A route.ts export that is not an HTTP method is not this rule's concern.
      {
        code: `export function absolutizeMediaUrls(order) {
          for (const layer of order.layers) {
            layer.url = layer.url;
          }
          return order;
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
      },
    ],
    invalid: [
      // A loop fanning one external call out, plus a second external call
      // after the loop: weight of three.
      {
        code: `export async function POST(request) {
          const body = await request.json();
          const jobIds = [];
          for (const order of body.orders) {
            const id = await createPublication(order);
            jobIds.push(id);
          }
          try {
            await dispatch(jobIds);
          } catch (e) {
            return NextResponse.json({ error: String(e) }, { status: 500 });
          }
          return NextResponse.json({ jobIds });
        }`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [
          {
            message:
              'Handler "POST" has an imperative weight of 3 and must be extracted to a named function outside ' +
              "src/app/. See docs/next-codebase-guide/rules/route-handler-rule.md",
          },
        ],
      },
      // Same shape, wrapped by a HOC: the loop's one external call still
      // scores the call itself plus the loop bonus, reaching weight two.
      {
        code: `export const POST = withUserId(async (userId, request) => {
          const body = await request.json();
          const jobIds = [];
          for (const order of body.orders) {
            const id = await createPublication(userId, order);
            jobIds.push(id);
          }
          return NextResponse.json({ jobIds });
        });`,
        filename: srcFile("app/api/render-instagram-content/route.ts"),
        errors: [
          {
            message:
              'Handler "POST" has an imperative weight of 2 and must be extracted to a named function outside ' +
              "src/app/. See docs/next-codebase-guide/rules/route-handler-rule.md",
          },
        ],
      },
    ],
  });
});
