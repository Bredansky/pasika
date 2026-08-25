import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**"],
  additionalConfigs: [
    {
      // The CLI reports to the terminal, so writing to stdout is its purpose.
      files: ["cli/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
});

export default eslintConfig;
