import { describe, documentationRuleTester } from "./rule-tester";
import { guideStatesNoRequirementRule } from "./guide-states-no-requirement";

void describe("A Guide MUST NOT state a requirement with RFC 2119 vocabulary, and a requirement MUST be stated in a Rule.", () => {
  documentationRuleTester.run("guide-states-no-requirement", guideStatesNoRequirementRule, {
    valid: [
      {
        code: "# How To Deploy\n\n1. Run the build script.\n2. Publish the package.",
        filename: "foo-guide.md",
      },
    ],
    invalid: [
      {
        code: "# How To Deploy\n\n1. The deploy step MUST run the build script.",
        filename: "foo-guide.md",
        errors: [{ message: "guide states a requirement with RFC 2119 vocabulary" }],
      },
    ],
  });
});
