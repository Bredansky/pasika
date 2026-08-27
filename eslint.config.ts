import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  pasika: RuleSeverity.Error,
  ignores: ["dist/**", "node_modules/**", "README.md", "MILESTONES.md"],
});

export default eslintConfig;
