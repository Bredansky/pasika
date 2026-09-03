import { describe, ruleTester, srcFile } from "../rule-tester";
import { importBoundariesRule } from "./import-boundaries";

const BOUNDARY_MESSAGE = "This import violates the src layer boundary.";

const choice = (preferred: string, preferredCount: number, other: string, otherCount: number): string =>
  `Use "${preferred}" (${String(preferredCount)} segment${preferredCount === 1 ? "" : "s"}) ` +
  `instead of "${other}" (${String(otherCount)} segment${otherCount === 1 ? "" : "s"})` +
  `${preferredCount === otherCount ? ", and a tie goes to the relative path" : ""}.`;

void describe("Imports MUST use whichever of the relative path and the @/* alias has fewer segments, counting each ../ step and each name in the path as one segment.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      // Relative wins: the alias would have to re-spell the shared feature path.
      {
        code: 'import { InvoiceRow } from "./invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'import { maxRetries } from "../constants";',
        filename: srcFile("features/billing/hooks/use-retry-payment.ts"),
      },
      // Alias wins: crossing out of a layer always costs at least one `../`.
      {
        code: 'import { debounce } from "@/utils/debounce";',
        filename: srcFile("features/stream/StreamBoard/schedule.ts"),
      },
      {
        code: 'import { locales } from "@/locales";',
        filename: srcFile("compositions/dashboard-view.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { InvoiceRow } from "@/features/billing/invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [{ message: choice("./invoice-row", 1, "@/features/billing/invoice-row", 3) }],
      },
      {
        code: 'import { locales } from "../locales";',
        filename: srcFile("compositions/dashboard-view.tsx"),
        errors: [{ message: choice("@/locales", 1, "../locales", 2) }],
      },
      {
        code: 'import { debounce } from "../../../utils/debounce";',
        filename: srcFile("features/stream/StreamBoard/schedule.ts"),
        errors: [{ message: choice("@/utils/debounce", 2, "../../../utils/debounce", 5) }],
      },
    ],
  });
});

void describe("Imports MUST use the relative path when the relative path and the @/* alias have the same number of segments.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { format } from "../../utils/format";',
        filename: srcFile("features/billing/InvoiceCard/rows/row.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { format } from "@/features/billing/utils/format";',
        filename: srcFile("features/billing/InvoiceCard/rows/row.tsx"),
        errors: [{ message: choice("../../utils/format", 4, "@/features/billing/utils/format", 4) }],
      },
    ],
  });
});

void describe("A file under src/compositions/ MUST NOT import from src/app/.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { Invoice } from "@/features/billing/invoice";',
        filename: srcFile("compositions/checkout.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { metadata } from "@/app/layout";',
        filename: srcFile("compositions/checkout.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
    ],
  });
});

void describe("A file in a feature folder MUST NOT import from another feature folder, src/compositions/, or src/app/.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { StatusBadge } from "@/shared/status-badge";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'import { formatDate } from "@/utils/format-date";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { HomeBanner } from "@/features/home/HomeBanner";',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'import { Checkout } from "@/compositions/checkout";',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'import { metadata } from "@/app/layout";',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
    ],
  });
});

void describe("A file under src/shared/ MUST NOT import from src/app/, src/compositions/, or a feature folder.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { formatDate } from "@/utils/format-date";',
        filename: srcFile("shared/status-badge.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { Invoice } from "@/features/billing/invoice";',
        filename: srcFile("shared/status-badge.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'import { Checkout } from "@/compositions/checkout";',
        filename: srcFile("shared/status-badge.tsx"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
    ],
  });
});

void describe("A file in the root layer MUST NOT import from src/app/, src/compositions/, a feature folder, or src/shared/.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { round } from "./round";',
        filename: srcFile("utils/format-retry-delay.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { StatusBadge } from "@/shared/status-badge";',
        filename: srcFile("utils/format-retry-delay.ts"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'import { Invoice } from "@/features/billing/invoice";',
        filename: srcFile("hooks/use-search.ts"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
    ],
  });
});

void describe("A configuration module MUST import only from root support folders and its own files.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { homeFeedConfigSchema } from "./schemas";',
        filename: srcFile("config/home-feed/index.ts"),
      },
      {
        code: 'import { formatDate } from "@/utils/format-date";',
        filename: srcFile("config/home-feed/index.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { Invoice } from "@/features/billing/invoice";',
        filename: srcFile("config/home-feed/index.ts"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'import { Checkout } from "@/compositions/checkout";',
        filename: srcFile("config/home-feed/index.ts"),
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
    ],
  });
});

void describe("Import boundaries MUST apply to every static and dynamic module-loading syntax.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'export * from "./invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'export { InvoiceRow } from "./invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: "export { InvoiceRow };",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'async function load() { return import("./invoice-row"); }',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'const row = require("./invoice-row");',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: "load(moduleName);",
        filename: srcFile("features/billing/invoice.tsx"),
      },
    ],
    invalid: [],
  });
});
