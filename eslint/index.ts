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
import tsParser from "@typescript-eslint/parser";
import { assertTypescriptAlignment } from "./ts-alignment";
import { filenameCaseRule } from "./rules/filename-case";
import { importBoundariesRule } from "./rules/import-boundaries";
import { noMixedConcernsRule } from "./rules/no-mixed-concerns";
import { noArbitraryTailwindRule } from "./rules/no-arbitrary-tailwind";
import { unknownUtilityRule } from "./rules/unknown-utility";
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
import { repoPackageJsonRules, nextjsPackageJsonRules } from "./rules/package-json/index";
import { huskyRules } from "./rules/husky/index";
import { vulykRules } from "./rules/vulyk/index";

/**
 * The `src/**` app rules: every source rule the framework enforces. The
 * file-naming, import, export, folder, extraction, and hygiene rules apply to
 * any TypeScript repository; the React, JSX, hooks, Tailwind, CVA, and i18n
 * rules assume a Next.js/React application with a Tailwind theme and are inert
 * in other codebases.
 */
const pasikaNextjsAppRules = {
  // Framework-agnostic TypeScript rules.
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
  // Next.js/React application rules.
  "component-placement": componentPlacementRule,
  "application-structure": applicationStructureRule,
  "data-testid-case": dataTestIdCaseRule,
  "jsx-hygiene": jsxHygieneRule,
  "interactive-component": interactiveComponentRule,
  "ui-state": uiStateRule,
  "no-mixed-concerns": noMixedConcernsRule,
  "no-arbitrary-tailwind": noArbitraryTailwindRule,
  "unknown-utility": unknownUtilityRule,
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

export { documentationRules, tailwindRules, repoPackageJsonRules, nextjsPackageJsonRules, huskyRules, vulykRules };

/**
 * One plugin object every preset block references. ESLint only permits a
 * plugin name to be redefined across configs when the value is the same
 * object reference, and several blocks share file scopes (`src/**`, the
 * manifest, `globals.css`), so a per-block plugin object would collide when
 * the blocks merge.
 */
export const pasikaPlugin = {
  rules: {
    // The shared plugin must register every rule the preset blocks reference,
    // so all rule sets live here.
    ...pasikaNextjsAppRules,
    ...documentationRules,
    ...tailwindRules,
    ...repoPackageJsonRules,
    ...nextjsPackageJsonRules,
    ...huskyRules,
    ...vulykRules,
  },
};

/**
 * The JSON language object shared by both manifest blocks, for the same reason
 * `pasikaPlugin` is shared: ESLint rejects a plugin name redefined with a
 * different object, and both blocks apply to `package.json`.
 */
const jsonLanguage = { languages: { json: jsonPlugin.languages.json } };

/** `pasika/<name>` ids for a rules object, in declaration order. */
function ruleIds(rules: Record<string, unknown>): string[] {
  return Object.keys(rules).map((name) => `pasika/${name}`);
}

// Rule-id groups, used internally to assemble the preset blocks and
// `allPasikaRuleIds`. Only `allPasikaRuleIds` is part of the public API.
const pasikaNextjsAppRuleIds = ruleIds(pasikaNextjsAppRules);
const documentationRuleIds = ruleIds(documentationRules);
const tailwindRuleIds = ruleIds(tailwindRules); // Tailwind stylesheet rules belong to the Next presets.
const repoPackageJsonRuleIds = ruleIds(repoPackageJsonRules);
const nextjsPackageJsonRuleIds = ruleIds(nextjsPackageJsonRules);
const huskyRuleIds = ruleIds(huskyRules);
const vulykRuleIds = ruleIds(vulykRules);

/** Every rule id, as they appear in configuration and in lint output. */
export const allPasikaRuleIds = [
  ...pasikaNextjsAppRuleIds,
  ...documentationRuleIds,
  ...tailwindRuleIds,
  ...repoPackageJsonRuleIds,
  ...nextjsPackageJsonRuleIds,
  ...huskyRuleIds,
  ...vulykRuleIds,
];

/**
 * The parser the `src/**` blocks ship. The TS/TSX source rules read ESTree
 * nodes and many re-parse with the TypeScript compiler API, so the preset
 * must parse `.ts`/`.tsx` as TypeScript even when used standalone (without
 * `zirka`, which otherwise supplies the parser). `@typescript-eslint/parser`
 * is a runtime dependency so an installing consumer always gets it.
 */
const pasikaAppLanguageOptions: Linter.Config["languageOptions"] = {
  parser: tsParser,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
};

/** The app's TS/TSX source (`src/**`), running every source rule. */
const pasikaNextjsAppConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  languageOptions: pasikaAppLanguageOptions,
  plugins: {
    pasika: pasikaPlugin,
  },
  rules: Object.fromEntries(pasikaNextjsAppRuleIds.map((id) => [id, "error"])),
};

/**
 * The `globals.css` entry under `src` — marked by `@import "tailwindcss"`.
 * The Tailwind structural rules run only here: each assumes this file IS the
 * entry point, so they'd misreport any other stylesheet.
 */
