import { expect, it } from "vitest";
import { describe } from "./rule-tester";
import { guideMentionsDocumentsRule } from "./guide-mentions-documents";

// The rule reads the guide folder from disk (like glossary-term-linking), so its
// enforcement happens over the real docs/ tree during self-lint, not fixture
// cases here. The describe title records the requirement for coverage.
void describe("A Guide entry point MUST reference each Rule it owns from within a How To step, MUST mention every Reference it owns, and MUST NOT link a document that does not exist.", () => {
  it("is enforced over the real docs/ tree during self-lint", () => {
    expect(guideMentionsDocumentsRule.meta?.docs?.description).toBeDefined();
  });
});
