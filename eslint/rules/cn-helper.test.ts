import { describe, ruleTester } from "../rule-tester";
import { cnHelperRule } from "./cn-helper";

const DOC = "See docs/pasika-adoption-guide/rules/cn-helper-rule.md";
const BUTTON = "src/features/ui/button.tsx";

void describe("A file that merges class names MUST import cn from pasika/cn.", () => {
  ruleTester.run("cn-helper", cnHelperRule, {
    valid: [
      {
        filename: BUTTON,
        code: 'import { cn } from "pasika/cn";\n\nexport function Button({ className }: ButtonProps) {\n  return <button className={cn("px-2 py-1", className)} />;\n}',
      },
      {
        // A re-export of the package entry hands the same merge on.
        filename: "src/features/ui/index.ts",
        code: 'export { cn } from "pasika/cn";',
      },
      {
        filename: "src/utils/format-date.ts",
        code: "export function formatDate(value: Date): string { return value.toISOString(); }",
      },
    ],
    invalid: [
      {
        // The repository's own module: a merge that stops receiving the framework's fixes.
        filename: BUTTON,
        code: 'import { cn } from "@/utils/cn";\n\nexport function Button({ className }: ButtonProps) {\n  return <button className={cn("px-2 py-1", className)} />;\n}',
        errors: [{ message: `cn must be imported from pasika/cn. ${DOC}` }],
      },
      {
        // A rename binds the helper's name to a package's own function.
        filename: BUTTON,
        code: 'import { twMerge as cn } from "tailwind-merge";',
        errors: [{ message: `cn must be imported from pasika/cn. ${DOC}` }],
      },
      {
        filename: "src/features/ui/index.ts",
        code: 'export { cn } from "clsx";',
        errors: [{ message: `cn must be imported from pasika/cn. ${DOC}` }],
      },
    ],
  });
});

void describe("A file MUST NOT declare a cn of its own.", () => {
  ruleTester.run("cn-helper", cnHelperRule, {
    valid: [{ filename: BUTTON, code: 'import { cn } from "pasika/cn";' }],
    invalid: [
      {
        filename: "src/utils/cn.ts",
        code: 'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]): string {\n  return twMerge(clsx(inputs));\n}',
        errors: [{ message: `A file must not declare its own cn; import it from pasika/cn. ${DOC}` }],
      },
      {
        filename: "src/features/ui/button.tsx",
        code: "export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));",
        errors: [{ message: `A file must not declare its own cn; import it from pasika/cn. ${DOC}` }],
      },
    ],
  });
});
