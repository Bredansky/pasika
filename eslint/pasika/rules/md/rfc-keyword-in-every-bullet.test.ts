import { describe, mdRuleTester } from "./rule-tester";
import { rfcKeywordInEveryBulletRule } from "./rfc-keyword-in-every-bullet";

void describe("A bullet MUST contain at least one RFC 2119 keyword, and a bullet MUST use MUST or MUST NOT only when the requirement admits no exception, SHOULD or SHOULD NOT only when exceptions are possible, and MAY only when the behavior is optional.", () => {
  mdRuleTester.run("rfc-keyword-in-every-bullet", rfcKeywordInEveryBulletRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- A helper file MUST use named exports.\n- A component MAY fetch data.\n",
      },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\n## Code Quality\n\n- Code MUST NOT use `eslint-disable` directives.\n",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- A helper file uses named exports.\n- A component MUST fetch data.\n",
        errors: [{ message: "bullet point contains no RFC 2119 keyword" }],
      },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\n- Values are kebab-case.\n",
        errors: [{ message: "bullet point contains no RFC 2119 keyword" }],
      },
    ],
  });
});
