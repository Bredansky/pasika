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
import { cnHelperRule } from "./rules/cn-helper";
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
import { soleStateOwnerRule } from "./rules/sole-state-owner";
import { localeKeyShapeRule } from "./rules/locale-key-shape";
import { sharedStyleDedupRule } from "./rules/shared-style-dedup";
import { repeatedStructureRule } from "./rules/repeated-structure";
import { zodSchemaValidationRule } from "./rules/zod-schema-validation";
import { sourceUnderSrcRule } from "./rules/source-under-src";
import { configBaselineRule } from "./rules/config-baseline";
import { documentationRules } from "./rules/documentation/index";
import { cssRules } from "./rules/css/index";
import { repoPackageJsonRules, nextPackageJsonRules } from "./rules/package-json/index";
import { huskyRules } from "./rules/husky/index";

/**
 * Framework-agnostic source rules: file naming, imports, exports, folder
 * conventions, package hygiene. These apply to any TypeScript repository.
 */
export const repoSourceRules = {
  "filename-case": filenameCaseRule,
  "import-boundaries": importBoundariesRule,
  "named-exports": namedExportsRule,
  "support-file-placement": supportFilePlacementRule,
  "support-folder-shape": supportFolderShapeRule,
  "import-through-index": importThroughIndexRule,
  "util-file-name": utilFileNameRule,
  "no-util-barrel": noUtilBarrelRule,
  "enforce-barrel-exports": enforceBarrelExportsRule,
  "config-extraction": configExtractionRule,
  "value-extraction": valueExtractionRule,
  "type-extraction": typeExtractionRule,
  "zod-schema-validation": zodSchemaValidationRule,
  "source-under-src": sourceUnderSrcRule,
  "config-baseline": configBaselineRule,
};

/**
 * Framework-flavored source rules: React components, JSX, hooks, Tailwind,
 * CVA variants, UI state, feature-folder i18n. These assume a Next.js/React
 * application with a Tailwind theme and are inert in other codebases.
 */
export const nextSourceRules = {
  "component-placement": componentPlacementRule,
  "application-structure": applicationStructureRule,
  "data-testid-case": dataTestIdCaseRule,
  "jsx-hygiene": jsxHygieneRule,
  "interactive-component": interactiveComponentRule,
  "ui-state": uiStateRule,
  "no-mixed-concerns": noMixedConcernsRule,
  "no-arbitrary-tailwind": noArbitraryTailwindRule,
  "enforce-cn-merge": enforceCnMergeRule,
  "cn-helper": cnHelperRule,
  "enforce-cva-variant-props": enforceCvaVariantPropsRule,
  "cva-appearance-props": cvaAppearancePropsRule,
  "cva-boolean-variants": cvaBooleanVariantsRule,
  "cross-feature-import": crossFeatureImportRule,
  "pure-function-extract": pureFunctionExtractRule,
  "hook-complexity": hookComplexityRule,
  "locale-dotted-path": localeDottedPathRule,
  "locales-location": localesLocationRule,
  "hook-extraction": hookExtractionRule,
  "component-nesting": componentNestingRule,
  "stay-flat": stayFlatRule,
  "locale-placement": localePlacementRule,
  "sole-state-owner": soleStateOwnerRule,
  "locale-key-shape": localeKeyShapeRule,
  "shared-style-dedup": sharedStyleDedupRule,
  "repeated-structure": repeatedStructureRule,
};

/** Merged for backward compatibility and coverage ref resolution. */
export const pasikaRules = {
  ...repoSourceRules,
  ...nextSourceRules,
};

export { documentationRules, cssRules, repoPackageJsonRules, nextPackageJsonRules, huskyRules };

/** Rule ids as they appear in configuration and in lint output. */
export const pasikaRuleIds = Object.keys(pasikaRules).map((name) => `pasika/${name}`);

export const pasikaDocumentationRuleIds = Object.keys(documentationRules).map((name) => `pasika/${name}`);
/** CSS rules are Tailwind-flavored and belong to the Next presets. */
export const pasikaCssRuleIds = Object.keys(cssRules).map((name) => `pasika/${name}`);
export const repoPackageJsonRuleIds = Object.keys(repoPackageJsonRules).map((name) => `pasika/${name}`);

export const repoSourceRuleIds = Object.keys(repoSourceRules).map((name) => `pasika/${name}`);
export const nextSourceRuleIds = Object.keys(nextSourceRules).map((name) => `pasika/${name}`);
export const huskyRuleIds = Object.keys(huskyRules).map((name) => `pasika/${name}`);
export const nextPackageJsonRuleIds = Object.keys(nextPackageJsonRules).map((name) => `pasika/${name}`);

/** Every rule id, as they appear in configuration and in lint output. */
export const allPasikaRuleIds = [...pasikaRuleIds, ...pasikaDocumentationRuleIds, ...pasikaCssRuleIds, ...repoPackageJsonRuleIds, ...nextPackageJsonRuleIds, ...huskyRuleIds];

/**
 * Framework-agnostic source preset: the generic source rules over `src/**`.
 * CSS, JSON, and markdown rules need their own ESLint language and are wired
 * separately (or composed by zirka's `styleguide()`). Use `repoConfig` for a
 * plain TypeScript repository or for pasika building itself.
 */
export const repoConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: { rules: repoSourceRules },
  },
  rules: Object.fromEntries(repoSourceRuleIds.map((id) => [id, "error"])),
};

/**
 * Framework-flavored source preset: the full application source rules over
 * `src/**`. CSS (Tailwind) and package.json rules need their own ESLint
 * language and are wired separately (or composed by zirka's `styleguide()`).
 * Consumers with a Next.js/React app use this; pasika itself does not.
 */
export const nextConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: { rules: pasikaRules },
  },
  rules: Object.fromEntries(pasikaRuleIds.map((id) => [id, "error"])),
};

/** Backward-compatible alias for consumers already using `pasikaConfig`. */
export const pasikaConfig: Linter.Config = nextConfig;
