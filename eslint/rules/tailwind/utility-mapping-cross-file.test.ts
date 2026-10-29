import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityMappingRule } from "./utility-mapping";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-utility-cross-file-")));
const styles = path.join(root, "src/app/styles");
mkdirSync(styles, { recursive: true });
writeFileSync(
  path.join(styles, "tokens.css"),
  `:root { --rainbow-gradient: linear-gradient(red, blue); --background-image-rainbow-gradient: var(--rainbow-gradient); }
@theme { --radius-existing: 12px; --color-primary-canvas: #123456; }
@theme inline { --background-image-rainbow-gradient: var(--background-image-rainbow-gradient); }`,
);
const cases = {
  "radius.css": "@utility rounded-card { @apply [border-radius:12px]; }",
  "color.css": "@utility bg-brand-canvas { @apply [background-color:#123456]; }",
  "other.css": "@utility p-card { @apply [padding:12px]; }",
  "gradient.css": "@utility bg-rainbow-gradient { @apply [background-image:var(--rainbow-gradient)]; }",
  "selector.css": ".rainbow-surface { background-image: var(--rainbow-gradient); }",
};
for (const [name, content] of Object.entries(cases)) writeFileSync(path.join(styles, name), content);

process.chdir(root);
void describe("utility-mapping uses @theme definitions across imported CSS partials", () => {
  tailwindRuleTester.run("utility-mapping:cross-file", utilityMappingRule, {
    valid: [],
    invalid: [
      {
        code: cases["radius.css"],
        filename: path.join(styles, "radius.css"),
        errors: [
          {
            message:
              'Custom utility "rounded-card" duplicates theme-generated "rounded-existing" (border-radius: 12px); reuse "rounded-existing" instead.',
          },
        ],
      },
      {
        code: cases["color.css"],
        filename: path.join(styles, "color.css"),
        errors: [
          {
            message:
              'Custom utility "bg-brand-canvas" duplicates theme-generated "bg-primary-canvas" (background-color: #123456); reuse "bg-primary-canvas" instead.',
          },
        ],
      },
      {
        code: cases["gradient.css"],
        filename: path.join(styles, "gradient.css"),
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: cases["selector.css"],
        filename: path.join(styles, "selector.css"),
        errors: [
          {
            message:
              'CSS class ".rainbow-surface" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: cases["other.css"],
        filename: path.join(styles, "other.css"),
        errors: [
          {
            message:
              'Custom utility "p-card" only maps padding (12px); prefer @theme inline token "--spacing-card" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
    ],
  });
});
