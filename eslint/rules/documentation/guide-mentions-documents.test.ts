import { describe, documentationRuleTester } from "./rule-tester";
import { guideMentionsDocumentsRule } from "./guide-mentions-documents";

// The rule reads the guide folder from disk (like glossary-term-linking), so its
// enforcement happens over the real docs/ tree during self-lint. The describe
// title records the requirement for coverage.
void describe("A Guide entry point MUST reference each Rule it owns from within a How To step, MUST mention every Reference it owns, and MUST NOT link a document that does not exist.", () => {
  documentationRuleTester.run("guide-mentions-documents", guideMentionsDocumentsRule, {
    valid: [],
    invalid: [],
  });
});
