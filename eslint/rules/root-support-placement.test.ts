import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { rootSupportPlacementRule } from "./root-support-placement";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A root utils/ function whose only consumer is a route.ts under app/.
  "utils/absolutize-media-urls.ts": "export function absolutizeMediaUrls(order: unknown) { return order; }\n",
  "app/api/render-instagram-content/route.ts":
    'import { absolutizeMediaUrls } from "@/utils/absolutize-media-urls";\nexport async function POST() { return absolutizeMediaUrls({}); }\n',

  // A root types/ type whose only consumer is a route.ts under app/.
  "types/render-order.ts": "export type RenderOrder = { jobId: string };\n",
  "app/api/render-instagram-content/types.ts":
    'import type { RenderOrder } from "@/types/render-order";\nexport function useIt(order: RenderOrder) { return order; }\n',

  // A root schemas/ schema whose only consumer is a configuration module.
  "schemas/github-error-response-schema.ts": "export const githubErrorResponseSchema = { message: undefined };\n",
  "config/github/index.ts":
    'import { githubErrorResponseSchema } from "@/schemas/github-error-response-schema";\nexport const githubConfig = githubErrorResponseSchema;\n',

  // A root constants/ constant whose only consumer is a route.ts under app/.
  "constants/max-render-jobs.ts": "export const maxRenderJobs = 10;\n",
  "app/api/render-instagram-content/limits.ts":
    'import { maxRenderJobs } from "@/constants/max-render-jobs";\nexport function useIt() { return maxRenderJobs; }\n',

  // A root utils/ function reused by two features: has earned its place.
  "utils/format-retry-delay.ts": "export function formatRetryDelay(ms: number) { return String(ms); }\n",
  "features/billing/invoice.tsx":
    'import { formatRetryDelay } from "@/utils/format-retry-delay";\nexport function Invoice() { return <div>{formatRetryDelay(1)}</div>; }\n',
  "features/stream/stream-card.tsx":
    'import { formatRetryDelay } from "@/utils/format-retry-delay";\nexport function StreamCard() { return <div>{formatRetryDelay(1)}</div>; }\n',

  // A root types/ type reused by two features: has earned its place.
  "types/invoice-status.ts": 'export type InvoiceStatus = "draft" | "paid";\n',
  "features/billing/invoice-summary.tsx":
    'import type { InvoiceStatus } from "@/types/invoice-status";\nexport function InvoiceSummary(props: { status: InvoiceStatus }) { return <div />; }\n',
  "features/reporting/status-badge.tsx":
    'import type { InvoiceStatus } from "@/types/invoice-status";\nexport function StatusBadge(props: { status: InvoiceStatus }) { return <div />; }\n',

  // An unused root utils/ export is not this rule's problem.
  "utils/unused-helper.ts": "export function unusedHelper() { return 1; }\n",
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-root-support-placement-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const UTILITIES_DOC = "See docs/next-codebase-guide/rules/utilities-rule.md";
const TYPES_AND_SCHEMAS_DOC = "See docs/next-codebase-guide/rules/types-and-schemas-rule.md";
const CONSTANTS_DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A pure function with no consumer outside `src/app/` or a configuration module MUST live in the feature it represents, not `src/utils/`. If no existing feature applies, it MUST introduce a new feature folder.", () => {
  ruleTester.run("root-support-placement", rootSupportPlacementRule, {
    valid: [
      // Reused by two features: has earned root src/utils/.
      {
        code: read("utils/format-retry-delay.ts"),
        filename: file("utils/format-retry-delay.ts"),
      },
      // Unused export is not this rule's problem.
      {
        code: read("utils/unused-helper.ts"),
        filename: file("utils/unused-helper.ts"),
      },
      // A file outside the root support folders is out of scope.
      {
        code: read("features/billing/invoice.tsx"),
        filename: file("features/billing/invoice.tsx"),
      },
    ],
    invalid: [
      {
        code: read("utils/absolutize-media-urls.ts"),
        filename: file("utils/absolutize-media-urls.ts"),
        errors: [
          {
            message:
              `Function "absolutizeMediaUrls" has no consumer outside src/app/ or a configuration module, so it ` +
              "has not earned root src/utils/; move it into the feature it represents. If no existing feature " +
              `applies, introduce a new feature folder. ${UTILITIES_DOC}`,
          },
        ],
      },
    ],
  });
});

void describe("A type or schema with no consumer outside `src/app/` or a configuration module MUST live in the feature it represents, not `src/types/` or `src/schemas/`. If no existing feature applies, it MUST introduce a new feature folder.", () => {
  ruleTester.run("root-support-placement", rootSupportPlacementRule, {
    valid: [
      // Reused by two features: has earned root src/types/.
      {
        code: read("types/invoice-status.ts"),
        filename: file("types/invoice-status.ts"),
      },
    ],
    invalid: [
      {
        code: read("types/render-order.ts"),
        filename: file("types/render-order.ts"),
        errors: [
          {
            message:
              `Type "RenderOrder" has no consumer outside src/app/ or a configuration module, so it ` +
              "has not earned root src/types/; move it into the feature it represents. If no existing feature " +
              `applies, introduce a new feature folder. ${TYPES_AND_SCHEMAS_DOC}`,
          },
        ],
      },
      {
        code: read("schemas/github-error-response-schema.ts"),
        filename: file("schemas/github-error-response-schema.ts"),
        errors: [
          {
            message:
              `Schema "githubErrorResponseSchema" has no consumer outside src/app/ or a configuration module, ` +
              "so it has not earned root src/schemas/; move it into the feature it represents. If no existing " +
              `feature applies, introduce a new feature folder. ${TYPES_AND_SCHEMAS_DOC}`,
          },
        ],
      },
    ],
  });
});

void describe("A constant with no consumer outside `src/app/` or a configuration module MUST live in the feature it represents, not `src/constants/`. If no existing feature applies, it MUST introduce a new feature folder.", () => {
  ruleTester.run("root-support-placement", rootSupportPlacementRule, {
    valid: [],
    invalid: [
      {
        code: read("constants/max-render-jobs.ts"),
        filename: file("constants/max-render-jobs.ts"),
        errors: [
          {
            message:
              `Constant "maxRenderJobs" has no consumer outside src/app/ or a configuration module, so it ` +
              "has not earned root src/constants/; move it into the feature it represents. If no existing " +
              `feature applies, introduce a new feature folder. ${CONSTANTS_DOC}`,
          },
        ],
      },
    ],
  });
});
