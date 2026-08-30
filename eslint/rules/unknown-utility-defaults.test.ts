import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { unknownUtilityRule } from "./unknown-utility";

/**
 * A repository that has not adopted the framework's default-theme reset yet
 * keeps Tailwind's built-in defaults: `bg-red-500`, `rounded-lg`, and the
 * rest are generated, so the rule must not flag them. Node runs each test
 * file in its own process, which makes the `chdir` below safe.
 */
const GLOBALS = `@theme {
  --color-primary-canvas: #d87943;
  --animate-float: float 3s ease-in-out infinite;
  --ease-custom: cubic-bezier(0, 0, 0.2, 1);
  --aspect-video: 16 / 9;
}
`;

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unknown-utility-defaults-")));
const globalsPath = path.join(root, "src", "globals.css");
mkdirSync(path.dirname(globalsPath), { recursive: true });
writeFileSync(globalsPath, GLOBALS);
process.chdir(root);

const message = (className: string): string =>
  `Utility class "${className}" is not a custom @utility, a theme-generated utility, or a built-in Tailwind utility.`;

void describe("Without a default-theme reset, Tailwind's built-in defaults are valid utilities.", () => {
  ruleTester.run("unknown-utility", unknownUtilityRule, {
    valid: [
      // The default palette, the color specials, and default tokens per namespace.
      {
        code: '<div className="bg-red-500 text-white rounded-lg font-sans tracking-wide leading-relaxed opacity-50 z-10 blur-sm shadow-md" />',
        filename: srcFile("shared/card.tsx"),
      },
      // Palette colors through the color-consuming prefixes.
      {
        code: '<div className="from-sky-400 caret-black shadow-red-500 border-red-500 text-primary-canvas" />',
        filename: srcFile("shared/card.tsx"),
      },
      // Font-size and value namespaces fall back to the defaults when the project did not reset them.
      {
        code: '<div className="text-2xl animate-pulse ease-out aspect-square" />',
        filename: srcFile("shared/card.tsx"),
      },
    ],
    invalid: [
      // Typos are still caught even with the defaults alive.
      {
        code: '<div className="bg-primay-canvas" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-primay-canvas") }],
      },
      {
        code: '<div className="bg-red-6000" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-red-6000") }],
      },
      // Project namespaces without a matching token or default are still unknown.
      {
        code: '<div className="animate-chromatic ease-wacky" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("animate-chromatic") }, { message: message("ease-wacky") }],
      },
    ],
  });
});
