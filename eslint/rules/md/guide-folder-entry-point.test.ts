import { describe, mdRuleTester } from "./rule-tester";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point";

void describe("A Guide with support files MUST become a folder named the same as its entry-point file, without the .md extension.", () => {
  mdRuleTester.run("guide-folder-entry-point", guideFolderEntryPointRule, {
    valid: [],
    invalid: [],
  });
});
