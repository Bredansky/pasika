/**
 * ESLint rule: pasika/config-extraction
 *
 * A type, schema, or utility used only to implement one configuration module
 * MUST be extracted even with one consumer. A configuration module is a
 * src/config/<name>/ folder with index.ts as its entry point, so any type or
 * schema still declared in a module file that is not a support file belongs in
 * the module's types/ or schemas/ folder — or, once a consumer outside the
 * module imports it, in the matching root support folder.
 *
 * @see docs/code-organization-guide/rules/configuration-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, symbolKey } from "../project/index";
import { describeConsumers, segmentsOf, SUPPORT_FOLDERS } from "../project/ccf";

export const configExtractionRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require config-only types and schemas to be extracted into the module's support folder.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    // A configuration module file: src/config/<name>/<file>. Support folders are
    // already the extraction destination, so they are not candidates.
    if (segments.length < 3 || segments[0] !== "config") return {};
    if (SUPPORT_FOLDERS.has(segments[2] ?? "")) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module) return {};

    const suspects = module.exports.filter((exp) => exp.kind === "type" || exp.kind === "schema");
    if (suspects.length === 0) return {};

    const findings: { line: number; message: string }[] = [];

    for (const exp of suspects) {
      const consumers = [...(index.symbolConsumers.get(symbolKey(file, exp.name)) ?? [])];
      const outsideConfig = consumers.filter((consumer) => segmentsOf(consumer, sourceRoot)[0] !== "config");

      if (outsideConfig.length > 0) {
        findings.push({
          line: exp.line,
          message:
            `${exp.kind} "${exp.name}" in a configuration module is imported by ` +
            `${describeConsumers(outsideConfig, sourceRoot)} outside src/config/. Move it to the ` +
            "matching root support folder. See docs/code-organization-guide/rules/configuration-rule.md",
        });
      } else if (consumers.length > 0) {
        findings.push({
          line: exp.line,
          message:
            `${exp.kind} "${exp.name}" is used only to implement this configuration module; ` +
            `extract it to the module's ${exp.kind === "schema" ? "schemas/" : "types/"} folder even with one consumer. ` +
            "See docs/code-organization-guide/rules/configuration-rule.md",
        });
      }
    }

    if (findings.length === 0) return {};

    return {
      Program(node) {
        for (const finding of findings) {
          context.report({ node, loc: { line: finding.line, column: 0 }, message: finding.message });
        }
      },
    };
  },
};
