/**
 * Pasika ESLint Ruleset
 *
 * Each rule enforces requirements from the `docs/` tree, and each rule file
 * carries a `@see` annotation naming the document it comes from. Which
 * documented requirement each rule covers is recorded in
 * `enforcement/registry.json` and verified by `pasika coverage`.
 */
import type { Linter } from "eslint";
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
import { interactiveComponentRule } from "./rules/interactive-component.js";
import { uiStateRule } from "./rules/ui-state.js";
import { cvaAppearancePropsRule } from "./rules/cva-appearance-props.js";
import { cvaBooleanVariantsRule } from "./rules/cva-boolean-variants.js";
import { crossFeatureImportRule } from "./rules/cross-feature-import.js";
import { pureFunctionExtractRule } from "./rules/pure-function-extract.js";
import { hookComplexityRule } from "./rules/hook-complexity.js";
import { localeDottedPathRule } from "./rules/locale-dotted-path.js";
import { localesLocationRule } from "./rules/locales-location.js";
import { hookExtractionRule } from "./rules/hook-extraction.js";
import { valueExtractionRule } from "./rules/value-extraction.js";
import { configExtractionRule } from "./rules/config-extraction.js";
import { componentNestingRule } from "./rules/component-nesting.js";
import { stayFlatRule } from "./rules/stay-flat.js";
import { typeExtractionRule } from "./rules/type-extraction.js";
import { localePlacementRule } from "./rules/locale-placement.js";
import { sharedStyleDedupRule } from "./rules/shared-style-dedup.js";
import { noEslintDisableRule } from "./rules/no-eslint-disable.js";
import { mdRules } from "./rules/md/index.js";
import { cssRules } from "./rules/css/index.js";
import { jsonRules } from "./rules/json/index.js";

export const pasikaRules = {
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
  "interactive-component": interactiveComponentRule,
  "ui-state": uiStateRule,
  "filename-case": filenameCaseRule,
  "import-boundaries": importBoundariesRule,
  "no-mixed-concerns": noMixedConcernsRule,
  "no-arbitrary-tailwind": noArbitraryTailwindRule,
  "enforce-cn-merge": enforceCnMergeRule,
  "enforce-cva-variant-props": enforceCvaVariantPropsRule,
  "cva-appearance-props": cvaAppearancePropsRule,
  "cva-boolean-variants": cvaBooleanVariantsRule,
  "enforce-barrel-exports": enforceBarrelExportsRule,
  "cross-feature-import": crossFeatureImportRule,
  "pure-function-extract": pureFunctionExtractRule,
  "hook-complexity": hookComplexityRule,
  "locale-dotted-path": localeDottedPathRule,
  "locales-location": localesLocationRule,
  "hook-extraction": hookExtractionRule,
  "value-extraction": valueExtractionRule,
  "config-extraction": configExtractionRule,
  "component-nesting": componentNestingRule,
  "stay-flat": stayFlatRule,
  "type-extraction": typeExtractionRule,
  "locale-placement": localePlacementRule,
  "shared-style-dedup": sharedStyleDedupRule,
  "no-eslint-disable": noEslintDisableRule,
};

export { mdRules, cssRules, jsonRules };

/** Rule ids as they appear in configuration and in lint output. */
export const pasikaRuleIds = Object.keys(pasikaRules).map((name) => `pasika/${name}`);

export const pasikaMdRuleIds = Object.keys(mdRules).map((name) => `pasika/${name}`);
export const pasikaCssRuleIds = Object.keys(cssRules).map((name) => `pasika/${name}`);
export const pasikaJsonRuleIds = Object.keys(jsonRules).map((name) => `pasika/${name}`);

/** Every rule id, as they appear in configuration and in lint output. */
export const allPasikaRuleIds = [...pasikaRuleIds, ...pasikaMdRuleIds, ...pasikaCssRuleIds, ...pasikaJsonRuleIds];

export const pasikaConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: { rules: pasikaRules },
  },
  rules: Object.fromEntries(pasikaRuleIds.map((id) => [id, "error"])),
};
