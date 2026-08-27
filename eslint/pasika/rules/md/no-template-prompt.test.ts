import { describe, mdRuleTester } from "./rule-tester";
import { noTemplatePromptRule } from "./no-template-prompt";

void describe("Authors MUST replace each bracketed prompt with the final title, explanation, step, or lookup content it asks for.", () => {
  mdRuleTester.run("no-template-prompt", noTemplatePromptRule, {
    valid: [{ filename: "foo-guide.md", code: "# Foo Guide\n\nFinal content here." }],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n[Explain the guide's scope]",
        errors: [{ message: "leftover bracketed template prompt" }],
      },
    ],
  });
});
