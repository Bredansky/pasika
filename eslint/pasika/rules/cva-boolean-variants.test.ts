import { describe, ruleTester, srcFile } from "../rule-tester";
import { cvaBooleanVariantsRule } from "./cva-boolean-variants";

const CVA_WITH_BOOLEAN = `const buttonVariants = cva("inline-flex", {
  variants: {
    size: { sm: "h-8 px-3", lg: "h-11 px-5" },
    elevated: { true: "shadow-md", false: "" },
  },
});`;

const CVA_WITH_COMPOUND = `const buttonVariants = cva("inline-flex", {
  variants: {
    size: { sm: "h-8 px-3", lg: "h-11 px-5" },
    square: { true: "justify-center", false: "justify-start" },
  },
  compoundVariants: [
    { size: "sm", square: true, className: "w-8 px-0" },
  ],
});`;

void describe("A boolean prop that changes appearance MUST use a CVA variant when both boolean values have explicit treatments or when the boolean participates in a compound variant.", () => {
  ruleTester.run("cva-boolean-variants", cvaBooleanVariantsRule, {
    valid: [
      {
        // Boolean variant in CVA, used via cva() call — correct
        code: `${CVA_WITH_BOOLEAN}\n<button className={cn(buttonVariants({ size, elevated }))} />`,
        filename: srcFile("shared/button.tsx"),
      },
      {
        // Boolean in cn() but NOT a CVA variant — standalone usage is fine
        code: `const buttonVariants = cva("inline-flex", { variants: { size: { sm: "h-8" } } });\n<button className={cn(buttonVariants({ size }), loading && "opacity-50")} />`,
        filename: srcFile("shared/button.tsx"),
      },
      {
        // No CVA at all — this rule doesn't apply
        code: '<button className={cn("rounded", active && "primary")} />',
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        // Boolean variant in both CVA and cn() — violation
        code: `${CVA_WITH_BOOLEAN}\n<button className={cn(buttonVariants({ size }), elevated && "shadow-md")} />`,
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
      {
        // Compound boolean also in cn() — violation
        code: `${CVA_WITH_COMPOUND}\n<button className={cn(buttonVariants({ size, square }), square && "justify-center")} />`,
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
    ],
  });
});

void describe("A boolean prop that changes appearance MUST use conditional cn() when it only adds or removes one standalone class treatment.", () => {
  ruleTester.run("cva-boolean-variants", cvaBooleanVariantsRule, {
    valid: [
      {
        // Standalone boolean in cn() — correct
        code: `const buttonVariants = cva("inline-flex");\n<button className={cn(buttonVariants({ size }), elevated && "shadow-md")} />`,
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        // Standalone boolean also in CVA with both true/false — violation
        code: `${CVA_WITH_BOOLEAN}\n<button className={cn(buttonVariants({ size }), elevated && "shadow-md")} />`,
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
    ],
  });
});
