import { describe, packageJsonRuleTester } from "./rule-tester";
import { techStackRule } from "./tech-stack";

const REQUIRED = [
  "next",
  "react",
  "react-dom",
  "typescript",
  "tailwindcss",
  "zod",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "eslint",
  "prettier",
  "husky",
  "lint-staged",
  "zirka",
];

function completePackage(): Record<string, Record<string, string>> {
  return {
    dependencies: {
      next: "^15.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    },
    devDependencies: Object.fromEntries(REQUIRED.filter((p) => !["next", "react", "react-dom"].includes(p)).map((r) => [r, "^1.0.0"])),
  };
}

void describe(
  "A repository adopting the framework MUST list every package the Tech Stack Reference names as a dependency or devDependency in package.json.",
  () => {
    packageJsonRuleTester.run("tech-stack", techStackRule, {
      valid: [{ code: JSON.stringify(completePackage()) }],
      invalid: [
        {
          code: JSON.stringify({ name: "my-app" }),
          errors: REQUIRED.map(
            (pkg) => ({ message: `${pkg} must be listed in package.json as a dependency or devDependency.` }),
          ),
        },
        {
          // Remove only zirka
          code: JSON.stringify(completePackage(), null, 0).replace(
            ',"zirka":"^1.0.0"',
            "",
          ),
          errors: [{ message: "zirka must be listed in package.json as a dependency or devDependency." }],
        },
      ],
    });
  },
);