import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { preferEnumRule } from "./prefer-enum";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-prefer-enum-cva-")));
process.chdir(root);

const file = (name: string): string => path.join(root, "src", name);

void describe("Known, fixed sets of two or more related string or numeric values MUST use a shared TypeScript `enum`, even if each value appears only once.", () => {
  ruleTester.run("prefer-enum CVA choices", preferEnumRule, {
    valid: [
      {
        filename: file("shared/button.tsx"),
        code: 'enum ButtonTone { Primary = "primary", Secondary = "secondary" } const styles = cva("", { variants: { tone: { [ButtonTone.Primary]: "bg-primary", [ButtonTone.Secondary]: "bg-muted" } }, defaultVariants: { tone: ButtonTone.Primary } });',
      },
      {
        filename: file("shared/boolean-button.tsx"),
        code: 'const styles = cva("", { variants: { enabled: { true: "opacity-100", false: "opacity-0" } } });',
      },
      {
        filename: file("shared/single-option.tsx"),
        code: 'const styles = cva("", { variants: { tone: { primary: "bg-primary" } } });',
      },
      {
        filename: file("shared/dynamic.tsx"),
        code: 'const dynamicTone = getTone(); const styles = cva("", { variants: { tone: { [dynamicTone]: "bg-dynamic", secondary: "bg-muted" } } });',
      },
      {
        filename: file("shared/spread.tsx"),
        code: 'const styles = cva("", { variants: { tone: { ...sharedStyles, primary: "bg-primary", secondary: "bg-muted" } } });',
      },
      {
        filename: file("shared/ordinary-object.tsx"),
        code: 'const metadata = { tone: { primary: "bg-primary", secondary: "bg-muted" } };',
      },
      {
        filename: file("shared/compound.tsx"),
        code: 'const styles = cva("", { compoundVariants: [{ tone: "primary", className: "bg-primary" }, { tone: "secondary", className: "bg-muted" }] });',
      },
    ],
    invalid: [
      {
        filename: file("shared/raw-choices.tsx"),
        code: 'const styles = cva("", { variants: { tone: { primary: "bg-primary", secondary: "bg-muted" } } });',
        errors: [
          { message: /named CVA choice in a fixed set must use a TypeScript enum member/ },
          { message: /named CVA choice in a fixed set must use a TypeScript enum member/ },
        ],
      },
      {
        filename: file("shared/mixed-choices.tsx"),
        code: 'enum ButtonTone { Primary = "primary", Secondary = "secondary" } const styles = cva("", { variants: { tone: { [ButtonTone.Primary]: "bg-primary", secondary: "bg-muted" } } });',
        errors: [{ message: /named CVA choice in a fixed set must use a TypeScript enum member/ }],
      },
      {
        filename: file("shared/independent-dimensions.tsx"),
        code: 'const styles = cva("", { variants: { size: { sm: "h-8", lg: "h-12" }, enabled: { true: "opacity-100", false: "opacity-0" } } });',
        errors: [
          { message: /named CVA choice in a fixed set must use a TypeScript enum member/ },
          { message: /named CVA choice in a fixed set must use a TypeScript enum member/ },
        ],
      },
    ],
  });
});
