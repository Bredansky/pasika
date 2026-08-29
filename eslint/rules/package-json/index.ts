/**
 * Package.json rules: checks on the package.json manifest itself. Any
 * repository, including pasika itself, should follow the framework-agnostic
 * subset (`repoPackageJsonRules`); `nextjs-stack` is specific to a Next.js
 * (or React) application.
 */
import { exactVersionRule } from "./exact-version";
import { noVulykDependencyRule } from "./no-vulyk-dependency";
import { nextjsStackRule } from "./nextjs-stack";

/** Framework-agnostic package.json rules any repository should follow. */
export const repoPackageJsonRules = {
  "no-vulyk-dependency": noVulykDependencyRule,
  "exact-version": exactVersionRule,
};

/** Package.json rules specific to a Next.js (or React) application. */
export const nextPackageJsonRules = {
  "nextjs-stack": nextjsStackRule,
};

export type RepoPackageJsonRuleName = keyof typeof repoPackageJsonRules;
export type NextPackageJsonRuleName = keyof typeof nextPackageJsonRules;
