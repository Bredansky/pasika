/**
 * All Tailwind stylesheet rules (Tailwind v4 src/app/styles/globals.css).
 */
import { applyUsageRule } from "./apply-usage";
import { baseLayerPairRule } from "./base-layer-pair";
import { colorRoleUsageRule } from "./color-role-usage";
import { cssEntryPointRule } from "./css-entry-point";
import { customUtilityApplyRule } from "./custom-utility-apply";
import { featureCssPlacementRule } from "./feature-css-placement";
import { globalSelectorStylingRule } from "./global-selector-styling";
import { globalStylesheetRule } from "./global-stylesheet";
import { noUtilityAliasRule } from "./no-utility-alias";
import { rootVariablesRule } from "./root-variables";
import { stylesheetOrderingRule } from "./stylesheet-ordering";
import { themeResetRule } from "./theme-reset";
import { uniqueCssDefinitionRule } from "./unique-css-definition";
import { uniqueCssTokenValueRule } from "./unique-css-token-value";
import { unusedUtilityRule } from "./unused-utility";
import { utilityMappingRule } from "./utility-mapping";

export const tailwindRules = {
  "theme-reset": themeResetRule,
  "color-role-usage": colorRoleUsageRule,
  "root-variables": rootVariablesRule,
  "apply-usage": applyUsageRule,
  "base-layer-pair": baseLayerPairRule,
  "stylesheet-ordering": stylesheetOrderingRule,
  "custom-utility-apply": customUtilityApplyRule,
  "utility-mapping": utilityMappingRule,
  "css-entry-point": cssEntryPointRule,
  "feature-css-placement": featureCssPlacementRule,
  "global-stylesheet": globalStylesheetRule,
  "unused-utility": unusedUtilityRule,
  "unique-css-definition": uniqueCssDefinitionRule,
  "unique-css-token-value": uniqueCssTokenValueRule,
  "no-utility-alias": noUtilityAliasRule,
  "global-selector-styling": globalSelectorStylingRule,
};

export type TailwindRuleName = keyof typeof tailwindRules;
