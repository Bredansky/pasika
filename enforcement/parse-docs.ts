import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { hashRequirement, normalizeRequirement } from "./normalize.js";

/** The four document kinds the documentation guide defines. */
export type DocKind = "guide" | "rule" | "reference" | "policy";

const KIND_BY_SUFFIX: [suffix: string, kind: DocKind][] = [
  ["-rule.md", "rule"],
  ["-guide.md", "guide"],
  ["-reference.md", "reference"],
  ["-policy.md", "policy"],
];

/** Words that carry requirement strength, longest first so `MUST NOT` wins over `MUST`. */
const RFC_2119 = /\b(?<keyword>MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\b/;

export interface ParsedRequirement {
  /** Canonical text used for identity. */
  text: string;
  hash: string;
  /** The bullet as written, without its list marker. */
  raw: string;
  line: number;
}

export interface ParsedStep {
  line: number;
  text: string;
  /** Documents this step links, as written. */
  links: string[];
}

export interface ParsedDoc {
  /** Absolute path on disk. */
  filePath: string;
  /** Path relative to the docs root, with forward slashes. */
  doc: string;
  fileName: string;
  /** Undefined when no file-name suffix identifies the kind. */
  kind?: DocKind;
  title: string;
  /** First non-empty prose line under the title. */
  overview?: string;
  /** Prose lines with fenced code blocks blanked and code spans unwrapped, indexed from 0. */
  prose: string[];
  /**
   * Prose lines with code spans removed rather than unwrapped, so a backticked
   * keyword counts as naming the keyword rather than using it.
   */
  proseWithoutCode: string[];
  requirements: ParsedRequirement[];
  /** Numbered list items, which only a Guide is expected to have. */
  steps: ParsedStep[];
  /** `## Incorrect`/`## Correct` headings in document order. */
  exampleHeadings: { line: number; text: string }[];
  /** Every link to another Markdown document, outside fenced code. */
  docLinks: { line: number; target: string }[];
  /** `## ` section headings, excluding the example headings. */
  sectionHeadings: { line: number; text: string }[];
}

function listMarkdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) {
      // Underscore folders hold templates and other support assets, not documents.
      return entry.startsWith("_") ? [] : listMarkdownFiles(entryPath);
    }
    return entry.endsWith(".md") ? [entryPath] : [];
  });
}

/**
 * Blanks fenced code blocks and unwraps inline code spans, keeping one entry per
 * source line so reported line numbers still match the file.
 */
function toProse(body: string, codeSpanReplacement: "$<content>" | ""): string[] {
  let insideFence = false;
  return body.split("\n").map((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      insideFence = !insideFence;
      return "";
    }
    if (insideFence) return "";
    return line.replaceAll(/`(?<content>[^`]*)`/g, codeSpanReplacement);
  });
}

function findDocLinks(line: string): string[] {
  return [...line.matchAll(/\]\((?<target>[^)]*\.md[^)]*)\)/g)].map((match) => match.groups?.target ?? "");
}

export function parseDoc(filePath: string, docsRoot: string): ParsedDoc {
  const body = readFileSync(filePath, "utf8");
  const prose = toProse(body, "$<content>");
  const proseWithoutCode = toProse(body, "");
  const fileName = path.basename(filePath);
  const kind = KIND_BY_SUFFIX.find(([suffix]) => fileName.endsWith(suffix))?.[1];

  const requirements: ParsedRequirement[] = [];
  const steps: ParsedStep[] = [];
  const exampleHeadings: { line: number; text: string }[] = [];
  const sectionHeadings: { line: number; text: string }[] = [];
  const docLinks: { line: number; target: string }[] = [];

  prose.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const target of findDocLinks(line)) {
      docLinks.push({ line: lineNumber, target });
    }

    if (/^\s*[-*]\s/.test(line) && RFC_2119.test(line)) {
      const text = normalizeRequirement(line);
      requirements.push({ text, hash: hashRequirement(text), raw: line.replace(/^\s*[-*]\s+/, ""), line: lineNumber });
    }

    if (/^\s*\d+\.\s/.test(line)) {
      steps.push({ line: lineNumber, text: line.replace(/^\s*\d+\.\s+/, ""), links: findDocLinks(line) });
    }

    if (/^## (?:Incorrect|Correct)\b/.test(line)) {
      exampleHeadings.push({ line: lineNumber, text: line.slice(3).trim() });
    } else if (line.startsWith("## ")) {
      sectionHeadings.push({ line: lineNumber, text: line.slice(3).trim() });
    }
  });

  const title = /^# (?<title>.+)$/m.exec(body)?.groups?.title?.trim() ?? "";
  const overview = prose.slice(1).find((line) => line.trim() !== "" && !line.startsWith("#"));

  return {
    filePath,
    doc: path.relative(docsRoot, filePath).split(path.sep).join("/"),
    fileName,
    kind,
    title,
    overview,
    prose,
    proseWithoutCode,
    requirements,
    steps,
    exampleHeadings,
    docLinks,
    sectionHeadings,
  };
}

export function parseDocs(docsRoot: string): ParsedDoc[] {
  return listMarkdownFiles(docsRoot)
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => parseDoc(filePath, docsRoot));
}

export { RFC_2119 };
