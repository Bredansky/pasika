import { describe, ruleTester, srcFile } from "../rule-tester";
import { cnHelperRule } from "./cn-helper";

void describe("A repository MUST define its cn helper by merging clsx and tailwind-merge.", () => {
  ruleTester.run("cn-helper", cnHelperRule, {
    valid: [
      {
        filename: srcFile("utils/cn.ts"),
        code: `import { clsx } from "clsx"; import { twMerge } from "tailwind-merge"; export function cn(...inputs) { return twMerge(clsx(inputs)); }`,
      },
      {
        filename: srcFile("utils/cn.ts"),
        code: `import { clsx, type ClassValue } from "clsx"; import { twMerge } from "tailwind-merge"; export const cn = (...inputs) => twMerge(clsx(inputs));`,
      },
    ],
    invalid: [
      {
        // No tailwind-merge
        filename: srcFile("utils/cn.ts"),
        code: `import { clsx } from "clsx"; export const cn = (...inputs) => clsx(inputs);`,
        errors: [{ message: "cn must be built from clsx and tailwind-merge (e.g. cn = twMerge(clsx(inputs)))." }],
      },
      {
        // No clsx
        filename: srcFile("utils/cn.ts"),
        code: `import { twMerge } from "tailwind-merge"; export const cn = (...inputs) => twMerge(inputs);`,
        errors: [{ message: "cn must be built from clsx and tailwind-merge (e.g. cn = twMerge(clsx(inputs)))." }],
      },
    ],
  });
});