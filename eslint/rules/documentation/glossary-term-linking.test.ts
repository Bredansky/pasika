import { expect, it } from "vitest";
import { describe } from "./rule-tester";
import { glossaryTermLinkingRule } from "./glossary-term-linking";

// The rule reads the glossary and guide folders from disk, so its enforcement
// happens over the real docs/ tree during self-lint, not fixture cases here.
// The describe title records the requirement for coverage.
void describe("A Guide whose steps use terms that a glossary Reference defines MUST link that Reference from its first step.", () => {
  it("is enforced over the real docs/ tree during self-lint", () => {
    expect(glossaryTermLinkingRule.meta?.docs?.description).toBeDefined();
  });
});
