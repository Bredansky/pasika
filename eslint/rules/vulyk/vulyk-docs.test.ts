import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after } from "node:test";
import { describe, vulykRuleTester } from "./rule-tester";
import { vulykDocsRule } from "./vulyk-docs";

const PASIKA_CONFIG = `import { defineConfig } from "vulyk/config";
export default defineConfig({
  entries: {
    "framework-docs": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs",
      targets: ["."],
      agents: ["AGENTS.md"],
    },
  },
});`;

interface Project {
  dir: string;
  packageJson: string;
}

function makeProject(files: Record<string, string>): Project {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vulyk-docs-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return { dir, packageJson: path.join(dir, "package.json") };
}

const projectDirs: string[] = [];
after(() => {
  for (const dir of projectDirs) fs.rmSync(dir, { recursive: true, force: true });
});

const project = (files: Record<string, string>): Project => {
  const created = makeProject(files);
  projectDirs.push(created.dir);
  return created;
};

void describe("A repository adopting the framework MUST track the framework's docs from `pasika` in `vulyk.config.ts`.", () => {
  vulykRuleTester.run("vulyk-docs", vulykDocsRule, {
    valid: [
      {
        filename: project({ "vulyk.config.ts": PASIKA_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
      },
    ],
    invalid: [
      {
        filename: project({ "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
        errors: [
          {
            message:
              "No vulyk.config.ts found. Run npx vulyk@latest init to create one that tracks the framework's docs.",
          },
        ],
      },
      {
        filename: project({ "vulyk.config.ts": `export default {};`, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
        errors: [
          {
            message: "vulyk.config.ts must track the framework's docs from the pasika repository.",
          },
        ],
      },
    ],
  });
});

void describe("A repository adopting the framework MUST have the `AGENTS.md` agent file that `vulyk` generates for the tracked docs.", () => {
  vulykRuleTester.run("vulyk-docs", vulykDocsRule, {
    valid: [
      {
        filename: project({ "vulyk.config.ts": PASIKA_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
      },
    ],
    invalid: [
      {
        filename: project({ "vulyk.config.ts": PASIKA_CONFIG }).packageJson,
        code: "{}",
        errors: [
          {
            message:
              "No AGENTS.md found. Run npx vulyk@latest agents to generate the agent file that routes to the tracked docs.",
          },
        ],
      },
    ],
  });
});
