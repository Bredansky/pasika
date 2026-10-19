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

interface Workflow {
  file: string;
  content: Mapping;
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

function usesReusableWorkflow(job: unknown, filename: string): boolean {
  const uses: unknown = mapping(job)?.uses;
  if (typeof uses !== "string" || !uses.startsWith("./.github/workflows/")) return false;
  const relative = uses.slice("./.github/workflows/".length);
  return path.posix.normalize(relative) === filename;
}

function needsJob(job: unknown, dependency: string): boolean {
  const needs: unknown = mapping(job)?.needs;
  return needs === dependency || (Array.isArray(needs) && needs.includes(dependency));
}

function publishes(job: unknown): boolean {
  return steps(job).some(
    (step) => typeof step.run === "string" && /(?:^|[\n;&|])\s*npm\s+publish(?=\s|$)/.test(step.run),
  );
}

function readWorkflows(dir: string): { workflows: Workflow[]; errors: string[] } {
  const workflows: Workflow[] = [];
  const errors: string[] = [];
  for (const file of readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort()) {
    try {
      const parsed: unknown = parse(readFileSync(path.join(dir, file), "utf8"), { uniqueKeys: true });
      const content = mapping(parsed);
      if (!content) throw new Error("expected a YAML mapping");
      workflows.push({ file, content });
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
      description: "Require GitHub Actions validation and gate publishing on the same reusable checks.",
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
          ({ content }) => Object.hasOwn(events(content), "pull_request") && branchesTrigger(content),
        );
        if (!check) {
          report("GitHub Actions must run shared checks for pull requests and branch pushes.");
          return;
        }

        const scripts = scriptsOf(node.body);
        const requiredScripts = ["format", "lint", "typecheck", "test:unit:coverage:check"];
        for (const optional of ["test:requirements", "build"]) {
          if (scripts.has(optional)) requiredScripts.push(optional);
        }

        const checkJobs = Object.values(jobs(check.content));
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

        const releaseWorkflows = workflows.filter(({ content }) => Object.values(jobs(content)).some(publishes));
        if (releaseWorkflows.length === 0) return;

        if (!Object.hasOwn(events(check.content), "workflow_call")) {
          report("GitHub Actions checks must support workflow_call so publishing can reuse them.");
        }
        for (const release of releaseWorkflows) {
          const releaseJobs = jobs(release.content);
          const checksJob = Object.entries(releaseJobs).find(([, job]) => usesReusableWorkflow(job, check.file));
          if (!checksJob) {
            report(`GitHub Actions ${release.file} must call the reusable checks workflow before publishing.`);
            continue;
          }
          for (const [id, job] of Object.entries(releaseJobs)) {
            if (publishes(job) && !needsJob(job, checksJob[0])) {
              report(`GitHub Actions ${release.file} publishing job "${id}" must depend on the checks job.`);
            }
          }
        }
      },
    };
  },
};
