import { describe, jsonRuleTester } from "./rule-tester";
import { zirkaInstalledRule } from "./zirka-installed";

void describe("zirka MUST be listed in package.json as a devDependency.", () => {
  jsonRuleTester.run("zirka-installed", zirkaInstalledRule, {
    valid: [
      { code: `{ "devDependencies": { "zirka": "^0.0.43" } }` },
      { code: `{ "dependencies": { "zirka": "^0.0.43" } }` },
    ],
    invalid: [
      {
        code: `{ "name": "my-app" }`,
        errors: [{ message: "zirka must be listed in package.json as a devDependency." }],
      },
      {
        code: `{ "devDependencies": { "pasika": "^0.3.0" } }`,
        errors: [{ message: "zirka must be listed in package.json as a devDependency." }],
      },
    ],
  });
});
