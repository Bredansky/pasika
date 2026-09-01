import { describe, ruleTester, srcFile } from "../rule-tester";
import { crossFeatureImportRule } from "./cross-feature-import";

void describe("A component that imports from two or more feature folders MUST live in src/compositions/.", () => {
  ruleTester.run("cross-feature-import", crossFeatureImportRule, {
    valid: [
      {
        code: 'import { Button } from "@/features/shared/button";',
        filename: srcFile("features/billing/dashboard.tsx"),
      },
      {
        code: 'import { Layout } from "@/compositions/layout";',
        filename: srcFile("features/billing/dashboard.tsx"),
      },
      {
        code: 'import { BillingPanel } from "@/features/billing/BillingPanel"; import { HomeBanner } from "@/features/home/HomeBanner";',
        filename: srcFile("compositions/billing-overview.tsx"),
      },
      {
        code: 'import { helper } from "@/features/home/helper";',
        filename: srcFile("features/billing/utils/format.ts"),
      },
      {
        code: 'import { Billing } from "@/features/billing/Billing"; import { Home } from "@/features/home/Home";',
        filename: srcFile("app/page.tsx"),
      },
      {
        code: 'import { a } from "@/features/billing/a"; import { b } from "@/features/home/b";',
        filename: srcFile("config/theme/index.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { BillingPanel } from "@/features/billing/BillingPanel"; import { HomeBanner } from "@/features/home/HomeBanner";',
        filename: srcFile("features/billing/dashboard.tsx"),
        errors: [
          {
            message:
              "This component imports from two or more feature folders (billing, home) and must live in src/compositions/. See docs/next-codebase-guide/rules/component-placement-rule.md",
          },
        ],
      },
      {
        code: 'import { Stream } from "@/features/stream/Stream"; import { Donation } from "@/features/donation/Donation";',
        filename: srcFile("shared/overview.tsx"),
        errors: [
          {
            message:
              "This component imports from two or more feature folders (donation, stream) and must live in src/compositions/. See docs/next-codebase-guide/rules/component-placement-rule.md",
          },
        ],
      },
      {
        code: 'import { A } from "@/features/a/A"; import { B } from "@/features/b/B"; import { C } from "@/features/c/C";',
        filename: srcFile("shared/mega-view.tsx"),
        errors: [
          {
            message:
              "This component imports from two or more feature folders (a, b) and must live in src/compositions/. See docs/next-codebase-guide/rules/component-placement-rule.md",
          },
        ],
      },
    ],
  });
});
