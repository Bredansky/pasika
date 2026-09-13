/**
 * Vulyk rules: tracked-docs distribution checks. They run on package.json and
 * read the `vulyk.config.ts` and the generated agent files, so they need the
 * JSON language even though the concern is the vulyk workflow.
 */
import { trackedDocsRule } from "./tracked-docs";
import { vulykDependencyRule } from "./vulyk-dependency";

export const vulykRules = {
  "vulyk-dependency": vulykDependencyRule,
  "tracked-docs": trackedDocsRule,
};

export type VulykRuleName = keyof typeof vulykRules;
