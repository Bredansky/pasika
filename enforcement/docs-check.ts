import path from "node:path";
import { parseDocs, RFC_2119, type ParsedDoc } from "./parse-docs.js";

/**
 * Identifiers of the documentation checks. The enforcement registry points at
 * these, so renaming one is a change the registry has to follow.
 */
export const DOCS_CHECKS = [
  "doc-kind-suffix",
  "title-matches-file-name",
  "overview-present",
  "overview-length",
  "guide-overview-no-links",
  "guide-step-single-sentence",
  "guide-step-single-link",
  "guide-states-no-requirement",
  "guide-folder-entry-point",
  "requirement-present",
  "rule-paired-examples",
  "example-heading-description",
  "conventions-no-examples",
  "conventions-single-document",
  "no-cross-document-link",
  "reference-no-rfc-vocabulary",
  "reference-block-headings",
  "support-document-placement",
  "no-template-prompt",
] as const;

export type DocsCheck = (typeof DOCS_CHECKS)[number];

export interface DocsFinding {
  doc: string;
  line: number;
  check: DocsCheck;
  message: string;
}

function countSentences(text: string): number {
  // Abbreviations inside requirement text are rare, so a period followed by
  // whitespace is a reliable sentence boundary here.
  return text.split(/[.!?](?:\s+|$)/).filter((part) => part.trim() !== "").length;
}

function checkDoc(doc: ParsedDoc, allDocs: ParsedDoc[]): DocsFinding[] {
  const findings: DocsFinding[] = [];
  const add = (line: number, check: DocsCheck, message: string): void => {
    findings.push({ doc: doc.doc, line, check, message });
  };

  if (!doc.kind) {
    add(1, "doc-kind-suffix", "file name carries no -guide, -rule, -reference, or -conventions suffix");
    return findings;
  }

  const expectedFileName = `${doc.title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.md`;
  if (doc.title === "") {
    add(1, "title-matches-file-name", "document has no `# Title` heading");
  } else if (expectedFileName !== doc.fileName) {
    add(1, "title-matches-file-name", `title "${doc.title}" expects file name ${expectedFileName}`);
  }

  if (doc.overview === undefined) {
    add(2, "overview-present", "no overview follows the title");
  } else if (countSentences(doc.overview) > 2) {
    add(
      2,
      "overview-length",
      `overview uses ${String(countSentences(doc.overview))} sentences, at most two are allowed`,
    );
  }

  if (doc.kind === "guide") {
    if (doc.overview?.includes("](")) {
      add(2, "guide-overview-no-links", "guide overview links another document");
    }
    for (const step of doc.steps) {
      if (countSentences(step.text) > 1) {
        add(step.line, "guide-step-single-sentence", `step uses ${String(countSentences(step.text))} sentences`);
      }
      if (step.links.length > 1) {
        add(step.line, "guide-step-single-link", `step links ${String(step.links.length)} documents`);
      }
    }
    if (doc.requirements.length > 0) {
      const first = doc.requirements[0];
      add(first?.line ?? 1, "guide-states-no-requirement", "guide states a requirement with RFC 2119 vocabulary");
    }
  } else {
    for (const link of doc.docLinks) {
      add(link.line, "no-cross-document-link", `${doc.kind} links another document: ${link.target}`);
    }
  }

  if ((doc.kind === "rule" || doc.kind === "conventions") && doc.requirements.length === 0) {
    add(1, "requirement-present", `${doc.kind} document states no requirement`);
  }

  if (doc.kind === "rule") {
    const incorrect = doc.exampleHeadings.filter((heading) => heading.text.startsWith("Incorrect"));
    const correct = doc.exampleHeadings.filter((heading) => heading.text.startsWith("Correct"));
    if (incorrect.length === 0 || incorrect.length !== correct.length) {
      add(
        1,
        "rule-paired-examples",
        `${String(incorrect.length)} Incorrect and ${String(correct.length)} Correct examples`,
      );
    }
    for (const heading of doc.exampleHeadings) {
      if (!/^(?:Incorrect|Correct) — .+/.test(heading.text)) {
        add(heading.line, "example-heading-description", `example heading has no em-dash description: ${heading.text}`);
      }
    }
  }

  if (doc.kind === "conventions") {
    for (const heading of doc.exampleHeadings) {
      add(heading.line, "conventions-no-examples", `conventions document contains an example: ${heading.text}`);
    }
    const conventionsDocs = allDocs.filter((other) => other.kind === "conventions");
    if (conventionsDocs.length > 1 && conventionsDocs[0] === doc) {
      add(1, "conventions-single-document", `${String(conventionsDocs.length)} conventions documents exist`);
    }
  }

  if (doc.kind === "reference") {
    doc.proseWithoutCode.forEach((line, index) => {
      const match = RFC_2119.exec(line);
      if (match) {
        add(
          index + 1,
          "reference-no-rfc-vocabulary",
          `reference uses RFC 2119 vocabulary: ${match.groups?.keyword ?? ""}`,
        );
      }
    });
    if (doc.sectionHeadings.length === 1) {
      add(
        doc.sectionHeadings[0]?.line ?? 1,
        "reference-block-headings",
        "reference has exactly one section heading, so either a single block is headed or a first block is not",
      );
    }
  }

  // Rules and references a guide owns live in its rules/ and references/ folders.
  const parentFolder = path.basename(path.dirname(doc.filePath));
  if (doc.kind === "rule" && parentFolder !== "rules") {
    add(1, "support-document-placement", `rule lives in "${parentFolder}/" instead of "rules/"`);
  }
  if (doc.kind === "reference" && parentFolder !== "references") {
    add(1, "support-document-placement", `reference lives in "${parentFolder}/" instead of "references/"`);
  }

  doc.prose.forEach((line, index) => {
    if (/^\s*\[[A-Z0-9].*\]\s*$/.test(line)) {
      add(index + 1, "no-template-prompt", "leftover bracketed template prompt");
    }
  });

  return findings;
}

/**
 * A folder that holds `rules/` or `references/` is a guide folder, so it needs a
 * guide named after it as its entry point. Other guides may share that folder.
 */
function checkGuideFolders(docs: ParsedDoc[]): DocsFinding[] {
  const guideFolders = new Set(
    docs
      .filter((doc) => ["rules", "references"].includes(path.basename(path.dirname(doc.filePath))))
      .map((doc) => path.dirname(path.dirname(doc.filePath))),
  );

  return [...guideFolders]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((folder) => {
      const expectedEntryPoint = `${path.basename(folder)}.md`;
      const hasEntryPoint = docs.some(
        (doc) => doc.kind === "guide" && path.dirname(doc.filePath) === folder && doc.fileName === expectedEntryPoint,
      );
      if (hasEntryPoint) return [];
      const anyDoc = docs.find((doc) => doc.filePath.startsWith(`${folder}${path.sep}`));
      return [
        {
          doc: anyDoc ? path.dirname(path.dirname(anyDoc.doc)) : path.basename(folder),
          line: 1,
          check: "guide-folder-entry-point",
          message: `folder holds support documents but has no ${expectedEntryPoint} entry point`,
        },
      ];
    });
}

export function checkDocs(docsRoot: string): { docs: ParsedDoc[]; findings: DocsFinding[] } {
  const docs = parseDocs(docsRoot);
  return { docs, findings: [...docs.flatMap((doc) => checkDoc(doc, docs)), ...checkGuideFolders(docs)] };
}
