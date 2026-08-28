import { describe, documentationRuleTester } from "./rule-tester";
import { guideOverviewNoLinksRule } from "./guide-overview-no-links";

void describe("A Guide overview MUST contain one or two short descriptive sentences about the guide's scope and purpose, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("guide-overview-no-links", guideOverviewNoLinksRule, {
    valid: [{ filename: "foo-guide.md", code: "# Foo Guide\n\nTwo short sentences. They are concise." }],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nSee the [Other Guide](other-guide.md) for details.",
        errors: [{ message: "guide overview links another document" }],
      },
    ],
  });
});
