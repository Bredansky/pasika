import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { unknownUtilityRule } from "./unknown-utility";

/**
 * The rule reads the src/ tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe. This fixture follows the framework's styling guide: the global
 * stylesheet resets Tailwind's default theme with `--*: initial`, so the
 * default tokens are dead and only the project's own theme counts.
 */
const GLOBALS = `@theme {
  --*: initial;
  --color-primary-canvas: #d87943;
  --color-primary-ink: #ffffff;
  --color-brand-500: #123456;
  --radius-card: 1rem;
  --font-display: "Inter", sans-serif;
  --text-sm: 0.875rem;
  --blur-sm: 8px;
  --animate-float: float 3s ease-in-out infinite;
  --ease-custom: cubic-bezier(0, 0, 0.2, 1);
  --aspect-video: 16 / 9;
}

@utility primary-surface {
  @apply bg-(--primary-canvas) text-(--primary-ink);
}
`;

const FIXTURE: Record<string, string> = {
  "globals.css": GLOBALS,
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unknown-utility-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const message = (className: string): string =>
  `Utility class "${className}" is not a custom @utility, a theme-generated utility, or a built-in Tailwind utility.`;

void describe("A utility class a component references MUST be a custom `@utility`, a theme-generated utility, or a built-in Tailwind utility.", () => {
  ruleTester.run("unknown-utility", unknownUtilityRule, {
    valid: [
      // Theme-generated utilities from the project's @theme.
      {
        code: '<button className="bg-primary-canvas text-primary-ink">Save</button>',
        filename: srcFile("shared/save-button.tsx"),
      },
      // Custom @utility.
      { code: '<div className="primary-surface" />', filename: srcFile("shared/card.tsx") },
      // Structural built-ins and unchecked prefixes survive the reset.
      { code: '<div className="flex items-center justify-between" />', filename: srcFile("shared/card.tsx") },
      // Variants leave the utility itself unchanged.
      { code: '<div className="hover:bg-primary-canvas sm:text-primary-ink" />', filename: srcFile("shared/card.tsx") },
      // Project tokens in the non-color namespaces.
      { code: '<div className="rounded-card font-display" />', filename: srcFile("shared/card.tsx") },
      // Font-size and value namespaces (text, animate, ease, aspect) come from the project's @theme.
      {
        code: '<div className="text-sm animate-float ease-custom aspect-video" />',
        filename: srcFile("shared/card.tsx"),
      }, // Built-in values and numeric scales that do not depend on theme tokens.
      {
        code: '<div className="border-2 border-x-2 divide-x divide-y-2 ring-inset outline-offset-2 decoration-2 stroke-2 from-primary-canvas to-t fill-none accent-auto" />',
        filename: srcFile("shared/card.tsx"),
      },
      // Compound prefixes keep their own namespace: ring-offset takes a color token.
      {
        code: '<div className="ring-offset-primary-canvas ring-offset-2 backdrop-blur-sm" />',
        filename: srcFile("shared/card.tsx"),
      },
      // Inside cn() helpers: plain strings, conditionals, and object keys.
      {
        code: 'cn("bg-primary-canvas", isActive && "text-primary-ink", { "border-2": active })',
        filename: srcFile("shared/card.tsx"),
      },
      // Parenthesized CSS-variable utilities and arbitrary values are not validated here.
      { code: '<div className="bg-(--primary-canvas)" />', filename: srcFile("shared/card.tsx") },
      { code: "<div className=\"bg-[url('/hero.png')]\" />", filename: srcFile("shared/hero.tsx") },
      // Dynamically built class names can't be validated; the fragments must not false-positive.
      // eslint-disable-next-line no-template-curly-in-string -- the code under test is itself a template literal
      { code: "<div className={`bg-${tone}-canvas`} />", filename: srcFile("shared/card.tsx") },
      { code: '<div className="sm:flex" />', filename: srcFile("shared/card.tsx") },
    ],
    invalid: [
      // A typo inside a theme token family.
      {
        code: '<div className="bg-primay-canvas" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-primay-canvas") }],
      },
      // A typo at the end of a theme token.
      {
        code: '<div className="text-primary-inkx" />',
        filename: srcFile("shared/label.tsx"),
        errors: [{ message: message("text-primary-inkx") }],
      },
      // A typo in a project radius token.
      {
        code: '<div className="rounded-cards" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("rounded-cards") }],
      },
      // A typo in a project font token.
      {
        code: '<div className="font-displa" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("font-displa") }],
      },
      // A default-family shade that does not exist.
      {
        code: '<div className="bg-red-6000" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-red-6000") }],
      },
      // A bare default family without a shade is not a Tailwind v4 utility.
      {
        code: '<div className="bg-red" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-red") }],
      },
      // A typo in a custom @utility name.
      {
        code: '<div className="primary-surfce" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("primary-surfce") }],
      },
      // A project family with a shade the project does not define.
      {
        code: '<div className="bg-brand-600" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-brand-600") }],
      },
      // A ring-offset color the project does not define is unknown, not `offset-background`.
      {
        code: '<div className="ring-offset-background" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("ring-offset-background") }],
      },
      // Font-size and value tokens the project did not re-declare after the reset are dead.
      {
        code: '<div className="text-2xl animate-chromatic ease-linear aspect-square" />',
        filename: srcFile("shared/card.tsx"),
        errors: [
          { message: message("text-2xl") },
          { message: message("animate-chromatic") },
          { message: message("ease-linear") },
          { message: message("aspect-square") },
        ],
      },
      // The default-theme reset disables Tailwind's defaults, so palette classes are dead too.
      {
        code: '<div className="bg-red-500" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-red-500") }],
      },
      {
        code: '<div className="text-white rounded-lg font-sans shadow-md" />',
        filename: srcFile("shared/card.tsx"),
        errors: [
          { message: message("text-white") },
          { message: message("rounded-lg") },
          { message: message("font-sans") },
          { message: message("shadow-md") },
        ],
      },
      {
        code: '<div className="from-sky-400 caret-black shadow-red-500" />',
        filename: srcFile("shared/card.tsx"),
        errors: [
          { message: message("from-sky-400") },
          { message: message("caret-black") },
          { message: message("shadow-red-500") },
        ],
      },
      // Inside cn() conditionals and behind variants.
      {
        code: 'cn("bg-primary-canvas", isActive && "bg-primay-canvas")',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-primay-canvas") }],
      },
      {
        code: '<div className="hover:bg-primay-canvas" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("hover:bg-primay-canvas") }],
      },
      // A valid class next to an invalid one reports only the invalid one.
      {
        code: '<div className="bg-primary-canvas bg-primay-canvas" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-primay-canvas") }],
      },
    ],
  });
});
