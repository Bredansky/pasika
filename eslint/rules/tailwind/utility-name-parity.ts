/**
 * ESLint rule: pasika/utility-name-parity
 *
 * Require property/value parity for every static, single-@apply custom utility.
 * Readable literals retain units; complex expressions retain a stable digest.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import { generate, parse, toPlainObject } from "@eslint/css-tree";
import type { CssNodePlain, StyleSheetPlain } from "@eslint/css-tree";
import { atrulesNamed, blockChildren, preludeIdentifiers, rules, selectorNames } from "./helpers";

function numericPart(value: string): string | undefined {
  const match =
    /^(?<negative>-?)(?<number>(?:\d+(?:\.\d+)?|\.\d+))(?<unit>%|px|rem|em|vw|vh|dvw|dvh|ch|fr|s|ms|deg|turn)?$/u.exec(
      value,
    );
  if (!match?.groups?.number) return undefined;
  const number = String(Number(match.groups.number)).replace(".", "p");
  const sign = match.groups.negative === "-" ? "neg-" : "";
  return sign + number + (match.groups.unit === "%" ? "pct" : (match.groups.unit ?? ""));
}

function readableValue(value: string): string | undefined {
  const words = value
    .trim()
    .replace(/,/gu, "_comma_")
    .split(/[_\s]+/u)
    .filter(Boolean);
  if (words.length === 0 || words.length > 8) return undefined;
  const parts: string[] = [];
  for (const word of words) {
    const numeric = numericPart(word);
    if (numeric) {
      parts.push(numeric);
      continue;
    }
    const hex = /^#(?<color>[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.exec(word)?.groups?.color;
    if (hex) {
      parts.push("hex", hex.toLowerCase());
      continue;
    }
    const variable = /^var\(--(?<name>[a-z][a-z0-9-]*)\)$/u.exec(word)?.groups?.name;
    if (variable) {
      parts.push("var", variable);
      continue;
    }
    if (/^[a-z][a-z0-9-]*$/iu.test(word)) {
      parts.push(word.toLowerCase());
      continue;
    }
    return undefined;
  }
  const slug = parts.join("-");
  return slug.length <= 70 ? slug : undefined;
}

function compoundValue(value: string): string {
  const readable = readableValue(value);
  if (readable) return readable;
  const candidate = /^(?<fn>[a-z][a-z0-9-]*)\(/iu.exec(value.trim())?.groups?.fn?.toLowerCase();
  const hint = candidate?.endsWith("-") ? undefined : candidate;
  const digest = createHash("sha256").update(value.trim()).digest("hex").slice(0, 12);
  return [hint, "hash", digest].filter(Boolean).join("-");
}

interface Operation {
  property: string;
  value: string;
}

/**
 * ESLint rules are synchronous, while Tailwind's compiler is async.
 * Batch a stylesheet's candidates in one bounded subprocess.
 */
const TAILWIND_WORKER = String.raw`
import { readFileSync } from "node:fs";
import { compile } from "tailwindcss";
const applies = JSON.parse(readFileSync(0, "utf8"));
const results = [];
for (const [index, apply] of applies.entries()) {
  const name = "pasika-probe-" + index;
  try {
    const compiler = await compile("@tailwind utilities; @utility " + name + " { " + apply + " }");
    results.push({ css: compiler.build([name]) });
  } catch (error) {
    results.push({ error: String(error instanceof Error ? error.message : error) });
  }
}
process.stdout.write(JSON.stringify(results));
`;

interface CompiledResult {
  css?: string;
  error?: string;
}

const compilerCache = new Map<string, CompiledResult[]>();

function isCompiledResult(value: unknown): value is CompiledResult {
  if (typeof value !== "object" || value === null) return false;
  return ("css" in value && typeof value.css === "string") || ("error" in value && typeof value.error === "string");
}

