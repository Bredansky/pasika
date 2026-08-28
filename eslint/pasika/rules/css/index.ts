/**
 * All CSS rules for the global stylesheet checks.
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
import { globalCssLocationRule } from "./global-css-location";
import { globalStylesheetRule } from "./global-stylesheet";

export const cssRules = {
  "theme-reset": themeResetRule,
  "root-variables": rootVariablesRule,
  "apply-usage": applyUsageRule,
  "base-layer-pair": baseLayerPairRule,
  "stylesheet-ordering": stylesheetOrderingRule,
  "css-variable-naming": cssVariableNamingRule,
  "custom-utility-apply": customUtilityApplyRule,
  "surface-utility": surfaceUtilityRule,
  "theme-variable-namespace": themeVariableNamespaceRule,
  "global-css-location": globalCssLocationRule,
  "global-stylesheet": globalStylesheetRule,
};

export type CssRuleName = keyof typeof cssRules;
