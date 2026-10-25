/**
 * Read-only inspection of Tailwind v4 project CSS.
 * Findings are review candidates, not lint failures.
 */
export interface TailwindAuditFinding {
  kind:
    | "built-in-duplicate"
    | "duplicate-utility"
    | "duplicate-theme-token"
    | "theme-token-collision"
    | "theme-candidate"
    | "possible-unused"
    | "shared-root-value";
  line: number;
  names: string[];
  detail: string;
}

export interface TailwindAuditReport {
  summary: {
    lines: number;
    utilities: number;
    rootVariables: number;
    themeVariables: number;
    singleReferenceUtilities: number;
    possibleUnusedUtilities: number;
  };
  findings: TailwindAuditFinding[];
}

interface CssBlock {
  name: string;
  body: string;
  line: number;
}

/** Find balanced CSS blocks, including those containing nested at-rules. */
function blocks(css: string, opener: RegExp): CssBlock[] {
  const matches: CssBlock[] = [];
  for (const match of css.matchAll(opener)) {
    const open = css.indexOf("{", match.index);
    let depth = 1;
    let end = open + 1;
    for (; end < css.length && depth > 0; end++) {
      if (css[end] === "{") depth++;
      if (css[end] === "}") depth--;
    }
    if (depth !== 0) continue;
    matches.push({
      name: match.groups?.name ?? "",
      body: css.slice(open + 1, end - 1),
      line: css.slice(0, match.index).split("\n").length,
    });
  }
  return matches;
}

