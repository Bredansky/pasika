/**
 * All JSON rules for the package.json checks.
 */
import { noCacheFlagRule } from "./no-cache-flag";
import { noVulykDependencyRule } from "./no-vulyk-dependency";

export const jsonRules = {
  "no-cache-flag": noCacheFlagRule,
  "no-vulyk-dependency": noVulykDependencyRule,
};

export type JsonRuleName = keyof typeof jsonRules;
