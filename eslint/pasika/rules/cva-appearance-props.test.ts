import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { cvaAppearancePropsRule } from "./cva-appearance-props.js";

const CVA_DEFINITION = `const buttonVariants = cva("inline-flex items-center", {
  variants: {
    size: { sm: "h-8 px-3", lg: "h-11 px-5" },
  },
});`;

void describe("A component that lets callers choose visual options MUST define them with cva.", () => {
  ruleTester.run("cva-appearance-props", cvaAppearancePropsRule, {
    valid: [
      {
        // cva definition present in the same file
        code: `${CVA_DEFINITION}\ntype ButtonProps = { size?: "sm" | "lg" };`,
        filename: srcFile("shared/button.tsx"),
      },
      {
        // non-visual prop is not affected
        code: "type FooProps = { label?: string; disabled?: boolean };",
        filename: srcFile("shared/foo.tsx"),
      },
      {
        // VariantProps derived correctly
        code: `${CVA_DEFINITION}\ntype ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;`,
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: 'type ButtonProps = { size?: "sm" | "lg" };',
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
      {
        code: 'type CardProps = { variant?: "outlined" | "filled"; tone?: "subtle" | "strong" };',
        filename: srcFile("shared/card.tsx"),
        errors: 2,
      },
    ],
  });
});
