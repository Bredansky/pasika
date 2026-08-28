import { describe, documentationRuleTester } from "./rule-tester";
import { glossaryTermLinkingRule } from "./glossary-term-linking";

void describe("A Guide whose steps use terms that a glossary Reference defines MUST link that Reference from its first step.", () => {
  documentationRuleTester.run("glossary-term-linking", glossaryTermLinkingRule, {
    valid: [],
    invalid: [],
  });
});