const tailwindStructureRules: Linter.Config = {
  files: ["src/**/globals.css"],
  plugins: {
    css,
    pasika: pasikaPlugin,
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: Object.fromEntries(
    tailwindRuleIds.filter((id) => id !== "pasika/css-entry-point").map((id) => [id, "error"]),
  ),
};

/**
 * Every stylesheet under `src` — the cross-file `css-entry-point` import-graph
 * rule, applied once over all files so a stray sheet or one reached two hops
 * away is caught. Kept apart from the structural rules because those assume
 * the entry point and can't run here.
 */
const tailwindImportGraph: Linter.Config = {
  files: ["src/**/*.css"],
  plugins: {
    css,
    pasika: pasikaPlugin,
  },
  language: "css/css",
  languageOptions: { tolerant: true },
  rules: { "pasika/css-entry-point": "error" },
};

/**
 * `package.json` block that applies to any repository: the framework-agnostic
 * manifest rules plus the husky (git-hook) and vulyk (docs) rules, on the JSON
 * language.
 */
const pasikaAppPackageJsonConfig: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: jsonLanguage,
    pasika: pasikaPlugin,
  },
  language: "json/json",
  rules: Object.fromEntries([...repoPackageJsonRuleIds, ...huskyRuleIds, ...vulykRuleIds].map((id) => [id, "error"])),
};

/**
 * `package.json` block for the framework only: the Next.js-stack requirement,
 * on the JSON language. Kept out of `pasikaApp` so a repository that does
 * not adopt the framework is never forced to list its packages.
 */
const pasikaNextjsAppPackageJsonConfig: Linter.Config = {
  files: ["package.json"],
  plugins: {
    json: jsonLanguage,
    pasika: pasikaPlugin,
  },
  language: "json/json",
  rules: Object.fromEntries(nextjsPackageJsonRuleIds.map((id) => [id, "error"])),
};

/**
 * Root zirka block: the framework's configuration contract. Runs on the
 * repository's eslint config file and verifies it takes its lint, format, and
 * TypeScript configuration from zirka rather than restating it locally.
 */
const zirkaConfig: Linter.Config = {
  files: ["eslint.config.{ts,mts,cts,js,mjs,cjs}"],
  plugins: { pasika: pasikaPlugin },
  rules: { "pasika/zirka-baseline": "error" },
};

/** Markdown/docs block: the documentation-guide rules, on the gfm language. */
const documentationConfig: Linter.Config = {
  files: ["docs/**/*.md"],
  // vulyk-generated agent files are not authored docs: with per-directory
  // targets they can land under docs/ (e.g. docs/AGENTS.md) and must not be
  // held to the documentation guide.
  ignores: ["**/_*/**", "**/AGENTS.md", "**/CLAUDE.md"],
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
 * contract, and the documentation markdown rules. It carries no `src/**`
 * source block: source linting is the Next.js app's job.
 * Use this for a plain TypeScript repository that does not adopt the framework.
 */
export const pasikaApp: Linter.Config[] = [
  pasikaAppPackageJsonConfig,
  zirkaConfig,
  documentationConfig,
];

/**
 * Wrap the `pasikaNextjsApp` preset so the TypeScript alignment diagnostic runs the
 * first time the array is consumed (spread into a config, iterated, measured),
 * instead of at module load. That keeps `pasikaApp`-only repositories —
 * which never use pasika's bundled parser — completely unaffected: they can
 * stay on whatever TypeScript major they pin. A pasikaNextjsApp consumer whose
 * hoisted TypeScript has a different major than the compiler pasika bundles
 * gets a load-time error urging the upgrade, instead of crashing later inside
 * the type-aware rules. See `./ts-alignment`.
 */
const pasikaNextjsAppWithDiagnostic = <T extends Linter.Config[]>(preset: T): T => {
  let checked = false;
  return new Proxy(preset, {
    get(target, property, receiver) {
      if (!checked && (property === Symbol.iterator || property === "length")) {
        checked = true;
        assertTypescriptAlignment();
      }
      return Reflect.get(target, property, receiver);
    },
  });
};

/**
 * Next.js app preset: the full adopted-to-the-framework stack. Anything in
 * `pasikaApp` plus the framework-only blocks — the Next.js-stack manifest
 * requirement, the `src/**` app source rules, and the Tailwind stylesheet
 * rules. `pasikaApp` is a strict subset of `pasikaNextjsApp`. Consuming this
 * preset (spreading or iterating it) runs the TypeScript alignment diagnostic
 * first, so a mismatched compiler major fails config load with an actionable
 * error instead of crashing every type-aware rule later.
 */
export const pasikaNextjsApp: Linter.Config[] = pasikaNextjsAppWithDiagnostic([
  ...pasikaApp,
  pasikaNextjsAppPackageJsonConfig,
  pasikaNextjsAppConfig,
  tailwindStructureRules,
  tailwindImportGraph,
]);
