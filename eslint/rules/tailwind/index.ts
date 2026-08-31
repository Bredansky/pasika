/**
 * All Tailwind stylesheet rules (Tailwind v4 globals.css).
 */
import { themeResetRule } from "./theme-reset";
import { rootVariablesRule } from "./root-variables";
import { applyUsageRule } from "./apply-usage";
import { baseLayerPairRule } from "./base-layer-pair";
import { stylesheetOrderingRule } from "./stylesheet-ordering";
import { cssVariableNamingRule } from "./css-variable-naming";
import { customUtilityApplyRule } from "./custom-utility-apply";
import { surfaceUtilityRule } from "./surface-utility";
import { themeVariableNamespaceRule } from "./theme-variable-namespace";
import { cssEntryPointRule } from "./css-entry-point";
import { globalStylesheetRule } from "./global-stylesheet";
import { unusedUtilityRule } from "./unused-utility";

export const tailwindRules = {
  "theme-reset": themeResetRule,
  "root-variables": rootVariablesRule,
  "apply-usage": applyUsageRule,
  "base-layer-pair": baseLayerPairRule,
  "stylesheet-ordering": stylesheetOrderingRule,
  "css-variable-naming": cssVariableNamingRule,
  "custom-utility-apply": customUtilityApplyRule,
  "surface-utility": surfaceUtilityRule,
  "theme-variable-namespace": themeVariableNamespaceRule,
  "css-entry-point": cssEntryPointRule,
  "global-stylesheet": globalStylesheetRule,
  "unused-utility": unusedUtilityRule,
};

export type TailwindRuleName = keyof typeof tailwindRules;
