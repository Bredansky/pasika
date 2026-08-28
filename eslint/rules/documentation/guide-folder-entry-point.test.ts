import { describe, documentationRuleTester } from "./rule-tester";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point";

void describe("A Guide with support files MUST become a folder named the same as its entry-point file, without the .md extension.", () => {
  documentationRuleTester.run("guide-folder-entry-point", guideFolderEntryPointRule, {
    valid: [],
    invalid: [],
  });
});
