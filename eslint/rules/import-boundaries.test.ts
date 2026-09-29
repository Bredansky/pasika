import { describe, ruleTester, srcFile } from "../rule-tester";
import { importBoundariesRule } from "./import-boundaries";

const BOUNDARY_MESSAGE = "This import violates the src layer boundary.";

const choice = (preferred: string, other: string): string => `Use "${preferred}" instead of "${other}".`;

void describe("An import whose target is in the current directory or its direct parent directory MUST use a relative path with ./ or ../.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { InvoiceRow } from "./invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
      },
      {
        code: 'import { locales } from "../locales";',
        filename: srcFile("compositions/dashboard-view.tsx"),
      },
    ],
    invalid: [
      {
        code: 'import { InvoiceRow } from "@/features/billing/invoice-row";',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [{ message: choice("./invoice-row", "@/features/billing/invoice-row") }],
      },
      {
        code: 'import { locales } from "@/locales";',
        filename: srcFile("compositions/dashboard-view.tsx"),
        errors: [{ message: choice("../locales", "@/locales") }],
      },
    ],
  });
});

void describe("A relative import MUST NOT traverse more than one parent directory; use the @/* alias instead of ../../ or deeper paths.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { format } from "@/features/billing/utils/format";',
        filename: srcFile("features/billing/InvoiceCard/rows/row.tsx"),
      },
      {
        code: 'import { format } from "@/features/billing/InvoiceCard/format";',
        filename: srcFile("features/billing/InvoiceCard/rows/cells/cell.tsx"),
      },
      {
        code: 'import { debounce } from "@/utils/debounce";',
        filename: srcFile("features/stream/StreamBoard/schedule.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { format } from "../../utils/format";',
        filename: srcFile("features/billing/InvoiceCard/rows/row.tsx"),
        errors: [{ message: choice("@/features/billing/utils/format", "../../utils/format") }],
      },
      {
        code: 'import { format } from "../../format";',
        filename: srcFile("features/billing/InvoiceCard/rows/cells/cell.tsx"),
        errors: [{ message: choice("@/features/billing/InvoiceCard/format", "../../format") }],
      },
      {
        code: 'import { debounce } from "../../../utils/debounce";',
        filename: srcFile("features/stream/StreamBoard/schedule.ts"),
        errors: [{ message: choice("@/utils/debounce", "../../../utils/debounce") }],
      },
      {
        code: 'import { getTextLayerBoxStyle } from "../../../utils/text-layer-styles";',
        filename: srcFile("features/editor/Poster/preview-card/instagram-editor/utils/text-layer-styles.test.ts"),
        errors: [
          {
            message: choice("@/features/editor/Poster/utils/text-layer-styles", "../../../utils/text-layer-styles"),
          },
        ],
      },
    ],
  });
});

void describe("A file under src/compositions/ MUST NOT import from src/app/.", () => {
  ruleTester.run("import-boundaries", importBoundariesRule, {
    valid: [
      {
        code: 'import { Invoice } from "../features/billing/invoice";',
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
        code: 'import { formatDate } from "../utils/format-date";',
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
