import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after } from "node:test";
import { describe, ruleTester } from "../rule-tester";
import { zirkaBaselineRule } from "./zirka-baseline";

const COMPLIANT_ESLINT_CONFIG = `import { styleguide } from "zirka"; export default styleguide({}).eslintConfig;`;
const COMPLIANT_TSCONFIG = `{ "extends": "zirka/typescript" }`;
const COMPLIANT_PRETTIER = `import { styleguide } from "zirka"; export default styleguide({ prettier: true }).prettierConfig;`;

interface Project {
  dir: string;
  eslintConfig: string;
}

function makeProject(files: Record<string, string>): Project {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zirka-baseline-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return { dir, eslintConfig: path.join(dir, "eslint.config.ts") };
}

void describe("A repository MUST take its lint, format, and TypeScript configuration from zirka and its rules from pasika rather than restating them locally.", () => {
  const projectDirs: string[] = [];
  after(() => {
    for (const dir of projectDirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  const project = (files: Record<string, string>): Project => {
    const created = makeProject(files);
    projectDirs.push(created.dir);
    return created;
  };

  ruleTester.run("zirka-baseline", zirkaBaselineRule, {
    valid: [
      {
        filename: project({
          "eslint.config.ts": COMPLIANT_ESLINT_CONFIG,
          "tsconfig.json": COMPLIANT_TSCONFIG,
          "prettier.config.mjs": COMPLIANT_PRETTIER,
        }).eslintConfig,
        code: COMPLIANT_ESLINT_CONFIG,
      },
    ],
    invalid: [
      {
        filename: project({
          "eslint.config.ts": `export default {};`,
          "tsconfig.json": COMPLIANT_TSCONFIG,
          "prettier.config.mjs": COMPLIANT_PRETTIER,
        }).eslintConfig,
        code: `export default {};`,
        errors: [
          {
            message:
              'ESLint config must take its configuration from zirka (import { styleguide } from "zirka") instead of restating rules locally.',
          },
        ],
      },
      {
        filename: project({
          "eslint.config.ts": COMPLIANT_ESLINT_CONFIG,
          "tsconfig.json": `{}`,
          "prettier.config.mjs": COMPLIANT_PRETTIER,
        }).eslintConfig,
        code: COMPLIANT_ESLINT_CONFIG,
        errors: [{ message: 'tsconfig.json must extend the zirka TypeScript base config ("zirka/typescript").' }],
      },
      {
        filename: project({
          "eslint.config.ts": COMPLIANT_ESLINT_CONFIG,
          "tsconfig.json": COMPLIANT_TSCONFIG,
        }).eslintConfig,
        code: COMPLIANT_ESLINT_CONFIG,
        errors: [
          {
            message:
              "No prettier config found. Create one that takes its configuration from zirka (styleguide({ prettier: true }).prettierConfig).",
          },
        ],
      },
      {
        filename: project({
          "eslint.config.ts": COMPLIANT_ESLINT_CONFIG,
          "tsconfig.json": COMPLIANT_TSCONFIG,
          "prettier.config.mjs": `export default {};`,
        }).eslintConfig,
        code: COMPLIANT_ESLINT_CONFIG,
        errors: [
          {
            message:
              "The prettier config must take its configuration from zirka (styleguide({ prettier: true }).prettierConfig) instead of restating it locally.",
          },
        ],
      },
    ],
  });
});