function compileApplies(applies: string[], cwd: string): CompiledResult[] {
  const key = `${cwd}\u0000${JSON.stringify(applies)}`;
  const cached = compilerCache.get(key);
  if (cached) return cached;
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", TAILWIND_WORKER], {
    cwd,
    input: JSON.stringify(applies),
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  let results: CompiledResult[];
  if (child.error || child.status !== 0) {
    const reason = child.error?.message ?? (child.stderr.trim() || "Tailwind compilation failed");
    results = applies.map(() => ({ error: reason }));
  } else {
    try {
      const parsed: unknown = JSON.parse(child.stdout);
      if (!Array.isArray(parsed)) throw new Error("Unexpected Tailwind output");
      const values: unknown[] = parsed;
      results = values.filter(isCompiledResult);
      if (results.length !== applies.length) throw new Error("Unexpected Tailwind output");
    } catch {
      results = applies.map(() => ({ error: "Invalid Tailwind compiler response" }));
    }
  }
  compilerCache.set(key, results);
  return results;
}

/** Use the CSS declaration Tailwind emits, not a guessed prefix mapping. */
function compiledOperation(compiled: CompiledResult, index: number): Operation | undefined {
  if (!compiled.css) return undefined;
  const sheet = toPlainObject(parse(compiled.css, { parseValue: false }));
  const probe = rules(sheet).find((candidate) => selectorNames(candidate).includes(`pasika-probe-${String(index)}`));
  if (!probe) return undefined;
  // Ignore Tailwind's implementation-only variables, not its CSS operation.
  const declarations = blockChildren(probe).filter(
    (child) => child.type === "Declaration" && !child.property.startsWith("--tw-"),
  );
  if (declarations.length !== 1) return undefined;
  const declaration = declarations[0];
  if (declaration?.type !== "Declaration") return undefined;
  return { property: declaration.property, value: generate(declaration.value).trim() };
}

function expectedName(operation: Operation): string {
  const value = compoundValue(operation.value);
  // Mirror the actual CSS property. Only "background-*" uses the agreed
  // Tailwind-style "bg-*" spelling; all other property names stay explicit.
  const property = operation.property.replace(/^-+/u, "").replace(/^background-/u, "bg-");
  return `${property}-${value}`;
}

function singleApply(utility: CssNodePlain, textOf: (node: CssNodePlain) => string): string | undefined {
  const children = blockChildren(utility);
  if (children.length !== 1) return undefined;
  const child = children[0];
  if (child?.type !== "Atrule" || child.name !== "apply") return undefined;
  return textOf(child);
}

export const utilityNameParityRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require single-operation custom utilities to have deterministic property/value-derived names.",
    },
  },
  create(context) {
    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        const candidates = atrulesNamed(node, "utility").flatMap((utility) => {
          const name = preludeIdentifiers(utility)[0];
          if (!name || name.endsWith("-*")) return [];
          const apply = singleApply(utility, (child) => context.sourceCode.getText(child));
          return apply ? [{ utility, name, apply }] : [];
        });
        if (candidates.length === 0) return;
        // Resolve Tailwind relative to the CSS file so nested workspaces can
        // use their own installed Tailwind version instead of the repo root's.
        const physicalDir = path.dirname(context.physicalFilename);
        const cwd = path.isAbsolute(physicalDir) && existsSync(physicalDir) ? physicalDir : context.cwd;
        const compiled = compileApplies(
          candidates.map((candidate) => candidate.apply),
          cwd,
        );
        for (const [index, candidate] of candidates.entries()) {
          const result = compiled[index];
          const operation = result ? compiledOperation(result, index) : undefined;
          if (!operation) {
            context.report({
              node: candidate.utility,
              message: `Custom utility "${candidate.name}" applies "${candidate.apply}", but Tailwind cannot resolve exactly one CSS property${result?.error ? `: ${result.error}` : ""}; use an explicit [property:value] @apply mapping instead.`,
            });
            continue;
          }
          const expected = expectedName(operation);
          if (candidate.name === expected) continue;
          context.report({
            node: candidate.utility,
            message: `Custom utility "${candidate.name}" maps ${operation.property}: ${operation.value}; rename it "${expected}" to preserve property/value parity.`,
          });
        }
      },
    };
  },
};
