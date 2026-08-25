import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { enforceCvaVariantPropsRule } from "./enforce-cva-variant-props.js";

const CVA_DEFINITION = `const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: { sm: "h-8 px-3", lg: "h-11 px-5" },
  },
});`;

void describe("A component's variant prop types MUST be derived from its cva definition with VariantProps rather than manually duplicated unions.", () => {
  ruleTester.run("enforce-cva-variant-props", enforceCvaVariantPropsRule, {
    valid: [
      {
        code: `${CVA_DEFINITION}\ntype ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;`,
        filename: srcFile("shared/button.tsx"),
      },
      {
        // A union prop that is not a cva variant name is unrelated to the definition.
        code: `${CVA_DEFINITION}\ntype ButtonProps = { align: "start" | "end" };`,
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: `${CVA_DEFINITION}\ntype ButtonProps = { size?: "sm" | "lg" };`,
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
    ],
  });
});
