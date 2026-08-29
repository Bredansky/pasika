/**
 * Pasika ESLint Ruleset
 *
 * Each rule enforces requirements from the `docs/` tree, and each rule file
 * carries a `@see` annotation naming the document it comes from. Which
 * documented requirement each rule covers is recorded in
 * `enforcement/registry.json` and verified by `pasika coverage`.
 */
import type { Linter } from "eslint";
import css from "@eslint/css";
import jsonPlugin from "@eslint/json";
import markdown from "@eslint/markdown";
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
import { tailwindRules } from "./rules/tailwind/index";
import { repoPackageJsonRules, nextPackageJsonRules } from "./rules/package-json/index";
import { huskyRules } from "./rules/husky/index";

/**
 * Framework-agnostic source rules: file naming, imports, exports, folder
 * conventions, package hygiene. These apply to any TypeScript repository.
 */
const repoSourceRules = {
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
const nextSourceRules = {
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

/** Every source rule, merged so the Next preset applies them all. */
export const pasikaRules = {
  ...repoSourceRules,
  ...nextSourceRules,
};

export { documentationRules, tailwindRules, repoPackageJsonRules, nextPackageJsonRules, huskyRules };

/** `pasika/<name>` ids for a rules object, in declaration order. */
function ruleIds(rules: Record<string, unknown>): string[] {
  return Object.keys(rules).map((name) => `pasika/${name}`);
}

// Rule-id groups, used internally to assemble the preset blocks and
// `allPasikaRuleIds`. Only `allPasikaRuleIds` is part of the public API.
const pasikaRuleIds = ruleIds(pasikaRules);
const documentationRuleIds = ruleIds(documentationRules);
const tailwindRuleIds = ruleIds(tailwindRules); // Tailwind stylesheet rules belong to the Next presets.
const repoPackageJsonRuleIds = ruleIds(repoPackageJsonRules);
const nextPackageJsonRuleIds = ruleIds(nextPackageJsonRules);
const huskyRuleIds = ruleIds(huskyRules);

/** Every rule id, as they appear in configuration and in lint output. */
export const allPasikaRuleIds = [
  ...pasikaRuleIds,
  ...documentationRuleIds,
  ...tailwindRuleIds,
  ...repoPackageJsonRuleIds,
  ...nextPackageJsonRuleIds,
  ...huskyRuleIds,
];

/** The Next app's TS/TSX source (`src/**`), running every application rule. */
const nextAppBlock: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: { rules: pasikaRules },
  },
  rules: Object.fromEntries(pasikaRuleIds.map((id) => [id, "error"])),
};

/** Tailwind stylesheet block: the global stylesheet (theme/utility rules). */
const tailwindGlobalsBlock: Linter.Config = {
  files: ["src/**/globals.css"],
  plugins: {
    css,
    pasika: { rules: tailwindRules },
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: Object.fromEntries(
    tailwindRuleIds.filter((id) => id !== "pasika/global-css-location").map((id) => [id, "error"]),
  ),
};

/** Tailwind stylesheet block for every other stylesheet (`global-css-location` only). */
const tailwindAnyCssBlock: Linter.Config = {
  files: ["src/**/*.css"],
  plugins: {
    css,
    pasika: { rules: tailwindRules },
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: { "pasika/global-css-location": "error" },
};

/** `package.json` block: manifest + husky (git-hook) rules, on the JSON language. */
const manifestBlock: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: { ...repoPackageJsonRules, ...nextPackageJsonRules, ...huskyRules } },
  },
  language: "json/json",
  rules: Object.fromEntries(
    [...repoPackageJsonRuleIds, ...nextPackageJsonRuleIds, ...huskyRuleIds].map((id) => [id, "error"]),
  ),
};

/** Markdown/docs block: the documentation-guide rules, on the gfm language. */
const docsBlock: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["**/_*/**"],
  plugins: {
    markdown,
    pasika: { rules: documentationRules },
  },
  language: "markdown/gfm",
  rules: Object.fromEntries(documentationRuleIds.map((id) => [id, "error"])),
};

/**
 * Repository-level preset: every block that does NOT touch `src/**` — the
 * package.json manifest (including husky hook requirements) and the
 * documentation-guide markdown rules. This governs the repository itself,
 * independent of any application source.
 */
export const pasikaRepo: Linter.Config[] = [manifestBlock, docsBlock];

/**
 * Framework-wide preset: the full adopted-to-the-framework stack. Anything in
 * `pasikaRepo` plus the `src/**` blocks — TS/TSX source rules and the Tailwind
 * stylesheet rules. `pasikaRepo` is a strict subset of `pasikaNext`.
 */
export const pasikaNext: Linter.Config[] = [...pasikaRepo, nextAppBlock, tailwindGlobalsBlock, tailwindAnyCssBlock];
