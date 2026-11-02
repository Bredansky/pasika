/**
 * ESLint rule: pasika/theme-mode
 *
 * Named appearance modes follow Tailwind's manually toggled dark-mode pattern:
 * data-theme selects the mode, @custom-variant exposes its utility prefix.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate } from "@eslint/css-tree";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { atrulesNamed, rules, walkNodes } from "./helpers";
import { MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const MODE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const MODE_REFERENCE = /(?:^|[^a-z0-9-])(?<name>[a-z][a-z0-9]*(?:-[a-z0-9]+)*):(?=[a-z[(])/gu;
const MODE_ATTRIBUTE = /data-theme\s*=\s*["'](?<name>[a-z][a-z0-9]*(?:-[a-z0-9]+)*)["']/gu;
const CUSTOM_REGISTRATION = /@custom-variant\s+(?<name>[a-z][a-z0-9-]*)\b(?<selector>[^;]*);/gu;
const SELECTOR_OVERRIDE =
  "Use a data-theme @custom-variant for mode-specific styles; direct [data-theme] selectors are not allowed.";
const CLASS_OVERRIDE = "Use the data-theme @custom-variant instead of a .dark CSS selector.";
const SYSTEM_OVERRIDE =
  "Use data-theme with @custom-variant for mode styling; resolve system preferences in application code, not a prefers-color-scheme CSS media query.";
const MODE_LOCATION = "Declare appearance-mode @custom-variant definitions in globals.css only.";
const MISSING_CSS_VARIANT = (name: string): string =>
  `CSS @variant "${name}" requires a matching @custom-variant declaration in globals.css.`;

function variantName(prelude: string): string | undefined {
  return /^(?<name>[a-z][a-z0-9-]*)\b/u.exec(prelude.trim())?.groups?.name;
}

function isModeVariant(name: string, prelude: string): boolean {
  return name === "dark" || name.startsWith("theme-") || /\[\s*data-theme\b/u.test(prelude);
}

function canonicalModePrelude(name: string, source: string): boolean {
  if (!MODE_NAME.test(name)) return false;
  const normalized = source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/["']/gu, "")
    .replace(/\s+/gu, "");
  return normalized === `${name}(&:where([data-theme=${name}],[data-theme=${name}]*))`;
}

export const themeModeRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require a single data-theme/@custom-variant strategy for appearance modes." },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const globalFile = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    if (path.dirname(current) !== path.dirname(globalFile)) return {};
    const read = cachedTextReader();

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const registered = new Set<string>();
        for (const variant of atrulesNamed(node, "custom-variant")) {
          if (variant.type !== "Atrule") continue;
          const prelude = variant.prelude ? generate(variant.prelude) : "";
          const name = variantName(prelude);
          if (!name) continue;
          if (!isModeVariant(name, prelude)) continue;
          if (current !== globalFile) {
            context.report({ node: variant, message: MODE_LOCATION });
            continue;
          }
          if (!canonicalModePrelude(name, prelude)) {
            const selected = /\[\s*data-theme\s*=\s*["']?(?<mode>[a-z][a-z0-9-]*)["']?\s*\]/u.exec(prelude)?.groups?.mode;
            context.report({
              node: variant,
              message:
                selected && selected !== name
                  ? `Theme variant "${name}" must be named "${selected}" to match its data-theme selector.`
                  : `Theme variant "${name}" must match both [data-theme="${name}"] and its descendants with &:where(...).`,
            });
          }
          if (registered.has(name)) {
            context.report({ node: variant, message: `Theme variant "${name}" is already defined in globals.css.` });
          }
          registered.add(name);
        }

        // A short variant name is a mode only when its selector or a source
        // data-theme attribute identifies it as one; built-in variants stay untouched.
        const modeHints = new Set<string>();
        for (const file of findFiles(sourceRoot, MODULE_EXTENSIONS)) {
          for (const match of read(file).matchAll(MODE_ATTRIBUTE)) {
            if (match.groups?.name) modeHints.add(match.groups.name);
          }
        }
        // CSS @variant references resolve against the named modes in globals.css.
        const globalRegistrations =
          current === globalFile
            ? registered
            : new Set(
                [
                  ...read(globalFile)
                    .replace(/\/\*[\s\S]*?\*\//gu, "")
                    .matchAll(CUSTOM_REGISTRATION),
                ].flatMap((match) => {
                  const name = match.groups?.name;
                  return name && isModeVariant(name, `${name}${match.groups?.selector ?? ""}`) ? [name] : [];
                }),
              );
        for (const variant of atrulesNamed(node, "variant")) {
          if (variant.type !== "Atrule" || !variant.prelude) continue;
          const name = variantName(generate(variant.prelude));
          if (
            name &&
            (name === "dark" || name.startsWith("theme-") || globalRegistrations.has(name) || modeHints.has(name)) &&
            !globalRegistrations.has(name)
          ) {
            context.report({ node: variant, message: MISSING_CSS_VARIANT(name) });
          }
        }

        for (const rule of rules(node)) {
          if (rule.type !== "Rule") continue;
          const selector = generate(rule.prelude);
          if (/\[\s*data-theme(?:\s*[~|^$*]?=|\s*\])/u.test(selector)) {
            context.report({ node: rule, message: SELECTOR_OVERRIDE });
          } else if (/\.dark(?![\w-])/u.test(selector)) {
            context.report({ node: rule, message: CLASS_OVERRIDE });
          }
        }

        walkNodes(node, (child) => {
          if (child.type !== "Atrule" || child.name !== "media" || !child.prelude) return;
          if (/\bprefers-color-scheme\b/u.test(generate(child.prelude))) {
            context.report({ node: child, message: SYSTEM_OVERRIDE });
          }
        });

        if (current !== globalFile) return;
        const referenced = new Set<string>();
        for (const file of findFiles(sourceRoot, MODULE_EXTENSIONS)) {
          for (const match of read(file).matchAll(MODE_REFERENCE)) {
            const name = match.groups?.name;
            if (name && (name === "dark" || name.startsWith("theme-") || registered.has(name) || modeHints.has(name))) {
              referenced.add(name);
            }
          }
        }
        for (const name of referenced) {
          if (!registered.has(name)) {
            context.report({
              node,
              message: `Theme utility prefix "${name}:" requires a matching @custom-variant in globals.css; Tailwind's default media-based dark mode is not allowed.`,
            });
          }
        }
      },
    };
  },
};
