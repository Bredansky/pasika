import type { Linter } from "eslint";
import { organizationImportsRule } from "./rules/organization-imports.js";

export const pasikaConfig: Linter.Config = {
  files: ["src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"],
  plugins: {
    pasika: {
      rules: {
        "organization-imports": organizationImportsRule,
      },
    },
  },
  rules: {
    "pasika/organization-imports": "error",
  },
};
