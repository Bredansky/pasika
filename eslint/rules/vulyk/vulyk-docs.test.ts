import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after } from "node:test";
import { describe, vulykRuleTester } from "./rule-tester";
import { vulykDocsRule } from "./vulyk-docs";

/** Tracks every required doc: baseline docs plus the Next.js-app docs. */
const PASIKA_CONFIG = `import { defineConfig } from "vulyk/config";
export default defineConfig({
  entries: {
    "documentation-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/documentation-guide",
      targets: ["."],
    },
    "pasika-adoption-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/pasika-adoption-guide",
      targets: ["."],
    },
    "repository-policy": {
      source: "https://github.com/Bredansky/pasika/blob/main/docs/repository-policy.md",
      targets: ["."],
    },
    "next-codebase-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/next-codebase-guide",
      targets: ["."],
    },
    "next-tailwind-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/next-tailwind-guide",
      targets: ["."],
    },
  },
});`;

/** Tracks only the baseline docs, as a plain TypeScript repository requires. */
const TYPESCRIPT_APP_CONFIG = `import { defineConfig } from "vulyk/config";
export default defineConfig({
  entries: {
    "documentation-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/documentation-guide",
      targets: ["."],
    },
    "pasika-adoption-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/pasika-adoption-guide",
      targets: ["."],
    },
    "repository-policy": {
      source: "https://github.com/Bredansky/pasika/blob/main/docs/repository-policy.md",
      targets: ["."],
    },
  },
});`;

const NEXTJS_PACKAGE_JSON = JSON.stringify({ dependencies: { next: "16.2.2" } });

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

void describe("A repository adopting the framework MUST track the framework's `documentation-guide`, `pasika-adoption-guide`, and `repository-policy` docs from `pasika` in `vulyk.config.ts`.", () => {
  vulykRuleTester.run("vulyk-docs", vulykDocsRule, {
    valid: [
      {
        filename: project({ "vulyk.config.ts": TYPESCRIPT_APP_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
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

void describe("A repository adopting the framework's Next.js app preset MUST additionally track the framework's `next-codebase-guide` and `next-tailwind-guide` docs from `pasika` in `vulyk.config.ts`.", () => {
  vulykRuleTester.run("vulyk-docs", vulykDocsRule, {
    valid: [
      {
        filename: project({ "vulyk.config.ts": TYPESCRIPT_APP_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
      },
      {
        filename: project({ "vulyk.config.ts": PASIKA_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: NEXTJS_PACKAGE_JSON,
      },
    ],
    invalid: [
      {
        filename: project({
          "vulyk.config.ts": `import { defineConfig } from "vulyk/config";
export default defineConfig({
  entries: {
    "documentation-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/documentation-guide",
      targets: ["."],
    },
  },
});`,
          "AGENTS.md": "# AGENTS\n",
        }).packageJson,
        code: "{}",
        errors: [
          {
            message:
              "vulyk.config.ts must track the framework's pasika-adoption-guide docs from pasika (Bredansky/pasika/docs/pasika-adoption-guide).",
          },
          {
            message:
              "vulyk.config.ts must track the framework's repository-policy docs from pasika (Bredansky/pasika/docs/repository-policy.md).",
          },
        ],
      },
      {
        // A Next.js app that tracks only the baseline docs is missing the two app-preset docs.
        filename: project({ "vulyk.config.ts": TYPESCRIPT_APP_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: NEXTJS_PACKAGE_JSON,
        errors: [
          {
            message:
              "vulyk.config.ts must track the framework's next-codebase-guide docs from pasika (Bredansky/pasika/docs/next-codebase-guide).",
          },
          {
            message:
              "vulyk.config.ts must track the framework's next-tailwind-guide docs from pasika (Bredansky/pasika/docs/next-tailwind-guide).",
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
        filename: project({ "vulyk.config.ts": TYPESCRIPT_APP_CONFIG, "AGENTS.md": "# AGENTS\n" }).packageJson,
        code: "{}",
      },
    ],
    invalid: [
      {
        filename: project({ "vulyk.config.ts": TYPESCRIPT_APP_CONFIG }).packageJson,
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
