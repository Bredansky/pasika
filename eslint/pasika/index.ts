/**
 * Pasika ESLint Ruleset
 *
 * Each rule enforces requirements from the `docs/` tree, and each rule file
 * carries a `@see` annotation naming the document it comes from. Which
 * documented requirement each rule covers is recorded in
 * `enforcement/registry.json` and verified by `pasika coverage`.
 */
import type { Linter } from "eslint";
import { filenameCaseRule } from "./rules/filename-case";
import { importBoundariesRule } from "./rules/import-boundaries";
import { noMixedConcernsRule } from "./rules/no-mixed-concerns";
import { noArbitraryTailwindRule } from "./rules/no-arbitrary-tailwind";
import { enforceCnMergeRule } from "./rules/enforce-cn-merge";
import { enforceCvaVariantPropsRule } from "./rules/enforce-cva-variant-props";
import { enforceBarrelExportsRule } from "./rules/enforce-barrel-exports";
import { componentPlacementRule } from "./rules/component-placement";
import { supportFilePlacementRule } from "./rules/support-file-placement";
import { applicationStructureRule } from "./rules/application-structure";
import { namedExportsRule } from "./rules/named-exports";
import { dataTestIdCaseRule } from "./rules/data-testid-case";
import { supportFolderShapeRule } from "./rules/support-folder-shape";
import { importThroughIndexRule } from "./rules/import-through-index";
import { utilFileNameRule } from "./rules/util-file-name";
import { noUtilBarrelRule } from "./rules/no-util-barrel";
import { jsxHygieneRule } from "./rules/jsx-hygiene";
import { interactiveComponentRule } from "./rules/interactive-component";
import { uiStateRule } from "./rules/ui-state";
import { cvaAppearancePropsRule } from "./rules/cva-appearance-props";
import { cvaBooleanVariantsRule } from "./rules/cva-boolean-variants";
import { crossFeatureImportRule } from "./rules/cross-feature-import";
import { pureFunctionExtractRule } from "./rules/pure-function-extract";
import { hookComplexityRule } from "./rules/hook-complexity";
import { localeDottedPathRule } from "./rules/locale-dotted-path";
import { localesLocationRule } from "./rules/locales-location";
import { hookExtractionRule } from "./rules/hook-extraction";
import { valueExtractionRule } from "./rules/value-extraction";
import { configExtractionRule } from "./rules/config-extraction";
import { componentNestingRule } from "./rules/component-nesting";
import { stayFlatRule } from "./rules/stay-flat";
import { typeExtractionRule } from "./rules/type-extraction";
import { localePlacementRule } from "./rules/locale-placement";
import { localeKeyShapeRule } from "./rules/locale-key-shape";
import { sharedStyleDedupRule } from "./rules/shared-style-dedup";
import { noEslintDisableRule } from "./rules/no-eslint-disable";
import { zodSchemaValidationRule } from "./rules/zod-schema-validation";
import { sourceUnderSrcRule } from "./rules/source-under-src";
import { mdRules } from "./rules/md/index";
import { cssRules } from "./rules/css/index";
import { jsonRules } from "./rules/json/index";

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
  "locale-key-shape": localeKeyShapeRule,
  "shared-style-dedup": sharedStyleDedupRule,
  "no-eslint-disable": noEslintDisableRule,
  "zod-schema-validation": zodSchemaValidationRule,
  "source-under-src": sourceUnderSrcRule,
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
