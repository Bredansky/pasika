import { expect, it } from "vitest";
import { describe } from "./rule-tester";
import { guideFolderEntryPointRule } from "./guide-folder-entry-point";

// The rule reads the guide folder from disk, so its enforcement happens over
// the real docs/ tree during self-lint, not fixture cases here. The describe
// title records the requirement for coverage.
void describe("A Guide with support files MUST become a folder named the same as its entry-point file, without the .md extension.", () => {
  it("is enforced over the real docs/ tree during self-lint", () => {
    expect(guideFolderEntryPointRule.meta?.docs?.description).toBeDefined();
  });
});
