/**
 * Pasika ESLint Ruleset
 *
 * Each rule enforces a specific documentation Rule from the `docs/` tree.
 * Every rule file carries a `@see` annotation linking to the source doc.
 * This mapping is maintained so future agents can audit rule/doc alignment.
 *
 * Rule → Doc mapping:
 *
 *   filename-case          → docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md
 *   import-boundaries      → docs/code-organization-guide/rules/exports-and-imports-rule.md
 *   no-mixed-concerns      → docs/code-organization-guide/rules/no-mixed-concerns-rule.md
 *   no-arbitrary-tailwind  → docs/styling-guide/rules/arbitrary-value-rule.md
 *   enforce-cn-merge       → docs/styling-guide/rules/class-composition-rule.md
 *   enforce-cva-variant-props → docs/styling-guide/rules/component-variant-rule.md
 *   enforce-barrel-exports → docs/code-organization-guide/rules/folder-nesting-rule.md
 *                          + docs/code-organization-guide/rules/exports-and-imports-rule.md
 */
import type { Linter } from "eslint";
import { filenameCaseRule } from "./rules/filename-case.js";
import { importBoundariesRule } from "./rules/import-boundaries.js";
import { noMixedConcernsRule } from "./rules/no-mixed-concerns.js";
import { noArbitraryTailwindRule } from "./rules/no-arbitrary-tailwind.js";
import { enforceCnMergeRule } from "./rules/enforce-cn-merge.js";
import { enforceCvaVariantPropsRule } from "./rules/enforce-cva-variant-props.js";
import { enforceBarrelExportsRule } from "./rules/enforce-barrel-exports.js";

export const pasikaConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: {
      rules: {
        "filename-case": filenameCaseRule,
        "import-boundaries": importBoundariesRule,
        "no-mixed-concerns": noMixedConcernsRule,
        "no-arbitrary-tailwind": noArbitraryTailwindRule,
        "enforce-cn-merge": enforceCnMergeRule,
        "enforce-cva-variant-props": enforceCvaVariantPropsRule,
        "enforce-barrel-exports": enforceBarrelExportsRule,
      },
    },
  },
  rules: {
    "pasika/filename-case": "error",
    "pasika/import-boundaries": "error",
    "pasika/no-mixed-concerns": "error",
    "pasika/no-arbitrary-tailwind": "error",
    "pasika/enforce-cn-merge": "error",
    "pasika/enforce-cva-variant-props": "error",
    "pasika/enforce-barrel-exports": "error",
  },
};
