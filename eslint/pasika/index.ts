/**
 * Pasika ESLint Ruleset
 *
 * Each rule enforces requirements from the `docs/` tree, and each rule file
 * carries a `@see` annotation naming the document it comes from. Which
 * documented requirement each rule covers is recorded in
 * `enforcement/registry.json` and verified by `pasika coverage`.
 */
import type { Linter, Rule } from "eslint";
import { filenameCaseRule } from "./rules/filename-case.js";
import { importBoundariesRule } from "./rules/import-boundaries.js";
import { noMixedConcernsRule } from "./rules/no-mixed-concerns.js";
import { noArbitraryTailwindRule } from "./rules/no-arbitrary-tailwind.js";
import { enforceCnMergeRule } from "./rules/enforce-cn-merge.js";
import { enforceCvaVariantPropsRule } from "./rules/enforce-cva-variant-props.js";
import { enforceBarrelExportsRule } from "./rules/enforce-barrel-exports.js";
import { componentPlacementRule } from "./rules/component-placement.js";
import { supportFilePlacementRule } from "./rules/support-file-placement.js";
import { applicationStructureRule } from "./rules/application-structure.js";
import { namedExportsRule } from "./rules/named-exports.js";
import { dataTestIdCaseRule } from "./rules/data-testid-case.js";
import { supportFolderShapeRule } from "./rules/support-folder-shape.js";
import { importThroughIndexRule } from "./rules/import-through-index.js";
import { utilFileNameRule } from "./rules/util-file-name.js";
import { noUtilBarrelRule } from "./rules/no-util-barrel.js";
import { jsxHygieneRule } from "./rules/jsx-hygiene.js";

/** Every rule the plugin provides, keyed by its unprefixed name. */
export const pasikaRules: Record<string, Rule.RuleModule> = {
  "component-placement": componentPlacementRule,
  "support-file-placement": supportFilePlacementRule,
  "application-structure": applicationStructureRule,
  "named-exports": namedExportsRule,
  "data-testid-case": dataTestIdCaseRule,
  "support-folder-shape": supportFolderShapeRule,
  "import-through-index": importThroughIndexRule,
  "util-file-name": utilFileNameRule,
  "no-util-barrel": noUtilBarrelRule,
  "jsx-hygiene": jsxHygieneRule,
  "filename-case": filenameCaseRule,
  "import-boundaries": importBoundariesRule,
  "no-mixed-concerns": noMixedConcernsRule,
  "no-arbitrary-tailwind": noArbitraryTailwindRule,
  "enforce-cn-merge": enforceCnMergeRule,
  "enforce-cva-variant-props": enforceCvaVariantPropsRule,
  "enforce-barrel-exports": enforceBarrelExportsRule,
};

/** Rule ids as they appear in configuration and in lint output. */
export const pasikaRuleIds = Object.keys(pasikaRules).map((name) => `pasika/${name}`);

export const pasikaConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: { rules: pasikaRules },
  },
  rules: Object.fromEntries(pasikaRuleIds.map((id) => [id, "error"])),
};
