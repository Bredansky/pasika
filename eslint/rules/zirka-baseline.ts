/**
 * ESLint rule: pasika/zirka-baseline
 *
 * The repository's toolchain configuration MUST come from zirka, not from
 * rules restated locally. This rule runs on the eslint config file itself and
 * verifies that it imports zirka, that tsconfig.json extends zirka's
 * TypeScript base config, and that a prettier config references zirka.
 *
 * @see docs/framework-adoption-guide/rules/zirka-baseline-rule.md
 */

import fs from "node:fs";
import path from "node:path";
import type { Rule, SourceCode } from "eslint";

const ESLINT_CONFIG = /^eslint\.config\.(?:ts|mts|cts|js|mjs|cjs)$/;

const PRETTIER_CONFIGS = [
  "prettier.config.mjs",
  "prettier.config.cjs",
  "prettier.config.js",
  "prettier.config.ts",
  "prettier.config.mts",
  "prettier.config.cts",
] as const;

export const zirkaBaselineRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require eslint, prettier, and TypeScript configuration to come from zirka.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const basename = path.basename(filename);

    // Only run on eslint config files.
    if (!ESLINT_CONFIG.test(basename)) return {};

    const projectRoot = path.dirname(filename);
    const report = (message: string): void => {
      context.report({
        node: context.sourceCode.ast,
        loc: { line: 1, column: 0 },
        message,
      });
    };

    return {
      Program() {
        // The eslint config itself must take its configuration from zirka.
        if (!referencesZirka(context.sourceCode)) {
          report(
            'ESLint config must take its configuration from zirka (import { styleguide } from "zirka") instead of restating rules locally.',
          );
        }

        // tsconfig.json must exist and extend zirka's TypeScript base config.
        const tsconfigPath = path.join(projectRoot, "tsconfig.json");
        if (!fs.existsSync(tsconfigPath)) {
          report('No tsconfig.json found. Create one extending the zirka TypeScript base config ("zirka/typescript").');
        } else {
          let extendsValue: unknown;
          try {
            const parsed: unknown = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
            extendsValue =
              typeof parsed === "object" && parsed !== null && "extends" in parsed ? parsed.extends : undefined;
          } catch {
            report(
              'tsconfig.json must be valid JSON and extend the zirka TypeScript base config ("zirka/typescript").',
            );
            return;
          }
          if (typeof extendsValue !== "string" || !extendsValue.startsWith("zirka")) {
            report('tsconfig.json must extend the zirka TypeScript base config ("zirka/typescript").');
          }
        }

        // A prettier config must exist and take its configuration from zirka.
        const prettierConfigFile = PRETTIER_CONFIGS.find((name) => fs.existsSync(path.join(projectRoot, name)));
        if (!prettierConfigFile) {
          report(
            "No prettier config found. Create one that takes its configuration from zirka (styleguide({ prettier: true }).prettierConfig).",
          );
        } else {
          const content = fs.readFileSync(path.join(projectRoot, prettierConfigFile), "utf8");
          if (!content.includes("zirka")) {
            report(
              "The prettier config must take its configuration from zirka (styleguide({ prettier: true }).prettierConfig) instead of restating it locally.",
            );
          }
        }
      },
    };
  },
};

/** True when the file imports or requires zirka at the top level. */
function referencesZirka(sourceCode: SourceCode): boolean {
  for (const statement of sourceCode.ast.body) {
    if (
      statement.type === "ImportDeclaration" &&
      typeof statement.source.value === "string" &&
      statement.source.value.startsWith("zirka")
    ) {
      return true;
    }
  }
  return /require\(\s*["']zirka["']\s*\)/.test(sourceCode.getText());
}
