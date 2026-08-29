import { describe, packageJsonRuleTester } from "./rule-tester";
import { nextjsStackRule, NEXTJS_STACK_DEPENDENCIES, NEXTJS_STACK_DEV_DEPENDENCIES } from "./nextjs-stack";

function completePackage(): Record<string, Record<string, string>> {
  return {
    dependencies: Object.fromEntries(NEXTJS_STACK_DEPENDENCIES.map((pkg) => [pkg, "^1.0.0"])),
    devDependencies: Object.fromEntries(NEXTJS_STACK_DEV_DEPENDENCIES.map((pkg) => [pkg, "^1.0.0"])),
  };
}

void describe("A repository adopting the framework MUST list next, react, react-dom, zod, class-variance-authority, clsx, and tailwind-merge as a dependency in package.json.", () => {
  packageJsonRuleTester.run("nextjs-stack", nextjsStackRule, {
    valid: [{ code: JSON.stringify(completePackage()) }],
    invalid: [
      {
        code: JSON.stringify({ name: "my-app" }),
        errors: [
          ...NEXTJS_STACK_DEPENDENCIES.map((pkg) => ({
            message: `${pkg} must be listed in package.json as a dependency.`,
          })),
          ...NEXTJS_STACK_DEV_DEPENDENCIES.map((pkg) => ({
            message: `${pkg} must be listed in package.json as a devDependency.`,
          })),
        ],
      },
      {
        // Only one dependency missing
        code: JSON.stringify(completePackage()).replace(',"zod":"^1.0.0"', ""),
        errors: [{ message: "zod must be listed in package.json as a dependency." }],
      },
    ],
  });
});

void describe("A repository adopting the framework MUST list typescript, tailwindcss, eslint, prettier, husky, lint-staged, and zirka as a devDependency in package.json.", () => {
  packageJsonRuleTester.run("nextjs-stack", nextjsStackRule, {
    valid: [{ code: JSON.stringify(completePackage()) }],
    invalid: [
      {
        // Only one devDependency missing
        code: JSON.stringify(completePackage()).replace(',"zirka":"^1.0.0"', ""),
        errors: [{ message: "zirka must be listed in package.json as a devDependency." }],
      },
      {
        // A dependency listed as devDependency instead of dependency
        code: JSON.stringify({
          dependencies: Object.fromEntries(
            NEXTJS_STACK_DEPENDENCIES.filter((pkg) => pkg !== "next").map((pkg) => [pkg, "^1.0.0"]),
          ),
          devDependencies: {
            ...Object.fromEntries(NEXTJS_STACK_DEV_DEPENDENCIES.map((pkg) => [pkg, "^1.0.0"])),
            next: "^15.0.0",
          },
        }),
        errors: [{ message: "next must be listed in package.json as a dependency." }],
      },
    ],
  });
});
