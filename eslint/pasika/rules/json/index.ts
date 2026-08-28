/**
 * All JSON rules for the package.json checks.
 */
import { noVulykDependencyRule } from "./no-vulyk-dependency";
import { zirkaInstalledRule } from "./zirka-installed";

export const jsonRules = {
  "no-vulyk-dependency": noVulykDependencyRule,
  "zirka-installed": zirkaInstalledRule,
};

export type JsonRuleName = keyof typeof jsonRules;
