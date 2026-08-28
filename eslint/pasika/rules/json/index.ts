/**
 * All JSON rules for the package.json checks.
 */
import { noVulykDependencyRule } from "./no-vulyk-dependency";

export const jsonRules = {
  "no-vulyk-dependency": noVulykDependencyRule,
};

export type JsonRuleName = keyof typeof jsonRules;
