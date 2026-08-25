import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester.js";
import { enforceBarrelExportsRule } from "./enforce-barrel-exports.js";

/**
 * The rule reads the folder from disk to find the component the barrel belongs
 * to, so the fixture needs real files. The parent folder name has to be
 * kebab-case or PascalCase for the rule to treat the folder as a component
 * folder, which `mkdtemp`'s random suffix does not guarantee — hence the
 * explicit `blog/` level.
 */
function createNestedComponentFolder(): string {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-"));
  const componentDir = path.join(root, "blog", "BlogPage");
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(path.join(componentDir, "BlogPage.tsx"), "export function BlogPage() { return <main />; }\n");
  writeFileSync(path.join(componentDir, "blog-header.tsx"), "export function BlogHeader() { return <header />; }\n");
  return componentDir;
}

const componentDir = createNestedComponentFolder();
const barrel = path.join(componentDir, "index.ts");

void describe("The nested folder's index.ts MUST named-re-export the nested component and MUST NOT re-export its exclusive children.", () => {
  ruleTester.run("enforce-barrel-exports", enforceBarrelExportsRule, {
    valid: [{ code: 'export { BlogPage } from "./BlogPage";', filename: barrel }],
    invalid: [
      {
        code: 'export { BlogPage } from "./BlogPage";\nexport { BlogHeader } from "./blog-header";',
        filename: barrel,
        errors: [
          {
            message:
              'index.ts must not re-export exclusive children: BlogHeader. Only "BlogPage" may be re-exported. ' +
              "See docs/code-organization-guide/rules/folder-nesting-rule.md",
          },
        ],
      },
      {
        code: 'export { BlogHeader } from "./blog-header";',
        filename: barrel,
        errors: [
          {
            message:
              'index.ts in "BlogPage/" must re-export "BlogPage". ' +
              "See docs/code-organization-guide/rules/folder-nesting-rule.md",
          },
        ],
      },
    ],
  });
});
