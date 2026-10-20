/**
 * ESLint rule: pasika/ci-checks
 *
 * @see docs/pasika-adoption-guide/rules/ci-checks-rule.md
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";
import { parse } from "yaml";

type Mapping = Record<string, unknown>;

function mapping(value: unknown): Mapping | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
}

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function scriptsOf(root: DocumentNode["body"]): Map<string, string> {
  if (root.type !== "Object") return new Map();
  const scripts = root.members.find((member) => memberName(member) === "scripts");
  const members = scripts?.value.type === "Object" ? scripts.value.members : [];
  return new Map(
    members.flatMap((member) =>
      member.value.type === "String" ? [[memberName(member), member.value.value] as const] : [],
    ),
  );
}

function events(workflow: Mapping): Mapping {
  const on: unknown = workflow.on;
  if (typeof on === "string") return { [on]: null };
  if (Array.isArray(on)) {
    return Object.fromEntries(
      on.filter((item): item is string => typeof item === "string").map((item) => [item, null]),
    );
  }
  return mapping(on) ?? {};
}

function branchesTrigger(workflow: Mapping): boolean {
  const push: unknown = events(workflow).push;
  const branches: unknown = mapping(push)?.branches;
  return typeof branches === "string"
    ? branches.length > 0
    : Array.isArray(branches) && branches.some((branch) => typeof branch === "string" && branch.length > 0);
}

function jobs(workflow: Mapping): Mapping {
  return mapping(workflow.jobs) ?? {};
}

function steps(job: unknown): Mapping[] {
  const entries: unknown = mapping(job)?.steps;
  return Array.isArray(entries)
    ? entries.flatMap((entry) => {
        const step = mapping(entry);
        return step ? [step] : [];
      })
    : [];
}

function runsScript(run: unknown, name: string): boolean {
  if (typeof run !== "string") return false;
  return new RegExp(`(?:^|[\\n;&|])\\s*npm\\s+run\\s+${name}(?=\\s|$)`).test(run);
}

function runsNpmCi(run: unknown): boolean {
  return typeof run === "string" && /(?:^|[\n;&|])\s*npm\s+ci(?=\s|$)/.test(run);
}

function usesAction(value: unknown, action: string): boolean {
  return typeof value === "string" && value.startsWith(`${action}@`);
}

function readWorkflows(dir: string): { workflows: Mapping[]; errors: string[] } {
  const workflows: Mapping[] = [];
  const errors: string[] = [];
  for (const file of readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort()) {
    try {
      const parsed: unknown = parse(readFileSync(path.join(dir, file), "utf8"), { uniqueKeys: true });
      const content = mapping(parsed);
      if (!content) throw new Error("expected a YAML mapping");
      workflows.push(content);
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { workflows, errors };
}

export const ciChecksRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require GitHub Actions validation for pull requests and branch pushes.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        if (!context.filename.endsWith("package.json")) return;
        const dir = path.join(context.cwd, ".github", "workflows");
        // Projects without GitHub Actions may run CI elsewhere.
        if (!existsSync(dir)) return;

        const report = (message: string): void => {
          context.report({ node, message });
        };
        const { workflows, errors } = readWorkflows(dir);
        for (const error of errors) report(`Invalid GitHub Actions workflow: ${error}`);

        const check = workflows.find(
          (workflow) => Object.hasOwn(events(workflow), "pull_request") && branchesTrigger(workflow),
        );
        if (!check) {
          report("GitHub Actions must run shared checks for pull requests and branch pushes.");
          return;
        }

        const scripts = scriptsOf(node.body);
        const requiredScripts = ["format", "lint", "typecheck", "test:unit:coverage:check"];
        if (scripts.has("build")) requiredScripts.push("build");

        const checkJobs = Object.values(jobs(check));
        const allSteps = checkJobs.flatMap(steps);
        for (const job of checkJobs) {
          const jobSteps = steps(job);
          const firstCheck = jobSteps.findIndex((step) => requiredScripts.some((name) => runsScript(step.run, name)));
          if (firstCheck < 0) continue;
          const checkout = jobSteps.findIndex((step) => usesAction(step.uses, "actions/checkout"));
          const install = jobSteps.findIndex((step) => runsNpmCi(step.run));
          if (checkout < 0 || checkout >= firstCheck) {
            report("GitHub Actions checks must check out the repository before running npm scripts.");
          }
          if (install < 0 || install >= firstCheck || (checkout >= 0 && install <= checkout)) {
            report("GitHub Actions checks must install dependencies with npm ci.");
          }
        }
        for (const name of requiredScripts) {
          if (!allSteps.some((step) => runsScript(step.run, name))) {
            report(`GitHub Actions checks must run npm run ${name}.`);
          }
        }

        const coverage = scripts.get("test:unit:coverage:check");
        if (
          !coverage ||
          !/npm\s+run\s+test:unit:coverage(?=\s|$)/.test(coverage) ||
          !coverage.includes("--coverage.thresholds.autoUpdate=false") ||
          !/&&\s*git\s+diff\s+--exit-code/.test(coverage)
        ) {
          report(
            "package.json must declare test:unit:coverage:check that runs coverage with autoUpdate=false and verifies no Git diff.",
          );
        }
      },
    };
  },
};
