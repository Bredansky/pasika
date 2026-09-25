/**
 * All Tailwind stylesheet rules (Tailwind v4 src/app/styles/globals.css).
 */
import { themeResetRule } from "./theme-reset";
import { rootVariablesRule } from "./root-variables";
import { applyUsageRule } from "./apply-usage";
import { baseLayerPairRule } from "./base-layer-pair";
import { stylesheetOrderingRule } from "./stylesheet-ordering";
import { cssVariableNamingRule } from "./css-variable-naming";
import { customUtilityApplyRule } from "./custom-utility-apply";
import { utilityMappingRule } from "./utility-mapping";
import { themeVariableNamespaceRule } from "./theme-variable-namespace";
import { cssEntryPointRule } from "./css-entry-point";
import { globalStylesheetRule } from "./global-stylesheet";
import { unusedUtilityRule } from "./unused-utility";
import { globalSelectorStylingRule } from "./global-selector-styling";

export const tailwindRules = {
  "theme-reset": themeResetRule,
  "root-variables": rootVariablesRule,
  "apply-usage": applyUsageRule,
  "base-layer-pair": baseLayerPairRule,
  "stylesheet-ordering": stylesheetOrderingRule,
  "css-variable-naming": cssVariableNamingRule,
  "custom-utility-apply": customUtilityApplyRule,
  "utility-mapping": utilityMappingRule,
  "theme-variable-namespace": themeVariableNamespaceRule,
  "css-entry-point": cssEntryPointRule,
  "global-stylesheet": globalStylesheetRule,
  "unused-utility": unusedUtilityRule,
  "global-selector-styling": globalSelectorStylingRule,
};

export type TailwindRuleName = keyof typeof tailwindRules;
