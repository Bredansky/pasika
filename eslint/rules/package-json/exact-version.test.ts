import { describe, packageJsonRuleTester } from "./rule-tester";
import { exactVersionRule } from "./exact-version";

void describe("A dependency or devDependency in package.json MUST pin an exact version, never a range.", () => {
  packageJsonRuleTester.run("exact-version", exactVersionRule, {
    valid: [
      { code: JSON.stringify({ name: "app", dependencies: { react: "19.0.0" } }) },
      { code: JSON.stringify({ devDependencies: { typescript: "5.9.2" } }) },
      // peerDependencies are compatibility ranges for consumers, not installs — ignored
      { code: JSON.stringify({ peerDependencies: { typescript: ">=5.0.0" } }) },
      { code: JSON.stringify({ dependencies: { a: "1.2.3", b: "2.0.0" } }, null, 2) },
      { code: JSON.stringify({ name: "app" }) },
    ],
    invalid: [
      {
        code: JSON.stringify({ dependencies: { react: "^19.0.0" } }),
        errors: [{ message: 'react must pin an exact version (e.g. "1.2.3"), not a range or cap such as "^19.0.0".' }],
      },
      {
        code: JSON.stringify({ devDependencies: { typescript: "~5.9.2" } }),
        errors: [{ message: 'typescript must pin an exact version (e.g. "1.2.3"), not a range or cap such as "~5.9.2".' }],
      },
      {
        code: JSON.stringify({ dependencies: { zod: ">=4.0.0 <5" } }),
        errors: [{ message: 'zod must pin an exact version (e.g. "1.2.3"), not a range or cap such as ">=4.0.0 <5".' }],
      },
      {
        code: JSON.stringify({ dependencies: { foo: "*" } }),
        errors: [{ message: 'foo must pin an exact version (e.g. "1.2.3"), not a range or cap such as "*".' }],
      },
      {
        code: JSON.stringify({ dependencies: { bar: "latest" } }),
        errors: [{ message: 'bar must pin an exact version (e.g. "1.2.3"), not a range or cap such as "latest".' }],
      },
      {
        code: JSON.stringify({ dependencies: { rev: "1.x" } }),
        errors: [{ message: 'rev must pin an exact version (e.g. "1.2.3"), not a range or cap such as "1.x".' }],
      },
      {
        code: JSON.stringify({ dependencies: { rel: "5.9" } }),
        errors: [{ message: 'rel must pin an exact version (e.g. "1.2.3"), not a range or cap such as "5.9".' }],
      },
    ],
  });
});