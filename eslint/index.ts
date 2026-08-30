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
import { zirkaBaselineRule } from "./rules/zirka-baseline";
import { documentationRules } from "./rules/documentation/index";
import { tailwindRules } from "./rules/tailwind/index";
import { repoPackageJsonRules, nextPackageJsonRules } from "./rules/package-json/index";
import { huskyRules } from "./rules/husky/index";
import { vulykRules } from "./rules/vulyk/index";

/**
 * TypeScript app rules: file naming, imports, exports, folder conventions,
 * package hygiene. These apply to any TypeScript repository.
 */
const typescriptAppRules = {
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
  "zirka-baseline": zirkaBaselineRule,
};

/**
 * Next.js app rules: React components, JSX, hooks, Tailwind, CVA variants,
 * UI state, feature-folder i18n. These assume a Next.js/React application with
 * a Tailwind theme and are inert in other codebases.
 */
const nextjsAppRules = {
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

/** Every source rule, merged so the Next.js preset applies them all. */
export const pasikaRules = {
  ...typescriptAppRules,
  ...nextjsAppRules,
};

export { documentationRules, tailwindRules, repoPackageJsonRules, nextPackageJsonRules, huskyRules, vulykRules };

/**
 * One plugin object every preset block references. ESLint only permits a
 * plugin name to be redefined across configs when the value is the same
 * object reference, and several blocks share file scopes (`src/**`, the
 * manifest, `globals.css`), so a per-block plugin object would collide when
 * the blocks merge.
 */
export const pasikaPlugin = {
  rules: {
    ...pasikaRules,
    ...documentationRules,
    ...tailwindRules,
    ...repoPackageJsonRules,
    ...nextPackageJsonRules,
    ...huskyRules,
    ...vulykRules,
  },
};

/**
 * One JSON-language plugin object shared by both manifest blocks, for the same
 * reason `pasikaPlugin` is shared: ESLint rejects a plugin name redefined with
 * a different object, and both blocks apply to `package.json`.
 */
const jsonLanguagePlugin = { languages: { json: jsonPlugin.languages.json } };

/** `pasika/<name>` ids for a rules object, in declaration order. */
function ruleIds(rules: Record<string, unknown>): string[] {
  return Object.keys(rules).map((name) => `pasika/${name}`);
}

// Rule-id groups, used internally to assemble the preset blocks and
// `allPasikaRuleIds`. Only `allPasikaRuleIds` is part of the public API.
const typescriptAppRuleIds = ruleIds(typescriptAppRules);
const nextjsAppRuleIds = ruleIds(nextjsAppRules);
const pasikaRuleIds = ruleIds(pasikaRules);
const documentationRuleIds = ruleIds(documentationRules);
const tailwindRuleIds = ruleIds(tailwindRules); // Tailwind stylesheet rules belong to the Next presets.
const repoPackageJsonRuleIds = ruleIds(repoPackageJsonRules);
const nextPackageJsonRuleIds = ruleIds(nextPackageJsonRules);
const huskyRuleIds = ruleIds(huskyRules);
const vulykRuleIds = ruleIds(vulykRules);

/** Every rule id, as they appear in configuration and in lint output. */
export const allPasikaRuleIds = [
  ...pasikaRuleIds,
  ...documentationRuleIds,
  ...tailwindRuleIds,
  ...repoPackageJsonRuleIds,
  ...nextPackageJsonRuleIds,
  ...huskyRuleIds,
  ...vulykRuleIds,
];

/** The TypeScript app's TS/TSX source (`src/**`), running the TS app rules. */
const typescriptAppBlock: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: pasikaPlugin,
  },
  rules: Object.fromEntries(typescriptAppRuleIds.map((id) => [id, "error"])),
};

/** The Next.js app's TS/TSX source, adding the Next.js app rules on top. */
const nextjsAppBlock: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: pasikaPlugin,
  },
  rules: Object.fromEntries(nextjsAppRuleIds.map((id) => [id, "error"])),
};

/** Tailwind stylesheet block: the global stylesheet (theme/utility rules). */
const tailwindGlobalsBlock: Linter.Config = {
  files: ["src/**/globals.css"],
  plugins: {
    css,
    pasika: pasikaPlugin,
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
    pasika: pasikaPlugin,
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: { "pasika/global-css-location": "error" },
};

/**
 * `package.json` block that applies to any repository: the framework-agnostic
 * manifest rules plus the husky (git-hook) and vulyk (docs) rules, on the JSON
 * language.
 */
const repoManifestBlock: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: jsonLanguagePlugin,
    pasika: pasikaPlugin,
  },
  language: "json/json",
  rules: Object.fromEntries([...repoPackageJsonRuleIds, ...huskyRuleIds, ...vulykRuleIds].map((id) => [id, "error"])),
};

/**
 * `package.json` block for the framework only: the Next.js-stack requirement,
 * on the JSON language. Kept out of `typescriptApp` so a repository that does
 * not adopt the framework is never forced to list its packages.
 */
const nextManifestBlock: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: jsonLanguagePlugin,
    pasika: pasikaPlugin,
  },
  language: "json/json",
  rules: Object.fromEntries(nextPackageJsonRuleIds.map((id) => [id, "error"])),
};

/**
 * Root zirka block: the framework's configuration contract. Runs on the
 * repository's eslint config file and verifies it takes its lint, format, and
 * TypeScript configuration from zirka rather than restating it locally.
 */
const zirkaBlock: Linter.Config = {
  files: ["eslint.config.{ts,mts,cts,js,mjs,cjs}"],
  plugins: { pasika: pasikaPlugin },
  rules: { "pasika/zirka-baseline": "error" },
};

/** Markdown/docs block: the documentation-guide rules, on the gfm language. */
const docsBlock: Linter.Config = {
  files: ["docs/**/*.md"],
  ignores: ["**/_*/**"],
  plugins: {
    markdown,
    pasika: pasikaPlugin,
  },
  language: "markdown/gfm",
  rules: Object.fromEntries(documentationRuleIds.map((id) => [id, "error"])),
};

/**
 * TypeScript app preset: the framework-agnostic baseline — the package.json
 * manifest (incl. husky hook and vulyk requirements), the zirka configuration
 * contract, the `src/**` TS/TSX source, and the documentation markdown rules.
 * Use this for a plain TypeScript repository.
 */
export const typescriptApp: Linter.Config[] = [repoManifestBlock, zirkaBlock, typescriptAppBlock, docsBlock];

/**
 * Next.js app preset: the full adopted-to-the-framework stack. Anything in
 * `typescriptApp` plus the framework-only blocks — the Next.js-stack manifest
 * requirement, the Next.js app source rules, and the Tailwind stylesheet
 * rules. `typescriptApp` is a strict subset of `nextjsApp`.
 */
export const nextjsApp: Linter.Config[] = [
  ...typescriptApp,
  nextManifestBlock,
  nextjsAppBlock,
  tailwindGlobalsBlock,
  tailwindAnyCssBlock,
];
