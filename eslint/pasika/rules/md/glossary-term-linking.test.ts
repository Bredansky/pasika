import { describe, mdRuleTester } from "./rule-tester.js";
import { glossaryTermLinkingRule } from "./glossary-term-linking.js";

void describe("A Guide whose steps use terms that a glossary Reference defines MUST link that Reference from its first step.", () => {
  mdRuleTester.run("glossary-term-linking", glossaryTermLinkingRule, {
    valid: [],
    invalid: [],
  });
});
