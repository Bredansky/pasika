import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { unusedCssDefinitionRule } from "./unused-css-definition";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unused-css-definition-no-src-")));
writeFileSync(path.join(root, "src"), "not a directory");
process.chdir(root);

void describe("The unused CSS definition rule MUST be inert when the source root is not a directory.", () => {
  tailwindRuleTester.run("unused-css-definition", unusedCssDefinitionRule, {
    valid: [{ code: "@utility orphan { @apply px-1; }", filename: path.join(root, "styles.css") }],
    invalid: [],
  });
});
