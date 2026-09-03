import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { unusedUtilityRule } from "./unused-utility";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unused-utility-no-src-")));
writeFileSync(path.join(root, "src"), "not a directory");
process.chdir(root);

void describe("The unused utility rule MUST be inert when the source root is not a directory.", () => {
  tailwindRuleTester.run("unused-utility", unusedUtilityRule, {
    valid: [{ code: "@utility orphan { @apply px-1; }", filename: path.join(root, "styles.css") }],
    invalid: [],
  });
});