function declarations(body: string, openingLine: number): { name: string; value: string; line: number }[] {
  return [...body.matchAll(/^[ \t]*(?<name>--[\w-]+):[ \t]*(?<value>[\s\S]*?);/gm)].map((match) => ({
    name: match.groups?.name ?? "",
    value: (match.groups?.value ?? "").trim(),
    line: openingLine + (body.slice(0, match.index).match(/\n/g)?.length ?? 0),
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
}

function references(name: string, sources: readonly string[]): number {
  const pattern = new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`, "g");
  return sources.reduce((total, source) => total + [...source.matchAll(pattern)].length, 0);
}

interface ThemeCandidate {
  token: string;
  value: string;
  detail: string;
  safe: boolean;
}

/** Suggest only single-property mappings, and flag namespace collisions. */
function themeCandidate(name: string, body: string): ThemeCandidate | undefined {
  const operation = /^\s*@apply\s+\[(?<property>[a-z-]+):(?<value>[^\]\r\n]+)\];?\s*$/.exec(body);
  if (!operation) return undefined;
  const property = operation.groups?.property;
  const value = operation.groups?.value?.trim();
  if (!value) return undefined;

  const namespaces: Record<string, { prefix: string; namespace: string }> = {
    "font-size": { prefix: "text-", namespace: "text" },
    "letter-spacing": { prefix: "tracking-", namespace: "tracking" },
    width: { prefix: "w-", namespace: "spacing" },
    "max-width": { prefix: "max-w-", namespace: "spacing" },
    "min-width": { prefix: "min-w-", namespace: "spacing" },
    height: { prefix: "h-", namespace: "spacing" },
    "max-height": { prefix: "max-h-", namespace: "spacing" },
    "min-height": { prefix: "min-h-", namespace: "spacing" },
    "border-radius": { prefix: "rounded-", namespace: "radius" },
  };
  const mapping = property ? namespaces[property] : undefined;
  if (!mapping || !name.startsWith(mapping.prefix) || /[;{}]/.test(value)) return undefined;
  const suffix = name.slice(mapping.prefix.length);
  if (!suffix) return undefined;
  const token = `--${mapping.namespace}-${suffix}`;
  return {
    token,
    value,
    safe: !value.includes("_"),
    detail: `Consider @theme inline ${token} with a :root variable (${value}); preserve class "${
      name
    }". Verify compiled CSS.`,
  };
}

const CERTAIN_BUILTINS = new Set([
  "text-balance",
  "text-pretty",
  "cursor-pointer",
  "sr-only",
  "not-sr-only",
  "truncate",
  "antialiased",
  "subpixel-antialiased",
  "pointer-events-none",
  "pointer-events-auto",
]);

/** Pure read-only audit. References are conservative text matches, not a complete JSX evaluator. */
export function auditTailwindStyles(css: string, sourceTexts: readonly string[]): TailwindAuditReport {
  const utilities = blocks(css, /^@utility\s+(?<name>[\w-]+)\s*\{/gm);
  const root = blocks(css, /^:root\s*\{/gm).flatMap((block) => declarations(block.body, block.line));
  const theme = blocks(css, /^@theme(?:\s+inline)?\s*\{/gm).flatMap((block) => declarations(block.body, block.line));
  const findings: TailwindAuditFinding[] = [];
  const add = (kind: TailwindAuditFinding["kind"], line: number, names: string[], detail: string): void => {
    findings.push({ kind, line, names, detail });
  };

  let singleReferenceUtilities = 0;
  let possibleUnusedUtilities = 0;
  const byBody = new Map<string, CssBlock[]>();
  const candidates = new Map<string, { utility: CssBlock; suggestion: ThemeCandidate }[]>();

  for (const utility of utilities) {
    const count = references(utility.name, sourceTexts);
    if (count === 1) singleReferenceUtilities++;
    if (count === 0) {
      possibleUnusedUtilities++;
      add(
        "possible-unused",
        utility.line,
        [utility.name],
        "No source token found; dynamic class construction may evade this check.",
      );
    }
    if (CERTAIN_BUILTINS.has(utility.name)) {
      add(
        "built-in-duplicate",
        utility.line,
        [utility.name],
        "Name matches a Tailwind built-in. Compare behavior before removing the override.",
      );
    }
    const candidate = themeCandidate(utility.name, utility.body);
    if (candidate) {
      const group = candidates.get(candidate.token) ?? [];
      group.push({ utility, suggestion: candidate });
      candidates.set(candidate.token, group);
    }
    const normalized = utility.body.replace(/\s+/g, " ").trim();
    const group = byBody.get(normalized) ?? [];
    group.push(utility);
    byBody.set(normalized, group);
  }

  for (const [token, group] of candidates) {
    const values = new Set(group.map((entry) => entry.suggestion.value));
    if (values.size > 1) {
      add(
        "theme-token-collision",
        group[0]?.utility.line ?? 1,
        group.map((entry) => entry.utility.name),
        `${token} would represent different values: ${[...values].join(" vs ")}. Do not migrate these together.`,
      );
    } else {
      for (const { utility, suggestion } of group) {
        if (suggestion.safe) add("theme-candidate", utility.line, [utility.name], suggestion.detail);
      }
    }
  }

  for (const group of byBody.values()) {
    if (group.length < 2) continue;
    add(
      "duplicate-utility",
      group[0]?.line ?? 1,
      group.map((item) => item.name),
      "Identical CSS bodies. Check consumers and selector-sensitive behavior before consolidating.",
    );
  }

  const seenTheme = new Map<string, number>();
  const reportedTheme = new Set<string>();
  for (const item of theme) {
    const original = seenTheme.get(item.name);
    if (original === undefined) seenTheme.set(item.name, item.line);
    else if (!reportedTheme.has(item.name)) {
      reportedTheme.add(item.name);
      add(
        "duplicate-theme-token",
        item.line,
        [item.name],
        `Previously declared near line ${String(original)}; check effective cascade value.`,
      );
    }
  }

  const byValue = new Map<string, string[]>();
  for (const variable of root) {
    const names = byValue.get(variable.value) ?? [];
    names.push(variable.name);
    byValue.set(variable.value, names);
  }
  for (const [value, names] of byValue) {
    if (names.length < 2) continue;
    add(
      "shared-root-value",
      1,
      names,
      `Equal value (${value}) may be intentional: keep independent semantic roles unless proven identical.`,
    );
  }

  const kindOrder = [
    "duplicate-theme-token",
    "built-in-duplicate",
    "duplicate-utility",
    "theme-token-collision",
    "theme-candidate",
    "possible-unused",
    "shared-root-value",
  ];
  findings.sort(
    (a, b) =>
      kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) ||
      a.line - b.line ||
      a.names.join().localeCompare(b.names.join()),
  );

  return {
    summary: {
      lines: css.split(/\r?\n/).length,
      utilities: utilities.length,
      rootVariables: root.length,
      themeVariables: theme.length,
      singleReferenceUtilities,
      possibleUnusedUtilities,
    },
    findings,
  };
}
