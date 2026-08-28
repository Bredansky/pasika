/**
 * ESLint rule: pasika/type-extraction
 *
 * A type or schema declared in a component MUST stay in that component file
 * until another file imports it without the component where it is defined, and
 * a type or schema declared outside a component MUST stay in its file until
 * another file needs it without using the code in that file. Importing the
 * type alongside the component that defines it never requires extraction.
 *
 * @see docs/code-organization-guide/rules/types-and-schemas-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, symbolKey } from "../project/index";
import { describeConsumers, segmentsOf } from "../project/ccf";

export const typeExtractionRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a type or schema imported without its defining code to be extracted.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module) return {};

    const componentExport = module.exports.find((exp) => exp.kind === "component");
    // The code a consumer can use from this file besides types: hooks,
    // schemas, constants, and functions.
    const codeExports = module.exports.filter((exp) => exp.kind !== "type" && exp.kind !== "other");

    const findings: { line: number; message: string }[] = [];

    for (const exp of module.exports) {
      if (exp.kind !== "type" && exp.kind !== "schema") continue;

      const consumers = [...(index.symbolConsumers.get(symbolKey(file, exp.name)) ?? [])];
      if (consumers.length === 0) continue;

      if (componentExport) {
        // A consumer that also imports the component uses the code alongside
        // the type, so extraction is not required.
        const componentConsumers = index.symbolConsumers.get(symbolKey(file, componentExport.name)) ?? new Set();
        const independent = consumers.filter((consumer) => !componentConsumers.has(consumer));
        if (independent.length === 0) continue;
        findings.push({
          line: exp.line,
          message:
            `${exp.kind} "${exp.name}" is imported by ${describeConsumers(independent, sourceRoot)} without ` +
            `the component "${componentExport.name}" that defines it. Extract it to a types/ or schemas/ folder. ` +
            "See docs/code-organization-guide/rules/types-and-schemas-rule.md",
        });
        continue;
      }

      if (codeExports.length === 0) continue;
      // A consumer that imports any other code from this file uses the file as
      // a whole; one that takes only the type needs it independently.
      const independent = consumers.filter(
        (consumer) =>
          !codeExports.some((other) => index.symbolConsumers.get(symbolKey(file, other.name))?.has(consumer)),
      );
      if (independent.length === 0) continue;
      findings.push({
        line: exp.line,
        message:
          `${exp.kind} "${exp.name}" is imported by ${describeConsumers(independent, sourceRoot)} without using ` +
          "the code in this file. Extract it to a types/ or schemas/ folder. " +
          "See docs/code-organization-guide/rules/types-and-schemas-rule.md",
      });
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
