import { describe, ruleTester, srcFile } from "../rule-tester";
import { noCvaVariantForwardingRule } from "./no-cva-variant-forwarding";

void describe("A CVA option MUST NOT forward an identically named style map when it serves no other purpose.", () => {
  ruleTester.run("no-cva-variant-forwarding", noCvaVariantForwardingRule, {
    valid: [
      {
        filename: srcFile("shared/button.tsx"),
        code: `const primary = "bg-primary";
const secondary = "bg-secondary";
const buttonVariants = cva("", { variants: { variant: { primary, secondary } } });`,
      },
      {
        // Independent use gives the map a real purpose.
        filename: srcFile("shared/button.tsx"),
        code: `const { primary, secondary } = styles;
const buttonVariants = cva("", { variants: { variant: { primary, secondary } } });
const preview = primary;`,
      },
      {
        // A semantic mapping between differently named choices is not identity forwarding.
        filename: srcFile("shared/button.tsx"),
        code: `const { primary: surface, secondary: muted } = styles;
const buttonVariants = cva("", { variants: { tone: { active: surface, quiet: muted } } });`,
      },
      {
        // The map is used elsewhere than the CVA, so it is not redundant.
        filename: srcFile("shared/button.tsx"),
        code: `const styles = { primary: "a", secondary: "b" };
const buttonVariants = cva("", { variants: { tone: { primary: styles.primary, secondary: styles.secondary } } });
console.log(styles.primary);`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const buttonVariants = cva("", { variants: { tone: { primary: "a", secondary: "b" } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const { primary } = styles;
const buttonVariants = cva("", { variants: { tone: { primary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const { primary, ...rest } = styles;
const buttonVariants = cva("", { variants: { tone: { primary, secondary: rest.secondary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const { ["primary"]: primary, secondary } = styles;
const buttonVariants = cva("", { variants: { tone: { primary, secondary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const styles = { primary: "bg-primary" };
const buttonVariants = cva("", { variants: { tone: { primary: styles.primary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const styles = { primary: "bg-primary", ...extra };
const buttonVariants = cva("", { variants: { tone: { primary: styles.primary, secondary: styles.secondary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const styles = { ["primary"]: "bg-primary", secondary: "bg-secondary" };
const buttonVariants = cva("", { variants: { tone: { primary: styles.primary, secondary: styles.secondary } } });`,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const { primary, secondary } = styles;
const variants = cva("", { variants: { tone: { primary: styles.primary, secondary } } });`,
      },
    ],
    invalid: [
      {
        // Matches the real RetroButton pattern: external map -> destructure -> CVA.
        filename: srcFile("shared/button.tsx"),
        code: `import { retroButtonBackgroundClassNames } from "@/constants";
const { primary, secondary, outline, ghost, link } = retroButtonBackgroundClassNames;
const buttonVariants = cva("", { variants: { variant: {
  primary: cn(primary, "border-4"),
  secondary: cn(secondary, "border-2"),
  outline: cn(outline, "border-2"),
  ghost: cn(ghost, "opacity-70"),
  link: cn(link, "underline"),
} } });`,
        errors: [{ message: /only forwards identically named style keys/ }],
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const { sm, md, lg } = retroButtonHeightClassNames;
const variants = cva("", { variants: { size: { sm, md, lg } } });`,
        errors: 1,
      },
      {
        filename: srcFile("shared/button.tsx"),
        code: `const styles = { primary: "bg-primary", secondary: "bg-secondary" };
const buttonVariants = cva("", { variants: { tone: {
  primary: cn(styles.primary, "border-2"), secondary: cn(styles.secondary, "border-4")
} } });`,
        errors: 1,
      },
    ],
  });
});
