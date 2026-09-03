/**
 * Husky rules: repository git-hook hygiene checks. They read the `.husky/`
 * hook scripts and the `prepare` script, so they need the JSON language even
 * though the concern is git-hook setup, not the package.json manifest itself.
 */
import { huskyHookRule } from "./husky-hook";

export const huskyRules = {
  "husky-hook": huskyHookRule,
};

export type HuskyRuleName = keyof typeof huskyRules;
