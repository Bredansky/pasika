/**
 * All Tailwind stylesheet rules (Tailwind v4 src/app/styles/globals.css).
 */
import { applyUsageRule } from "./apply-usage";
import { atRuleSpacingRule } from "./at-rule-spacing";
import { baseLayerPairRule } from "./base-layer-pair";
import { colorLiteralUsageRule } from "./color-literal-usage";
import { colorRoleUsageRule } from "./color-role-usage";
import { cssEntryPointRule } from "./css-entry-point";
import { customUtilityApplyRule } from "./custom-utility-apply";
import { featureCssPlacementRule } from "./feature-css-placement";
import { globalStylesheetRule } from "./global-stylesheet";
import { noAttributeSelectorRule } from "./no-attribute-selector";
import { noSimpleClassRule } from "./no-simple-class-rule";
import { noUtilityAliasRule } from "./no-utility-alias";
import { rootVariablesRule } from "./root-variables";
import { stylesheetOrderingRule } from "./stylesheet-ordering";
import { themeModeRule } from "./theme-mode";
import { themeResetRule } from "./theme-reset";
import { themeTokenOrderRule } from "./theme-token-order";
import { uniqueCssDefinitionRule } from "./unique-css-definition";
import { uniqueCssTokenValueRule } from "./unique-css-token-value";
import { unusedCssDefinitionRule } from "./unused-css-definition";
import { utilityMappingRule } from "./utility-mapping";
import { utilityNameParityRule } from "./utility-name-parity";

export const tailwindRules = {
  "at-rule-spacing": atRuleSpacingRule,
  "theme-reset": themeResetRule,
  "theme-token-order": themeTokenOrderRule,
  "theme-mode": themeModeRule,
  "color-role-usage": colorRoleUsageRule,
  "color-literal-usage": colorLiteralUsageRule,
  "root-variables": rootVariablesRule,
  "apply-usage": applyUsageRule,
  "base-layer-pair": baseLayerPairRule,
  "stylesheet-ordering": stylesheetOrderingRule,
  "custom-utility-apply": customUtilityApplyRule,
  "utility-mapping": utilityMappingRule,
  "utility-name-parity": utilityNameParityRule,
  "css-entry-point": cssEntryPointRule,
  "feature-css-placement": featureCssPlacementRule,
  "global-stylesheet": globalStylesheetRule,
  "unused-css-definition": unusedCssDefinitionRule,
  "unique-css-definition": uniqueCssDefinitionRule,
  "unique-css-token-value": uniqueCssTokenValueRule,
  "no-attribute-selector": noAttributeSelectorRule,
  "no-simple-class-rule": noSimpleClassRule,
  "no-utility-alias": noUtilityAliasRule,
};

export type TailwindRuleName = keyof typeof tailwindRules;
