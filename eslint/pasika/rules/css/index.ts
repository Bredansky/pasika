/**
 * All CSS rules for the global stylesheet checks.
 */
import { themeResetRule } from "./theme-reset.js";
import { rootVariablesRule } from "./root-variables.js";
import { applyUsageRule } from "./apply-usage.js";
import { baseLayerPairRule } from "./base-layer-pair.js";
import { stylesheetOrderingRule } from "./stylesheet-ordering.js";
import { cssVariableNamingRule } from "./css-variable-naming.js";
import { customUtilityApplyRule } from "./custom-utility-apply.js";
import { surfaceUtilityRule } from "./surface-utility.js";
import { themeVariableNamespaceRule } from "./theme-variable-namespace.js";
import { globalCssLocationRule } from "./global-css-location.js";

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
};

export type CssRuleName = keyof typeof cssRules;
