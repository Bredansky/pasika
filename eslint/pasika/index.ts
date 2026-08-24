import type { Linter } from "eslint";
import { filenameCaseRule } from "./rules/filename-case.js";
import { organizationImportsRule } from "./rules/organization-imports.js";

export const pasikaConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: {
      rules: {
        "filename-case": filenameCaseRule,
        "organization-imports": organizationImportsRule,
      },
    },
  },
  rules: {
    "pasika/filename-case": "error",
    "pasika/organization-imports": "error",
  },
};
