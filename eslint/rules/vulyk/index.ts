/**
 * Vulyk rules: tracked-docs distribution checks. They run on package.json and
 * read the `vulyk.config.ts` and the generated agent files, so they need the
 * JSON language even though the concern is the vulyk workflow.
 */
import { vulykDocsRule } from "./vulyk-docs";

export const vulykRules = {
  "vulyk-docs": vulykDocsRule,
};

export type VulykRuleName = keyof typeof vulykRules;
