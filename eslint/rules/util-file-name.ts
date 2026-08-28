import path from "node:path";
import type { Rule } from "eslint";
import { parseModule } from "../project/parse-module";

function toKebabCase(value: string): string {
  return value
    .replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/g, "$<lower>-$<upper>")
    .replace(/(?<first>[A-Z])(?<rest>[A-Z][a-z])/g, "$<first>-$<rest>")
    .toLowerCase();
}

export const utilFileNameRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require single-function utility files to use the function's kebab-case name.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const segments = filename.replace(/\\/g, "/").split("/");
    if (!segments.includes("utils")) return {};

    let module;
    try {
      module = parseModule(filename);
    } catch {
      return {};
    }
    const functions = module.exports.filter((entry) => entry.kind === "function");
    if (functions.length !== 1 || module.exports.length !== 1) return {};

    const functionName = functions[0]?.name;
    if (!functionName) return {};
    const expected = toKebabCase(functionName);
    const actual = path.basename(filename, path.extname(filename));
    if (!expected || actual === expected) return {};

    return {
      Program(node) {
        context.report({
          node,
          message: `A utility file exporting ${functionName} must be named ${expected}.${path.extname(filename).slice(1)}.`,
        });
      },
    };
  },
};
